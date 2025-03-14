const express = require("express");
const { param, query } = require("express-validator");
const FoodItem = require("../models/FoodItem");
const mongoose = require("mongoose");
const { validateRequest, handleError } = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

// @route   GET /fooditems
// @desc    Get all food items with pagination, filtering, and search
// @access  PUBLIC
router.get(
  "/fooditems",
  [
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("categoryid").optional().isMongoId().withMessage(messages.INVALID_ID), // Validate category ID (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
    query("foodItemId").optional().isMongoId().withMessage(messages.INVALID_ID), // Validate foodItemId (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        page = 1,
        limit = 10,
        categoryid,
        sortBy = "createdAt",
        order = "desc",
        search,
        foodItemId,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Filter by foodItemId
      if (foodItemId) {
        filter._id = foodItemId;
      }

      // Filter by category ID
      if (categoryid) {
        filter.categories = categoryid;
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { name: { $regex: searchRegex } }, // Search by name
          { description: { $regex: searchRegex } }, // Search by description
        ];
      }

      // Fetch food items with pagination, filtering, and sorting
      const foodItems = await FoodItem.find(filter)
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!foodItems.length) {
        return res.status(404).json({ message: messages.NO_FOOD_ITEMS_FOUND });
      }

      // Get total count of food items for pagination
      const totalCount = await FoodItem.countDocuments(filter);

      // Return success response with pagination details
      res.status(200).json({
        success: true,
        data: foodItems,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/fooditems", "GET", error, req, res);
    }
  }
);

// @route   GET /fooditem/get/:id
// @desc    Get food item details by ID
// @access  PUBLIC
router.get(
  "/fooditem/get/:id",
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate food item ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the food item by ID and populate related fields
      const foodItem = await FoodItem.findById(id).lean();

      if (!foodItem) {
        return res
          .status(404)
          .json({ message: messages.FOOD_ITEM_NOT_FOUND_OR_INACTIVE });
      }

      // Return success response
      res.status(200).json(foodItem);
    } catch (error) {
      handleError(`/fooditem/get/${req.params.id}`, "GET", error, req, res);
    }
  }
);

module.exports = router;
