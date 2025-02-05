const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, required: true },
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
    relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
