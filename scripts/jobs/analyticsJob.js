const cron = require("node-cron");
const mongoose = require("mongoose");
const Order = require("../../models/Order");
const Analytics = require("../../models/Analytics");

async function updateAnalytics() {
  try {
    console.log("⏳ Running Analytics Job...");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Group orders by branchId
    const ordersByBranch = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$branchId",
          totalOrdersToday: { $sum: 1 },
          totalRevenueToday: { $sum: "$totalAmount" },
          preparationTimes: {
            $push: {
              $cond: [
                { $ifNull: ["$preparedAt", false] },
                {
                  $divide: [
                    { $subtract: ["$preparedAt", "$createdAt"] },
                    60000,
                  ],
                },
                null,
              ],
            },
          },
          deliveryTimes: {
            $push: {
              $cond: [
                { $ifNull: ["$deliveredAt", false] },
                {
                  $divide: [
                    { $subtract: ["$deliveredAt", "$preparedAt"] },
                    60000,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          branchId: "$_id",
          totalOrdersToday: 1,
          totalRevenueToday: 1,
          averagePreparationTime: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTime: {
            $avg: {
              $filter: {
                input: "$deliveryTimes",
                as: "delTime",
                cond: { $ne: ["$$delTime", null] },
              },
            },
          },
        },
      },
    ]);

    if (ordersByBranch.length === 0) {
      console.log("⚠️ No orders found for today.");
      return;
    }

    // Update or Insert Analytics Record per branch
    for (const branchData of ordersByBranch) {
      await Analytics.findOneAndUpdate(
        { branchId: branchData.branchId },
        {
          averagePreparationTime: branchData.averagePreparationTime || 0,
          averageDeliveryTime: branchData.averageDeliveryTime || 0,
          totalOrdersToday: branchData.totalOrdersToday,
          totalRevenueToday: branchData.totalRevenueToday,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    console.log("✅ Analytics Updated Successfully for All Branches!");
  } catch (error) {
    console.error("❌ Error updating analytics:", error.message);
  }
}

// Schedule job to run every hour
cron.schedule("0 * * * *", () => {
  updateAnalytics();
});

module.exports = updateAnalytics;
