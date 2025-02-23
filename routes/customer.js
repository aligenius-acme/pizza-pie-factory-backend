const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { param } = require("express-validator");
const Customer = require("../models/Customer");
const authMiddleware = require("../middleware/auth");
const { sendEmail } = require("../utils/email");
const { customerValidation } = require("../utils/validation");
const {
  generateToken,
  validateRequest,
  hashPassword,
  logError,
} = require("../utils/helpers");
const messages = require("../utils/messages");
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /customer/register
// @desc    Register a new customer or update a guest account
// @access  Public
router.post(
  "/customer/register",
  [customerValidation.all()],
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
        "deliveryAddresses",
        "paymentMethods",
        "isGuest",
      ];

      // Filter request body to only include allowed fields
      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
      );

      // Check if customer already exists (skip for guest accounts)
      let customer =
        !filteredBody.isGuest && (filteredBody.email || filteredBody.phone)
          ? await Customer.findOne({
              $or: [
                { email: filteredBody.email },
                { phone: filteredBody.phone },
              ],
            }).lean()
          : null;

      // Handle existing customer scenarios
      if (customer) {
        // If existing customer is a guest, update their account
        if (customer.isGuest && filteredBody.isGuest) {
          Object.assign(customer, filteredBody);
          await Customer.findByIdAndUpdate(customer._id, customer);
          return res.status(201).json({
            message: messages.GUEST_ACCOUNT_UPDATED,
            token: generateToken(customer._id),
          });
        }
        // If customer already exists and is not a guest, return error
        return res.status(400).json({ message: messages.CUSTOMER_EXISTS });
      }

      // Hash password for non-guest accounts
      if (!filteredBody.isGuest) {
        filteredBody.password = await hashPassword(filteredBody.password);
      }

      // Create and save new customer
      customer = new Customer(filteredBody);
      await customer.save();

      // Return success response with JWT token
      res.status(201).json({
        message: messages.REGISTRATION_SUCCESS,
        token: generateToken(customer._id),
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer registration error:", error);

      // Log error in MongoDB
      await logError(
        "/customer/register",
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

// @route   PUT /customer/update/:id
// @desc    Update customer profile
// @access  Private
router.put(
  "/customer/update/:id",
  authMiddleware.authenticateJWT, // Require JWT authentication
  [param("id").isMongoId(), customerValidation.all()], // Validate ID and request body
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Ensure the authenticated user is updating their own profile
      if (req.user.id !== id) {
        return res.status(403).json({ message: messages.UNAUTHORIZED_ACCESS });
      }

      // Define allowed fields for updates
      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "password",
        "deliveryAddresses",
        "paymentMethods",
        "loyaltyPoints",
        "isGuest",
      ];

      // Filter request body to only include allowed fields
      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
      );

      // Check for duplicate email or phone (excluding the current user)
      const existingCustomer = await Customer.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
        _id: { $ne: id },
      }).lean();

      if (existingCustomer) {
        return res.status(400).json({ message: messages.CUSTOMER_EXISTS });
      }

      // Find the customer by ID
      const customer = await Customer.findById(id).select("-password");
      if (!customer) {
        return res.status(404).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // Hash new password if provided
      if (filteredBody.password) {
        filteredBody.password = await hashPassword(filteredBody.password);
      }

      // Update customer fields
      Object.assign(customer, filteredBody);
      await customer.save();

      // Return success response
      res.status(200).json({
        message: messages.PROFILE_UPDATE_SUCCESS,
        customer,
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer update error:", error);

      // Log error in MongoDB
      await logError(
        `/customer/update/${param("id").isMongoId()}`,
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

// @route   POST /customer/login
// @desc    Authenticate customer and return JWT token
// @access  Public
router.post(
  "/customer/login",
  [customerValidation.email, customerValidation.password], // Validate email and password
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { email, password } = req.body;

      // Find customer by email
      const customer = await Customer.findOne({ email }).lean();
      if (!customer) {
        return res.status(400).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // Compare provided password with hashed password
      const isPasswordValid = await bcrypt.compare(password, customer.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: messages.INVALID_CREDENTIALS });
      }

      // Return success response with JWT token
      res.status(200).json({
        message: messages.LOGIN_SUCCESS,
        token: generateToken(customer._id),
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer login error:", error);

      // Log error in MongoDB
      await logError(
        "/customer/login",
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

// @route   GET /customer/get/:id
// @desc    Get customer profile by ID
// @access  Private
router.get(
  "/customer/get/:id",
  authMiddleware.authenticateJWT, // Require JWT authentication
  [param("id").isMongoId()], // Validate ID
  async (req, res) => {
    try {
      // Validate request parameters
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      // Find customer by ID and exclude password field
      const customer = await Customer.findById(id).select("-password").lean();
      if (!customer) {
        return res.status(404).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // If Order model exists, fetch customer's orders
      if (typeof Order !== "undefined" && mongoose.models.Order) {
        customer.orders = await Order.find({ customer: id }).lean();
      }

      // Return customer data
      res.status(200).json(customer);
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer get error:", error);

      // Log error in MongoDB
      await logError(
        `/customer/get/${param("id").isMongoId()}`,
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

// @route   POST /customer/forgot-password
// @desc    Initiate password reset process
// @access  Public
router.post(
  "/customer/forgot-password",
  [customerValidation.email], // Validate email
  async (req, res) => {
    try {
      // Validate request body
      if (validateRequest(req, res)) return;

      const { email } = req.body;

      // Find customer by email
      const customer = await Customer.findOne({ email });
      if (!customer) {
        return res.status(400).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // Generate and save reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      customer.resetPasswordToken = resetToken;
      customer.resetPasswordExpiry =
        Date.now() + (parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000); // Default to 1 hour
      await customer.save();

      // Create reset link
      const resetLink = `${FRONTEND_URL}/customer/reset-password/${resetToken}`;

      // Send reset email
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
      res.status(200).json({ message: messages.RESET_EMAIL_SENT });
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer password forgot:", error);

      // Log error in MongoDB
      await logError(
        "/customer/forgot-password",
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

// @route   POST /customer/reset-password/:token
// @desc    Reset customer password using reset token
// @access  Public
router.post(
  "/customer/reset-password/:token",
  [param("token").isString()], // Validate reset token
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Validate request body
      if (validateRequest(req, res)) return;

      // Find customer by valid reset token
      const customer = await Customer.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }, // Check if token is not expired
      });

      if (!customer) {
        return res.status(400).json({ message: messages.INVALID_RESET_TOKEN });
      }

      // Update password and clear reset token
      customer.password = await hashPassword(password);
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpiry = undefined;
      await customer.save();

      // Return success response
      res.status(200).json({ message: messages.PASSWORD_RESET_SUCCESS });
    } catch (error) {
      // Handle unexpected errors
      console.error("Customer password reset:", error);

      // Log error in MongoDB
      await logError(
        "/customer/reset-password",
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
