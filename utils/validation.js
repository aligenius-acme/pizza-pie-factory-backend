const {
  Roles,
  RecipientTypes,
  NotificationTypes,
  AddressLabels,
  OrderStatusses,
  PaymentTypes,
  DeliveryTypes,
} = require("../utils/enums");
const { body } = require("express-validator");

// Reusable validation messages
// Customer-related validation messages
const customerMessages = {
  firstName: {
    required: "First name is required",
  },
  lastName: {
    required: "Last name is required",
  },
  email: {
    invalid: "Invalid email format",
  },
  phone: {
    invalid:
      "Invalid UAE phone number format. Must start with +971 and be 12-13 digits long.",
  },
  password: {
    required: "Password is required",
    minLength: "Password must be at least 8 characters long",
    uppercase: "Password must contain at least one uppercase letter",
    lowercase: "Password must contain at least one lowercase letter",
    number: "Password must contain at least one number",
    specialChar:
      "Password must contain at least one special character (@$!%*?&)",
  },
  deliveryAddress: {
    label: {
      required: "Address label is required",
      invalid: `Address label must be one of: ${Object.values(
        AddressLabels
      ).join(", ")}`,
    },
    address: {
      required: "Address is required",
    },
    latitude: {
      invalid: "Latitude must be a valid number",
    },
    longitude: {
      invalid: "Longitude must be a valid number",
    },
  },
  paymentMethod: {
    type: {
      required: "Payment type is required",
      invalid: `Payment type must be one of: ${Object.values(PaymentTypes).join(
        ", "
      )}`,
    },
    cardToken: {
      invalid: "Stored card token must be a valid string",
    },
  },
};

// Branch-related validation messages
const branchMessages = {
  name: {
    required: "Branch name is required",
  },
  location: {
    address: {
      required: "Address is required",
    },
    latitude: {
      required: "Latitude is required",
      invalid: "Latitude must be a valid number between -90 and 90",
    },
    longitude: {
      required: "Longitude is required",
      invalid: "Longitude must be a valid number between -180 and 180",
    },
  },
  contactNumber: {
    required: "Contact number is required",
    invalid:
      "Invalid UAE contact number format. Must start with +971 and be 12-13 digits long.",
  },
  deliveryRadius: {
    required: "Delivery radius is required",
    invalid: "Delivery radius must be a valid number",
  },
};

