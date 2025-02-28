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

    // Previous Day
    const startOfPreviousDay = new Date(startOfDay);
    startOfPreviousDay.setDate(startOfPreviousDay.getDate() - 1);
    const endOfPreviousDay = new Date(endOfDay);
    endOfPreviousDay.setDate(endOfPreviousDay.getDate() - 1);

    // Previous Week
    const startOfPreviousWeek = new Date(startOfDay);
    startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);
    const endOfPreviousWeek = new Date(endOfDay);
    endOfPreviousWeek.setDate(endOfPreviousWeek.getDate() - 7);

    // Previous Month
    const startOfPreviousMonth = new Date(startOfDay);
    startOfPreviousMonth.setMonth(startOfPreviousMonth.getMonth() - 1, 1); // First day of the previous month
    startOfPreviousMonth.setHours(0, 0, 0, 0);

    const endOfPreviousMonth = new Date(startOfPreviousMonth);
    endOfPreviousMonth.setMonth(endOfPreviousMonth.getMonth() + 1, 0); // Last day of the previous month
    endOfPreviousMonth.setHours(23, 59, 59, 999);

    // Previous Year
    const startOfPreviousYear = new Date(startOfDay);
    startOfPreviousYear.setFullYear(
      startOfPreviousYear.getFullYear() - 1,
      0,
      1
    ); // First day of the previous year
    startOfPreviousYear.setHours(0, 0, 0, 0);

    const endOfPreviousYear = new Date(startOfPreviousYear);
    endOfPreviousYear.setFullYear(endOfPreviousYear.getFullYear() + 1, 0, 0); // Last day of the previous year
    endOfPreviousYear.setHours(23, 59, 59, 999);

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

    // Group orders by branchId for previous day's data
    const previousDayOrdersByBranch = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPreviousDay, $lte: endOfPreviousDay },
        },
      },
      {
        $group: {
          _id: "$branchId",
          totalOrdersPreviousDay: { $sum: 1 },
          totalRevenuePreviousDay: { $sum: "$totalAmount" },
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
          totalOrdersPreviousDay: 1,
          totalRevenuePreviousDay: 1,
          averagePreparationTimePreviousDay: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimePreviousDay: {
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

    // Group orders by branchId for previous week's data
    const previousWeekOrdersByBranch = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPreviousWeek, $lte: endOfPreviousWeek },
        },
      },
      {
        $group: {
          _id: "$branchId",
          totalOrdersPreviousWeek: { $sum: 1 },
          totalRevenuePreviousWeek: { $sum: "$totalAmount" },
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
          totalOrdersPreviousWeek: 1,
          totalRevenuePreviousWeek: 1,
          averagePreparationTimePreviousWeek: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimePreviousWeek: {
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

    // Group orders by branchId for previous month's data
    const previousMonthOrdersByBranch = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
        },
      },
      {
        $group: {
          _id: "$branchId",
          totalOrdersPreviousMonth: { $sum: 1 },
          totalRevenuePreviousMonth: { $sum: "$totalAmount" },
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
          totalOrdersPreviousMonth: 1,
          totalRevenuePreviousMonth: 1,
          averagePreparationTimePreviousMonth: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimePreviousMonth: {
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

    // Group orders by branchId for previous year's data
    const previousYearOrdersByBranch = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPreviousYear, $lte: endOfPreviousYear },
        },
      },
      {
        $group: {
          _id: "$branchId",
          totalOrdersPreviousYear: { $sum: 1 },
          totalRevenuePreviousYear: { $sum: "$totalAmount" },
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
          totalOrdersPreviousYear: 1,
          totalRevenuePreviousYear: 1,
          averagePreparationTimePreviousYear: {
            $avg: {
              $filter: {
                input: "$preparationTimes",
                as: "prepTime",
                cond: { $ne: ["$$prepTime", null] },
              },
            },
          },
          averageDeliveryTimePreviousYear: {
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

    const previousDayDataMap = new Map();
    previousDayOrdersByBranch.forEach((branch) => {
      previousDayDataMap.set(branch.branchId.toString(), branch);
    });

    const previousWeekDataMap = new Map();
    previousWeekOrdersByBranch.forEach((branch) => {
      previousWeekDataMap.set(branch.branchId.toString(), branch);
    });

    const previousMonthDataMap = new Map();
    previousMonthOrdersByBranch.forEach((branch) => {
      previousMonthDataMap.set(branch.branchId.toString(), branch);
    });

    const previousYearDataMap = new Map();
    previousYearOrdersByBranch.forEach((branch) => {
      previousYearDataMap.set(branch.branchId.toString(), branch);
    });

    const topFoodItemsMap = new Map();
    topFoodItemsByBranch.forEach((branch) => {
      topFoodItemsMap.set(branch.branchId.toString(), branch.topFoodItems);
    });

    for (const branchData of ordersByBranch) {
      const allTimeData =
        branchDataMap.get(branchData.branchId.toString()) || {};
      const previousDayData =
        previousDayDataMap.get(branchData.branchId.toString()) || {};
      const previousWeekData =
        previousWeekDataMap.get(branchData.branchId.toString()) || {};
      const previousMonthData =
        previousMonthDataMap.get(branchData.branchId.toString()) || {};
      const previousYearData =
        previousYearDataMap.get(branchData.branchId.toString()) || {};
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
          totalOrdersPreviousDay: previousDayData.totalOrdersPreviousDay || 0,
          totalRevenuePreviousDay: previousDayData.totalRevenuePreviousDay || 0,
          averagePreparationTimePreviousDay:
            previousDayData.averagePreparationTimePreviousDay || 0,
          averageDeliveryTimePreviousDay:
            previousDayData.averageDeliveryTimePreviousDay || 0,
          totalOrdersPreviousWeek:
            previousWeekData.totalOrdersPreviousWeek || 0,
          totalRevenuePreviousWeek:
            previousWeekData.totalRevenuePreviousWeek || 0,
          averagePreparationTimePreviousWeek:
            previousWeekData.averagePreparationTimePreviousWeek || 0,
          averageDeliveryTimePreviousWeek:
            previousWeekData.averageDeliveryTimePreviousWeek || 0,
          totalOrdersPreviousMonth:
            previousMonthData.totalOrdersPreviousMonth || 0,
          totalRevenuePreviousMonth:
            previousMonthData.totalRevenuePreviousMonth || 0,
          averagePreparationTimePreviousMonth:
            previousMonthData.averagePreparationTimePreviousMonth || 0,
          averageDeliveryTimePreviousMonth:
            previousMonthData.averageDeliveryTimePreviousMonth || 0,
          totalOrdersPreviousYear:
            previousYearData.totalOrdersPreviousYear || 0,
          totalRevenuePreviousYear:
            previousYearData.totalRevenuePreviousYear || 0,
          averagePreparationTimePreviousYear:
            previousYearData.averagePreparationTimePreviousYear || 0,
          averageDeliveryTimePreviousYear:
            previousYearData.averageDeliveryTimePreviousYear || 0,
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
