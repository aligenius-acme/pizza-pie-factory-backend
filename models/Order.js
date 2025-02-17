const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  DeliveryTypes,
  OrderStatusses,
  PaymentTypes,
} = require("../utils/enums");

const OrderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    items: [
      {
        foodItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
          default: null,
        },
        quantity: { type: Number, required: true },
        customizations: [
          {
            customization: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Customization",
            },
            selectedOption: { type: String },
            selectedSubOption: { type: String },
            additionalPrice: { type: Number, default: 0 },
          },
        ],
        totalPrice: { type: Number, required: true },
      },
    ],
    offers: [
      {
        offer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Offer",
          required: true,
        },
        items: [
          {
            foodItem: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "FoodItem",
              required: true,
            },
            quantity: { type: Number, required: true },
            customizations: [
              {
                customization: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "Customization",
                },
                selectedOption: { type: String },
                selectedSubOption: { type: String },
                additionalPrice: { type: Number, default: 0 },
              },
            ],
          },
        ],
        totalPrice: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatusses),
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PaymentTypes),
    },
    deliveryType: {
      type: String,
      required: true,
      enum: Object.values(DeliveryTypes),
    },
    deliveryAddress: {
      address: {
        type: String,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
      latitude: {
        type: Number,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
      longitude: {
        type: Number,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
    },
    instructions: { type: String },
    orderPlacedAt: { type: Date, default: Date.now },
    estimatedDeliveryTime: { type: Date },
    completedAt: { type: Date },
    orderDeliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
