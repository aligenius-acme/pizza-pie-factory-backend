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
        $unwind: "$items", // Flatten the items array to process each item individually
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
          foodItemSales: {
            $push: { foodItem: "$items.foodItem", quantity: "$items.quantity" },
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
          foodItemSales: 1,
        },
      },
    ]);

    if (ordersByBranch.length === 0) {
      console.log("⚠️ No orders found for today.");
      return;
    }

    for (const branchData of ordersByBranch) {
      // Aggregate to get the top 10 best-selling food items for the branch
      const topFoodItems = await Order.aggregate([
        {
          $match: {
            branchId: branchData.branchId,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.foodItem",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $project: { _id: 1 } },
      ]);

      const topFoodItemIds = topFoodItems.map((item) => item._id);

      await Analytics.findOneAndUpdate(
        { branchId: branchData.branchId },
        {
          averagePreparationTime: branchData.averagePreparationTime || 0,
          averageDeliveryTime: branchData.averageDeliveryTime || 0,
          totalOrdersToday: branchData.totalOrdersToday,
          totalRevenueToday: branchData.totalRevenueToday,
          topFoodItems: topFoodItemIds,
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
