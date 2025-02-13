const mongoose = require("mongoose");
const { RecipientTypes, NotificationTypes } = require("../utils/enums");
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipientType: {
      type: String,
      required: true,
      enum: Object.values(RecipientTypes),
    },
    recipientId: { type: Schema.Types.ObjectId, ref: "Customer" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    message: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationTypes),
    },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
