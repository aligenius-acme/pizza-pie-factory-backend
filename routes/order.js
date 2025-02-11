const express = require("express");
const { param, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/auth");
const { OrderStatusses } = require("../utils/enums");

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL;

// POST /api/order/create
router.post(
  "/order/create",
  authMiddleware.authenticateJWT,
  ...orderValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = new Order(req.body);
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

// PUT /api/order/update/:id
router.put(
  "/order/update/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    ...orderValidation(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updatedOrder = await Order.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/order/status/:id
router.patch(
  "/order/status/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status")
      .isIn(Object.values(OrderStatusses))
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      await axios.post(`${BACKEND_URL}/api/notifications/send`, {
        userId: updatedOrder.customerId,
        title: status,
        message: `Your order #${updatedOrder._id} status has been updated to ${updatedOrder.status}.`,
      });

      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/order/get/:id
router.get(
  "/order/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid order ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = await Order.findById(req.params.id)
        .populate("customerId")
        .populate("items.foodItemId");

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/orders
router.get("/orders", authMiddleware.authenticateJWT, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId")
      .populate("items.foodItemId");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
