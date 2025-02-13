const express = require("express");
const { param } = require("express-validator");
const Category = require("../../models/Category");
const FoodItem = require("../../models/FoodItem");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const { categoryValidation } = require("../../utils/validation");

const { validateRequest } = require("../../utils/helpers");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// @route   POST /admin/category/register
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/category/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [...categoryValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["name"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) => allowedFields.includes(key) && value !== undefined
        )
      );

      const existingCategory = await Category.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category with this name already exists" });
      }

      let categoryData = filteredBody;

      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "categories", public_id: filteredBody.name },
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
// @access  PRIVATE (Admin Only)
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
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const allowedFields = ["name"];

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const oldName = category.name;

      let updateData = { name: filteredBody.name };

      if (req.file) {
        if (category.imageUrl) {
          await cloudinary.uploader.destroy(`categories/${oldName}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "categories", public_id: filteredBody.name },
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

      Object.assign(category, filteredBody);
      await category.save();

      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/categories
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
