const express = require("express");
const { query } = require("express-validator");
const EmployeeMessage = require("../../models/EmployeeMessage");
const authMiddleware = require("../../middleware/auth");
const { employeeMessageValidation } = require("../../utils/validation");
const { validateRequest } = require("../../utils/helpers");

const router = express.Router();

// POST /admin/employee/message/send
// Access: PRIVATE
router.post(
  "/admin/employee/message/send",
  authMiddleware.authenticateJWT,
  ...employeeMessageValidation(),
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["receiverId", "message"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      const senderId = req.user.id;

      if (senderId === filteredBody.receiverId) {
        return res
          .status(400)
          .json({ message: "Sender and receiver cannot be the same" });
      }

      filteredBody.senderId = senderId;

      const employeeMessage = new EmployeeMessage(filteredBody);
      await employeeMessage.save();

      // Emit the new message to the receiver's room via Socket.io
      const io = req.app.get("io");
      io.to(filteredBody.receiverId).emit("newMessage", employeeMessage);

      res.status(201).json(employeeMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /admin/employee/message/send
// Access: PRIVATE
router.get(
  "/admin/employee/messages",
  authMiddleware.authenticateJWT,
  [query("employeeId").isMongoId().withMessage("Invalid employee ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const currentUserId = req.user.id;
      const otherEmployeeId = req.query.employeeId;

      const messages = await EmployeeMessage.find({
        $or: [
          { senderId: currentUserId, receiverId: otherEmployeeId },
          { senderId: otherEmployeeId, receiverId: currentUserId },
        ],
      }).sort({ timestamp: 1 });

      if (!messages.length) {
        return res.status(404).json({ message: "No messages found" });
      }
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
