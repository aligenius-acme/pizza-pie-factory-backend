const express = require("express");
const { param, validationResult } = require("express-validator");
const Notification = require("../../models/Notification");
const Customer = require("../../models/Customer");
const authMiddleware = require("../../middleware/auth");
const { RecipientTypes, NotificationTypes } = require("../../utils/enums");
const { notificationValidation } = require("../../utils/validation");

const { sendEmail } = require("../../utils/email");
const { sendSms } = require("../../utils/sms");

const router = express.Router();

// POST /admin/notification/create
// Access: PRIVATE
router.post(
  "/admin/notification/create",
  authMiddleware.authenticateJWT,
  [...notificationValidation()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        recipientId,
        recipientType,
        message,
        type,
        relatedOrderId,
        branchId,
      } = req.body;

      let notificationData = {
        recipientType,
        message,
        type,
        relatedOrderId,
      };

      if (recipientType === RecipientTypes.BRANCH) {
        notificationData.branchId = branchId;
      }

      const notification = new Notification(notificationData);
      await notification.save();

      const io = req.app.get("io");

      if (recipientType === RecipientTypes.CUSTOMER) {
        const customer = await Customer.findById(recipientId).lean();
        if (!customer) {
          return res.status(400).json({ message: "Customer not found" });
        }
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
          io.to(recipientId.toString()).emit("newNotification", notification);
        }
      } else if (recipientType === RecipientTypes.EMPLOYEE) {
        if (branchId) {
          io.to(branchId.toString()).emit("newNotification", notification);
        } else {
          io.emit("newNotification", notification);
        }
      } else {
        if (recipientId) {
          io.to(recipientId.toString()).emit("newNotification", notification);
        }
      }

      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/notifications
// Retrieve all notifications
// Access: Site admin only
router.get(
  "/admin/notifications",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const notifications = await Notification.find()
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/notification/get/:id
// Retrieve a notification by ID
// Access: Site admin only
router.get(
  "/admin/notification/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findById(req.params.id).lean();
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(200).json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /admin/notification/mark-read/:id
// Mark a notification as read
// Access: Site admin only
router.put(
  "/admin/notification/mark-read/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res(200).json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /admin/notification/delete/:id
// Delete a notification
// Access: Site admin only
router.delete(
  "/admin/notification/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findByIdAndDelete(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.status(204).json({ message: "Notification deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
