const { Roles } = require("../utils/enums");
const { body } = require("express-validator");

// Password validation logic
const passwordValidation = () => [
  body("password")
    .if((value, { req }) => !req.body.isGuest)
    .notEmpty()
    .withMessage("Password is required for registered users")
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
  // Validate "phone" if it exists in the request
  body("phone")
    .if((value, { req }) => req.body.phone !== undefined)
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+971[0-9]{8,9}$/)
    .withMessage("Invalid phone number"),

  // Validate "contactNumber" if it exists in the request
  body("contactNumber")
    .if((value, { req }) => req.body.contactNumber !== undefined)
    .notEmpty()
    .withMessage("Contact number is required")
    .matches(/^\+971[0-9]{8,9}$/)
    .withMessage("Invalid contact number"),
];

// First Name and Last Name validation logic
const nameValidation = () => [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
];

// Address validation logic
const addressValidation = () => [
  body("deliveryAddresses.*.label")
    .notEmpty()
    .withMessage("Address label is required"),
  body("deliveryAddresses.*.address")
    .notEmpty()
    .withMessage("Address is required"),
  body("deliveryAddresses.*.latitude")
    .isNumeric()
    .withMessage("Latitude must be a number"),
  body("deliveryAddresses.*.longitude")
    .isNumeric()
    .withMessage("Longitude must be a number"),
];

// Role validation logic
const roleValidation = () => [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .custom((value) => {
      if (!Object.values(Roles).includes(value)) {
        throw new Error("Invalid role");
      }
      return true;
    }),
];

// Branch validation logic
const branchValidation = () => [
  body("name").notEmpty().withMessage("Branch name is required"),
  body("location.address").notEmpty().withMessage("Address is required"),
  body("location.latitude")
    .isNumeric()
    .withMessage("Latitude must be a number"),
  body("location.longitude")
    .isNumeric()
    .withMessage("Longitude must be a number"),
  body("contactNumber").notEmpty().withMessage("Contact number is required"),
];

module.exports = {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
  roleValidation,
  branchValidation,
  addressValidation,
};
