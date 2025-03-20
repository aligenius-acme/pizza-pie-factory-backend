const express = require("express");
const { param, query } = require("express-validator");
const { branchValidation } = require("../../utils/validation");
const Branch = require("../../models/Branch");
const Analytics = require("../../models/Analytics");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// @route   POST /admin/branch/register
// @desc    Register a new branch (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/branch/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [...branchValidation()], // Apply branch validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Branch.schema);

      // Check if branch with the same name already exists
      const existingBranch = await Branch.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingBranch) {
        return res.status(400).json({ message: messages.BRANCH_EXISTS });
      }

      let branchData = filteredBody;

      // Upload image to Cloudinary if provided
      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "branches", public_id: filteredBody.name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        branchData.imageUrl = result.secure_url;
      }

      // Create and save the branch
      const branch = new Branch(branchData);
      await branch.save();

      // Return success response
      res.status(201).json({
        message: messages.BRANCH_REGISTRATION_SUCCESS,
        branch,
      });
    } catch (error) {
      handleError("/admin/branch/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/branch/update/:id
// @desc    Update branch details (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/branch/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    ...branchValidation(), // Apply branch validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the branch by ID
      const branch = await Branch.findById(id);
      if (!branch) {
        return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
      }

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Branch.schema);

      // Check if the new name already exists for another branch (excluding the current branch)
      if (filteredBody.name && filteredBody.name !== branch.name) {
        const existingBranch = await Branch.findOne({
          name: filteredBody.name,
          _id: { $ne: id }, // Exclude the current branch
        });
        if (existingBranch) {
          return res.status(400).json({ message: messages.BRANCH_EXISTS });
        }
      }

      // Update branch fields
      Object.assign(branch, filteredBody);

      // Upload new image to Cloudinary if provided
      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (branch.imageUrl) {
          await cloudinary.uploader.destroy(`branches/${branch.name}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "branches", public_id: filteredBody.name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        branch.imageUrl = result.secure_url;
      }

      // Save the updated branch
      await branch.save();

      // Return success response
      res.status(200).json({
        message: messages.BRANCH_UPDATE_SUCCESS,
        branch,
      });
    } catch (error) {
      handleError(
        `/admin/branch/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/branches
// @desc    Get all branches (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branches",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    query("branchId").optional().isMongoId().withMessage(messages.INVALID_ID), // Validate branchId (optional)
    query("search").optional().trim(), // Validate search query (optional)
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId, search, page = 1, limit = 10 } = req.query;

      // Build filter object
      let filter = {};

      // Filter by branchId
      if (branchId) {
        filter._id = branchId;
      }

      // Filter by search query (name or address)
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } }, // Case-insensitive search for name
          { "location.address": { $regex: search, $options: "i" } }, // Case-insensitive search for address
        ];
      }

      // Calculate pagination values
      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const skip = (pageNumber - 1) * pageSize;

      // Fetch branches with filtering and pagination
      const branches = await Branch.find(filter)
        .skip(skip) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      // Get the total count of branches (for pagination metadata)
      const totalCount = await Branch.countDocuments(filter);

      // Check if branches exist
      if (!branches.length) {
        return res.status(404).json({ message: messages.NO_BRANCHES_FOUND });
      }

      // Return success response with the list of branches and pagination metadata
      return res.status(200).json({
        success: true,
        data: branches,
        pagination: {
          totalItems: totalCount, // Total number of branches
          totalPages: Math.ceil(totalCount / pageSize), // Total number of pages
          currentPage: pageNumber, // Current page number
          pageSize, // Number of items per page
        },
      });
    } catch (error) {
      handleError("/admin/branches", "GET", error, req, res);
    }
  }
);

// @route   GET /admin/branch/analytics/:id
// @desc    Get branch analytics by ID (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branch/analytics/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find analytics data by branch ID
      const analytics = await Analytics.findOne({ branchId: id }).lean();
      if (!analytics) {
        return res.status(404).json({ message: messages.ANALYTICS_NOT_FOUND });
      }

      // Return success response with the branch analytics
      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      handleError(
        `/admin/branch/analytics/${req.params.id}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// // @route   GET /admin/branch/get/:id
// // @desc    Get branch details by ID (Admin Only)
// // @access  PRIVATE (Admin Only)
// router.get(
//   "/admin/branch/get/:id",
//   authMiddleware.authenticateJWT, // Authenticate JWT
//   authMiddleware.authenticateAdmin, // Ensure user is an admin
//   [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validateRequest(req);
//       if (errors) return res.status(400).json({ errors });

//       const { id } = req.params;

//       // Find branch by ID
//       const branch = await Branch.findById(id).lean();
//       if (!branch) {
//         return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
//       }

//       // Return success response with the branch details
//       res.status(200).json(branch);
//     } catch (error) {
//       handleError(`/admin/branch/get/${req.params.id}`, "GET", error, req, res);
//     }
//   }
// );

module.exports = router;
