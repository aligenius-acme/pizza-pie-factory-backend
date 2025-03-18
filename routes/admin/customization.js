const express = require("express");
const { param, query } = require("express-validator");
const Customization = require("../../models/Customization");
const authMiddleware = require("../../middleware/auth");
const { customizationValidation } = require("../../utils/validation");
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

const router = express.Router();

// @route   POST /admin/customization/register
// @desc    Register a new customization (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/customization/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [...customizationValidation()], // Apply customization validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Customization.schema);

      // Check if customization with the same name already exists
      const existingCustomization = await Customization.findOne({
        name: filteredBody.customizationName,
      }).lean();

      if (existingCustomization) {
        return res.status(400).json({ message: messages.CUSTOMIZATION_EXISTS });
      }

      // Create and save the customization
      const customization = new Customization(filteredBody);
      await customization.save();

      // Return success response
      res.status(201).json({
        message: messages.CUSTOMIZATION_REGISTRATION_SUCCESS,
        customization,
      });
    } catch (error) {
      handleError("/admin/customization/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/customization/update/:id
// @desc    Update an existing customization (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/customization/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [...customizationValidation()], // Apply customization validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Customization.schema);

      // Check if customization with the same name already exists (excluding the current one)
      const existingCustomization = await Customization.findOne({
        name: filteredBody.customizationName,
        _id: { $ne: id },
      }).lean();

      if (existingCustomization) {
        return res.status(400).json({ message: messages.CUSTOMIZATION_EXISTS });
      }

      // Find and update the customization
      const customization = await Customization.findByIdAndUpdate(
        id,
        filteredBody,
        { new: true }
      ).lean();

      if (!customization) {
        return res
          .status(404)
          .json({ message: messages.CUSTOMIZATION_NOT_FOUND_OR_INACTIVE });
      }

      // Return success response
      res.status(200).json({
        message: messages.CUSTOMIZATION_UPDATE_SUCCESS,
        customization,
      });
    } catch (error) {
      handleError(
        `/admin/customization/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/customization/:id
// @desc    Get a customization by ID (Admin Only)
// @access  PRIVATE (Admin Only)
// router.get(
//   "/admin/customization/:id",
//   authMiddleware.authenticateJWT, // Authenticate JWT
//   authMiddleware.authenticateAdmin, // Ensure user is an admin
//   [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate customization ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validateRequest(req);
//       if (errors) return res.status(400).json({ errors });

//       const { id } = req.params;

//       // Find the customization by ID
//       const customization = await Customization.findById(id).lean();
//       if (!customization) {
//         return res
//           .status(404)
//           .json({ message: messages.CUSTOMIZATION_NOT_FOUND_OR_INACTIVE });
//       }

//       // Return success response
//       res.status(200).json(customization);
//     } catch (error) {
//       handleError(
//         `/admin/customization/${req.params.id}`,
//         "GET",
//         error,
//         req,
//         res
//       );
//     }
//   }
// );

// @route   GET /admin/customizations
// @desc    Get all customizations (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/customizations",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    query("customizationId")
      .optional()
      .isMongoId()
      .withMessage(messages.INVALID_ID), // Validate ID (optional)
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("isActive").optional().isBoolean(), // Validate isActive (optional)
    query("startDate").optional().isISO8601(), // Validate startDate (optional)
    query("endDate").optional().isISO8601(), // Validate endDate (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        customizationId,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        isActive,
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Filter by ID
      if (customizationId) {
        filter._id = customizationId;
      }

      // Filter by isActive status
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Filter by date range
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      } else if (startDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
        };
      } else if (endDate) {
        filter.createdAt = {
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter = {
          $or: [
            { customizationName: { $regex: searchRegex } }, // Search by name
          ],
        };
      }

      // Fetch customizations with pagination and sorting
      const customizations = await Customization.find(filter)
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!customizations || customizations.length === 0) {
        return res
          .status(404)
          .json({ message: messages.NO_CUSTOMIZATIONS_FOUND });
      }

      // Get the total count of customizations
      const totalCount = await Customization.countDocuments(filter);

      // Return success response with customizations and pagination details
      res.status(200).json({
        success: true,
        data: customizations,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/admin/customizations", "GET", error, req, res);
    }
  }
);

module.exports = router;
