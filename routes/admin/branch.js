const express = require("express");
const { param, query } = require("express-validator");
const { branchValidation } = require("../../utils/validation");
const Branch = require("../../models/Branch");
const authMiddleware = require("../../middleware/auth");
const { validateRequest } = require("../../utils/helpers");
const { OrderStatusses } = require("../../utils/enums");
const messages = require("../../utils/messages"); // Import messages

const router = express.Router();

// @route   POST /admin/branch/register
// @desc    Register a new branch (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/branch/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [...branchValidation()], // Apply branch validation rules
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      // Define allowed fields to prevent unwanted data injection
      const allowedFields = [
        "name",
        "location",
        "contactNumber",
        "deliveryRadius",
      ];

      // Filter request body to only include allowed fields
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      // Check if branch with the same name already exists
      let existingBranch = await Branch.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingBranch) {
        return res.status(400).json({ message: messages.BRANCH_EXISTS });
      }

      // Create and save new branch
      const branch = new Branch(filteredBody);
      await branch.save();

      // Return success response with the created branch
      res.status(201).json({
        message: messages.BRANCH_REGISTRATION_SUCCESS,
        branch,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Branch registration error:", error);

      // Log error in MongoDB
      await logError(
        "/admin/branch/register",
        "POST",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   PUT /admin/branch/update/:id
// @desc    Update branch details (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/branch/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    ...branchValidation(), // Apply branch validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Define allowed fields to prevent unwanted data injection
      const allowedFields = [
        "name",
        "location",
        "contactNumber",
        "deliveryRadius",
      ];

      // Filter request body to only include allowed fields
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      // Find branch by ID
      let branch = await Branch.findById(id);
      if (!branch) {
        return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
      }

      // Update branch fields
      Object.assign(branch, filteredBody);
      await branch.save();

      // Return success response with the updated branch
      res.status(200).json({
        message: messages.BRANCH_UPDATE_SUCCESS,
        branch,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Branch update error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/update/${param("id").isMongoId()}`,
        "PUT",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branches
// @desc    Get all branches (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branches",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  async (req, res) => {
    try {
      // Fetch all branches
      const branches = await Branch.find().lean();

      // Check if branches exist
      if (!branches.length) {
        return res.status(404).json({ message: messages.NO_BRANCHES_FOUND });
      }

      // Return success response with the list of branches
      res.status(200).json(branches);
    } catch (error) {
      // Handle unexpected errors
      console.error("Get branches error:", error);

      // Log error in MongoDB
      await logError(
        "/admin/branches",
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/get/:id
// @desc    Get branch details by ID (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branch/get/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Find branch by ID
      const branch = await Branch.findById(id).lean();
      if (!branch) {
        return res.status(404).json({ message: messages.BRANCH_NOT_FOUND });
      }

      // Return success response with the branch details
      res.status(200).json(branch);
    } catch (error) {
      // Handle unexpected errors
      console.error("Branch get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/get/${param("id").isMongoId()}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/orders/:id
// @desc    Get all orders for a specific branch (with pagination and sorting using query parameters)
// @access  PRIVATE
router.get(
  "/admin/branch/orders/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = "orderPlacedAt",
        order = "desc",
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Find all orders for the branch with pagination and sorting
      const orders = await Order.find({ branchId: id })
        .populate({ path: "customerId", select: "name" }) // Populate customer details
        .populate({ path: "items.foodItem", select: "name" }) // Populate food item details
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Get the total count of orders for the branch
      const totalCount = await Order.countDocuments({ branchId: id });

      // Return success response with the orders and pagination details
      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Branch orders get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/orders/${req.params.id}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/orders/:id/status/:status
// @desc    Get orders by status for a specific branch (with pagination)
// @access  PRIVATE
router.get(
  "/admin/branch/orders/:id/status/:status",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    param("status")
      .isIn(Object.values(OrderStatusses))
      .withMessage(messages.INVALID_STATUS), // Validate status
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, status } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = "orderPlacedAt",
        order = "desc",
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      const filter = { id, status };

      // Fetch orders with pagination and sorting
      const orders = await Order.find(filter)
        .populate({ path: "customerId", select: "name" }) // Populate customer details
        .populate({ path: "items.foodItem", select: "name" }) // Populate food item details
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Get the total count of orders for the branch and status
      const totalCount = await Order.countDocuments(filter);

      // Return success response with the orders and pagination details
      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Orders by status get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/orders/${req.params.id}/status/${req.params.status}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/recent-orders/:id
// @desc    Get 5 most recent orders for a specific branch
// @access  PRIVATE
router.get(
  "/admin/branch/recent-orders/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Find the 10 most recent orders for the branch
      const orders = await Order.find({ id })
        .populate({ path: "customerId", select: "name" }) // Populate customer details
        .populate({ path: "items.foodItem", select: "name" }) // Populate food item details
        .sort({ orderPlacedAt: -1 }) // Sort by orderPlacedAt in descending order (most recent first)
        .limit(10) // Limit to 10 orders
        .lean();

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: messages.NO_ORDERS_FOUND });
      }

      // Return success response with the 10 most recent orders
      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Recent orders get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/recent-orders/${req.params.id}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/top-products/:id
// @desc    Get top 10 best-selling products for a specific branch
// @access  PRIVATE
router.get(
  "/admin/branch/top-products/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Aggregate to find top 10 best-selling products
      const topProducts = await Order.aggregate([
        // Match orders for the specific branch
        { $match: { id: mongoose.Types.ObjectId(id) } },
        // Unwind the items array to process each item individually
        { $unwind: "$items" },
        // Group by foodItem and calculate total quantity sold
        {
          $group: {
            _id: "$items.foodItem",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        // Sort by totalQuantity in descending order
        { $sort: { totalQuantity: -1 } },
        // Limit to top 10 products
        { $limit: 10 },
        // Lookup to populate foodItem details
        {
          $lookup: {
            from: "fooditems", // Collection name for FoodItem
            localField: "_id",
            foreignField: "_id",
            as: "foodItemDetails",
          },
        },
        // Unwind the foodItemDetails array (since lookup returns an array)
        { $unwind: "$foodItemDetails" },
        // Project the required fields, including imageUrl
        {
          $project: {
            _id: 0,
            foodItemId: "$_id",
            name: "$foodItemDetails.name",
            imageUrl: "$foodItemDetails.imageUrl", // Include imageUrl
            totalQuantity: 1,
          },
        },
      ]);

      if (!topProducts || topProducts.length === 0) {
        return res.status(404).json({ message: messages.NO_PRODUCTS_FOUND });
      }

      // Return success response with the top 10 best-selling products
      res.status(200).json({
        success: true,
        data: topProducts,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Top products get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/top-products/${req.params.id}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

// @route   GET /admin/branch/employees/:id
// @desc    Get all employees for a specific branch (with pagination, sorting, and filtering)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branch/employees/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("role").optional().isString(), // Validate role (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        role, // Optional filtering by role
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = { branchId: id, isDeleted: false }; // Exclude soft-deleted employees
      if (role) {
        filter.role = role; // Filter by role if provided
      }

      // Find all employees for the branch with pagination and sorting
      const employees = await Employee.find(filter)
        .select("-password -resetPasswordToken -resetPasswordExpiry") // Exclude sensitive fields
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!employees || employees.length === 0) {
        return res.status(404).json({ message: messages.NO_EMPLOYEES_FOUND });
      }

      // Get the total count of employees for the branch
      const totalCount = await Employee.countDocuments(filter);

      // Return success response with the employees and pagination details
      res.status(200).json({
        success: true,
        data: employees,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Branch employees get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/branch/employees/${req.params.id}`,
        "GET",
        error.message,
        error.stack,
        req.body
      );

      res.status(500).json({
        success: false,
        message: messages.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
);

module.exports = router;
