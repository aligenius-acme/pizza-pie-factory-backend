const express = require("express");
const { param } = require("express-validator");
const Category = require("../models/Category");
const FoodItem = require("../models/FoodItem");

const router = express.Router();

// @route   GET /categories
// @access  PRIVATE
router.get(
  "/admin/categories",
  [authMiddleware.authenticateJWT],
  async (req, res) => {
    try {
      const categories = await Category.find().lean();

      if (categories.length === 0) {
        return res.status(404).json({ message: "No categories found" });
      }

      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/category/get/:id
// @access  PRIVATE
router.get(
  "/admin/category/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const category = await Category.findById(req.params.id).lean();
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      if (category.items && category.items.length > 0) {
        category = await Category.findById(req.params.id)
          .populate("items")
          .lean();
      }

      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   DELETE /admin/category/delete/:id
// @access  PRIVATE (Admin Only)
router.delete(
  "/admin/category/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const foodItems = await FoodItem.find({ categories: id }).lean();
      if (foodItems.length > 0) {
        return res.status(400).json({
          message: "Category cannot be deleted as it has associated food items",
        });
      }

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      if (category.imageUrl) {
        await cloudinary.uploader.destroy(`categories/${category.name}`);
      }

      await Category.findByIdAndDelete(id);

      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
