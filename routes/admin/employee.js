const express = require("express");
const bcrypt = require("bcryptjs");
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
  logError,
} = require("../../utils/helpers");
const messages = require("../../utils/messages"); // Import messages
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /admin/employee/register
// @desc    Register a new employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/register",
  authMiddleware.authenticateJWT, // Require JWT authentication
  authMiddleware.authenticateAdmin, // Require admin role
  [employeeValidation.all()], // Validate all employee fields
  async (req, res) => {
    try {
      // Validate request body against validation rules
      if (validateRequest(req, res)) return;

      // Define allowed fields to prevent unwanted data injection
      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "password",
        "role",
        "branchId",
      ];

      // Filter request body to only include allowed fields
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value != null
        )
      );

      // Verify that the branch exists
      const branch = await Branch.findById(filteredBody.branchId).lean();
      if (!branch) {
        return res.status(400).json({ message: messages.INVALID_BRANCH_ID });
      }

      // Check if an employee with the same email or phone already exists
      let existingEmployee = await Employee.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
      }).lean();

      if (existingEmployee) {
        return res.status(400).json({
          message: messages.EMPLOYEE_EXISTS,
        });
      }

      // Hash the password before saving
      filteredBody.password = await hashPassword(filteredBody.password);

      // Create and save the new employee
      const employee = new Employee(filteredBody);
      await employee.save();

      // Return success response with JWT token
      res.status(201).json({
        message: messages.REGISTRATION_SUCCESS,
        token: generateToken(employee._id, { role: employee.role }),
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee registration error:", error);

      // Log error in MongoDB
      await logError(
        "/admin/employee/register",
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

// @route   PUT /admin/employee/update/:id
// @desc    Update an employee's details (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/employee/update/:id",
  authMiddleware.authenticateJWT, // Require JWT authentication
  authMiddleware.authenticateAdmin, // Require admin role
  [
    param("id").isMongoId().withMessage(messages.INVALID_EMPLOYEE_ID), // Validate employee ID
    employeeValidation.all(), // Validate all employee fields
  ],
  async (req, res) => {
    try {
      // Validate request body against validation rules
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Define allowed fields to prevent unwanted data injection
      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "password",
        "role",
        "branchId",
      ];

      // Filter request body to only include allowed fields
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      // Check if another employee with the same email or phone already exists
      let existingEmployee = await Employee.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
        _id: { $ne: id }, // Exclude the current employee from the check
      }).lean();

      if (existingEmployee) {
        return res.status(400).json({
          message: messages.EMPLOYEE_EXISTS,
        });
      }

      // Verify that the branch exists
      const branch = await Branch.findById(filteredBody.branchId).lean();
      if (!branch) {
        return res.status(400).json({ message: messages.INVALID_BRANCH_ID });
      }

      // Find the employee by ID
      let employee = await Employee.findById(id).select("-password");
      if (!employee) {
        return res.status(404).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Hash the new password if provided
      if (filteredBody.password) {
        filteredBody.password = await hashPassword(filteredBody.password);
      }

      // Update the employee's details
      Object.assign(employee, filteredBody);
      await employee.save();

      // Return success response with updated employee details
      res.status(200).json({
        message: messages.PROFILE_UPDATE_SUCCESS,
        employee,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee update error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/employee/update/${param("id").isMongoId()}`,
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

// @route   POST /admin/employee/login
// @desc    Authenticate an employee and return a JWT token
// @access  PUBLIC
router.post(
  "/admin/employee/login",
  [employeeValidation.email, employeeValidation.password], // Validate email and password
  async (req, res) => {
    try {
      // Validate request body against validation rules
      if (validateRequest(req, res)) return;

      const { email, password } = req.body;

      // Find the employee by email
      const employee = await Employee.findOne({ email }).lean();
      if (!employee) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Check if employee is active
      if (employee.isActive === false) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_ACTIVE });
      }

      // Compare the provided password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: messages.INVALID_CREDENTIALS });
      }

      // Return success response with JWT token
      res.status(200).json({
        message: messages.LOGIN_SUCCESS,
        token: generateToken(employee._id, { role: employee.role }),
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee login error:", error);

      // Log error in MongoDB
      await logError(
        "/admin/employee/login",
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

// @route   GET /admin/employee/get/:id
// @desc    Get an employee's details by ID
// @access  PRIVATE
router.get(
  "/admin/employee/get/:id",
  authMiddleware.authenticateJWT, // Require JWT authentication
  [param("id").isMongoId().withMessage(messages.INVALID_EMPLOYEE_ID)], // Validate employee ID
  async (req, res) => {
    try {
      // Validate request parameters
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Find the employee by ID and exclude the password field
      const employee = await Employee.findById(id).select("-password").lean();
      if (!employee) {
        return res.status(404).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Return success response with employee details
      res.status(200).json(employee);
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee get error:", error);

      // Log error in MongoDB
      await logError(
        `/admin/employee/get/${param("id").isMongoId()}`,
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

// @route   POST /admin/employee/forgot-password
// @desc    Initiate password reset process for an employee
// @access  PUBLIC
router.post(
  "/admin/employee/forgot-password",
  [employeeValidation.email], // Validate email
  async (req, res) => {
    try {
      // Validate request body against validation rules
      if (validateRequest(req, res)) return;

      const { email } = req.body;

      // Find the employee by email
      const employee = await Employee.findOne({ email });
      if (!employee) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Generate and save a reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      employee.resetPasswordToken = resetToken;
      employee.resetPasswordExpiry =
        Date.now() + (parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000); // Default to 1 hour
      await employee.save();

      // Create the reset link
      const resetLink = `${FRONTEND_URL}/employee/reset-password/${resetToken}`;

      // Send the reset email
      try {
        await sendEmail(
          email,
          messages.RESET_EMAIL_SUBJECT,
          messages.RESET_EMAIL_HTML(resetLink)
        );
      } catch (emailError) {
        return res.status(500).json({
          message: messages.RESET_EMAIL_FAILED,
          error: emailError.message,
        });
      }

      // Return success response
      res.status(200).json({
        message: messages.RESET_EMAIL_SENT,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee password forgot:", error);

      // Log error in MongoDB
      await logError(
        "/admin/employee/forgot-password",
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

// @route   POST /admin/employee/reset-password/:token
// @desc    Reset an employee's password using a reset token
// @access  PUBLIC
router.post(
  "/admin/employee/reset-password/:token",
  [param("token").isString().withMessage(messages.INVALID_RESET_TOKEN)], // Validate reset token
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Validate request body against validation rules
      if (validateRequest(req, res)) return;

      // Find the employee by valid reset token
      const employee = await Employee.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }, // Check if token is not expired
      });

      if (!employee) {
        return res.status(400).json({ message: messages.INVALID_RESET_TOKEN });
      }

      // Update the password and clear the reset token
      employee.password = await hashPassword(password);
      employee.resetPasswordToken = undefined;
      employee.resetPasswordExpiry = undefined;
      await employee.save();

      // Return success response
      res.status(200).json({
        message: messages.PASSWORD_RESET_SUCCESS,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Employee password reset:", error);

      // Log error in MongoDB
      await logError(
        "/admin/employee/reset-password",
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

module.exports = router;
