const express = require("express");
const axios = require("axios");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const { query } = require("express-validator");
const Customer = require("../models/Customer");
const Branch = require("../models/Branch");
const authMiddleware = require("../middleware/auth");
const {
  OrderStatusses,
  DeliveryTypes,
  RecipientTypes,
  NotificationTypes,
  PaymentTypes,
} = require("../utils/enums");
const { orderValidation } = require("../utils/validation");
const {
  validateRequest,
  isWithinDeliveryRadius,
  stripUnwantedFields,
  handleError,
  validatePickupTime,
  encrypt,
  decrypt,
} = require("../utils/helpers");
const messages = require("../utils/messages");

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL;
const ADCB_MERCHANT_ID = process.env.ADCB_MERCHANT_ID;
const ADCB_API_KEY = process.env.ADCB_API_KEY;
const ADCB_PAYMENT_GATEWAY_URL = process.env.ADCB_PAYMENT_GATEWAY_URL;
const ADCB_RETURN_URL = process.env.ADCB_RETURN_URL;

// Reward points configuration
const REWARD_POINTS_PER_AED = 1; // 1 point for every AED spent
const REWARD_POINTS_EXPIRY_DAYS = 365; // Points expire after 1 year

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
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Order.schema);

      // Ensure the customer is updating their own order
      if (filteredBody.customerId !== req.user.id) {
        return res.status(403).json({ message: messages.UNAUTHORIZED_ACCESS });
      }

      // Find the customer's cart
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

      // Validate pickup time for PICKUP orders
      if (filteredBody.deliveryType === DeliveryTypes.PICKUP) {
        const { pickupDay, pickupTime } = filteredBody;

        // Validate pickup time against branch opening timings
        validatePickupTime(branch, pickupDay, pickupTime);
      }

      // Create the order
      const newOrder = new Order({
        customerId: filteredBody.customerId,
        branchId: filteredBody.branchId,
        items: cart.items,
        offers: cart.offers,
        tax: cart.tax,
        deliveryCharges: cart.deliveryCharges,
        totalAmount: cart.totalAmount,
        status: OrderStatusses.PENDING_PAYMENT, // Default status for credit card payments
        paymentMethod: filteredBody.paymentMethod,
        deliveryType: filteredBody.deliveryType,
        deliveryAddress:
          filteredBody.deliveryType === DeliveryTypes.DELIVERY
            ? filteredBody.deliveryAddress
            : null,
        pickupDay:
          filteredBody.deliveryType === DeliveryTypes.PICKUP
            ? filteredBody.pickupDay
            : null,
        pickupTime:
          filteredBody.deliveryType === DeliveryTypes.PICKUP
            ? filteredBody.pickupTime
            : null,
        phoneNumber: customer.phoneNumber,
        instructions: filteredBody.instructions,
        statusHistory: [
          {
            status: OrderStatusses.PENDING_PAYMENT,
            timestamp: new Date(),
          },
        ],
        orderPlacedAt: new Date(),
      });

      // Save the order (temporarily)
      await newOrder.save();

      // If payment method is Credit Card, redirect to ADCB payment page
      if (filteredBody.paymentMethod === PaymentTypes.CREDIT_CARD) {
        // Find the customer
        const customer = await Customer.findById(filteredBody.customerId);

        // Check if the customer has a saved card
        const savedCard = customer.paymentMethods.find(
          (method) =>
            method.paymentType === PaymentTypes.CREDIT_CARD &&
            method.saveForFuture
        );

        // Prepare payment data
        const paymentData = {
          merchantId: ADCB_MERCHANT_ID,
          apiKey: ADCB_API_KEY,
          amount: cart.totalAmount,
          orderId: newOrder._id.toString(),
          returnUrl: ADCB_RETURN_URL,
          customerEmail: req.user.email, // Assuming email is available in the user object
        };

        // Add stored card token if available
        if (savedCard && savedCard.storedCardToken) {
          // Decrypt the stored card token
          const decryptedToken = decrypt(savedCard.storedCardToken);
          paymentData.storedCardToken = decryptedToken;
        }

        // Redirect to ADCB payment page
        const paymentUrl = `${ADCB_PAYMENT_GATEWAY_URL}/payment?${new URLSearchParams(
          paymentData
        ).toString()}`;
        return res.status(200).json({
          message: messages.REDIRECT_TO_PAYMENT,
          paymentUrl,
        });
      }

      // For other payment methods (e.g., Cash), complete the order
      newOrder.status = OrderStatusses.PREPARING;
      await newOrder.save();

      // Delete the cart after successful order creation
      await Cart.deleteMany({ customerId: filteredBody.customerId });

      // Add reward points to the customer
      const customer = await Customer.findById(filteredBody.customerId);
      const pointsEarned = Math.floor(cart.totalAmount * REWARD_POINTS_PER_AED);
      customer.rewardPoints += pointsEarned;

      // Set reward points expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + REWARD_POINTS_EXPIRY_DAYS);
      customer.rewardPointsExpiry = expiryDate;

      await customer.save();

      const token = req.headers.authorization?.split(" ")[1]; // Extract the token

      // Send notification to the customer
      await axios.post(
        `${BACKEND_URL}/api/admin/notification/create`,
        {
          recipientId: filteredBody.customerId,
          recipientType: RecipientTypes.CUSTOMER,
          message: messages.NOTIFICATION_CUSTOMER_ORDER_CREATED.message(
            newOrder._id
          ),
          type: NotificationTypes.NEW_ORDER,
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
          recipientType: RecipientTypes.BRANCH,
          message: messages.NOTIFICATION_BRANCH_NEW_ORDER.message(newOrder._id),
          type: NotificationTypes.ORDER_UPDATE,
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
        pointsEarned,
        totalRewardPoints: customer.rewardPoints,
      });
    } catch (error) {
      handleError("/order/create", "POST", error, req, res);
    }
  }
);

