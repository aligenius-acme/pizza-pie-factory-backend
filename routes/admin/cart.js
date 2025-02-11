const express = require("express");
const { param, validationResult } = require("express-validator");
const Cart = require("../../models/Cart");
const authMiddleware = require("../../middleware/auth");

const { cartValidation } = require("../../utils/validation");

const router = express.Router();

// GET /api/carts
// Retrieve all carts
// Access: Site admin only
router.get(
  "/carts",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
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
  }
);

// DELETE /api/cart/delete/:id
// Delete a cart
// Access: Site admin only
router.delete(
  "/cart/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
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
