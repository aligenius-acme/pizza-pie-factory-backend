const express = require("express");
const { param } = require("express-validator");
const Cart = require("../../models/Cart");
const Offer = require("../../models/Offer");
const FoodItem = require("../../models/FoodItem");
const authMiddleware = require("../../middleware/auth");
const { cartValidation } = require("../../utils/validation");
const { validateRequest } = require("../../utils/helpers");
const messages = require("../../utils/messages"); // Import messages

const router = express.Router();

// @route   POST /cart/create
// @desc    Create a new cart for the authenticated customer
// @access  PRIVATE (Customer Only)
router.post(
  "/cart/create",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [...cartValidation()], // Apply cart validation rules
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { items, offers } = req.body;
      const customerId = req.user.id; // Get customer ID from authenticated user

      let totalAmount = 0;
      let appliedOffers = [];
      let updatedItems = [];
      let offerItems = new Set();

      // Process each item in the cart
      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItem);
        if (!foodItem) {
          return res.status(400).json({ message: messages.INVALID_FOOD_ITEM });
        }

        // Calculate item total price
        let itemTotal = foodItem.price * item.quantity;
        let additionalPrice = 0;

        // Add customization prices
        if (item.customizations) {
          for (const cust of item.customizations) {
            additionalPrice +=
              cust.selectedOption.additionalPrice * item.quantity;
            for (const subOpt of cust.selectedSubOptions) {
              additionalPrice += subOpt.additionalPrice * item.quantity;
            }
          }
        }

        itemTotal += additionalPrice;

        // Add item to updatedItems array
        updatedItems.push({
          ...item,
          itemPrice: foodItem.price,
          additionalPrice,
          totalPrice: itemTotal,
        });
      }

      // Process offers
      let offerPriceTotal = 0;
      let additionalOfferPrice = 0;
      for (const offerId of offers) {
        const offer = await Offer.findById(offerId).populate("customizations");
        if (!offer) continue;

        // Check if all required customizations are present in the cart
        const offerCustomizationIds = offer.customizations.map((c) =>
          c._id.toString()
        );
        const cartCustomizationIds = items.flatMap((item) =>
          item.customizations.map((c) => c.customization.toString())
        );

        const allItemsIncluded = offerCustomizationIds.every((id) =>
          cartCustomizationIds.includes(id)
        );

        if (allItemsIncluded) {
          // Apply offer
          appliedOffers.push({
            offerId: offerId,
            isOfferComplete: true,
          });
          offerPriceTotal += offer.offerPrice;

          // Track items included in the offer
          for (const item of items) {
            if (
              item.customizations.some((cust) =>
                offerCustomizationIds.includes(cust.customization.toString())
              )
            ) {
              offerItems.add(item.foodItem);
            }
          }

          // Adjust prices for items included in the offer
          for (const item of updatedItems) {
            if (offerItems.has(item.foodItem)) {
              additionalOfferPrice += item.additionalPrice;
              item.itemPrice = 0;
              item.totalPrice = 0;
              const offer = appliedOffers.find(
                (o) => offerItems.has(item.foodItem.toString()) && o.offerId
              );
              if (offer) {
                item.offer = { offerId: offer.offerId };
              }
            }
          }
        }
      }

      // Calculate total amount for non-offer items
      for (const item of updatedItems) {
        if (!offerItems.has(item.foodItem)) {
          totalAmount += item.totalPrice;
        }
      }

      // Add offer prices to the total amount
      totalAmount += offerPriceTotal + additionalOfferPrice;

      // Create and save the cart
      const cart = new Cart({
        customerId,
        items: updatedItems,
        offers: appliedOffers,
        totalAmount,
      });

      await cart.save();

      // Return success response
      res.status(201).json({
        message: messages.CART_CREATED_SUCCESS,
        cart,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: messages.INTERNAL_SERVER_ERROR });

      // Handle unexpected errors
      console.error("Cart registration error:", error);

      // Log error in MongoDB
      await logError(
        "/cart/create",
        "POST",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   PUT /cart/update/:id
// @desc    Update an existing cart for the authenticated customer
// @access  PRIVATE (Customer Only)
router.put(
  "/cart/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    param("id").isMongoId().withMessage(messages.INVALID_CART_ID), // Validate cart ID
    ...cartValidation(), // Apply cart validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const { items, offers } = req.body;
      const customerId = req.user.id; // Get customer ID from authenticated user

      // Find the cart
      let cart = await Cart.findOne({ _id: id, customerId });
      if (!cart) {
        return res.status(404).json({ message: messages.CART_NOT_FOUND });
      }

      let totalAmount = 0;
      let appliedOffers = [];
      let updatedItems = [...cart.items];
      let offerItems = new Set();

      // Update or add new items
      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItem);
        if (!foodItem) {
          return res.status(400).json({ message: messages.INVALID_FOOD_ITEM });
        }

        // Calculate item total price
        let itemTotal = foodItem.price * item.quantity;
        let additionalPrice = 0;

        // Add customization prices
        if (item.customizations) {
          for (const cust of item.customizations) {
            additionalPrice +=
              cust.selectedOption.additionalPrice * item.quantity;
            for (const subOpt of cust.selectedSubOptions) {
              additionalPrice += subOpt.additionalPrice * item.quantity;
            }
          }
        }

        itemTotal += additionalPrice;

        // Check if item already exists in the cart
        const existingItemIndex = updatedItems.findIndex(
          (cartItem) =>
            cartItem.foodItem.toString() === item.foodItem.toString()
        );

        if (existingItemIndex !== -1) {
          // Update existing item
          updatedItems[existingItemIndex].quantity = item.quantity;
          updatedItems[existingItemIndex].totalPrice = itemTotal;
          updatedItems[existingItemIndex].additionalPrice = additionalPrice;
        } else {
          // Add new item
          updatedItems.push({
            ...item,
            itemPrice: foodItem.price,
            additionalPrice,
            totalPrice: itemTotal,
          });
        }
      }

      // Process offers
      let offerPriceTotal = 0;
      let additionalOfferPrice = 0;
      for (const offerId of offers) {
        const offer = await Offer.findById(offerId).populate("customizations");
        if (!offer) continue;

        // Check if all required customizations are present in the cart
        const offerCustomizationIds = offer.customizations.map((c) =>
          c._id.toString()
        );
        const cartCustomizationIds = updatedItems.flatMap((item) =>
          item.customizations.map((c) => c.customization.toString())
        );

        const allItemsIncluded = offerCustomizationIds.every((id) =>
          cartCustomizationIds.includes(id)
        );

        if (allItemsIncluded) {
          // Apply offer
          appliedOffers.push({
            offerId: offerId,
            isOfferComplete: true,
          });
          offerPriceTotal += offer.offerPrice;

          // Track items included in the offer
          for (const item of updatedItems) {
            if (
              item.customizations.some((cust) =>
                offerCustomizationIds.includes(cust.customization.toString())
              )
            ) {
              offerItems.add(item.foodItem);
            }
          }

          // Adjust prices for items included in the offer
          for (const item of updatedItems) {
            if (offerItems.has(item.foodItem)) {
              additionalOfferPrice += item.additionalPrice;
              item.itemPrice = 0;
              item.totalPrice = 0;
              const offer = appliedOffers.find(
                (o) => offerItems.has(item.foodItem.toString()) && o.offerId
              );
              if (offer) {
                item.offer = { offerId: offer.offerId };
              }
            }
          }
        }
      }

      // Calculate total amount for non-offer items
      for (const item of updatedItems) {
        if (!offerItems.has(item.foodItem)) {
          totalAmount += item.totalPrice;
        }
      }

      // Add offer prices to the total amount
      totalAmount += offerPriceTotal + additionalOfferPrice;

      // Update cart fields
      cart.items = updatedItems;
      cart.offers = appliedOffers;
      cart.totalAmount = totalAmount;

      await cart.save();

      // Return success response
      res.status(200).json({
        message: messages.CART_UPDATED_SUCCESS,
        cart,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Cart update error:", error);

      // Log error in MongoDB
      await logError(
        `/cart/update/${param("id").isMongoId()}`,
        "PUT",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

module.exports = router;
