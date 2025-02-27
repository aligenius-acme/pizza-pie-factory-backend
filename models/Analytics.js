const mongoose = require("mongoose");
const { Schema } = mongoose;

const AnalyticsSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    averagePreparationTime: { type: Number, required: true, min: 0 },
    averageDeliveryTime: { type: Number, required: true, min: 0 },
    totalOrdersToday: { type: Number, required: true, min: 0 },
    totalRevenueToday: { type: Number, required: true, min: 0 },
    topFoodItems: [{ type: Schema.Types.ObjectId, ref: "FoodItem" }],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analytics", AnalyticsSchema);
