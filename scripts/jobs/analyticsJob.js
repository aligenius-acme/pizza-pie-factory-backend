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

    // Group orders by branchId for today's data
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
          averagePreparationTimeToday: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimeToday: {
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

    // Group orders by branchId for all-time data
    const allTimeOrdersByBranch = await Order.aggregate([
      {
        $group: {
          _id: "$branchId",
          totalOrdersAllTime: { $sum: 1 },
          totalRevenueAllTime: { $sum: "$totalAmount" },
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
          totalOrdersAllTime: 1,
          totalRevenueAllTime: 1,
          averagePreparationTimeAllTime: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimeAllTime: {
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

    // Get the top 5 ordered food items per branch with count
    const topFoodItemsByBranch = await Order.aggregate([
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: { branchId: "$branchId", foodItem: "$items.foodItem" },
          orderCount: { $sum: "$items.quantity" },
        },
      },
      {
        $sort: { orderCount: -1 },
      },
      {
        $group: {
          _id: "$_id.branchId",
          topFoodItems: {
            $push: {
              foodItem: "$_id.foodItem",
              count: "$orderCount",
            },
          },
        },
      },
      {
        $project: {
          branchId: "$_id",
          topFoodItems: { $slice: ["$topFoodItems", 5] }, // Limit to top 5
        },
      },
    ]);

    // Merge data and update analytics
    const branchDataMap = new Map();
    allTimeOrdersByBranch.forEach((branch) => {
      branchDataMap.set(branch.branchId.toString(), branch);
    });

    const topFoodItemsMap = new Map();
    topFoodItemsByBranch.forEach((branch) => {
      topFoodItemsMap.set(branch.branchId.toString(), branch.topFoodItems);
    });

    for (const branchData of ordersByBranch) {
      const allTimeData =
        branchDataMap.get(branchData.branchId.toString()) || {};
      const topFoodItems =
        topFoodItemsMap.get(branchData.branchId.toString()) || [];

      await Analytics.findOneAndUpdate(
        { branchId: branchData.branchId },
        {
          totalOrdersToday: branchData.totalOrdersToday,
          totalRevenueToday: branchData.totalRevenueToday,
          averagePreparationTimeToday:
            branchData.averagePreparationTimeToday || 0,
          averageDeliveryTimeToday: branchData.averageDeliveryTimeToday || 0,
          totalOrdersAllTime: allTimeData.totalOrdersAllTime || 0,
          totalRevenueAllTime: allTimeData.totalRevenueAllTime || 0,
          averagePreparationTimeAllTime:
            allTimeData.averagePreparationTimeAllTime || 0,
          averageDeliveryTimeAllTime:
            allTimeData.averageDeliveryTimeAllTime || 0,
          topFoodItems: topFoodItems, // Now includes count
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
