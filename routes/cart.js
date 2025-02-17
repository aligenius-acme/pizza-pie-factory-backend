const express = require("express");
const { param } = require("express-validator");
const Cart = require("../models/Cart");
const FoodItem = require("../models/FoodItem");
const authMiddleware = require("../middleware/auth");
const { cartValidation } = require("../utils/validation");
const { validateRequest } = require("../utils/helpers");

const router = express.Router();

// POST /api/cart/create
// Access: PUBLIC
router.post("/cart/create", async (req, res) => {
  try {
    if (validateRequest(req, res)) return;
    const { customerId, items, offerId } = req.body;
    let offer = null;
    if (offerId) {
      offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
    }

    let offerComplete = false;
    let offerItemIds = [];
    if (offer) {
      offerItemIds = offer.items.map((item) => item.toString());
      const cartItemIds = items.map((item) => item.foodItem.toString());
      offerComplete = offerItemIds.every((itemId) =>
        cartItemIds.includes(itemId)
      );
    }

    const cart = new Cart({
      customerId,
      items,
      totalAmount: 0, // Will be calculated later
    });

    let totalAmount = 0;
    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res
          .status(404)
          .json({ error: `Food item with ID ${item.foodItem} not found` });
      }

      let itemPrice = foodItem.price;

      for (const customization of item.customizations) {
        const selectedCustomization = await Customization.findById(
          customization.customization
        );
        if (!selectedCustomization) {
          return res.status(404).json({
            error: `Customization with ID ${customization.customization} not found`,
          });
        }

        const selectedOption = selectedCustomization.customizations
          .flatMap((c) => c.options)
          .find((option) => option.name === customization.selectedOption);

        if (selectedOption) {
          itemPrice += selectedOption.additionalPrice;

          const selectedSubOption = selectedOption.subOptions.find(
            (subOption) => subOption.name === customization.selectedSubOption
          );
          if (selectedSubOption) {
            itemPrice += selectedSubOption.additionalPrice;
          }
        }
      }

      const isOfferItem = offerItemIds.includes(item.foodItem.toString());

      if (offerComplete && isOfferItem) {
        totalAmount += offer.offerPrice;
      } else {
        totalAmount += itemPrice;
      }
    }
    cart.totalAmount = totalAmount;

    await cart.save();

    res.status(201).json(cart);
  } catch (error) {
    console.error("Error creating cart:", error);
    res.status(500).json({ error: "Failed to create cart" });
  }
});

// PUT /api/cart/update/:id
// Access: PUBLIC
router.put("/cart/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;
    const { items, offerId } = req.body;

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    let offer = null;
    if (offerId) {
      offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
    }

    let offerComplete = false;
    let offerItemIds = [];
    if (offer) {
      offerItemIds = offer.items.map((item) => item.toString());
      const cartItemIds = items.map((item) => item.foodItem.toString());
      offerComplete = offerItemIds.every((itemId) =>
        cartItemIds.includes(itemId)
      );
    }

    let totalAmount = 0;
    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res
          .status(404)
          .json({ error: `Food item with ID ${item.foodItem} not found` });
      }

      let itemPrice = foodItem.price;

      for (const customization of item.customizations) {
        const selectedCustomization = await Customization.findById(
          customization.customization
        );
        if (!selectedCustomization) {
          return res.status(404).json({
            error: `Customization with ID ${customization.customization} not found`,
          });
        }

        const selectedOption = selectedCustomization.customizations
          .flatMap((c) => c.options)
          .find((option) => option.name === customization.selectedOption);

        if (selectedOption) {
          itemPrice += selectedOption.additionalPrice;

          const selectedSubOption = selectedOption.subOptions.find(
            (subOption) => subOption.name === customization.selectedSubOption
          );
          if (selectedSubOption) {
            itemPrice += selectedSubOption.additionalPrice;
          }
        }
      }

      const isOfferItem = offerItemIds.includes(item.foodItem.toString());

      if (offerComplete && isOfferItem) {
        totalAmount += offer.offerPrice;
      } else {
        totalAmount += itemPrice;
      }
    }

    cart.items = items;
    cart.totalAmount = totalAmount;

    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart" });
  }
});

module.exports = router;
