const express = require("express");
const { param } = require("express-validator");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const authMiddleware = require("../../middleware/auth");
const { OrderStatusses } = require("../../utils/enums");
const { orderValidation } = require("../../utils/validation");
const { validateRequest } = require("../../utils/helpers");

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL;

// POST /api/order/create
// Access: PRIVATE (Admin Only)
router.post(
  "/admin/order/create",
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

// PUT /api/order/update/:id
// Access: PRIVATE (Admin Only)
router.put(
  "/admin/order/update/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    ...orderValidation(),
  ],
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

      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const { id } = req.params;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      Object.assign(order, filteredBody);
      await order.save();
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/order/status/:id
// Access: PRIVATE (Admin Only)
router.patch(
  "/admin/order/status/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status")
      .isIn(Object.values(OrderStatusses))
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

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
// Access: PRIVATE (Admin Only)
router.get(
  "/admin/order/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid order ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const order = await Order.findById(req.params.id)
        .populate({ path: "customer", select: "name" })
        // .populate("customerId")
        // .populate("items.foodItemId")
        .lean();

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
// Access: PRIVATE (Admin Only)
router.get(
  "/admin/orders",
  authMiddleware.authenticateJWT,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        customerId,
        status,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      let filter = {};
      if (customerId) filter.customerId = customerId;
      if (status) filter.status = status;

      const orders = await Order.find(filter)
        .populate({ path: "customerId", select: "name email" })
        .populate({ path: "items.foodItemId", select: "name price" })
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean();

      const totalCount = await Order.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: orders,
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

module.exports = router;
