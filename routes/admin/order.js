const express = require("express");
const { param, query } = require("express-validator");
const authMiddleware = require("../../middleware/auth");
const {
  validateRequest,
  handleError,
  validateEmployeeBranchAssociation,
} = require("../../utils/helpers");
const { OrderStatusses } = require("../../utils/enums");
const messages = require("../../utils/messages");
const Order = require("../../models/Order");
const Customer = require("../../models/Customer");
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
    query("orderId").optional().isMongoId().withMessage(messages.INVALID_ID),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("sortBy").optional().isString(),
    query("order").optional().isIn(["asc", "desc"]),
    query("status").optional().isString(),
    query("orderPlacedAt").optional().isISO8601().toDate(),
  ],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;
      const {
        customerId,
        orderId,
        page = 1,
        limit = 10,
        sortBy = "orderPlacedAt",
        order = "desc",
        status,
        orderPlacedAt,
      } = req.query;

      // Custom validation: If orderId is provided, customerId is mandatory
      if (orderId && !customerId) {
        return res.status(400).json({
          message: ORDER_INVALID_REQUEST,
        });
      }

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Validate that the employee is associated with the specified branch
      const validationResult = await validateEmployeeBranchAssociation(
        req.user.id, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResult.isValid) {
        return res
          .status(validationResult.message === messages.FORBIDDEN ? 403 : 404)
          .json({ message: validationResult.message });
      }

      // Build filter object
      const filter = { branchId };
      if (customerId) {
        filter.customerId = customerId; // Add customer ID to filter if provided
      }
      if (orderId) {
        filter._id = orderId; // Add order ID to filter if provided
      }
      if (status) {
        filter.status = status; // Add status to filter if provided
      }

      // Add date filtering
      if (orderPlacedAt) {
        const startOfDay = new Date(orderPlacedAt);
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00.000)

        const endOfDay = new Date(orderPlacedAt);
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59.999)

        filter.orderPlacedAt = { $gte: startOfDay, $lte: endOfDay }; // Filter by orderPlacedAt date
      }

      // Fetch orders or a single order based on whether orderId is provided
      let query = Order.find(filter);

      // Conditionally apply .select() if orderId is not provided
      if (!orderId) {
        query = query.select("_id totalAmount status orderPlacedAt");
      }

      // Apply populate only if orderId is provided or customerId is not provided
      if (orderId || !customerId) {
        query = query.populate({
          path: "customerId",
          select: "firstName lastName email phone",
        });
      }

      // Populate deliveryDriver details if orderId is provided
      if (orderId) {
        query = query.populate({
          path: "deliveryDriverId", // Ensure this matches the field name in the schema
          select: "firstName lastName email phone",
        });
      }

      // Populate foodItemId for each item in the items array
      query = query.populate({
        path: "items.foodItem", // Nested path for foodItem
        select: "name description imageUrl", // Include the required fields
      });

      // Apply sorting, pagination, and limit only if orderId is not provided
      if (!orderId) {
        query = query
          .sort({ [sortBy]: sortOrder }) // Sort by the specified field
          .skip((pageNumber - 1) * pageSize) // Skip records for pagination
          .limit(pageSize); // Limit the number of records per page
      }

      const orders = await query.lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Rename `customerId` to `customer` and `deliveryDriverId` to `deliveryDriver` in the response
      const renameFields = (order) => {
        if (order.customerId) {
          order.customer = order.customerId;
          delete order.customerId;
        }
        if (order.deliveryDriverId) {
          order.deliveryDriver = order.deliveryDriverId;
          delete order.deliveryDriverId;
        }
        return order;
      };

      // If orderId is provided, return the single order with customer and deliveryDriver details
      if (orderId) {
        const orderWithDetails = renameFields(orders[0]);
        return res.status(200).json({
          success: true,
          data: orderWithDetails,
        });
      }

      // If customerId is provided but not orderId, fetch customer details separately
      let customerDetails = null;
      if (customerId && !orderId) {
        const customer = await Customer.findById(customerId).select(
          "firstName lastName email phone"
        );
        if (customer) {
          customerDetails = customer;
        }
      }

      // Rename `customerId` to `customer` for all orders
      const ordersWithRenamedFields = orders.map(renameFields);

      // Get total count of orders for the branch based on the applied filters
      const totalCount = await Order.countDocuments(filter); // Use the same filter object

      // Return success response with pagination details and customer details if applicable
      const response = {
        success: true,
        data: ordersWithRenamedFields,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      };

      if (customerDetails) {
        response.customer = customerDetails;
      }

      res.status(200).json(response);
    } catch (error) {
      handleError("/admin/order/branch/:branchId", "GET", error, req, res);
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

      // Validate that the employee is associated with the specified branch
      const validationResult = await validateEmployeeBranchAssociation(
        req.user.id, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResult.isValid) {
        return res
          .status(validationResult.message === messages.FORBIDDEN ? 403 : 404)
          .json({ message: validationResult.message });
      }

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

// @route   PATCH /admin/order/branch/status/:id
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
      const { status, deliveryDriverId } = req.body;

      // Validate that the employee is associated with the specified branch
      const validationResult = await validateEmployeeBranchAssociation(
        req.user.id, // Authenticated employee ID
        req.branchId // Branch ID from request params
      );

      if (!validationResult.isValid) {
        return res
          .status(validationResult.message === messages.FORBIDDEN ? 403 : 404)
          .json({ message: validationResult.message });
      }

      // Validate that deliveryDriverId is provided if status is OUT_FOR_DELIVERY
      if (status === OrderStatusses.OUT_FOR_DELIVERY && !deliveryDriverId) {
        return res.status(400).json({
          message: messages.DELIVERY_DRIVER_REQUIRED,
        });
      }

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

      // Associate delivery driver if availeble
      if (deliveryDriverId) {
        updateData.deliveryDriverId = deliveryDriverId;
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
