const mongoose = require("mongoose");
const { PaymentTypes, AddressLabels } = require("../utils/enums");
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.isGuest;
      },
    },
    deliveryAddresses: [
      {
        label: { type: String, enum: Object.values(AddressLabels) },
        address: { type: String, required: true, trim: true },
        deliveryInstructions: { type: String, default: "", trim: true },
        latitude: { type: Number },
        longitude: { type: Number },
        saveForFuture: { type: Boolean, default: false },
      },
    ],
    paymentMethods: [
      {
        paymentType: { type: String, enum: Object.values(PaymentTypes) },
        storedCardToken: { type: String },
        saveForFuture: { type: Boolean, default: false },
      },
    ],
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    isGuest: { type: Boolean, default: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

// Exclude password from responses
CustomerSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpiry;
    return ret;
  },
});

CustomerSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpiry;
    return ret;
  },
});

// Define virtual field for orders
CustomerSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "customerId",
});

module.exports = mongoose.model("Customer", CustomerSchema);
