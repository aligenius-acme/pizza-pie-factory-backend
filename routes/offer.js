const express = require("express");
const { param } = require("express-validator");
const Offer = require("../models/Offer");
const FoodItem = require("../models/FoodItem");
const Customization = require("../models/FoodItem");
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
        return res.status(404).json({ message: messages.OFFER_NOT_FOUND });
      }

      // Step 2: Initialize the response object
      const response = {
        id: offer._id,
        offerName: offer.name,
        steps: [],
      };

      // Step 3: Process each category as a step
      for (const category of offer.categories) {
        const step = {
          categoryId: category._id,
          categoryName: category.name,
          foodItems: [],
        };

        // Step 4: Retrieve all food items for the current category
        const foodItems = await FoodItem.find({
          categories: category._id,
        }).populate("customizations");

        // Step 5: Process each food item and its customizations
        for (const foodItem of foodItems) {
          const foodItemWithCustomizations = {
            foodItemId: foodItem._id,
            foodItemName: foodItem.name,
            customizations: [],
          };

          // Step 6: Retrieve customizations linked to the offer
          if (foodItem.customizations && foodItem.customizations.length > 0) {
            for (const customization of foodItem.customizations) {
              // Check if the customization is linked to the offer
              if (
                customization &&
                offer.customizations.some(
                  (offerCustomization) =>
                    offerCustomization.toString() ===
                    customization._id.toString()
                )
              ) {
                foodItemWithCustomizations.customizations.push(customization);
              }
            }
          }

          step.foodItems.push(foodItemWithCustomizations);
        }

        response.steps.push(step);
      }

      // Step 7: Send the response
      res.status(200).json(response);
    } catch (error) {
      handleError(`/offer/details/${req.params.id}`, "GET", error, req, res);
    }
  }
);

// @route   GET /offer/get/:id
// @desc    Get offer by ID
// @access  PRIVATE
router.get(
  "/offer/get/:id",
  [param("id").isMongoId().withMessage(messages.INVALID_OFFER_ID)],
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the offer by ID and populate related fields
      const offer = await Offer.findById(id)
        .populate({ path: "categories" })
        .populate({ path: "customizations" })
        .lean();

      if (!offer) {
        return res.status(404).json({ message: messages.OFFER_NOT_FOUND });
      }

      // Return success response
      res.status(200).json(offer);
    } catch (error) {
      handleError(`/offer/get/${req.params.id}`, "GET", error, req, res);
    }
  }
);

// @route   GET /offers
// @desc    Get all active offers
// @access  PUBLIC
router.get("/offers", async (req, res) => {
  try {
    // Fetch all offers and populate related fields
    const offers = await Offer.find({ isActive: true })
      .populate({ path: "categories" })
      .populate({ path: "customizations" })
      .lean();

    // Return success response
    res.status(200).json(offers);
  } catch (error) {
    handleError("/admin/offers", "GET", error, req, res);
  }
});

module.exports = router;