// Validation rules for customer fields
const customerValidation = {
  name: [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage(customerMessages.firstName.required),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage(customerMessages.lastName.required),
  ],

  email: [
    body("email")
      .optional({ checkFalsy: true })
      .normalizeEmail()
      .isEmail()
      .withMessage(customerMessages.email.invalid),
  ],

  phone: [
    body("phone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\+971[0-9]{8,9}$/)
      .withMessage(customerMessages.phone.invalid),
  ],

  password: [
    body("password")
      .if((value, { req }) => !req.body.isGuest)
      .notEmpty()
      .withMessage(customerMessages.password.required)
      .isLength({ min: 8 })
      .withMessage(customerMessages.password.minLength)
      .matches(/[A-Z]/)
      .withMessage(customerMessages.password.uppercase)
      .matches(/[a-z]/)
      .withMessage(customerMessages.password.lowercase)
      .matches(/[0-9]/)
      .withMessage(customerMessages.password.number)
      .matches(/[@$!%*?&]/)
      .withMessage(customerMessages.password.specialChar),
  ],

  deliveryAddresses: [
    body("deliveryAddresses.*.label")
      .notEmpty()
      .withMessage(customerMessages.deliveryAddress.label.required)
      .isIn(Object.values(AddressLabels))
      .withMessage(customerMessages.deliveryAddress.label.invalid),

    body("deliveryAddresses.*.address")
      .trim()
      .notEmpty()
      .withMessage(customerMessages.deliveryAddress.address.required),

    body("deliveryAddresses.*.latitude")
      .optional({ checkFalsy: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage(customerMessages.deliveryAddress.latitude.invalid),

    body("deliveryAddresses.*.longitude")
      .optional({ checkFalsy: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage(customerMessages.deliveryAddress.longitude.invalid),
  ],

  paymentMethods: [
    body("paymentMethods.*.paymentType")
      .notEmpty()
      .withMessage(customerMessages.paymentMethod.type.required)
      .isIn(Object.values(PaymentTypes))
      .withMessage(customerMessages.paymentMethod.type.invalid),

    body("paymentMethods.*.storedCardToken")
      .optional({ checkFalsy: true })
      .isString()
      .withMessage(customerMessages.paymentMethod.cardToken.invalid),
  ],

  all: () => [
    ...customerValidation.name,
    ...customerValidation.email,
    ...customerValidation.phone,
    ...customerValidation.password,
    ...customerValidation.deliveryAddresses,
    ...customerValidation.paymentMethods,
  ],
};

// Branch validation logic
const branchValidation = () => [
  body("name").trim().notEmpty().withMessage(branchMessages.name.required),
  body("location.address")
    .trim()
    .notEmpty()
    .withMessage(branchMessages.location.address.required),

  body("location.latitude")
    .notEmpty()
    .withMessage(branchMessages.location.latitude.required)
    .isFloat({ min: -90, max: 90 })
    .withMessage(branchMessages.location.latitude.invalid),

  body("location.longitude")
    .notEmpty()
    .withMessage(branchMessages.location.longitude.required)
    .isFloat({ min: -180, max: 180 })
    .withMessage(branchMessages.location.longitude.invalid),
  body("contactNumber")
    .trim()
    .notEmpty()
    .withMessage(branchMessages.contactNumber.required)
    .matches(/^\+971[0-9]{8,9}$/)
    .withMessage(branchMessages.contactNumber.invalid),
  body("deliveryRadius")
    .trim()
    .notEmpty()
    .withMessage(branchMessages.deliveryRadius.required),
];

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

const categoryValidation = () => [
  body("name").notEmpty().withMessage("Menu name is required"),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

const foodItemValidation = () => [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Name is required and must be a non-empty string."),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price is required and must be a non-negative number."),

  body("categories")
    .notEmpty()
    .withMessage("Categories must be an array of ObjectIds."),

  body("ingredients")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Ingredients are required and must be a non-empty string."),

  body("imageUrl")
    .optional()
    .isString()
    .withMessage("Image URL must be a string."),
];

// Cart validation logic
const cartValidation = () => [
  body("customerId")
    .if((value, { req }) => !req.body.isGuest)
    .notEmpty()
    .withMessage("Customer ID is required")
    .isMongoId()
    .withMessage("Invalid customer ID"),
  // Validate items array
  body("items").isArray().withMessage("Items must be an array"),
  body("items.*.foodItem")
    .optional()
    .isMongoId()
    .withMessage("Invalid food item ID"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  // body("items.*.customizations").optional().isArray(),
  // body("items.*.customizations.*.customization")
  //   .optional()
  //   .isMongoId()
  //   .withMessage("Invalid customization ID"),
  // body("items.*.customizations.*.selectedOption").optional().isString(),
  // body("items.*.customizations.*.selectedSubOption").optional().isString(),
  // body("items.*.customizations.*.additionalPrice")
  //   .optional()
  //   .isFloat({ min: 0 })
  //   .withMessage("Additional price must be a positive number"),
  // body("items.*.totalPrice")
  //   .isFloat({ min: 0 })
  //   .withMessage("Total price must be a positive number"),
  // body("totalAmount")
  //   .isFloat({ min: 0 })
  //   .withMessage("Total amount must be a positive number"),
];

// Order validation logic
const orderValidation = () => [
  body("customerId")
    .notEmpty()
    .withMessage("Customer ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Customer ID"),

  body("branchId")
    .notEmpty()
    .withMessage("Branch ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Branch ID"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),
  body("items.*.foodItem")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Food Item ID"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("items.*.totalPrice")
    .isFloat({ min: 0 })
    .withMessage("Total price must be at least 0"),

  body("offers").optional().isArray(),
  body("offers.*.offer")
    .notEmpty()
    .withMessage("Offer ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Offer ID"),
  body("offers.*.items").isArray(),
  body("offers.*.items.*.foodItem")
    .notEmpty()
    .withMessage("Food Item ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Food Item ID"),
  body("offers.*.items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("offers.*.totalPrice")
    .isFloat({ min: 0 })
    .withMessage("Total price must be at least 0"),

  body("totalAmount")
    .isFloat({ min: 0 })
    .withMessage("Total amount must be at least 0"),

  body("status")
    .isIn(Object.values(OrderStatusses))
    .withMessage("Invalid order status"),

  body("paymentMethod")
    .isIn(Object.values(PaymentTypes))
    .withMessage("Invalid payment method"),

  body("deliveryType")
    .isIn(Object.values(DeliveryTypes))
    .withMessage("Invalid delivery type"),

  body("deliveryAddress.address")
    .if(body("deliveryType").equals(DeliveryTypes.DELIVERY))
    .notEmpty()
    .withMessage("Address is required for delivery"),
  body("deliveryAddress.latitude")
    .if(body("deliveryType").equals(DeliveryTypes.DELIVERY))
    .isFloat()
    .withMessage("Latitude is required for delivery"),
  body("deliveryAddress.longitude")
    .if(body("deliveryType").equals(DeliveryTypes.DELIVERY))
    .isFloat()
    .withMessage("Longitude is required for delivery"),

  body("instructions").optional().isString(),
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
  body("name")
    .isString()
    .notEmpty()
    .withMessage("Name is required and must be a string."),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),

  body("customizations")
    .optional()
    .notEmpty()
    .withMessage("Customizations must be an array of ObjectIds."),

  body("categories")
    .notEmpty()
    .withMessage("Categories must be an array of ObjectIds."),

  body("offerPrice")
    .isFloat({ min: 0 })
    .withMessage("Offer price is required and must be a non-negative number."),

  body("imageUrl")
    .optional()
    .isString()
    .withMessage("Image URL must be a string."),

  body("validFrom")
    .isISO8601()
    .withMessage(
      "Valid from date is required and must be a valid ISO 8601 date."
    ),

  body("validUntil")
    .isISO8601()
    .withMessage(
      "Valid until date is required and must be a valid ISO 8601 date."
    ),

  body("termsAndConditions")
    .optional()
    .isString()
    .withMessage("Terms and conditions must be a string."),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value."),

  body("offerCode")
    .isString()
    .notEmpty()
    .withMessage("Offer code is required and must be a string."),
];

// Customization validation logic
const customizationValidation = () => [
  body("customizationName")
    .isString()
    .notEmpty()
    .withMessage("Customization name is required and must be a string."),

  body("customizations")
    .isArray({ min: 1 })
    .withMessage("Customizations must be a non-empty array."),

  body("customizations.*.name")
    .isString()
    .notEmpty()
    .withMessage("Each customization must have a non-empty name."),

  body("customizations.*.options")
    .isArray({ min: 1 })
    .withMessage("Each customization must have a non-empty options array."),

  body("customizations.*.options.*.name")
    .isString()
    .notEmpty()
    .withMessage("Each option must have a non-empty name."),

  body("customizations.*.options.*.additionalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Additional price must be a non-negative number."),

  body("customizations.*.options.*.isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean value."),

  body("customizations.*.options.*.subOptions")
    .optional()
    .isArray()
    .withMessage("SubOptions must be an array."),

  body("customizations.*.options.*.subOptions.*.name")
    .isString()
    .notEmpty()
    .withMessage("Each sub-option must have a non-empty name."),

  body("customizations.*.options.*.subOptions.*.additionalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Sub-option additional price must be a non-negative number."),

  body("customizations.*.options.*.subOptions.*.isDefault")
    .optional()
    .isBoolean()
    .withMessage("Sub-option isDefault must be a boolean value."),
];

module.exports = {
  customerValidation,
  branchValidation,
  employeeValidation,
  categoryValidation,
  foodItemValidation,
  cartValidation,
  orderValidation,
  employeeMessageValidation,
  notificationValidation,
  offerValidation,
  customizationValidation,
};
