const express = require("express");
const { param, query } = require("express-validator");
const Customer = require("../../models/Customer");
const Order = require("../../models/Order");
const authMiddleware = require("../../middleware/auth");
const {
  validateRequest,
  handleError,
  validateEmployeeBranchAssociation,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");
const { default: mongoose } = require("mongoose");
require("dotenv").config();

const router = express.Router();

// @route   GET /admin/customers/branch/:branchId
// @desc    Get all customers who have placed orders in a specific branch (with pagination, sorting, and filtering)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/customers/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
    query("createdAt").optional().isISO8601().toDate(), // Validate date (optional)
    query("isGuest").optional().isBoolean(), // Validate customer type (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        search,
        createdAt,
        isGuest,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Validate that the employee is associated with the specified branch
      const validationResult = await validateEmployeeBranchAssociation(
        req.user.id, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResult.isValid) {
        return res
          .status(validationResult.message === messages.FORBIDDEN ? 403 : 404)
          .json({ message: validationResult.message });
      }

      // Find all orders for the branch and extract unique customer IDs
      const orders = await Order.find({ branchId: branchId }).select(
        "customerId"
      );
      // Use a Set to ensure unique customer IDs
      const customerIds = [
        ...new Set(orders.map((order) => order.customerId.toString())),
      ].map((id) => new mongoose.Types.ObjectId(id));

      // Build filter object for customers
      let filter = { _id: { $in: customerIds } };

      // Add customer type filter
      if (isGuest) {
        filter.isGuest = isGuest; // Add isGuest to filter if provided
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { firstName: { $regex: searchRegex } }, // Search by first name
          { lastName: { $regex: searchRegex } }, // Search by last name
          { email: { $regex: searchRegex } }, // Search by email
          { phone: { $regex: searchRegex } }, // Search by phone
        ];
      }

      // Add date filtering
      if (createdAt) {
        const startOfDay = new Date(createdAt);
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00.000)

        const endOfDay = new Date(createdAt);
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59.999)

        filter.createdAt = { $gte: startOfDay, $lte: endOfDay }; // Filter by createdAt date
      }

      console.log(filter);

      // Find all customers who have placed orders in the branch
      const customers = await Customer.find(filter)
        .select(
          "-password -resetPasswordToken -resetPasswordExpiry -paymentMethods"
        ) // Exclude sensitive fields
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!customers || customers.length === 0) {
        return res.status(404).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // Get the total count of customers for the branch
      const totalCount = await Customer.countDocuments(filter);

      // Return success response with the customers and pagination details
      res.status(200).json({
        success: true,
        data: customers,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError(
        `/admin/customers/branch/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

module.exports = router;
