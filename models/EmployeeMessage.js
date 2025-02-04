const mongoose = require("mongoose");
const EmployeeMessageSchema = new mongoose.Schema(
  {
    employeeMessageId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = {
  EmployeeMessage: mongoose.model("EmployeeMessage", EmployeeMessageSchema),
};