// @route   POST /payment/callback
// @desc    Handle payment callback from ADCB
// @access  PUBLIC
router.post("/order/payment/callback", async (req, res) => {
  try {
    const { orderId, status, paymentToken, saveForFuture } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: messages.ORDER_NOT_FOUND });
    }

    // Check payment status
    if (status === "SUCCESS") {
      // Update order status
      order.status = OrderStatusses.PREPARING;
      await order.save();

      // Save the payment token for future purchases if requested
      if (saveForFuture) {
        const customer = await Customer.findById(order.customerId);
        const existingPaymentMethod = customer.paymentMethods.find(
          (method) =>
            method.paymentType === PaymentTypes.CREDIT_CARD &&
            method.saveForFuture
        );

        if (existingPaymentMethod) {
          // Update existing saved card
          existingPaymentMethod.storedCardToken = encrypt(paymentToken); // Encrypt the token
        } else {
          // Add new saved card
          customer.paymentMethods.push({
            paymentType: PaymentTypes.CREDIT_CARD,
            storedCardToken: encrypt(paymentToken), // Encrypt the token
            saveForFuture: true,
          });
        }

        await customer.save();
      }

      // Delete the cart
      await Cart.deleteMany({ customerId: order.customerId });

      // Add reward points to the customer
      const customer = await Customer.findById(order.customerId);
      const pointsEarned = Math.floor(
        order.totalAmount * REWARD_POINTS_PER_AED
      );
      customer.rewardPoints += pointsEarned;

      // Set reward points expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + REWARD_POINTS_EXPIRY_DAYS);
      customer.rewardPointsExpiry = expiryDate;

      await customer.save();

      // Send notification to the customer
      const token = req.headers.authorization?.split(" ")[1]; // Extract the token
      await axios.post(
        `${BACKEND_URL}/api/admin/notification/create`,
        {
          recipientId: order.customerId,
          recipientType: RecipientTypes.CUSTOMER,
          message: messages.NOTIFICATION_CUSTOMER_ORDER_CREATED.message(
            order._id
          ),
          type: NotificationTypes.NEW_ORDER,
          relatedOrderId: order._id,
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
          recipientId: order.branchId,
          recipientType: RecipientTypes.BRANCH,
          message: messages.NOTIFICATION_BRANCH_NEW_ORDER.message(order._id),
          type: NotificationTypes.ORDER_UPDATE,
          relatedOrderId: order._id,
          branchId: order.branchId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Return success response
      return res.status(200).json({
        message: messages.PAYMENT_SUCCESS,
        order,
        pointsEarned,
        totalRewardPoints: customer.rewardPoints,
      });
    } else {
      // Payment failed
      order.status = OrderStatusses.PAYMENT_FAILED;
      await order.save();

      return res.status(400).json({
        message: messages.PAYMENT_FAILED,
      });
    }
  } catch (error) {
    handleError("/payment/callback", "POST", error, req, res);
  }
});

