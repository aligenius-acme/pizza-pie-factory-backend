const mongoose = require("mongoose");
const { Schema } = mongoose;

const { Roles } = require("../utils/enums");

const EmployeeSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: { type: String, required: true },
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
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

// Set virtuals to be included when converting documents to JSON or Objects
EmployeeSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});
EmployeeSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Employee", EmployeeSchema);
