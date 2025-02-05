const mongoose = require("mongoose");
const { Schema } = mongoose;

const AnalyticsSchema = new Schema(
  {
    averagePreparationTime: { type: Number, required: true, min: 0 },
    averageDeliveryTime: { type: Number, required: true, min: 0 },
    totalOrdersToday: { type: Number, required: true, min: 0 },
    totalRevenueToday: { type: Number, required: true, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analytics", AnalyticsSchema);
