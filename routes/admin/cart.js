const express = require("express");
const { param } = require("express-validator");
const Cart = require("../../models/Cart");
const authMiddleware = require("../../middleware/auth");
const { validateRequest } = require("../../utils/helpers");

const router = express.Router();

// GET /api/admin/carts
// Access: PRIVATE (Admin Only)
router.get(
  "/admin/carts",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        customer, // Optional filtering by customer ID
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      let filter = {};
      if (customer) {
        filter.customer = customer;
      }

      const carts = await Cart.find(filter)
        .populate({ path: "customer", select: "name" })
        .populate({ path: "foodItem", select: "name" })
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean();

      if (!carts.length) {
        return res.status(404).json({ message: "No cart(s) found" });
      }

      carts.forEach((cart) => {
        cart.items.forEach((item) => {
          if (item.foodItemId && item.foodItemId.customizationOptions) {
            const baseOptions = item.foodItemId.customizationOptions || {};
            const cartOptions = item.customizationOptions || {};
            item.finalCustomizationOptions = { ...baseOptions, ...cartOptions };
          }
        });
      });

      const totalCount = await Cart.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: carts,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/admin/cart/delete/:id
// Access: PRIVATE (Admin Only)
router.delete(
  "/cart/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
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
