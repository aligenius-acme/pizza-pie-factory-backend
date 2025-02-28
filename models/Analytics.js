const mongoose = require("mongoose");
const { Schema } = mongoose;

const AnalyticsSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    averagePreparationTimeAllTime: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimeAllTime: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersAllTime: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      default: 0,
    },
    totalRevenueAllTime: { type: Number, required: true, min: 0, default: 0 },
    averagePreparationTimeToday: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimeToday: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersToday: { type: Number, required: true, min: 0, default: 0 },
    totalRevenueToday: { type: Number, required: true, min: 0, default: 0 },
    topFoodItems: [
      {
        foodItem: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },
        count: { type: Number, default: 0 },
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analytics", AnalyticsSchema);
