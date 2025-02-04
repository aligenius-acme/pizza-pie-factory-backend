const mongoose = require("mongoose");

const AnalyticsSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    averagePreparationTime: { type: Number, required: true, min: 0 },
    averageDeliveryTime: { type: Number, required: true, min: 0 },
    totalOrdersToday: { type: Number, required: true, min: 0 },
    totalRevenueToday: { type: Number, required: true, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = {
  Analytics: mongoose.model("Analytics", AnalyticsSchema),
};
