const express = require("express");
const { param, query } = require("express-validator");
const authMiddleware = require("../../middleware/auth");
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
} = require("../../utils/helpers");
const { OrderStatusses } = require("../../utils/enums");
const messages = require("../../utils/messages");
const Order = require("../../models/Order");
const axios = require("axios");

const router = express.Router();

// @route   GET /admin/order/branch/:branchId
// @desc    Get all orders for a specific branch (with pagination and sorting)
// @access  PRIVATE
router.get(
  "/admin/order/branch/:branchId",
  authMiddleware.authenticateJWT,
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID),
    query("customerId").optional().isMongoId().withMessage(messages.INVALID_ID),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("sortBy").optional().isString(),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;
      const {
        customerId,
        page = 1,
        limit = 10,
        sortBy = "orderPlacedAt",
        order = "desc",
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      const filter = { branchId };
      if (customerId) {
        filter.customerId = customerId; // Add customer ID to filter if provided
      }

      // Fetch orders with pagination and sorting
      const orders = await Order.find(filter)
        .populate({ path: "customerId", select: "firstName lastName email" }) // Populate customer details
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Get total count of orders for the branch
      const totalCount = await Order.countDocuments({ branchId });

      // Return success response with pagination details
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
      handleError("/admin/order/branch/:branchId", "GET", error, req, res);
    }
  }
);

// @route   GET /admin/order/branch/:branchId/status/:status
// @desc    Get orders by status for a specific branch (with pagination)
// @access  PRIVATE
router.get(
  "/admin/order/branch/:branchId/status/:status",
  authMiddleware.authenticateJWT,
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID),
    param("status")
      .isIn(Object.values(OrderStatusses))
      .withMessage(messages.INVALID_STATUS),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("sortBy").optional().isString(),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId, status } = req.params;
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
      const filter = { branchId, status };

      // Fetch orders with pagination and sorting
      const orders = await Order.find(filter)
        .populate({ path: "customerId", select: "firstName lastName email" }) // Populate customer details
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Get total count of orders for the branch and status
      const totalCount = await Order.countDocuments(filter);

      // Return success response with pagination details
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
      handleError(
        `/admin/order/branch/${req.params.branchId}/status/${req.params.status}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/order/branch/recent/:branchId
// @desc    Get 10 most recent orders for a specific branch
// @access  PRIVATE
router.get(
  "/admin/order/branch/recent/:branchId",
  authMiddleware.authenticateJWT,
  [param("branchId").isMongoId().withMessage(messages.INVALID_ID)],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;

      // Fetch 10 most recent orders
      const orders = await Order.find({ branchId })
        .populate({ path: "customerId", select: "firstName lastName email" }) // Populate customer details
        .sort({ orderPlacedAt: -1 })
        .limit(10)
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Return success response
      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      handleError(
        `/admin/order/branch/recent/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /order/customer
// @desc    Get all orders for a customer (with pagination, sorting, and filtering)
// @access  PRIVATE (Customer Only)
router.get(
  "/admin/order/branch/customer",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("customerId").optional().isMongoId(), // Validate customerId (optional)
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
        customerId,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // If customerId is provided, use it; otherwise, use the authenticated user's ID
      if (customerId) {
        filter.customerId = customerId;
      } else {
        filter.customerId = req.user.id;
      }

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
      handleError("/admin/order/branch/customer", "GET", error, req, res);
    }
  }
);

// @route   PATCH /admin/order/status/:id
// @desc    Update existing order status
// @access  PRIVATE
router.patch(
  "/admin/order/status/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage(messages.INVALID_ORDER_ID)],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;
      const { status } = req.body;

      // Prepare update data
      const updateData = { status };
      updateData.statusHistory = [{ status, timestamp: new Date() }];

      // Update timestamps based on status
      if (status === OrderStatusses.DELIVERED) {
        updateData.orderDeliveredAt = new Date();
      }

      if (status === OrderStatusses.OUT_FOR_DELIVERY) {
        updateData.completedAt = new Date();
      }

      // Update the order
      const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      if (!updatedOrder) {
        return res.status(404).json({ message: messages.ORDER_NOT_FOUND });
      }

      const token = req.headers.authorization?.split(" ")[1];

      // Send notification to the customer
      await axios.post(
        `${BACKEND_URL}/api/admin/notification/create`,
        {
          recipientId: updatedOrder.customerId,
          recipientType: "CUSTOMER",
          message: `Your order #${updatedOrder._id} status has been updated to ${status}.`,
          type: "ORDER_STATUS_UPDATE",
          relatedOrderId: updatedOrder._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Return success response
      res.status(200).json({
        success: true,
        message: messages.ORDER_STATUS_UPDATED_SUCCESS,
        order: updatedOrder,
      });
    } catch (error) {
      handleError("/admin/order/status/:id", "PATCH", error, req, res);
    }
  }
);

module.exports = router;
