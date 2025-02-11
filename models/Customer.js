const mongoose = require("mongoose");
const {
  AuthProviders,
  PaymentTypes,
  AddressLabels,
} = require("../utils/enums");
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    isGuest: { type: Boolean, default: false },
    passwordHash: {
      type: String,
      required: function () {
        return !this.isGuest;
      },
    },
    authProvider: {
      type: String,
      enum: Object.values(AuthProviders),
      required: function () {
        return !this.isGuest;
      },
      default: function () {
        return this.isGuest ? AuthProviders.GUEST : undefined;
      },
    },
    authProviderId: { type: String, unique: true, sparse: true },
    deliveryAddresses: [
      {
        label: { type: String, enum: Object.values(AddressLabels) },
        address: { type: String },
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
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

// Set virtuals to be included when converting documents to JSON or Objects
CustomerSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});
CustomerSchema.set("toObject", { virtuals: true });

// Define the virtual field for orders
CustomerSchema.virtual("orders", {
  ref: "Order", // The model to use
  localField: "_id", // Find orders where `localField`
  foreignField: "customerId", // is equal to `foreignField`
});

module.exports = mongoose.model("Customer", CustomerSchema);
