const mongoose = require("mongoose");
const { Schema } = mongoose;
const { Roles } = require("../utils/enums");

const EmployeeSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(Roles),
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },
    otp: { type: String, select: false }, // Store OTP
    otpExpiry: { type: Date, select: false }, // OTP expiry time
    isActive: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

/** Virtuals: Hide sensitive fields when converting to JSON or Object */
EmployeeSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpiry;
    return ret;
  },
});

EmployeeSchema.set("toObject", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpiry;
    return ret;
  },
});

module.exports = mongoose.model("Employee", EmployeeSchema);
