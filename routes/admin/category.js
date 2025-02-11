const express = require("express");
const { param, body, validationResult } = require("express-validator");
const Category = require("../../models/Category");
const FoodItem = require("../../models/FoodItem");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const { categoryValidation } = require("../../utils/validation");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// @route   POST /admin/category/register
// @desc    Register a new category with optional image upload
// @access  Site admin only
router.post(
  "/admin/category/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  ...categoryValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category with this name already exists" });
      }

      let categoryData = { name };

      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "categories", public_id: name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        categoryData.imageUrl = result.secure_url;
      }

      const category = new Category(categoryData);
      await category.save();
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/category/update/:id
// @desc    Update a category and optionally update its image
// @access  Site admin only
router.put(
  "/admin/category/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [
    param("id").isMongoId().withMessage("Invalid category ID"),
    ...categoryValidation(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name } = req.body;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const oldName = category.name;

      let updateData = { name };

      if (req.file) {
        if (category.imageUrl) {
          await cloudinary.uploader.destroy(`categories/${oldName}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "categories", public_id: name },
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

      const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.status(200).json(updatedCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/categories
// @desc    Get all categories
// @access  Site admin only
router.get(
  "/admin/categories",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const categories = await Category.find();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/category/get/:id
// @desc    Get category by ID
// @access  Site admin only
router.get(
  "/admin/category/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   DELETE /admin/category/delete/:id
// @desc    Delete a category only if no food items reference it
// @access  Site admin only
router.delete(
  "/admin/category/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const foodItems = await FoodItem.find({ categories: id });
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

      res.status(204).json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
