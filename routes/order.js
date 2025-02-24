const express = require("express");
const axios = require("axios");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Branch = require("../models/Branch");
const authMiddleware = require("../middleware/auth");
const {
  OrderStatusses,
  DeliveryTypes,
  RecipientTypes,
  NotificationTypes,
} = require("../utils/enums");
const { orderValidation } = require("../utils/validation");
const { validateRequest, isWithinDeliveryRadius } = require("../utils/helpers");
const messages = require("../utils/messages"); // Import messages

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL;

// @route   POST /order/create
// @desc    Create an order from the cart and delete the cart
// @access  PRIVATE (Customer Only)
router.post(
  "/order/create",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [...orderValidation()], // Apply order validation rules
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const allowedFields = [
        "customerId",
        "branchId",
        "totalAmount",
        "paymentMethod",
        "deliveryType",
        "deliveryAddress",
        "instructions",
      ];

      // Filter request body to only include allowed fields
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      // Find the customer's cart
      if (filteredBody.customerId != req.user.id) {
        return res.status(404).json({ message: messages.UNAUTHORIZED_ACCESS });
      }
      const cart = await Cart.findOne({ customerId: filteredBody.customerId });
      if (!cart) {
        return res.status(404).json({ message: messages.CART_NOT_FOUND });
      }

      // Validate cart items
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({ message: messages.CART_EMPTY });
      }

      // Find the branch
      const branch = await Branch.findById(filteredBody.branchId);
      if (!branch) {
        return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
      }

      // Check if delivery is within the branch's radius
      if (
        filteredBody.deliveryType === DeliveryTypes.DELIVERY &&
        !isWithinDeliveryRadius(branch, filteredBody.deliveryAddress)
      ) {
        return res
          .status(400)
          .json({ message: messages.DELIVERY_NOT_AVAILABLE });
      }

      // Create the order
      const newOrder = new Order({
        customerId: filteredBody.customerId,
        branchId: filteredBody.branchId,
        items: cart.items,
        offers: cart.offers,
        totalAmount: cart.totalAmount,
        status: OrderStatusses.PREPARING, // Default status
        paymentMethod: filteredBody.paymentMethod,
        deliveryType: filteredBody.deliveryType,
        deliveryAddress:
          filteredBody.deliveryType === DeliveryTypes.DELIVERY
            ? filteredBody.deliveryAddress
            : null,
        instructions: filteredBody.instructions,
        statusHistory: [
          {
            status: OrderStatusses.PREPARING,
            timestamp: new Date(),
          },
        ],
        orderPlacedAt: new Date(),
      });

      // Save the order
      await newOrder.save();

      // Delete the cart after successful order creation
      await Cart.deleteMany({ customerId: filteredBody.customerId });

      const token = req.headers.authorization?.split(" ")[1]; // Extract the token

      // Send notification to the customer
      await axios.post(
        `${BACKEND_URL}/api/admin/notification/create`,
        {
          recipientId: filteredBody.customerId,
          recipientType: RecipientTypes.CUSTOMER, // Ensure this is correctly defined
          message: messages.NOTIFICATION_CUSTOMER_ORDER_CREATED.message(
            newOrder._id
          ),
          type: NotificationTypes.NEW_ORDER, // Ensure this is correctly defined
          relatedOrderId: newOrder._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Send notification to the branch
      await axios.post(
        `${BACKEND_URL}/api/admin/notification/create`,
        {
          recipientId: filteredBody.branchId,
          recipientType: RecipientTypes.BRANCH, // Ensure this is correctly defined
          message: messages.NOTIFICATION_BRANCH_NEW_ORDER.message(newOrder._id),
          type: NotificationTypes.ORDER_UPDATE, // Ensure this is correctly defined
          relatedOrderId: newOrder._id,
          branchId: filteredBody.branchId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Return success response
      res.status(201).json({
        message: messages.ORDER_CREATED_SUCCESS,
        order: newOrder,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Order creation error:", error);

      // Log error in MongoDB
      await logError(
        "/order/create",
        "POST",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

module.exports = router;
