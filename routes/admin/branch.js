const express = require("express");
const { param } = require("express-validator");
const { branchValidation } = require("../../utils/validation");
const Branch = require("../../models/Branch");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
  validateEmployeeBranchAssociation,
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

      const oldName = branch.name;

      let updateData = { name: filteredBody.name };

      // Upload new image to Cloudinary if provided
      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (branch.imageUrl) {
          await cloudinary.uploader.destroy(`branches/${oldName}`);
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
        updateData.imageUrl = result.secure_url;
      }

      // Update branch fields
      Object.assign(branch, updateData);
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
  async (req, res) => {
    try {
      // Fetch all branches
      const branches = await Branch.find().lean();

      // Check if branches exist
      if (!branches.length) {
        return res.status(404).json({ message: messages.NO_BRANCHES_FOUND });
      }

      // Return success response with the list of branches
      res.status(200).json(branches);
    } catch (error) {
      handleError("/admin/branches", "GET", error, req, res);
    }
  }
);

// @route   GET /admin/branch/get/:id
// @desc    Get branch details by ID (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branch/get/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find branch by ID
      const branch = await Branch.findById(id).lean();
      if (!branch) {
        return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
      }

      // Return success response with the branch details
      res.status(200).json(branch);
    } catch (error) {
      handleError(`/admin/branch/get/${req.params.id}`, "GET", error, req, res);
    }
  }
);

module.exports = router;
