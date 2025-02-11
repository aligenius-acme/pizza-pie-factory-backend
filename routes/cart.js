const express = require("express");
const { param, validationResult } = require("express-validator");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");

const { cartValidation } = require("../utils/validation");

const router = express.Router();

// POST /api/cart/create
// Create a new cart
// Access: Authenticated / Guests users
router.post(
  "/cart/create",
  authMiddleware.authenticateJWT,
  ...cartValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { customerId, items, totalAmount } = req.body;

      const cart = new Cart({
        customerId,
        items,
        totalAmount,
      });

      await cart.save();
      res.status(201).json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/cart/update/:id
// Update an existing cart
// Access: Authenticated users / Guests users
router.put(
  "/cart/update/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID"), ...cartValidation()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { customerId, items, totalAmount } = req.body;

      const updatedCart = await Cart.findByIdAndUpdate(
        id,
        { customerId, items, totalAmount },
        { new: true }
      );

      if (!updatedCart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.json(updatedCart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/cart/get/:id
// Retrieve a cart by ID
// Access: Authenticated users / Guests users
router.get(
  "/cart/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const cart = await Cart.findById(req.params.id)
        .populate("customerId")
        .populate("items.foodItemId");

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.items.forEach((item) => {
        if (item.foodItemId) {
          const baseOptions = item.foodItemId.customizationOptions || {};
          const cartOptions = item.customizationOptions || {};
          item.finalCustomizationOptions = { ...baseOptions, ...cartOptions };
        }
      });

      res.json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/carts
// Retrieve all carts
// Access: Authenticated users / Guest users
router.get("/carts", authMiddleware.authenticateJWT, async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate("customerId")
      .populate("items.foodItemId");

    carts.forEach((cart) => {
      cart.items.forEach((item) => {
        if (item.foodItemId && item.foodItemId.customizationOptions) {
          const baseOptions = item.foodItemId.customizationOptions || {};
          const cartOptions = item.customizationOptions || {};
          item.finalCustomizationOptions = { ...baseOptions, ...cartOptions };
        }
      });
    });

    res.json(carts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cart/delete/:id
// Delete a cart
// Access: Authenticated users / Guest users
router.delete(
  "/cart/delete/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid cart ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const cart = await Cart.findByIdAndDelete(id);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.json({ message: "Cart deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
