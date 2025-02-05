const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const crypto = require("crypto");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: AppleStrategy } = require("passport-apple");
const { Strategy: FacebookStrategy } = require("passport-facebook");
const { body, validationResult } = require("express-validator");
const Customer = require("../models/Customer");
const { AuthProviders } = require("../utils/enums");
const { sendEmail } = require("../utils/email");
const {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
} = require("../utils/validation");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const FRONTEND_URL = process.env.FRONTEND_URL;

//#region --CUSTOMER--

//#region CUSTOMER REGISTRATION
// Register customer with Username & Password
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

      const { firstName, lastName, email, phone, password } = req.body;
      let customer = await Customer.findOne({ email });
      if (customer)
        return res.status(400).json({ message: "User already exists" });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      customer = new Customer({
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        authProvider: AuthProviders.LOCAL,
      });
      await customer.save();

      const token = jwt.sign({ id: customer._id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
//#endregion

//#region CUSTOMER LOGIN
// Login customer with Username & Password
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
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
//#endregion

//#region CUSTOMER PASSWORD RECOVERY
// Customer forgot password
router.get(
  "/customer/forgot-password",
  [...emailValidation()],
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

      // Generate a password reset token
      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetExpiry = Date.now() + 3600000; // Token valid for 1 hour

      customer.resetPasswordToken = resetToken;
      customer.resetPasswordExpiry = resetExpiry;
      await customer.save();

      // Send email with the reset link using the email utility
      const resetLink = `${FRONTEND_URL}/customer/reset-password/${resetToken}`;
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

// Customer reset password
router.post(
  "/customer/reset-password/:token",
  [...passwordValidation()],
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    // Validate the incoming data
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

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update password and clear reset token
      customer.passwordHash = hashedPassword;
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpiry = undefined;

      await customer.save();
      res.status(200).json({ message: "Password has been successfully reset" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
//#endregion

//#region CUSTOMER OAUTH LOGIN
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
//#endregion

//#endregion
module.exports = router;
