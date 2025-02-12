const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { param } = require("express-validator");
const Employee = require("../../models/Employee");
const Branch = require("../../models/Branch");
const authMiddleware = require("../../middleware/auth");
const { sendEmail } = require("../../utils/email");
const { employeeValidation } = require("../../utils/validation");
const {
  generateToken,
  validateRequest,
  hashPassword,
} = require("../../utils/helpers");
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /admin/employee/register
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/register",
  // authMiddleware.authenticateJWT,
  // authMiddleware.authenticateAdmin,
  [employeeValidation.all()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "password",
        "role",
        "branchId",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) => allowedFields.includes(key) && value !== undefined
        )
      );

      const branch = await Branch.findById(filteredBody.branchId).lean();
      if (!branch) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      let existingEmployee = await Employee.findOne({
        email: filteredBody.email,
      }).lean();

      if (existingEmployee) {
        return res.status(400).json({ message: "Employee already exists" });
      }

      filteredBody.password = await hashPassword(filteredBody.password);

      const employee = new Employee(filteredBody);
      await employee.save();

      res.status(201).json({
        token: generateToken(employee._id, { role: employee.role }),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/employee/update/:id
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/employee/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid employee ID"),
    employeeValidation.all(),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "password",
        "role",
        "branchId",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) => allowedFields.includes(key) && value !== undefined
        )
      );

      let employee = await Employee.findById(id).select("-password");
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (filteredBody.password) {
        filteredBody.password = await hashPassword(filteredBody.password);
      }

      Object.assign(employee, filteredBody);
      await employee.save();

      res.status(200).json(employee);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/employee/login
// @access  PUBLIC
router.get(
  "/admin/employee/login",
  [employeeValidation.email, employeeValidation.password],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;
      const { email, password } = req.body;

      const employee = await Employee.findOne({ email }).lean();
      if (!employee) return res.status(400).json({ message: "User not found" });

      if (!(await bcrypt.compare(password, employee.password)))
        return res.status(400).json({ message: "Invalid credentials" });

      res.status(200).json({
        token: generateToken(employee._id, { role: employee.role }),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/employee/get:id
// @access  PRIVATE
router.get(
  "/admin/employee/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid employee ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const employee = await Employee.findById(id).select("-password").lean();
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.status(200).json(employee);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST admin/employee/forgot-password
// @access  PUBLIC
router.post(
  "/admin/employee/forgot-password",
  [employeeValidation.email],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { email } = req.body;
      const employee = await Employee.findOne({ email });
      if (!employee) return res.status(400).json({ message: "User not found" });

      const resetToken = crypto.randomBytes(32).toString("hex");
      employee.resetPasswordToken = resetToken;
      employee.resetPasswordExpiry =
        Date.now() + (parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000);

      await employee.save();
      const resetLink = `${FRONTEND_URL}/employee/reset-password/${resetToken}`;

      try {
        await sendEmail(
          email,
          "Password Reset Request",
          `<p>Click below to reset your password:</p> <a href="${resetLink}">Reset Password</a>`
        );
      } catch (emailError) {
        return res.status(500).json({
          message: "Failed to send reset email",
          error: emailError.message,
        });
      }

      res.status(200).json({
        message: "Password reset link sent to your email",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /admin/employee/reset-password
// @access  PUBLIC
router.post(
  "/admin/employee/reset-password/:token",
  [param("token").isString().withMessage("Invalid password reset token")],
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (validateRequest(req, res)) return;

      const employee = await Employee.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
      });

      if (!employee) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      employee.password = await hashPassword(password);
      employee.resetPasswordToken = undefined;
      employee.resetPasswordExpiry = undefined;

      await employee.save();
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
