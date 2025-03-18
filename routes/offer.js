const express = require("express");
const { param, query } = require("express-validator");
const Offer = require("../models/Offer");
const FoodItem = require("../models/FoodItem");
// const Customization = require("../models/FoodItem");
const { validateRequest, handleError } = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

// @route   GET /offer/details/:id
// @desc    Get offer details by ID
// @access  PUBLIC
router.get(
  "/offer/details/:id",
  [param("id").isMongoId().withMessage(messages.INVALID_ID)],
  async (req, res) => {
    try {
      // Validate request parameters
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Step 1: Retrieve the offer details
      const offer = await Offer.findById(id).populate("categories");
      if (!offer) {
        return res
          .status(404)
          .json({ message: messages.OFFER_NOT_FOUND_OR_INACTIVE });
      }

      // Step 2: Initialize the response object
      const response = {
        id: offer._id,
        offerName: offer.name,
        steps: [],
      };

      // Step 3: Process each category as a step
      let stepId = 1; // Unique identifier for each step
      for (const category of offer.categories) {
        const step = {
          stepId: stepId++, // Increment stepId for each step
          categoryId: category._id,
          categoryName: category.name,
          foodItems: [],
          completed: false, // Default to false
        };

        // Step 4: Retrieve all food items for the current category
        const foodItems = await FoodItem.find({
          categories: category._id,
          customizations: { $exists: true, $not: { $size: 0 } }, // Ensure customizations exist and are not empty
        }).populate("customizations");

        // Step 5: Process each food item and its customizations
        for (const foodItem of foodItems) {
          const foodItemWithCustomizations = {
            foodItemId: foodItem._id,
            foodItemName: foodItem.name,
            customizations: [],
          };

          // Step 6: Filter customizations linked to the offer
          if (foodItem.customizations && foodItem.customizations.length > 0) {
            const offerCustomizationIds = offer.customizations.map((oc) =>
              oc.toString()
            );

            for (const customization of foodItem.customizations) {
              // Check if the customization is linked to the offer
              if (
                customization &&
                offerCustomizationIds.includes(customization._id.toString())
              ) {
                foodItemWithCustomizations.customizations.push(customization);
              }
            }
          }

          // Only include the food item if it has customizations linked to the offer
          if (foodItemWithCustomizations.customizations.length > 0) {
            step.foodItems.push(foodItemWithCustomizations);
          }
        }

        // Only include the step if it has food items with customizations linked to the offer
        if (step.foodItems.length > 0) {
          response.steps.push(step);
        }
      }

      // Step 7: Send the response
      res.status(200).json(response);
    } catch (error) {
      handleError(`/offer/details/${req.params.id}`, "GET", error, req, res);
    }
  }
);

// // @route   GET /offer/get/:id
// // @desc    Get offer by ID
// // @access  PRIVATE
// router.get(
//   "/offer/get/:id",
//   [param("id").isMongoId().withMessage(messages.INVALID_OFFER_ID)],
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validateRequest(req);
//       if (errors) return res.status(400).json({ errors });

//       const { id } = req.params;

//       // Find the offer by ID and populate related fields
//       const offer = await Offer.findById(id)
//         .populate({ path: "categories" })
//         .populate({ path: "customizations" })
//         .lean();

//       if (!offer) {
//         return res
//           .status(404)
//           .json({ message: messages.OFFER_NOT_FOUND_OR_INACTIVE });
//       }

//       // Return success response
//       res.status(200).json(offer);
//     } catch (error) {
//       handleError(`/offer/get/${req.params.id}`, "GET", error, req, res);
//     }
//   }
// );

// // @route   GET /offers
// // @desc    Get all active offers
// // @access  PUBLIC
// router.get("/offers", async (req, res) => {
//   try {
//     // Fetch all offers and populate related fields
//     const offers = await Offer.find({ isActive: true })
//       .populate({ path: "categories" })
//       .populate({ path: "customizations" })
//       .lean();

//     // Return success response
//     res.status(200).json(offers);
//   } catch (error) {
//     handleError("/admin/offers", "GET", error, req, res);
//   }
// });

// @route   GET /offers
// @desc    Get all offers
// @access  PUBLIC
router.get(
  "/offers",
  [
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("startDate").optional().isISO8601(), // Validate startDate (optional)
    query("endDate").optional().isISO8601(), // Validate endDate (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Get all active offers
      filter.isActive = true;

      // Filter by date range
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      } else if (startDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
        };
      } else if (endDate) {
        filter.createdAt = {
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { name: { $regex: searchRegex } }, // Search by name
          { description: { $regex: searchRegex } }, // Search by description
        ];
      }

      // Fetch offers with pagination, sorting, and population
      const offers = await Offer.find(filter)
        .populate({ path: "categories" }) // Populate categories
        .populate({ path: "customizations" }) // Populate customizations
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!offers || offers.length === 0) {
        return res
          .status(404)
          .json({ message: messages.OFFER_NOT_FOUND_OR_INACTIVE });
      }

      // Get the total count of offers
      const totalCount = await Offer.countDocuments(filter);

      // Return success response with offers and pagination details
      res.status(200).json({
        success: true,
        data: offers,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/admin/offers", "GET", error, req, res);
    }
  }
);

module.exports = router;
