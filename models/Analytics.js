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
    averagePreparationTimePreviousYear: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimePreviousYear: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersPreviousYear: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      default: 0,
    },
    totalRevenuePreviousYear: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averagePreparationTimePreviousMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimePreviousMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersPreviousMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      default: 0,
    },
    totalRevenuePreviousMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averagePreparationTimePreviousWeek: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimePreviousWeek: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersPreviousWeek: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      default: 0,
    },
    totalRevenuePreviousWeek: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averagePreparationTimePreviousDay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDeliveryTimePreviousDay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalOrdersPreviousDay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      default: 0,
    },
    totalRevenuePreviousDay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
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
