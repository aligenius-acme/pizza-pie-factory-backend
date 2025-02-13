const express = require("express");
const { param } = require("express-validator");
const { branchValidation } = require("../../utils/validation");
const Branch = require("../../models/Branch");
const authMiddleware = require("../../middleware/auth");
const { validateRequest } = require("../../utils/helpers");

const router = express.Router();

// @route   POST /admin/branch/register
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/branch/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [branchValidation.all()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = ["name", "location", "contactNumber"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let existingBranch = await Branch.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingBranch) {
        return res.status(400).json({ message: "Branch already exists" });
      }

      const branch = new Branch(filteredBody);
      await branch.save();

      res.status(201).json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/branch/update/:id
// @access  Site admin only
router.put(
  "/admin/branch/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid branch ID"),
    branchValidation.all(),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const allowedFields = ["name", "location", "contactNumber"];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let branch = await Branch.findById(id);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }

      Object.assign(branch, filteredBody);
      await branch.save();

      res.status(200).json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/branches
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branches",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const branches = await Branch.find().lean();
      if (!branches.length) {
        return res.status(404).json({ message: "No branches found" });
      }

      res.status(200).json(branches);
    } catch (error) {
      res;
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/branch/get/:id
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/branch/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid Branch ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const branch = await Branch.findById(id).lean();
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }

      res.status(200).json(branch);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