// @route   GET /order/track
// @desc    Track an order using phone number or order ID and send status via SMS and email
// @access  PUBLIC
router.get("/order/track", async (req, res) => {
  try {
    const { phoneNumber, orderId, email } = req.query;

    // Validate request: At least one of phoneNumber or orderId is required
    if (!phoneNumber && !orderId) {
      return res.status(400).json({
        message: messages.PHONE_NUMBER_OR_ORDER_ID_REQUIRED,
      });
    }

    let order;

    // Find order by phone number
    if (phoneNumber) {
      order = await Order.findOne({ phoneNumber }).sort({ orderPlacedAt: -1 }); // Get the latest order for the phone number
    }

    // Find order by order ID
    if (orderId) {
      order = await Order.findById(orderId);
    }

    // Check if order exists
    if (!order) {
      return res.status(404).json({
        message: messages.ORDER_NOT_FOUND,
      });
    }

    // Prepare response
    const response = {
      orderId: order._id,
      status: order.status,
      statusHistory: order.statusHistory,
      totalAmount: order.totalAmount,
      items: order.items,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      pickupDay: order.pickupDay,
      pickupTime: order.pickupTime,
      instructions: order.instructions,
      orderPlacedAt: order.orderPlacedAt,
    };

    // Send order status via SMS if phone number is valid
    if (phoneNumber && isValidPhoneNumber(phoneNumber)) {
      const smsMessage = `Your order status is: ${order.status}. Order ID: ${order._id}`;
      await sendSms(phoneNumber, smsMessage);
    }

    // Send order status via email if email is valid
    if (email && isValidEmail(email)) {
      const emailSubject = `Order Status Update - Order ID: ${order._id}`;
      const emailContent = `
        <h1>Order Status Update</h1>
        <p>Your order status is: <strong>${order.status}</strong>.</p>
        <p>Order ID: ${order._id}</p>
        <p>Thank you for shopping with us!</p>
      `;
      await sendEmail(email, emailSubject, emailContent);
    }

    // Return order details
    res.status(200).json({
      message: messages.ORDER_FETCHED_SUCCESS,
      order: response,
    });
  } catch (error) {
    handleError("/order/track", "GET", error, req, res);
  }
});

// @route   GET /order/customer
// @desc    Get all orders for a customer (with pagination, sorting, and filtering)
// @access  PRIVATE (Customer Only)
router.get(
  "/order/customer",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        page = 1,
        limit = 10,
        sortBy = "orderPlacedAt",
        order = "desc",
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = { customerId: req.user.id };

      // Find all orders for the customer with pagination, sorting, and filtering
      const orders = await Order.find(filter)
        .populate("branch", "name") // Populate branch details
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Get the total count of orders for the customer
      const totalCount = await Order.countDocuments(filter);

      // Return success response with the orders and pagination details
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
      handleError("/order/customer", "GET", error, req, res);
    }
  }
);

module.exports = router;
