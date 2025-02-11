const { Roles, RecipientTypes, NotificationTypes } = require("../utils/enums");
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

// Calegory validation logic
const categoryValidation = () => [
  body("name").notEmpty().withMessage("Branch name is required"),
];

// Employee message validation logic
const employeeMessageValidation = () => [
  body("message").notEmpty().withMessage("Message is required"),
  body("receiverId").isMongoId().withMessage("Invalid receiver ID"),
];

// Notification validation logic
const notificationValidation = [
  body("recipientType")
    .notEmpty()
    .withMessage("Recipient type is required")
    .isIn(Object.values(RecipientTypes))
    .withMessage("Invalid recipient type"),
  body("message").notEmpty().withMessage("Message is required"),
  body("type")
    .notEmpty()
    .withMessage("Notification type is required")
    .isIn(Object.values(NotificationTypes))
    .withMessage("Invalid notification type"),
  body().custom((value) => {
    if (value.recipientType === RecipientTypes.CUSTOMER && !value.recipientId) {
      throw new Error("For Customer notifications, recipientId is required.");
    }
    if (value.recipientType === RecipientTypes.BRANCH && !value.branchId) {
      throw new Error("For Branch notifications, branchId is required.");
    }
    return true;
  }),
];

// Cart validation logic
const cartValidation = [
  // Conditionally require customerId only if the cart is not for a guest.
  body("customerId")
    .if((value, { req }) => !req.body.isGuest)
    .notEmpty()
    .withMessage("Customer ID is required")
    .isMongoId()
    .withMessage("Invalid customer ID"),
  // Items array validation
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be an array with at least one item"),
  body("items.*.foodItemId")
    .notEmpty()
    .withMessage("Food item ID is required for each item")
    .isMongoId()
    .withMessage("Invalid food item ID"),
  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each item")
    .isNumeric()
    .withMessage("Quantity must be a number")
    .custom((value) => value >= 1)
    .withMessage("Quantity must be at least 1"),
  body("totalAmount")
    .notEmpty()
    .withMessage("Total amount is required")
    .isNumeric()
    .withMessage("Total amount must be a number")
    .custom((value) => value >= 0)
    .withMessage("Total amount must be non-negative"),
];

// Food item validation logic
const foodItemValidation = () => [
  body("name").notEmpty().withMessage("Food item name is required"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number"),
];

// Order validation logic
const orderValidation = () => [
  body("customerId").isMongoId().withMessage("Invalid customer ID"),
  body("branchId").isMongoId().withMessage("Invalid branch ID"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be an array with at least one item"),
  body("items.*.foodItemId").isMongoId().withMessage("Invalid food item ID"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("orderType")
    .isIn(Object.values(OrderTypes))
    .withMessage("Invalid order type"),
  body("status")
    .isIn(Object.values(OrderStatusses))
    .withMessage("Invalid status"),
  body("paymentMethod")
    .isIn(Object.values(PaymentTypes))
    .withMessage("Invalid payment method"),
  body("totalAmount")
    .isFloat({ min: 0 })
    .withMessage("Total amount must be a positive number"),
  body("discount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount must be a positive number"),
  body("instructions")
    .optional()
    .isString()
    .withMessage("Instructions must be a string"),
  body("deliveryAddress.address")
    .optional()
    .isString()
    .withMessage("Invalid address"),
  body("deliveryAddress.latitude")
    .optional()
    .isFloat()
    .withMessage("Invalid latitude"),
  body("deliveryAddress.longitude")
    .optional()
    .isFloat()
    .withMessage("Invalid longitude"),
];

module.exports = {
  passwordValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
  roleValidation,
  branchValidation,
  addressValidation,
  categoryValidation,
  foodItemValidation,
  employeeMessageValidation,
  notificationValidation,
  cartValidation,
  orderValidation,
};
