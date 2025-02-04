const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    items: [
      {
        foodItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        customizations: {
          extraToppings: [{ type: String }],
          spiceLevel: { type: String, enum: ["Mild", "Medium", "Spicy"] },
        },
      },
    ],
    orderType: { type: String, required: true, enum: ["Pickup", "Delivery"] },
    deliveryAddress: {
      address: {
        type: String,
        required: function () {
          return this.orderType === "Delivery";
        },
      },
      latitude: {
        type: Number,
        required: function () {
          return this.orderType === "Delivery";
        },
      },
      longitude: {
        type: Number,
        required: function () {
          return this.orderType === "Delivery";
        },
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["Preparing", "Out for Delivery", "Delivered"],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Credit Card", "Cash on Delivery"],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    instructions: { type: String },
    orderPlacedAt: { type: Date, default: Date.now },
    completedAt: {
      type: Date,
    },
    orderDeliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = {
  Order: mongoose.model("Order", OrderSchema),
};
