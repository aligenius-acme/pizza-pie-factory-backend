const express = require("express");
const { check, validationResult } = require("express-validator");
const Customer = require("../models/Customer");
const { AuthProviders } = require("../utils/enums");
const router = express.Router();

const validateCustomer = [
  check("firstName").notEmpty().withMessage("First name is required"),
  check("lastName").notEmpty().withMessage("Last name is required"),
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  check("phone")
    .optional()
    .matches(/^((\+971\s?|00971\s?|0)5[024568]\d{7})$/)
    .withMessage("Invalid phone number"),
  check("authProvider")
    .notEmpty()
    .withMessage("AuthProvider is required")
    .isIn(Object.values(AuthProviders))
    .withMessage("Invalid AuthProvider"),
  check("passwordHash")
    .if((value, { req }) => req.body.authProvider === AuthProviders.LOCAL)
    .notEmpty()
    .withMessage("Password is required"),
  check("authProviderId")
    .if((value, { req }) => req.body.authProvider !== AuthProviders.LOCAL)
    .notEmpty()
    .withMessage("AuthProviderId is required for third-party authentication"),
];

// Create a Customer using: POST "/api/customer/auth". Doesn't require auth
router.post("/", validateCustomer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
