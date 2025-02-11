const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmployeeMessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EmployeeMessageSchema.set("toJSON", { virtuals: true });
EmployeeMessageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("EmployeeMessage", EmployeeMessageSchema);
