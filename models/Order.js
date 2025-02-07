const mongoose = require("mongoose");
const { Schema } = mongoose;

const { OrderTypes, OrderStatusses, PaymentTypes } = require("../utils/enums");

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
        foodItemId: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        // Allow any type of customization data
        customizations: {
          type: Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    orderType: {
      type: String,
      required: true,
      enum: Object.values(OrderTypes),
    },
    deliveryAddress: {
      address: {
        type: String,
        required: function () {
          return this.orderType === OrderTypes.DELIVERY;
        },
      },
      latitude: {
        type: Number,
        required: function () {
          return this.orderType === OrderTypes.DELIVERY;
        },
      },
      longitude: {
        type: Number,
        required: function () {
          return this.orderType === OrderTypes.DELIVERY;
        },
      },
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatusses),
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PaymentTypes),
    },
    totalAmount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    instructions: { type: String },
    orderPlacedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    orderDeliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
