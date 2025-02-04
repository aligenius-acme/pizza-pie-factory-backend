const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    notificationId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientType: {
      type: String,
      required: true,
      enum: ["Customer", "Employee"],
    },
    message: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["NewOrder", "OrderUpdate", "Promotion"],
    },
    relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = {
  Notification: mongoose.model("Notification", NotificationSchema),
};
