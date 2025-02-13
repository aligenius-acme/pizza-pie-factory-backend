const express = require("express");
const { param } = require("express-validator");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");
const { OrderStatusses } = require("../utils/enums");
const { orderValidation } = require("../utils/validation");
const { validateRequest } = require("../utils/helpers");

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL;

// POST /api/order/create
// Access: PRIVATE
router.post(
  "/order/create",
  authMiddleware.authenticateJWT,
  [...orderValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = [
        "customerId",
        "branchId",
        "items",
        "orderType",
        "deliveryAddress",
        "status",
        "paymentMethod",
        "totalAmount",
        "discount",
        "instructions",
        "orderPlacedAt",
        "completedAt",
        "orderDeliveredAt",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const order = new Order(filteredBody);
      await order.save();

      await Cart.deleteMany({ customerId: req.body.customerId });

      await axios.post(`${BACKEND_URL}/api/notifications/send`, {
        userId: req.body.customerId,
        title: order.status,
        message: `Your order #${order._id} has been successfully created.`,
      });

      await axios.post(`${BACKEND_URL}/api/notifications/send`, {
        userId: req.body.branchId,
        title: OrderStatusses.NEW_ORDER,
        message: `A new order #${order._id} has been placed.`,
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
