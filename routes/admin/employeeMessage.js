const express = require("express");
const { query, validationResult } = require("express-validator");
const EmployeeMessage = require("../../models/EmployeeMessage");
const authMiddleware = require("../../middleware/auth");
const { employeeMessageValidation } = require("../../utils/validation");

const router = express.Router();

// ------------------------------------------------------------------
// POST /employee/message/send
// Send a new message from the authenticated employee to another employee
// ------------------------------------------------------------------
router.post(
  "/admin/employee/message/send",
  authMiddleware.authenticateJWT,
  ...employeeMessageValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const senderId = req.user.id;
      const { receiverId, message } = req.body;

      if (senderId === receiverId) {
        return res
          .status(400)
          .json({ message: "Sender and receiver cannot be the same" });
      }

      const newMessage = new EmployeeMessage({
        senderId,
        receiverId,
        message,
      });
      await newMessage.save();

      // Emit the new message to the receiver's room via Socket.io
      const io = req.app.get("io");
      io.to(receiverId).emit("newMessage", newMessage);

      res.status(201).json(newMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ------------------------------------------------------------------
// GET /employee/messages?employeeId=<otherEmployeeId>
// Get all messages between the authenticated employee and the given employee
// ------------------------------------------------------------------
router.get(
  "/admin/employee/messages",
  authMiddleware.authenticateJWT,
  [query("employeeId").isMongoId().withMessage("Invalid employee ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const currentUserId = req.user.id;
      const otherEmployeeId = req.query.employeeId;

      const messages = await EmployeeMessage.find({
        $or: [
          { senderId: currentUserId, receiverId: otherEmployeeId },
          { senderId: otherEmployeeId, receiverId: currentUserId },
        ],
      }).sort({ timestamp: 1 });

      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
