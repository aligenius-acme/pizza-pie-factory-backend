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
  stripUnwantedFields,
  handleError,
} = require("../utils/helpers");
const messages = require("../utils/messages");
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /customer/register
// @desc    Register a new customer or update a guest account
// @access  PUBLIC
router.post(
  "/customer/register",
  [customerValidation.all()],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Customer.schema);

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
        if (customer.isGuest && filteredBody.isGuest) {
          Object.assign(customer, filteredBody);
          await Customer.findByIdAndUpdate(customer._id, customer);
          return res.status(201).json({
            message: messages.GUEST_ACCOUNT_UPDATED,
            token: generateToken(customer._id),
          });
        }
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
      handleError("/customer/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /customer/update
// @desc    Update customer profile
// @access  PRIVATE
router.put(
  "/customer/update",
  authMiddleware.authenticateJWT,
  [
    customerValidation.name,
    customerValidation.phone,
    customerValidation.deliveryAddresses,
    customerValidation.paymentMethods,
  ],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const id = req.user.id;

      // // Ensure the authenticated user is updating their own profile
      // if (req.user.id !== id) {
      //   return res.status(403).json({ message: messages.UNAUTHORIZED_ACCESS });
      // }

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Customer.schema);

      // Check for duplicate email or phone (excluding the current user)
      // const existingCustomer = await Customer.findOne({
      //   $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
      //   _id: { $ne: id },
      // }).lean();

      // if (existingCustomer) {
      //   return res.status(400).json({ message: messages.CUSTOMER_EXISTS });
      // }

      // Find the customer by ID
      const customer = await Customer.findById(id).select("-password");
      if (!customer) {
        return res.status(404).json({ message: messages.CUSTOMER_NOT_FOUND });
      }

      // // Hash new password if provided
      // if (filteredBody.password) {
      //   filteredBody.password = await hashPassword(filteredBody.password);
      // }

      // Update customer fields
      Object.assign(customer, filteredBody);
      await customer.save();

      // Return success response
      res.status(200).json({
        message: messages.PROFILE_UPDATE_SUCCESS,
        customer,
      });
    } catch (error) {
      handleError(`/customer/update/${req.user.id}`, "PUT", error, req, res);
    }
  }
);

// @route   POST /customer/login
// @desc    Authenticate customer and return JWT token
// @access  PUBLIC
router.post(
  "/customer/login",
  [customerValidation.email, customerValidation.password],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

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
      handleError("/customer/login", "POST", error, req, res);
    }
  }
);

// @route   GET /customer
// @desc    Get customer profile by ID
// @access  PRIVATE
router.get("/customer", authMiddleware.authenticateJWT, async (req, res) => {
  try {
    const errors = validateRequest(req);
    if (errors) return res.status(400).json({ errors });

    // Find customer by ID and exclude password field
    const customer = await Customer.findById(req.user.id)
      .select("-password")
      .lean();
    if (!customer) {
      return res.status(404).json({ message: messages.CUSTOMER_NOT_FOUND });
    }

    // If Order model exists, fetch customer's orders
    if (typeof Order !== "undefined" && mongoose.models.Order) {
      customer.orders = await Order.find({ customer: req.user.id }).lean();
    }

    // Return customer data
    res.status(200).json(customer);
  } catch (error) {
    handleError(`/customer/${req.user.id}`, "GET", error, req, res);
  }
});

// @route   POST /customer/forgot-password
// @desc    Initiate password reset process
// @access  PUBLIC
router.post(
  "/customer/forgot-password",
  [customerValidation.email],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

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
      handleError("/customer/forgot-password", "POST", error, req, res);
    }
  }
);

// @route   POST /customer/reset-password/:token
// @desc    Reset customer password using reset token
// @access  PUBLIC
router.post(
  "/customer/reset-password/:token",
  [
    param("token").isString().withMessage(messages.INVALID_RESET_TOKEN),
    customerValidation.password,
  ],
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

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
      handleError("/customer/reset-password", "POST", error, req, res);
    }
  }
);

module.exports = router;
