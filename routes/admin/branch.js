const express = require("express");
const { param, query, validationResult } = require("express-validator");
const { branchValidation, phoneValidation } = require("../../utils/validation");
const Branch = require("../../models/Branch");

const authMiddleware = require("../../middleware/auth");

const router = express.Router();

// @route   POST /admin/branch/register
// @desc    Register a new branch
// @access  Site admin only
router.post(
  "/admin/branch/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  ...branchValidation(),
  ...phoneValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, location, contactNumber } = req.body;

      const existingBranch = await Branch.findOne({ name });
      if (existingBranch) {
        return res
          .status(400)
          .json({ message: "Branch with this name already exists" });
      }

      const branch = new Branch({
        name,
        location,
        contactNumber,
      });

      await branch.save();
      res.status(201).json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/branch/update/:id
// @desc    Update a branch
// @access  Site admin only
router.put(
  "/admin/branch/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid branch Id"),
    ...branchValidation(),
    ...phoneValidation(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!branch) return res.status(404).json({ message: "Branch not found" });

      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/branches
// @desc    Get all branches
// @access  Site admin only
router.get(
  "/admin/branches",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    query("includeEmployees")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for include employees"),
    query("includeOrders")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for include 0rders"),
  ],
  async (req, res) => {
    try {
      const { includeEmployees, includeOrders } = req.query;

      let query = Branch.find();
      if (includeEmployees === true) {
        query = query.populate("employees");
      }
      if (includeOrders === true) {
        query = query.populate("orders");
      }

      const branches = await query.exec();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/branch/get/:id
// @desc    Get branch by ID
// @access  Site admin only
router.get(
  "/admin/branch/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid Branch ID"),
    query("includeEmployees")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for include employees"),
    query("includeOrders")
      .optional()
      .isBoolean()
      .withMessage("Invalid value for include orders"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { includeEmployees, includeOrders } = req.query;
      let query = Branch.findById(req.params.id);

      if (includeEmployees === true) {
        query = query.populate("employees");
      }
      if (includeOrders === true) {
        query = query.populate("orders");
      }

      const branch = await query.exec();
      if (!branch) return res.status(404).json({ message: "Branch not found" });

      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
