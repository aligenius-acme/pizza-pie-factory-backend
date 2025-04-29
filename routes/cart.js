const express = require("express");
const { param } = require("express-validator");
const Cart = require("../models/Cart");
const Offer = require("../models/Offer");
const Customization = require("../models/Customization");
const FoodItem = require("../models/FoodItem");
const authMiddleware = require("../middleware/auth");
const { cartValidation } = require("../utils/validation");
const { validateRequest, handleError } = require("../utils/helpers");
const messages = require("../utils/messages"); // Import messages

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
      const { items, offers } = req.body;
      const customerId = req.user.id; // Get customer ID from authenticated user

      let totalAmount = 0;
      let appliedOffers = [];
      let updatedItems = [];
      let offerItems = new Set();

      // Process each item in the cart
      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItemId);
        if (!foodItem) {
          return res.status(400).json({ message: messages.INVALID_FOOD_ITEM });
        }

        // Fetch customizations from the database
        const customizations = await Customization.find({
          _id: { $in: item.customizations.map((c) => c.customization) },
          isActive: true,
        });

        // Calculate item total price using the price from the database
        let itemTotal = foodItem.price * item.quantity; // Use the price from the database
        let additionalPrice = 0;

        // Add customization prices from the database
        if (item.customizations) {
          for (const cust of item.customizations) {
            const customization = customizations.find(
              (c) => c._id.toString() === cust.customization.toString()
            );
            if (!customization) {
              return res
                .status(400)
                .json({ message: messages.INVALID_CUSTOMIZATION });
            }

            // Find the selected option in the customization
            const selectedOption = customization.customizations
              .flatMap((c) => c.options)
              .find(
                (opt) =>
                  opt._id.toString() === cust.selectedOption._id.toString()
              );

            console.log(selectedOption);
            if (selectedOption) {
              additionalPrice += selectedOption.additionalPrice * item.quantity;

              // Add sub-option prices if they exist
              if (cust.selectedSubOptions) {
                for (const subOptId of cust.selectedSubOptions) {
                  const selectedSubOption = selectedOption.subOptions.find(
                    (subOpt) =>
                      subOpt._id.toString() === subOptId._id.toString()
                  );
                  if (selectedSubOption) {
                    additionalPrice +=
                      selectedSubOption.additionalPrice * item.quantity;
                  }
                }
              }
            }
          }
        }

        itemTotal += additionalPrice;

        // Add item to updatedItems array
        updatedItems.push({
          ...item,
          itemPrice: foodItem.price, // Use the price from the database
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
              offerItems.add(item.foodItemId);
            }
          }

          // Adjust prices for items included in the offer
          for (const item of updatedItems) {
            if (offerItems.has(item.foodItemId)) {
              additionalOfferPrice += item.additionalPrice;
              item.itemPrice = 0;
              item.totalPrice = 0;
              const offer = appliedOffers.find(
                (o) => offerItems.has(item.foodItemId.toString()) && o.offerId
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
        if (!offerItems.has(item.foodItemId)) {
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
      handleError("/cart/create", "POST", error, req, res);
    }
  }
);

// @route   PUT /cart/update
// @desc    Update an existing cart for the authenticated customer
// @access  PRIVATE (Customer Only)
router.put(
  "/cart/update",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    ...cartValidation(), // Apply cart validation rules
  ],
  async (req, res) => {
    try {
      const { items, offers } = req.body;
      const customerId = req.user.id; // Get customer ID from authenticated user

      // Find the cart
      let cart = await Cart.findOne({ customerId });
      if (!cart) {
        return res.status(404).json({ message: messages.CART_NOT_FOUND });
      }

      // If no items are provided, delete the cart
      if (!items || items.length === 0) {
        await Cart.deleteOne({ customerId });
        return res.status(200).json({
          message: messages.CART_DELETED_SUCCESS,
          cart: null,
        });
      }

      let totalAmount = 0;
      let appliedOffers = [];
      let updatedItems = [];
      let offerItems = new Set();

      // Process each item in the cart
      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItemId);
        if (!foodItem) {
          return res.status(400).json({ message: messages.INVALID_FOOD_ITEM });
        }

        // Fetch customizations from the database
        const customizations = await Customization.find({
          _id: { $in: item.customizations.map((c) => c.customization) },
          isActive: true,
        });

        // Calculate item total price using the price from the database
        let itemTotal = foodItem.price * item.quantity; // Use the price from the database
        let additionalPrice = 0;

        // Add customization prices from the database
        if (item.customizations) {
          for (const cust of item.customizations) {
            const customization = customizations.find(
              (c) => c._id.toString() === cust.customization.toString()
            );
            if (!customization) {
              return res
                .status(400)
                .json({ message: messages.INVALID_CUSTOMIZATION });
            }

            // Find the selected option in the customization
            const selectedOption = customization.customizations
              .flatMap((c) => c.options)
              .find(
                (opt) =>
                  opt._id.toString() === cust.selectedOption._id.toString()
              );

            if (selectedOption) {
              additionalPrice += selectedOption.additionalPrice * item.quantity;

              // Add sub-option prices if they exist
              if (cust.selectedSubOptions) {
                for (const subOptId of cust.selectedSubOptions) {
                  const selectedSubOption = selectedOption.subOptions.find(
                    (subOpt) =>
                      subOpt._id.toString() === subOptId._id.toString()
                  );
                  if (selectedSubOption) {
                    additionalPrice +=
                      selectedSubOption.additionalPrice * item.quantity;
                  }
                }
              }
            }
          }
        }

        itemTotal += additionalPrice;

        // Add item to updatedItems array
        updatedItems.push({
          ...item,
          itemPrice: foodItem.price, // Use the price from the database
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
              offerItems.add(item.foodItemId);
            }
          }

          // Adjust prices for items included in the offer
          for (const item of updatedItems) {
            if (offerItems.has(item.foodItemId)) {
              additionalOfferPrice += item.additionalPrice;
              item.itemPrice = 0;
              item.totalPrice = 0;
              const offer = appliedOffers.find(
                (o) => offerItems.has(item.foodItemId.toString()) && o.offerId
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
        if (!offerItems.has(item.foodItemId)) {
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
      handleError("/cart/update", "PUT", error, req, res);
    }
  }
);

// @route   GET /cart/get
// @desc    Get cart details for the customer (Customer Only)
// @access  PRIVATE (Customer Only)
router.get(
  "/cart/get",
  authMiddleware.authenticateJWT, // Authenticate the user
  async (req, res) => {
    try {
      const customerId = req.user.id; // Extract the customer ID from the authenticated user

      // Find the cart by ID and ensure it belongs to the authenticated customer
      const cart = await Cart.findOne({ customerId });

      if (!cart) {
        return res.status(404).json({ message: messages.CART_NOT_FOUND });
      }

      // Return the cart details
      res.status(200).json(cart);
    } catch (error) {
      handleError("/cart/get", "GET", error, req, res);
    }
  }
);

module.exports = router;
