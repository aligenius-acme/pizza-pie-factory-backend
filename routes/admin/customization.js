const express = require("express");
const { param } = require("express-validator");
const Customization = require("../../models/Customization");
const authMiddleware = require("../../middleware/auth");
const { customizationValidation } = require("../../utils/validation");
const { validateRequest } = require("../../utils/helpers");

const router = express.Router();

// @route   POST /admin/customization/register
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/customization/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [...customizationValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["offerId", "customizationName", "customizations"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const existingCustomization = await Customization.findOne({
        name: filteredBody.customizationName,
      }).lean();

      if (existingCustomization) {
        return res
          .status(400)
          .json({ message: "Customization with this name already exists" });
      }

      let customizationData = filteredBody;
      const customization = new Customization(customizationData);
      await customization.save();
      res.status(201).json(customization);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/customization/:id
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/customization/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [...customizationValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["offerId", "customizationName", "customizations"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const existingCustomization = await Customization.findOne({
        name: filteredBody.customizationName,
        _id: { $ne: req.params.id },
      }).lean();

      if (existingCustomization) {
        return res
          .status(400)
          .json({ message: "Customization with this name already exists" });
      }

      const customization = await Customization.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        { new: true }
      ).lean();

      if (!customization) {
        return res.status(404).json({ message: "Customization not found" });
      }

      res.status(200).json(customization);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/customization/:id
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/customization/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid food item ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const customization = await Customization.findById(req.params.id).lean();
      if (!customization) {
        return res.status(404).json({ message: "Customization not found" });
      }
      res.status(200).json(customization);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/customizations
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/customizations",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const customizations = await Customization.find().lean();
      res.status(200).json(customizations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
