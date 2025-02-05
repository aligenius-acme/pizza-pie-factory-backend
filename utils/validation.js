const { body } = require("express-validator");

// Password validation logic
const passwordValidation = () => [
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[@$!%*?&]/)
    .withMessage("Password must contain at least one special character"),
];

// Email validation logic
const emailValidation = () => [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
];

// Phone validation logic
const phoneValidation = () => [
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+971[0-9]{8,9}$/)
    .withMessage("Invalid phone number"),
];

// First Name and Last Name validation logic
const nameValidation = () => [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
];

module.exports = {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
};
