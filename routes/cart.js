const express = require("express");
const { param } = require("express-validator");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");
const { cartValidation } = require("../utils/validation");
const { validateRequest } = require("../utils/helpers");

const router = express.Router();

// POST /api/cart/create
// Access: PUBLIC
router.post(
  "/cart/create",
  authMiddleware.authenticateJWT,
  [...cartValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["customerId", "items", "offerId"];

      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let totalAmount = 0;

      const foodItems = await Promise.all(
        filteredBody.items.map(async (item) => {
          const foodItem = await FoodItem.findById(item.foodItemId).lean();
          if (!foodItem) {
            throw new Error(`Food item not found: ${item.foodItemId}`);
          }
          return { ...item, price: foodItem.price };
        })
      );

      totalAmount = foodItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );

      if (filteredBody.isFromOffer && filteredBody.offerId) {
        const offer = await Offer.findOne({
          _id: filteredBody.offerId,
          validFrom: { $lte: new Date() },
          validUntil: { $gte: new Date() },
          isActive: true,
        }).lean();

        if (!offer) {
          return res.status(400).json({ message: "Invalid or expired offer" });
        }

        if (offer.discountType === OfferDiscountTypes.PERCENTAGE) {
          totalAmount -= (totalAmount * offer.discountValue) / 100;
        } else if (offer.discountType === OfferDiscountTypes.FIXED_AMOUNT) {
          totalAmount -= offer.discountValue;
        }

        totalAmount = Math.max(0, totalAmount);
      }

      const cart = new Cart(filteredBody);
      cart.totalAmount = totalAmount;
      await cart.save();
      res.status(201).json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/cart/update/:id
// Access: PUBLIC
router.put(
  "/cart/update/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID"), ...cartValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const allowedFields = ["customerId", "items", "offerId"];

      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const cart = await Cart.findById(id);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      let totalAmount = 0;

      const foodItems = await Promise.all(
        filteredBody.items.map(async (item) => {
          const foodItem = await FoodItem.findById(item.foodItemId);
          if (!foodItem) {
            throw new Error(`Food item not found: ${item.foodItemId}`);
          }
          return { ...item, price: foodItem.price };
        })
      );

      totalAmount = foodItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );

      if (filteredBody.isFromOffer && filteredBody.offerId) {
        const offer = await Offer.findOne({
          _id: filteredBody.offerId,
          validFrom: { $lte: new Date() },
          validUntil: { $gte: new Date() },
          isActive: true,
        });

        if (!offer) {
          return res.status(400).json({ message: "Invalid or expired offer" });
        }

        if (offer.discountType === OfferDiscountTypes.PERCENTAGE) {
          totalAmount -= (totalAmount * offer.discountValue) / 100;
        } else if (offer.discountType === OfferDiscountTypes.FIXED_AMOUNT) {
          totalAmount -= offer.discountValue;
        }

        totalAmount = Math.max(0, totalAmount);
      }

      Object.assign(cart, filteredBody, { totalAmount });

      await cart.save();
      res.status(200).json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/cart/get/:id
// Access: PUBLIC
router.get(
  "/cart/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const cart = await Cart.findById(req.params.id).lean();

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.items.forEach((item) => {
        if (item.foodItemId && item.foodItemId.customizationOptions) {
          const baseOptions = item.foodItemId.customizationOptions || {};
          const cartOptions = item.customizationOptions || {};
          item.finalCustomizationOptions = { ...baseOptions, ...cartOptions };
        }
      });

      res.status(200).json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/cart/delete/:id
// Access: PUBLIC
router.delete(
  "/cart/delete/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const cart = await Cart.findByIdAndDelete(id).lean();
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.status(200).json({ message: "Cart deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
