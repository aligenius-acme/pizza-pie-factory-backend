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
        "totalAmount",
        "status",
        "paymentMethod",
        "deliveryType",
        "promoCode",
        "discount",
        "deliveryAddress",
        "instructions",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const newOrder = new Order({
        customerId: filteredBody.customerId,
        branchId: filteredBody.branchId,
        items: cart.items,
        offers: cart.offers,
        totalAmount,
        status: filteredBody.status,
        paymentMethod: filteredBody.paymentMethod,
        promoCode: filteredBody.promoCode,
        discount: filteredBody.discount,
        deliveryType: filteredBody.deliveryType,
        deliveryAddress:
          deliveryType === DeliveryTypes.DELIVERY
            ? filteredBody.deliveryAddress
            : null,
        instructions: filteredBody.instructions,
        statusHistory: [{ status: filteredBody.status, timestamp: new Date() }],
        orderPlacedAt: new Date(),
      });

      await newOrder.save();

      await Cart.deleteMany({ customerId: filteredBody.customerId });

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
