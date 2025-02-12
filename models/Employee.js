const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
    isDeleted: { type: Boolean, default: false, select: false }, // Soft delete flag
  },
  { timestamps: true }
);

/** Indexes for optimized queries */
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ phone: 1 });

/** Hash password before saving */
EmployeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

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

EmployeeSchema.set("toObject", { virtuals: true });

/** Soft delete method */
EmployeeSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  await this.save();
};

module.exports = mongoose.model("Employee", EmployeeSchema);
