const {
  Roles,
  RecipientTypes,
  NotificationTypes,
  AddressLabels,
} = require("../utils/enums");
const { body } = require("express-validator");

const customerValidation = {
  name: [
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ],
  email: [
    body("email")
      .if((value, { req }) => !req.body.isGuest) // Only apply if user is NOT a guest
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
  ],
  phone: [
    body("phone")
      .if((value, { req }) => !req.body.isGuest) // Only apply if user is NOT a guest
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^\+971[0-9]{8,9}$/)
      .withMessage("Invalid phone number"),
  ],
  password: [
    body("password")
      .if((value, { req }) => !req.body.isGuest) // Only apply if user is NOT a guest
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
  ],
  deliveryAddresses: [
    body("deliveryAddresses.*.label")
      .notEmpty()
      .withMessage("Address label is required")
      .isIn(Object.values(AddressLabels))
      .withMessage(
        `Address label must be one of: ${Object.values(AddressLabels).join(
          ", "
        )}`
      ),
    body("deliveryAddresses.*.address")
      .notEmpty()
      .withMessage("Address is required"),
    body("deliveryAddresses.*.latitude")
      .isNumeric()
      .withMessage("Latitude must be a number"),
    body("deliveryAddresses.*.longitude")
      .isNumeric()
      .withMessage("Longitude must be a number"),
  ],
  all: () => [
    ...customerValidation.name,
    ...customerValidation.email,
    ...customerValidation.phone,
    ...customerValidation.password,
    ...customerValidation.deliveryAddresses,
  ],
};

const employeeValidation = {
  name: [
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ],
  email: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
  ],
  phone: [
    body("phone")
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^\+971[0-9]{8,9}$/)
      .withMessage("Invalid phone number"),
  ],
  password: [
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
  ],
  role: [
    body("role")
      .notEmpty()
      .withMessage("Role is required")
      .custom((value) => {
        if (!Object.values(Roles).includes(value)) {
          throw new Error("Invalid role");
        }
        return true;
      }),
  ],
  branchId: [
    body("branchId")
      .notEmpty()
      .withMessage("Branch is required")
      .isMongoId()
      .withMessage("Invalid branch"),
  ],
  all: () => [
    ...employeeValidation.name,
    ...employeeValidation.email,
    ...employeeValidation.phone,
    ...employeeValidation.password,
    ...employeeValidation.role,
    ...employeeValidation.branchId,
  ],
};

// Branch validation logic
const branchValidation = {
  name: [body("name").notEmpty().withMessage("Branch name is required")],
  location: [
    body("location.address").notEmpty().withMessage("Address is required"),
    body("location.latitude")
      .isNumeric()
      .withMessage("Latitude must be a number"),
    body("location.longitude")
      .isNumeric()
      .withMessage("Longitude must be a number"),
  ],
  contactNumber: [
    body("contactNumber")
      .notEmpty()
      .withMessage("Contact number is required")
      .matches(/^\+971[0-9]{8,9}$/)
      .withMessage("Invalid contact number"),
  ],
  all: () => [
    ...branchValidation.name,
    ...branchValidation.location,
    ...branchValidation.contactNumber,
  ],
};

// Calegory validation logic
const categoryValidation = () => [
  body("name").notEmpty().withMessage("Menu name is required"),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

// Food item validation logic
const foodItemValidation = () => [
  body("name").notEmpty().withMessage("Food item name is required"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be greater than or equal to 0"),
  body("categories")
    .notEmpty()
    .withMessage("Food item should be associated with atleast one catagory"),
  body("ingredients")
    .notEmpty()
    .withMessage("Food item should be associated with atleast one catagory"),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

// Cart validation logic
const cartValidation = () => [
  body("customerId")
    .if((value, { req }) => !req.body.isGuest)
    .notEmpty()
    .withMessage("Customer ID is required")
    .isMongoId()
    .withMessage("Invalid customer ID"),
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

// Employee message validation logic
const employeeMessageValidation = () => [
  body("message").notEmpty().withMessage("Message is required"),
  body("receiverId").isMongoId().withMessage("Invalid receiver ID"),
];

// Notification validation logic
const notificationValidation = () => [
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

// Offer validation logic
const offerValidation = () => [
  body("title").isString().notEmpty().withMessage("Title is required"),
  body("description").optional().isString(),
  body("imageUrl").optional().isString(),
  body("discountType")
    .isString()
    .notEmpty()
    .withMessage("Discount type is required"),
  body("discountValue")
    .notEmpty()
    .withMessage("Discount value is required")
    .isNumeric(),
  body("bundleItems")
    .optional()
    .isArray()
    .withMessage("Bundle items must be an array"),
  body("validFrom").isISO8601().withMessage("Valid from date is required"),
  body("validUntil").isISO8601().withMessage("Valid until date is required"),
  body("applicableDays").optional().isArray(),
  body("applicableTime.start").optional().isString(),
  body("applicableTime.end").optional().isString(),
  body("termsAndConditions").optional().isString(),
  body("isActive").optional().isBoolean(),
];

module.exports = {
  customerValidation,
  employeeValidation,
  branchValidation,
  categoryValidation,
  foodItemValidation,
  cartValidation,
  orderValidation,
  employeeMessageValidation,
  notificationValidation,
  offerValidation,
};
