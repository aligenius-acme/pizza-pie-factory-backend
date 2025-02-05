const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmployeeSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^((\+971\s?|00971\s?|0)5[024568]\d{7})$/, // Dubai phone number validation
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["Kitchen Staff, ", "Delivery Driver", "Customer Support"],
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
