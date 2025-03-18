const express = require("express");
const { query } = require("express-validator");
const EmployeeMessage = require("../../models/EmployeeMessage");
const authMiddleware = require("../../middleware/auth");
const { employeeMessageValidation } = require("../../utils/validation");
const {
  validateRequest,
  handleError,
  stripUnwantedFields,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

const router = express.Router();

// @route   POST /admin/employee/message/send
// @desc    Send a message to an employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/message/send",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [...employeeMessageValidation()], // Apply validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(
        req.body,
        EmployeeMessage.schema
      );

      const senderId = req.user.id;

      // Ensure sender and receiver are not the same
      if (senderId === filteredBody.receiverId) {
        return res.status(400).json({ message: messages.SAME_SENDER_RECEIVER });
      }

      // Add sender ID to the message
      filteredBody.senderId = senderId;

      // Create and save the message
      const employeeMessage = new EmployeeMessage(filteredBody);
      await employeeMessage.save();

      // Emit the new message to the receiver's room via Socket.io
      const io = req.app.get("io");
      io.to(filteredBody.receiverId).emit("newMessage", employeeMessage);

      // Return success response
      res.status(201).json(employeeMessage);
    } catch (error) {
      handleError("/admin/employee/message/send", "POST", error, req, res);
    }
  }
);

// @route   GET /admin/employee/messages
// @desc    Get messages between the current user and another employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/employee/messages",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [query("employeeId").isMongoId().withMessage(messages.INVALID_ID)], // Validate query parameter
  async (req, res) => {
    try {
      // Validate request query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const currentUserId = req.user.id;
      const otherEmployeeId = req.query.employeeId;

      // Fetch messages between the current user and the other employee
      const employeeMessages = await EmployeeMessage.find({
        $or: [
          { senderId: currentUserId, receiverId: otherEmployeeId },
          { senderId: otherEmployeeId, receiverId: currentUserId },
        ],
      })
        .sort({ timestamp: 1 }) // Sort by timestamp in ascending order
        .lean();

      // Check if messages exist
      if (!employeeMessages.length) {
        return res.status(404).json({ message: messages.NO_MESSAGE_FOUND });
      }

      // Return success response with messages
      res.status(200).json(employeeMessages);
    } catch (error) {
      handleError("/admin/employee/messages", "GET", error, req, res);
    }
  }
);

module.exports = router;
