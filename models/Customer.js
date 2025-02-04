const mongoose = require("mongoose");
const CustomerSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
    phone: {
      type: String,
      unique: true,
      match: /^((\+971\s?|00971\s?|0)5[024568]\d{7})$/, // Dubai phone number validation
    },
    passwordHash: { type: String },
    authProvider: {
      type: String,
      enum: ["Google", "Microsoft", "Local"],
      required: true,
    },
    authProviderId: { type: String, unique: true, sparse: true },
    deliveryAddresses: [
      {
        label: { type: String, enum: ["Home", "Office"] },
        address: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
        saveForFuture: { type: Boolean, default: false },
      },
    ],
    paymentMethods: [
      {
        paymentType: { type: String, enum: ["CreditCard", "COD"] },
        cardType: {
          type: String,
          required: function () {
            return this.paymentType && this.paymentType === "CreditCard";
          },
        },
        cardNumber: {
          type: String,
          required: function () {
            return this.paymentType && this.paymentType === "CreditCard";
          },
          match: /^\d{16}$/,
        },
        expiryDate: {
          type: String,
          required: function () {
            return this.paymentType && this.paymentType === "CreditCard";
          },
          match: /^(0[1-9]|1[0-2])\/(\d{2})$/,
        },
        saveForFuture: { type: Boolean, default: false },
      },
    ],
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  },
  { timestamps: true }
);

module.exports = {
  Customer: mongoose.model("Customer", CustomerSchema),
};
