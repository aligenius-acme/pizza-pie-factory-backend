const express = require("express");
const { param } = require("express-validator");
const Category = require("../models/Category");
const { validateRequest, handleError } = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

// @route   GET /categories
// @desc    Get all categories
// @access  PUBLIC
router.get("/categories", async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find().lean();

    if (categories.length === 0) {
      return res.status(404).json({ message: messages.NO_CATEGORIES_FOUND });
    }

    // Return success response
    res.status(200).json(categories);
  } catch (error) {
    handleError("/categories", "GET", error, req, res);
  }
});

// @route   GET /category/get/:id
// @desc    Get category details by ID
// @access  PRIVATE (Authenticated Users Only)
router.get(
  "/category/get/:id",
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate category ID
  async (req, res) => {
    try {
      // Validate request parameters
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Find the category by ID
      let category = await Category.findById(id).lean();
      if (!category) {
        return res.status(404).json({ message: messages.CATEGORY_NOT_FOUND });
      }

      // Populate items if they exist
      if (category.items && category.items.length > 0) {
        category = await Category.findById(id).populate("items").lean();
      }

      // Return success response
      res.status(200).json(category);
    } catch (error) {
      handleError("/categories", "GET", error, req, res);
    }
  }
);

module.exports = router;
