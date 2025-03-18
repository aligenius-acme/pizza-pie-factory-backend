const express = require("express");
const { param, query } = require("express-validator");
const Notification = require("../../models/Notification");
const Customer = require("../../models/Customer");
const authMiddleware = require("../../middleware/auth");
const { RecipientTypes, NotificationTypes } = require("../../utils/enums");
const { notificationValidation } = require("../../utils/validation");
const { sendEmail } = require("../../utils/email");
const { sendSms } = require("../../utils/sms");
const {
  stripUnwantedFields,
  validateRequest,
  handleError,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

const router = express.Router();

// @route   POST /admin/notification/create
// @desc    Create a new notification
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/notification/create",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [...notificationValidation()], // Apply notification validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Notification.schema);

      const {
        recipientId,
        recipientType,
        message,
        type,
        relatedOrderId,
        branchId,
      } = filteredBody;

      // Prepare notification data
      const notificationData = {
        recipientType,
        recipientId,
        branchId,
        message,
        type,
        relatedOrderId,
      };

      // Add branchId if recipientType is BRANCH
      if (recipientType === RecipientTypes.BRANCH) {
        notificationData.branchId = branchId;
      }

      // Create and save the notification
      const notification = new Notification(notificationData);
      await notification.save();

      // Get the Socket.IO instance
      const io = req.app.get("io");

      // Handle notifications based on recipient type
      if (recipientType === RecipientTypes.CUSTOMER) {
        const customer = await Customer.findById(recipientId).lean();
        if (!customer) {
          return res.status(400).json({ message: messages.CUSTOMER_NOT_FOUND });
        }

        // Send email and SMS for specific notification types
        if (
          type === NotificationTypes.ORDER_UPDATE ||
          type === NotificationTypes.PROMOTION
        ) {
          const customerEmail = customer.email;
          const customerPhone = customer.phone;

          await sendEmail(
            customerEmail,
            "New Notification",
            `<p>${message}</p>`
          );
          await sendSms(customerPhone, message);
        } else {
          // Emit Socket.IO event for real-time notifications
          io.to(recipientId.toString()).emit("newNotification", notification);
        }
      } else if (recipientType === RecipientTypes.EMPLOYEE) {
        // Emit Socket.IO event for employees
        if (branchId) {
          io.to(branchId.toString()).emit("newNotification", notification);
        } else {
          io.emit("newNotification", notification);
        }
      } else {
        // Emit Socket.IO event for other recipient types
        if (recipientId) {
          io.to(recipientId.toString()).emit("newNotification", notification);
        }
      }

      // Return success response
      res.status(201).json(notification);
    } catch (error) {
      handleError("/admin/notification/create", "POST", error, req, res);
    }
  }
);

// @route   GET /admin/notifications
// @desc    Retrieve all notifications with filtering and pagination
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/notifications/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    query("recipientId")
      .optional()
      .isMongoId()
      .withMessage(messages.INVALID_ID), // Validate recipient ID
    query("recipientType")
      .optional()
      .isIn([RecipientTypes.CUSTOMER, RecipientTypes.BRANCH])
      .withMessage(messages.INVALID_RECIPIENT_TYPE), // Validate recipient type
    query("notificationId")
      .optional()
      .isMongoId()
      .withMessage(messages.INVALID_ID), // Validate notification ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("read").optional().isBoolean(), // Validate read status (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        recipientId,
        branchId,
        recipientType,
        notificationId,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        read,
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Filter by branchId
      if (branchId) {
        filter.branchId = branchId;
      }

      // Filter by recipientType
      if (recipientType === RecipientTypes.BRANCH) {
        filter.recipientId = { $exists: false }; // Fetch notifications where recipientId is not available
      } else if (recipientType === RecipientTypes.CUSTOMER) {
        filter.recipientId = { $exists: true }; // Fetch notifications where recipientId is provided
      }

      // Filter by recipientId
      if (recipientId) {
        filter.recipientId = recipientId;
      }

      // Filter by notificationId
      if (notificationId) {
        filter._id = notificationId; // Fetch notification by its ID
      }

      // Filter by read status
      if (read !== undefined) {
        filter.read = read;
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { message: { $regex: searchRegex } }, // Search by message
        ];
      }

      // Find all notifications with filtering, sorting, and pagination
      const notifications = await Notification.find(filter)
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!notifications || notifications.length === 0) {
        return res
          .status(404)
          .json({ message: messages.NOTIFICATIONS_NOT_FOUND });
      }

      // Get the total count of notifications
      const totalCount = await Notification.countDocuments(filter);

      // Return success response with the notifications and pagination details
      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/admin/notifications", "GET", error, req, res);
    }
  }
);

// // @route   GET /admin/notification/get/:id
// // @desc    Retrieve a notification by ID
// // @access  PRIVATE (Admin Only)
// router.get(
//   "/admin/notification/get/:id",
//   authMiddleware.authenticateJWT, // Authenticate JWT
//   authMiddleware.authenticateAdmin, // Ensure user is an admin
//   [param("id").isMongoId().withMessage(messages.INVALID_NOTIFICATION_ID)], // Validate notification ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//       }

//       const { id } = req.params;

//       // Find the notification by ID
//       const notification = await Notification.findById(id).lean();
//       if (!notification) {
//         return res
//           .status(404)
//           .json({ message: messages.NOTIFICATION_NOT_FOUND });
//       }

//       // Return success response
//       res.status(200).json(notification);
//     } catch (error) {
//       handleError(
//         `/admin/notification/get/${req.params.id}`,
//         "GET",
//         error,
//         req,
//         res
//       );
//     }
//   }
// );

// @route   PUT /admin/notification/mark-read/:id
// @desc    Mark a notification as read
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/notification/mark-read/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate notification ID
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Update the notification to mark it as read
      const notification = await Notification.findByIdAndUpdate(
        id,
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res
          .status(404)
          .json({ message: messages.NOTIFICATIONS_NOT_FOUND });
      }

      // Return success response
      res.status(200).json(notification);
    } catch (error) {
      handleError(
        `/admin/notification/mark-read/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// // @route   DELETE /admin/notification/delete/:id
// // @desc    Delete a notification
// // @access  PRIVATE (Admin Only)
// router.delete(
//   "/admin/notification/delete/:id",
//   authMiddleware.authenticateJWT, // Authenticate JWT
//   authMiddleware.authenticateAdmin, // Ensure user is an admin
//   [param("id").isMongoId().withMessage(messages.INVALID_NOTIFICATION_ID)], // Validate notification ID
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//       }

//       const { id } = req.params;

//       // Delete the notification
//       const notification = await Notification.findByIdAndDelete(id);
//       if (!notification) {
//         return res
//           .status(404)
//           .json({ message: messages.NOTIFICATION_NOT_FOUND });
//       }

//       // Return success response
//       res.status(204).json({ message: messages.NOTIFICATION_DELETED_SUCCESS });
//     } catch (error) {
//       handleError(
//         `/admin/notification/delete/${req.params.id}`,
//         "DELETE",
//         error,
//         req,
//         res
//       );
//     }
//   }
// );

module.exports = router;
