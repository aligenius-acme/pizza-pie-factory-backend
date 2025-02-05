const mongoose = require("mongoose");
const {
  AuthProviders,
  PaymentTypes,
  AddressLabels,
} = require("../utils/enums");
const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, unique: true, match: /.+\@.+\..+/ },
    phone: {
      type: String,
      unique: true,
      match: /^((\+971\s?|00971\s?|0)5[024568]\d{7})$/, // Dubai phone number validation
    },
    passwordHash: { type: String },
    authProvider: {
      type: String,
      enum: Object.values(AuthProviders),
      required: true,
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
        cardType: {
          type: String,
        },
        cardNumber: {
          type: String,
          match: /^\d{16}$/,
        },
        expiryDate: {
          type: String,
          match: /^(0[1-9]|1[0-2])\/(\d{2})$/,
        },
        saveForFuture: { type: Boolean, default: false },
      },
    ],
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    orderHistory: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
