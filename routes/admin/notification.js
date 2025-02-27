const express = require("express");
const { param, validationResult } = require("express-validator");
const Notification = require("../../models/Notification");
const Customer = require("../../models/Customer");
const authMiddleware = require("../../middleware/auth");
const { RecipientTypes, NotificationTypes } = require("../../utils/enums");
const { notificationValidation } = require("../../utils/validation");
const { sendEmail, sendSms } = require("../../utils/notifications");
const { stripUnwantedFields, handleError } = require("../../utils/helpers");
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

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
// @desc    Retrieve all notifications
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/notifications",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  async (req, res) => {
    try {
      // Fetch all notifications sorted by creation date
      const notifications = await Notification.find()
        .sort({ createdAt: -1 })
        .lean();

      // Return success response
      res.status(200).json(notifications);
    } catch (error) {
      handleError("/admin/notifications", "GET", error, req, res);
    }
  }
);

// @route   GET /admin/notification/get/:id
// @desc    Retrieve a notification by ID
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/notification/get/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_NOTIFICATION_ID)], // Validate notification ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Find the notification by ID
      const notification = await Notification.findById(id).lean();
      if (!notification) {
        return res
          .status(404)
          .json({ message: messages.NOTIFICATION_NOT_FOUND });
      }

      // Return success response
      res.status(200).json(notification);
    } catch (error) {
      handleError(
        `/admin/notification/get/${req.params.id}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   PUT /admin/notification/mark-read/:id
// @desc    Mark a notification as read
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/notification/mark-read/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("id").isMongoId().withMessage(messages.INVALID_NOTIFICATION_ID)], // Validate notification ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

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
          .json({ message: messages.NOTIFICATION_NOT_FOUND });
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

// @route   DELETE /admin/notification/delete/:id
// @desc    Delete a notification
// @access  PRIVATE (Admin Only)
router.delete(
  "/admin/notification/delete/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_NOTIFICATION_ID)], // Validate notification ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Delete the notification
      const notification = await Notification.findByIdAndDelete(id);
      if (!notification) {
        return res
          .status(404)
          .json({ message: messages.NOTIFICATION_NOT_FOUND });
      }

      // Return success response
      res.status(204).json({ message: messages.NOTIFICATION_DELETED_SUCCESS });
    } catch (error) {
      handleError(
        `/admin/notification/delete/${req.params.id}`,
        "DELETE",
        error,
        req,
        res
      );
    }
  }
);

module.exports = router;
