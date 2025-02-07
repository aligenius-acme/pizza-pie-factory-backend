const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { param, body, validationResult } = require("express-validator");
const Employee = require("../../models/Employee");
const authMiddleware = require("../../middleware/auth");
const { sendEmail } = require("../../utils/email");
const {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
  roleValidation,
} = require("../../utils/validation");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const PASSWORD_RESET_TOKEN_EXPIRY = process.env.PASSWORD_RESET_TOKEN_EXPIRY;

// @route   POST /admin/employee/register
// @desc    Register new employee using user name and password
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    ...nameValidation(),
    ...emailValidation(),
    ...phoneValidation(),
    ...passwordValidation(),
    ...roleValidation(),
    body("branchId")
      .notEmpty()
      .withMessage("Branch is required")
      .isMongoId()
      .withMessage("Invalid branch"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, phone, password, role, branchId } =
        req.body;

      let employee = await Employee.findOne({ email });
      if (employee) {
        return res.status(400).json({ message: "User already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      employee = new Employee({
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        role,
        branchId,
      });
      await employee.save();

      const token = jwt.sign(
        { id: employee._id, role: employee.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /admin/employee/update/:id
// @desc    Update employee details (excluding password)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/employee/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid employee Id"),
    ...nameValidation(),
    ...emailValidation(),
    ...phoneValidation(),
    ...passwordValidation(),
    ...roleValidation(),
    body("branchId")
      .notEmpty()
      .withMessage("Branch is required")
      .isMongoId()
      .withMessage("Invalid branch"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    if (req.user.id !== id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this profile" });
    }

    const { firstName, lastName, email, phone, role, branchId } = req.body;

    try {
      let employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (firstName) employee.firstName = firstName;
      if (lastName) employee.lastName = lastName;
      if (email) employee.email = email;
      if (phone) employee.phone = phone;
      if (role) employee.role = role;
      if (branchId) employee.branchId = branchId;

      await employee.save();

      res
        .status(200)
        .json({ message: "Employee updated successfully", employee });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/employee/login
// @desc    Login an employee using email and password
// @access  PUBLIC
router.get(
  "/admin/employee/login",
  [
    ...emailValidation(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const employee = await Employee.findOne({ email });
      if (!employee) return res.status(400).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, employee.passwordHash);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        {
          id: employee._id,
          role: employee.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /admin/employee/get:id
// @desc    Get logged in employee details
// @access  PRIVATE
router.get(
  "/admin/employee/get/:id",
  authMiddleware.authenticateJWT,
  param("id").isMongoId().withMessage("Invalid employee Id"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user.id !== id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to get this profile" });
      }
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.status(200).json({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        branch: employee.branchId
          ? employee.branchId.name
          : "No branch assigned", // assuming branch has a 'name' field
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST admin/employee/forgot-password
// @desc    Initiate password recovery
// @access  PUBLIC
router.post(
  "/admin/employee/forgot-password",
  [...emailValidation()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const employee = await Employee.findOne({ email });
      if (!employee) {
        return res.status(400).json({ message: "User not found" });
      }

      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetExpiryInMillis =
        parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000;
      const resetExpiry = new Date(Date.now() + resetExpiryInMillis);

      employee.resetPasswordToken = resetToken;
      employee.resetPasswordExpiry = resetExpiry;
      await employee.save();

      const resetLink = `${FRONTEND_URL}/employee/reset-password/${resetToken}`;
      const htmlContent = `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`;

      await sendEmail(email, "Password Reset Request", htmlContent);

      res
        .status(200)
        .json({ message: "Password reset link has been sent to your email" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /admin/employee/reset-password
// @desc    Reset password using token
// @access  PUBLIC
router.post(
  "/admin/employee/reset-password/:token",
  [
    param("token").isString().withMessage("Invalid password reset token"),
    ...passwordValidation(),
  ],
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const employee = await Employee.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
      });

      if (!employee) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      employee.passwordHash = hashedPassword;
      employee.resetPasswordToken = undefined;
      employee.resetPasswordExpiry = undefined;

      await employee.save();
      res.status(200).json({ message: "Password has been successfully reset" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
