const express = require("express");
const { param } = require("express-validator");
const Cart = require("../models/Cart");
const Offer = require("../models/Offer");
const Customization = require("../models/Customization");
const FoodItem = require("../models/FoodItem");
const { cartValidation } = require("../utils/validation");
const { validateRequest } = require("../utils/helpers");

const router = express.Router();

// POST /api/cart/create
// Access: PUBLIC
router.post("/cart/create", [...cartValidation()], async (req, res) => {
  try {
    if (validateRequest(req, res)) return;

    const { customerId, items, offers } = req.body;

    // Fetch and validate offers
    const validOffers = [];
    if (offers && offers.length > 0) {
      for (const offerId of offers) {
        const offer = await Offer.findById(offerId);
        if (offer && offer.isActive) {
          validOffers.push(offer);
        } else {
          return res
            .status(404)
            .json({ error: `Offer with ID ${offerId} not found or inactive` });
        }
      }
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res
          .status(404)
          .json({ error: `Food item with ID ${item.foodItem} not found` });
      }

      if (foodItem.price !== item.itemPrice) {
        return res.status(400).json({
          error: `Price mismatch for food item ${item.foodItem}. Expected: ${foodItem.price}, Received: ${item.itemPrice}`,
        });
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
          .find((option) =>
            option._id.equals(customization.selectedOption._id)
          );

        if (selectedOption) {
          if (
            selectedOption.additionalPrice !==
            customization.selectedOption.additionalPrice
          ) {
            return res.status(400).json({
              error: `Additional price mismatch for option ${customization.selectedOption._id}. Expected: ${selectedOption.additionalPrice}, Received: ${customization.selectedOption.additionalPrice}`,
            });
          }
          itemPrice += selectedOption.additionalPrice;

          for (const subOption of customization.selectedSubOptions) {
            const selectedSubOption = selectedOption.subOptions.find((sub) =>
              sub._id.equals(subOption._id)
            );
            if (selectedSubOption) {
              if (
                selectedSubOption.additionalPrice !== subOption.additionalPrice
              ) {
                return res.status(400).json({
                  error: `Sub-option price mismatch for sub-option ${subOption._id}. Expected: ${selectedSubOption.additionalPrice}, Received: ${subOption.additionalPrice}`,
                });
              }
              itemPrice += selectedSubOption.additionalPrice;
            }
          }
        }
      }

      const totalPrice = itemPrice * item.quantity;
      totalAmount += totalPrice;

      processedItems.push({
        foodItem: item.foodItem,
        quantity: item.quantity,
        customizations: item.customizations,
        itemPrice,
        totalPrice,
      });
    }

    for (const offer of validOffers) {
      totalAmount -= offer.offerPrice;
    }

    totalAmount = Math.max(totalAmount, 0);

    const cart = new Cart({
      customerId,
      items: processedItems,
      offers: validOffers.map((offer) => offer._id),
      totalAmount,
    });

    await cart.save();

    res.status(201).json({
      customerId,
      items: processedItems,
      offers: validOffers.map((offer) => offer._id),
      totalAmount,
    });
  } catch (error) {
    console.error("Error creating cart:", error);
    res.status(500).json({ error: "Failed to create cart" });
  }
});

// PUT /api/cart/update/:id
// Access: PUBLIC
router.put(
  "/cart/update/:id",
  [
    param("id").isMongoId().withMessage("Invalid branch ID"),
    ...cartValidation(),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const { customerId, items, offers } = req.body;

      const cart = await Cart.findById(id);
      if (!cart) {
        return res.status(404).json({ error: `Cart with ID ${id} not found` });
      }

      const validOffers = [];
      if (offers && offers.length > 0) {
        for (const offerId of offers) {
          const offer = await Offer.findById(offerId);
          if (offer && offer.isActive) {
            validOffers.push(offer);
          } else {
            return res.status(404).json({
              error: `Offer with ID ${offerId} not found or inactive`,
            });
          }
        }
      }

      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItem);
        if (!foodItem) {
          return res
            .status(404)
            .json({ error: `Food item with ID ${item.foodItem} not found` });
        }

        if (foodItem.price !== item.itemPrice) {
          return res.status(400).json({
            error: `Price mismatch for food item ${item.foodItem}. Expected: ${foodItem.price}, Received: ${item.itemPrice}`,
          });
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
            .find((option) =>
              option._id.equals(customization.selectedOption._id)
            );

          if (selectedOption) {
            if (
              selectedOption.additionalPrice !==
              customization.selectedOption.additionalPrice
            ) {
              return res.status(400).json({
                error: `Additional price mismatch for option ${customization.selectedOption._id}. Expected: ${selectedOption.additionalPrice}, Received: ${customization.selectedOption.additionalPrice}`,
              });
            }
            itemPrice += selectedOption.additionalPrice;

            for (const subOption of customization.selectedSubOptions) {
              const selectedSubOption = selectedOption.subOptions.find((sub) =>
                sub._id.equals(subOption._id)
              );
              if (selectedSubOption) {
                if (
                  selectedSubOption.additionalPrice !==
                  subOption.additionalPrice
                ) {
                  return res.status(400).json({
                    error: `Sub-option price mismatch for sub-option ${subOption._id}. Expected: ${selectedSubOption.additionalPrice}, Received: ${subOption.additionalPrice}`,
                  });
                }
                itemPrice += selectedSubOption.additionalPrice;
              }
            }
          }
        }

        const totalPrice = itemPrice * item.quantity;
        totalAmount += totalPrice;

        processedItems.push({
          foodItem: item.foodItem,
          quantity: item.quantity,
          customizations: item.customizations,
          itemPrice,
          totalPrice,
        });
      }

      for (const offer of validOffers) {
        totalAmount -= offer.offerPrice;
      }

      totalAmount = Math.max(totalAmount, 0);

      cart.customerId = customerId;
      cart.items = processedItems;
      cart.offers = validOffers.map((offer) => offer._id);
      cart.totalAmount = totalAmount;

      await cart.save();

      res.status(200).json({
        customerId,
        items: processedItems,
        offers: validOffers.map((offer) => offer._id),
        totalAmount,
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ error: "Failed to update cart" });
    }
  }
);

module.exports = router;
