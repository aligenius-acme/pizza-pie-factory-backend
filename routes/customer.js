const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

/* TO BE USED IF OAUTH IS REQUIRED
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: AppleStrategy } = require("passport-apple");
const { Strategy: FacebookStrategy } = require("passport-facebook");
*/

const { param, body, validationResult } = require("express-validator");
const Customer = require("../models/Customer");
const authMiddleware = require("../middleware/auth");
const { AuthProviders } = require("../utils/enums");
const { sendEmail } = require("../utils/email");
const {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
  addressValidation,
} = require("../utils/validation");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const PASSWORD_RESET_TOKEN_EXPIRY = process.env.PASSWORD_RESET_TOKEN_EXPIRY;

// @route   POST /customer/register
// @desc    Register a new customer using user name and password
// @access  PUBLIC
router.post(
  "/customer/register",
  [
    ...nameValidation(),
    ...emailValidation(),
    ...phoneValidation(),
    ...passwordValidation(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        deliveryAddresses,
        paymentMethods,
        isGuest,
      } = req.body;

      let customer = await Customer.findOne({ email });

      if (customer) {
        if (customer.isGuest && isGuest) {
          customer.firstName = firstName;
          customer.lastName = lastName;
          customer.phone = phone;
          customer.deliveryAddresses = deliveryAddresses;
          customer.paymentMethods = paymentMethods;
          await customer.save();

          const token = jwt.sign({ id: customer._id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRY,
          });
          return res.json({ token });
        }
        return res.status(400).json({ message: "User already exists" });
      }
      if (isGuest) {
        customer = new Customer({
          firstName,
          lastName,
          email,
          phone,
          deliveryAddresses,
          paymentMethods,
          isGuest: true,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        customer = new Customer({
          firstName,
          lastName,
          email,
          phone,
          passwordHash,
          authProvider: AuthProviders.LOCAL,
          deliveryAddresses,
          paymentMethods,
          isGuest: false,
        });
      }

      await customer.save();

      // Generate token
      const token = jwt.sign({ id: customer._id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });
      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   PUT /customer/update/:id
// @desc    Update customer details, including delivery addresses
// @access  PRIVATE
router.put(
  "/customer/update/:id",
  authMiddleware.authenticateJWT,
  [
    param("id").isMongoId().withMessage("Invalid customer Id"),
    ...nameValidation(),
    ...emailValidation(),
    ...phoneValidation(),
    ...addressValidation(),
  ],
  async (req, res) => {
    try {
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

      const {
        firstName,
        lastName,
        email,
        phone,
        deliveryAddresses,
        paymentMethods,
        loyaltyPoints,
      } = req.body;

      let customer = await Customer.findById(id);
      if (!customer)
        return res.status(404).json({ message: "Customer not found" });

      if (firstName) customer.firstName = firstName;
      if (lastName) customer.lastName = lastName;
      if (email) customer.email = email;
      if (phone) customer.phone = phone;

      if (deliveryAddresses && Array.isArray(deliveryAddresses)) {
        customer.deliveryAddresses = deliveryAddresses;
      }

      if (paymentMethods && Array.isArray(paymentMethods)) {
        customer.paymentMethods = paymentMethods;
      }

      if (loyaltyPoints) customer.loyaltyPoints = loyaltyPoints;

      await customer.save();

      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /customer/login
// @desc    Login a customer using user name and password
// @access  PUBLIC
router.get(
  "/customer/login",
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
      const customer = await Customer.findOne({ email });
      if (!customer) return res.status(400).json({ message: "User not found" });
      const isMatch = await bcrypt.compare(password, customer.passwordHash);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        {
          id: customer._id,
          authProvider: customer.authProvider,
          authProviderId: customer.authProviderId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   GET /customer/get
// @desc    Get logged in customer details
// @access  PRIVATE
router.get(
  "/customer/get/:id",
  authMiddleware.authenticateJWT,
  param("id").isMongoId().withMessage("Invalid customer Id"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      if (req.user.id !== id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to get this profile" });
      }

      let customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({ message: "User not found" });
      }

      if (mongoose.modelNames().includes("Order")) {
        await customer.populate("orders");
      } else {
        customer.orders = [];
      }

      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /customer/forgot-password
// @desc    Initiate password recovery
// @access  PUBLIC
router.post(
  "/customer/forgot-password",
  [
    param("token").isString().withMessage("Invalid password reset token"),
    ...emailValidation(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const customer = await Customer.findOne({ email });
      if (!customer) {
        return res.status(400).json({ message: "User not found" });
      }

      const resetToken = crypto.randomBytes(20).toString("hex");

      const resetExpiryInMillis =
        parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000;
      const resetExpiry = new Date(Date.now() + resetExpiryInMillis);

      customer.resetPasswordToken = resetToken;
      customer.resetPasswordExpiry = new Date(resetExpiry);
      await customer.save();

      const resetLink = `${FRONTEND_URL}/customer/reset-password/${resetToken}`;
      const htmlContent = `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`;

      await sendEmail(email, "Password Reset Request", htmlContent);

      res
        .status(204)
        .json({ message: "Password reset link has been sent to your email" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// @route   POST /customer/reset-password
// @desc    Reset password using token
// @access  PUBLIC
router.post(
  "/customer/reset-password/:token",
  [...passwordValidation()],
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const customer = await Customer.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
      });

      if (!customer) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      customer.passwordHash = hashedPassword;
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpiry = undefined;

      await customer.save();
      res.status(204).json({ message: "Password has been successfully reset" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/* TO BE USED IF OAUTH IS REQUIRED
// OAuth Strategy Handler
async function handleOAuthLogin(profile, provider, done) {
  try {
    let customer = await Customer.findOne({ authProviderId: profile.id });
    if (!customer) {
      customer = new Customer({
        firstName: profile.name?.givenName || profile.displayName.split(" ")[0],
        lastName:
          profile.name?.familyName || profile.displayName.split(" ")[1] || "",
        email: profile.emails?.[0]?.value,
        authProvider: provider,
        authProviderId: profile.id,
      });
      await customer.save();
    }
    done(null, customer);
  } catch (error) {
    done(error, null);
  }
}

// Google Auth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) =>
      handleOAuthLogin(profile, AuthProviders.GOOGLE, done)
  )
);

// Apple Auth Strategy
passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      callbackURL: "/auth/apple/callback",
    },
    (accessToken, refreshToken, profile, done) =>
      handleOAuthLogin(profile, AuthProviders.APPLE, done)
  )
);

// Facebook Auth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name"],
    },
    (accessToken, refreshToken, profile, done) =>
      handleOAuthLogin(profile, AuthProviders.FACEBOOK, done)
  )
);

// OAuth Routes (Google)
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });
    res.json({ token });
  }
);

// OAuth Routes (Apple)
router.get("/auth/apple", passport.authenticate("apple"));
router.get(
  "/auth/apple/callback",
  passport.authenticate("apple", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });
    res.json({ token });
  }
);

// OAuth Routes (Facebook)
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });
    res.json({ token });
  }
);
*/

module.exports = router;
