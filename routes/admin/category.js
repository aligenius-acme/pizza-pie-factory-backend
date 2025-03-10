const express = require("express");
const { param } = require("express-validator");
const Category = require("../../models/Category");
const FoodItem = require("../../models/FoodItem");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const { categoryValidation } = require("../../utils/validation");
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

// @route   POST /admin/category/register
// @desc    Register a new category (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/category/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [...categoryValidation()], // Apply category validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Category.schema);

      // Check if category with the same name already exists
      const existingCategory = await Category.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingCategory) {
        return res.status(400).json({ message: messages.CATEGORY_EXISTS });
      }

      let categoryData = filteredBody;

      // Upload image to Cloudinary if provided
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

      // Create and save the category
      const category = new Category(categoryData);
      await category.save();

      // Return success response
      res.status(201).json({
        message: messages.CATEGORY_REGISTRATION_SUCCESS,
        category,
      });
    } catch (error) {
      handleError("/admin/category/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/category/update/:id
// @desc    Update an existing category (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/category/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate category ID
    ...categoryValidation(), // Apply category validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the category by ID
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: messages.CATEGORY_NOT_FOUND });
      }

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Category.schema);

      const oldName = category.name;

      let updateData = { name: filteredBody.name };

      // Upload new image to Cloudinary if provided
      if (req.file) {
        // Delete old image from Cloudinary if it exists
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

      // Update category fields
      Object.assign(category, updateData);
      await category.save();

      // Return success response
      res.status(200).json({
        message: messages.CATEGORY_UPDATE_SUCCESS,
        category,
      });
    } catch (error) {
      handleError(
        `/admin/category/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/categories
// @desc    Get all categories
// @access  PUBLIC
router.get("/admin/categories", async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find().lean();

    if (categories.length === 0) {
      return res.status(404).json({ message: messages.NO_CATEGORIES_FOUND });
    }

    // Return success response
    res.status(200).json(categories);
  } catch (error) {
    handleError("/admin/categories", "GET", error, req, res);
  }
});

// // @route   DELETE /admin/category/delete/:id
// // @desc    Delete a category (Admin Only)
// // @access  PRIVATE (Admin Only)
// router.delete(
//   "/admin/category/delete/:id",
//   authMiddleware.authenticateJWT, // Authenticate JWT
//   authMiddleware.authenticateAdmin, // Ensure user is an admin
//   [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate category ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validateRequest(req);
//       if (errors) return res.status(400).json({ errors });

//       const { id } = req.params;

//       // Check if the category has associated food items
//       const foodItems = await FoodItem.find({ categories: id }).lean();
//       if (foodItems.length > 0) {
//         return res.status(400).json({
//           message: messages.CATEGORY_HAS_FOOD_ITEMS,
//         });
//       }

//       // Find the category by ID
//       const category = await Category.findById(id).lean();
//       if (!category) {
//         return res.status(404).json({ message: messages.CATEGORY_NOT_FOUND });
//       }

//       // Delete the category image from Cloudinary if it exists
//       if (category.imageUrl) {
//         await cloudinary.uploader.destroy(`categories/${category.name}`);
//       }

//       // Delete the category
//       await Category.findByIdAndDelete(id);

//       // Return success response
//       res.status(200).json({ message: messages.CATEGORY_DELETED_SUCCESS });
//     } catch (error) {
//       handleError(
//         `/admin/category/delete/${req.params.id}`,
//         "DELETE",
//         error,
//         req,
//         res
//       );
//     }
//   }
// );

module.exports = router;
