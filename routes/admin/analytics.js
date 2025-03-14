const express = require("express");
const Analytics = require("../../models/Analytics");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

// POST /api/admin/analytics/total-revenue
// @access  PRIVATE (Admin Only)
// router.post(
//   "/admin/analytics/total-revenue",
//   authMiddleware.authenticateJWT,
//   authMiddleware.authenticateAdmin,
//   async (req, res) => {
//     try {
//       const result = await Analytics.aggregate([
//         {
//           $group: {
//             _id: null,
//             totalRevenue: { $sum: "$totalRevenueToday" },
//           },
//         },
//       ]);

//       const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;
//       res.status(200).json({ totalRevenue });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

// POST /api/admin/analytics/total-orders
// @access PRIVATE (Admin Only)
// router.post(
//   "/admin/analytics/total-orders",
//   authMiddleware.authenticateJWT,
//   authMiddleware.authenticateAdmin,
//   async (req, res) => {
//     try {
//       const result = await Analytics.aggregate([
//         {
//           $group: {
//             _id: null,
//             totalOrders: { $sum: "$totalOrdersToday" },
//           },
//         },
//       ]);

//       const totalOrders = result.length > 0 ? result[0].totalOrders : 0;
//       res.status(200).json({ totalOrders });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

module.exports = router;
