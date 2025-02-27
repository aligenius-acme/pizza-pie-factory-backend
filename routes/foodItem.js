const express = require("express");
const { param, query } = require("express-validator");
const FoodItem = require("../models/FoodItem");
const mongoose = require("mongoose");
const { validateRequest, logError } = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

// Centralized error handling
const handleError = async (route, method, error, req, res) => {
  console.error(`${route} error:`, error);
  await logError(route, method, error.message, error.stack, req.body);
  res.status(500).json({
    message: messages.INTERNAL_SERVER_ERROR,
    error: error.message,
  });
};

// @route   GET /fooditems
// @desc    Get all food items with pagination and filtering
// @access  PUBLIC
router.get(
  "/fooditems",
  [
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
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
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      let filter = {};
      if (categoryid) {
        filter.categories = categoryid;
      }

      // Fetch food items with pagination and filtering
      const foodItems = await FoodItem.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
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
        return res.status(404).json({ message: messages.FOOD_ITEM_NOT_FOUND });
      }

      // Return success response
      res.status(200).json(foodItem);
    } catch (error) {
      handleError(`/fooditem/get/${req.params.id}`, "GET", error, req, res);
    }
  }
);

module.exports = router;
