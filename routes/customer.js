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
} = require("../utils/helpers");
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /customer/register
// @access  PUBLIC
router.post(
  "/customer/register",
  [customerValidation.all()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

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
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let customer =
        !filteredBody.isGuest && (filteredBody.email || filteredBody.phone)
          ? await Customer.findOne({
              $or: [
                { email: filteredBody.email },
                { phone: filteredBody.phone },
              ],
            }).lean()
          : null;

      if (customer) {
        if (customer.isGuest && filteredBody.isGuest) {
          Object.assign(customer, filteredBody);
          await customer.save();
          return res.status(201).json({ token: generateToken(customer._id) });
        }
        return res.status(400).json({
          message: "Customer with this email or phone already exists",
        });
      }

      if (!filteredBody.isGuest)
        filteredBody.password = await hashPassword(filteredBody.password);

      customer = new Customer(filteredBody);
      await customer.save();

      res.status(201).json({ token: generateToken(customer._id) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /customer/update/:id
// @access  PRIVATE
router.put(
  "/customer/update/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid customer ID"),
    customerValidation.all(),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      if (req.user.id !== id)
        return res
          .status(403)
          .json({ message: "Unauthorized to update this profile" });

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
      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let existingCustomer = await Customer.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
        _id: { $ne: id },
      }).lean();

      if (existingCustomer) {
        return res.status(400).json({
          message: "Customer with this email or phone already exists",
        });
      }

      let customer = await Customer.findById(id).select("-password");
      if (!customer)
        return res.status(404).json({ message: "Customer not found" });

      if (filteredBody.password)
        filteredBody.password = await hashPassword(filteredBody.password);

      Object.assign(customer, filteredBody);
      await customer.save();

      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /customer/login
// @access  PUBLIC
router.post(
  "/customer/login",
  [customerValidation.email, customerValidation.password],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;
      const { email, password } = req.body;

      const customer = await Customer.findOne({ email }).lean();
      if (!customer) return res.status(400).json({ message: "User not found" });

      const isPasswordValid = await bcrypt.compare(password, customer.password);

      if (!isPasswordValid)
        return res.status(400).json({ message: "Invalid credentials" });

      res.status(200).json({
        token: generateToken(customer._id),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /customer/get/:id
// @access  PRIVATE
router.get(
  "/customer/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid customer ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      let customer = await Customer.findById(id).select("-password").lean();
      if (!customer) return res.status(404).json({ message: "User not found" });

      if (typeof Order !== "undefined" && mongoose.models.Order) {
        customer.orders = await Order.find({ customer: id }).lean();
      }

      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /customer/forgot-password
// @access  PUBLIC
router.post(
  "/customer/forgot-password",
  [customerValidation.email],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { email } = req.body;
      const customer = await Customer.findOne({ email });
      if (!customer) return res.status(400).json({ message: "User not found" });

      const resetToken = crypto.randomBytes(32).toString("hex");
      customer.resetPasswordToken = resetToken;
      customer.resetPasswordExpiry =
        Date.now() + (parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000);

      await customer.save();
      const resetLink = `${FRONTEND_URL}/customer/reset-password/${resetToken}`;

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

      res
        .status(200)
        .json({ message: "Password reset link sent to your email" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /customer/reset-password/:token
// @access  PUBLIC
router.post(
  "/customer/reset-password/:token",
  param("token").isString().withMessage("Invalid password reset token"),
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (validateRequest(req, res)) return;

      const customer = await Customer.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
      });
      if (!customer) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      customer.password = await hashPassword(password);
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpiry = undefined;
      await customer.save();

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
