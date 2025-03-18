const express = require("express");
const { param, query } = require("express-validator");
const Category = require("../models/Category");
const { validateRequest, handleError } = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

// @route   GET /categories
// @desc    Get all categories (with pagination, sorting, and filtering)
// @access  PUBLIC
router.get(
  "/categories",
  [
    query("categoryId").optional().isMongoId().withMessage(messages.INVALID_ID), // Validate category ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        categoryId,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Filter by categoryId
      if (categoryId) {
        filter._id = categoryId;
      }

      // Get only active categories
      filter.isActive = true;

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { name: { $regex: searchRegex } }, // Search by name
          { description: { $regex: searchRegex } }, // Search by description (if applicable)
        ];
      }

      // Find all categories with filtering, sorting, and pagination
      const categories = await Category.find(filter)
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!categories || categories.length === 0) {
        return res.status(404).json({ message: messages.NO_CATEGORIES_FOUND });
      }

      // If categoryId is provided, return the single category
      if (categoryId) {
        return res.status(200).json({
          success: true,
          data: categories[0], // Return the first (and only) category
        });
      }

      // Get the total count of categories
      const totalCount = await Category.countDocuments(filter);

      // Return success response with the categories and pagination details
      res.status(200).json({
        success: true,
        data: categories,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/categories", "GET", error, req, res);
    }
  }
);

// // @route   GET /category/get/:id
// // @desc    Get category details by ID
// // @access  PUBLIC
// router.get(
//   "/category/get/:id",
//   [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate category ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       if (validateRequest(req, res)) return;

//       const { id } = req.params;

//       // Find the category by ID
//       let category = await Category.findById(id).lean();
//       if (!category) {
//         return res
//           .status(404)
//           .json({ message: messages.CATEGORY_NOT_FOUND_OR_INACTIVE });
//       }

//       // Populate items if they exist
//       if (category.items && category.items.length > 0) {
//         category = await Category.findById(id).populate("items").lean();
//       }

//       // Return success response
//       res.status(200).json(category);
//     } catch (error) {
//       handleError(`/category/get/${req.params.id}`, "GET", error, req, res);
//     }
//   }
// );

module.exports = router;
