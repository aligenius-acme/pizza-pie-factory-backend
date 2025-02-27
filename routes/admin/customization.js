const express = require("express");
const { param } = require("express-validator");
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

// @route   PUT /admin/customization/:id
// @desc    Update an existing customization (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/customization/:id",
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
          .json({ message: messages.CUSTOMIZATION_NOT_FOUND });
      }

      // Return success response
      res.status(200).json({
        message: messages.CUSTOMIZATION_UPDATE_SUCCESS,
        customization,
      });
    } catch (error) {
      handleError(
        `/admin/customization/${req.params.id}`,
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
router.get(
  "/admin/customization/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate customization ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the customization by ID
      const customization = await Customization.findById(id).lean();
      if (!customization) {
        return res
          .status(404)
          .json({ message: messages.CUSTOMIZATION_NOT_FOUND });
      }

      // Return success response
      res.status(200).json(customization);
    } catch (error) {
      handleError(
        `/admin/customization/${req.params.id}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/customizations
// @desc    Get all customizations (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/customizations",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  async (req, res) => {
    try {
      // Fetch all customizations
      const customizations = await Customization.find().lean();

      // Return success response
      res.status(200).json(customizations);
    } catch (error) {
      handleError("/admin/customizations", "GET", error, req, res);
    }
  }
);

module.exports = router;
