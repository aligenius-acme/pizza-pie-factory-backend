const {
  Roles,
  RecipientTypes,
  NotificationTypes,
  AddressLabels,
  OrderStatusses,
  PaymentTypes,
  DeliveryTypes,
  BranchOpeningDays,
} = require("../utils/enums");
const { isValidTime, validateOpeningTimings } = require("../utils/helpers");
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

const employeeMessages = {
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
  role: {
    label: {
      required: "Employee role is required",
      invalid: `Role must be one of: ${Object.values(Roles).join(", ")}`,
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
  openingTimings: {
    required: "Opening timings are required",
    invalid: "Invalid opening timings",
    duplicateDay: "Duplicate day found in opening timings",
    invalidTime: "Invalid time format. Use HH:MM",
    closingBeforeOpening: "Closing time must be after opening time",
  },
};

// Cart-related validation messages
const cartMessages = {
  customerId: {
    required: "Customer ID is required",
    invalid: "Invalid Customer ID format",
  },
  items: {
    foodItem: {
      invalid: "Invalid Food Item ID format",
    },
    quantity: {
      required: "Quantity is required",
      invalid: "Quantity must be a positive integer",
    },
    customizations: {
      mustBeArray: "Customizations must be an array",
      selectedOption: {
        required: "Selected option is required",
        invalid: "Selected option must be a valid object",
        name: {
          required: "Selected option name is required",
          invalid: "Selected option name must be a valid string",
        },
        additionalPrice: {
          invalid: "Selected option additional price must be a valid number",
        },
      },
      selectedSubOptions: {
        mustBeArray: "Selected sub-options must be an array",
        name: {
          required: "Selected sub-option name is required",
          invalid: "Selected sub-option name must be a valid string",
        },
        additionalPrice: {
          invalid:
            "Selected sub-option additional price must be a valid number",
        },
      },
    },
    itemPrice: {
      required: "Item price is required",
      invalid: "Item price must be a valid number",
    },
    totalPrice: {
      required: "Total price is required",
      invalid: "Total price must be a valid number",
    },
  },
  offers: {
    offerId: {
      invalid: "Invalid Offer ID format",
    },
    isOfferComplete: {
      invalid: "Invalid offer complete status. Must be a boolean",
    },
  },
  totalAmount: {
    required: "Total amount is required",
    invalid: "Total amount must be a valid number",
  },
};

// Order-related validation messages
const orderMessages = {
  customerId: {
    required: "Customer ID is required",
    invalid: "Invalid customer ID",
  },
  branchId: {
    required: "Branch ID is required",
    invalid: "Invalid branch ID",
  },
  deliveryDriverId: {
    invalid: "Invalid delivery driver ID",
  },
  items: {
    foodItem: {
      invalid: "Invalid food item ID",
    },
    quantity: {
      required: "Quantity is required",
      invalid: "Quantity must be a positive integer",
    },
    customizations: {
      invalid: "Customizations must be an array",
    },
    selectedOption: {
      required: "Selected option is required",
      invalid: "Selected option must be an object",
    },
    selectedOptionName: {
      required: "Selected option name is required",
      invalid: "Selected option name must be a string",
    },
    selectedOptionPrice: {
      invalid: "Selected option price must be a number",
    },
    selectedSubOptions: {
      invalid: "Selected sub-options must be an array",
    },
    selectedSubOptionName: {
      required: "Selected sub-option name is required",
      invalid: "Selected sub-option name must be a string",
    },
    selectedSubOptionPrice: {
      invalid: "Selected sub-option price must be a number",
    },
    itemPrice: {
      required: "Item price is required",
      invalid: "Item price must be a number",
    },
    totalPrice: {
      required: "Total price is required",
      invalid: "Total price must be a number",
    },
  },
  offers: {
    offerId: {
      invalid: "Invalid offer ID",
    },
    isOfferComplete: {
      invalid: "Offer completion status must be a boolean",
    },
  },
  totalAmount: {
    required: "Total amount is required",
    invalid: "Total amount must be a number",
    nonNegative: "Total amount must be non-negative",
  },
  status: {
    required: "Order status is required",
    invalid: `Order status must be one of: ${Object.values(OrderStatusses).join(
      ", "
    )}`,
  },
  paymentMethod: {
    required: "Payment method is required",
    invalid: `Payment method must be one of: ${Object.values(PaymentTypes).join(
      ", "
    )}`,
  },
  deliveryType: {
    required: "Delivery type is required",
    invalid: `Delivery type must be one of: ${Object.values(DeliveryTypes).join(
      ", "
    )}`,
  },
  deliveryAddress: {
    address: {
      required: "Delivery address is required",
      invalid: "Delivery address must be a string",
    },
    latitude: {
      required: "Delivery latitude is required",
      invalid: "Delivery latitude must be a number",
    },
    longitude: {
      required: "Delivery longitude is required",
      invalid: "Delivery longitude must be a number",
    },
  },
  pickupDay: {
    required: "Pickup day is required for PICKUP orders",
    invalid: `Pickup day must be one of: ${Object.values(
      BranchOpeningDays
    ).join(", ")}`,
  },
  pickupTime: {
    required: "Pickup time is required for PICKUP orders",
    invalid: "Pickup time must be in HH:MM format",
  },
  instructions: {
    invalid: "Instructions must be a string",
  },
  estimatedDeliveryTime: {
    invalid: "Invalid estimated delivery time format",
  },
};

// Category-related validation messages
const categoryMessages = {
  name: {
    required: "Category name is required",
  },
  imageUrl: {
    required: "Category image is required",
  },
};

// Employee Messages-related validation messages
const employeeMessageMessages = {
  message: {
    required: "Message is required",
  },
  receiverId: {
    required: "Receiver is required",
    invalid: "Invalid Receiver ID format",
  },
};

// Notifications-related validation messages
const notificationMessages = {
  recipientType: {
    required: "Recipient type is required",
    invalid: "Invalid recipient type",
  },
  message: {
    required: "Message is required",
  },
  type: {
    required: "Notification type is required",
    invalid: "Invalid notification type",
  },
  recipientId: {
    customerRequired: "For Customer notifications, recipientId is required.",
  },
  branchId: {
    branchRequired: "For Branch notifications, branchId is required.",
  },
};

// Offer-related validation messages
const offerMessages = {
  name: {
    required: "Offer name is required",
  },
  categories: {
    required: "At least one category is required",
    invalid: "Categories must be provided as an array",
  },
  offerPrice: {
    required: "Offer price is required",
    invalid: "Offer price must be a valid number",
  },
  validFrom: {
    required: "Valid from date is required",
    invalid: "Valid from date must be a valid date",
  },
  validUntil: {
    required: "Valid until date is required",
    invalid: "Valid until date must be a valid date",
    invalidDate: "Valid until date must be after valid from date",
  },
  offerCode: {
    required: "Offer code is required",
    invalid: "Offer code must be a valid string",
  },
};

// FoodItem-related validation messages
const foodItemMessages = {
  foodItem: {
    name: {
      required: "Food item name is required",
      invalid: "Food item name must be a string",
    },
    description: {
      invalid: "Food item description must be a string",
    },
    price: {
      required: "Food item price is required",
      invalid: "Food item price must be a number",
      nonNegative: "Food item price must be greater than 0",
    },
    categories: {
      required: "Food item categories are required",
      invalid: "Food item categories must be an array",
      categoryId: {
        invalid: "Invalid category ID",
      },
    },
    ingredients: {
      required: "Food item ingredients are required",
      invalid: "Food item ingredients must be a string",
    },
    nutritionalInfo: {
      invalid: "Nutritional info must be an object",
    },
    customizations: {
      invalid: "Customizations must be an array",
      customizationId: {
        required: "Customization ID is required",
        invalid: "Invalid customization ID",
      },
      isInOffer: {
        invalid: "Customization offer status must be a boolean",
      },
    },
    imageUrl: {
      invalid: "Image URL must be a string",
    },
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
  body("openingTimings")
    .isArray({ min: 1 })
    .withMessage(branchMessages.openingTimings.required)
    .custom((openingTimings) => {
      try {
        validateOpeningTimings(openingTimings);
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    })
    .withMessage(branchMessages.openingTimings.invalid),
];

// Cart validation logic
const cartValidation = () => [
  body("customerId")
    .notEmpty()
    .withMessage(cartMessages.customerId.required)
    .isMongoId()
    .withMessage(cartMessages.customerId.invalid),

  body("items.*.foodItem")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage(cartMessages.items.foodItem.invalid),

  body("items.*.quantity")
    .notEmpty()
    .withMessage(cartMessages.items.quantity.required)
    .isInt({ min: 1 })
    .withMessage(cartMessages.items.quantity.invalid),

  body("items.*.customizations")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage(cartMessages.items.customizations.mustBeArray),

  body("items.*.customizations.*.selectedOption")
    .notEmpty()
    .withMessage(cartMessages.items.customizations.selectedOption.required)
    .isObject()
    .withMessage(cartMessages.items.customizations.selectedOption.invalid),

  body("items.*.customizations.*.selectedOption.name")
    .notEmpty()
    .withMessage(cartMessages.items.customizations.selectedOption.name.required)
    .isString()
    .withMessage(cartMessages.items.customizations.selectedOption.name.invalid),

  body("items.*.customizations.*.selectedOption.additionalPrice")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage(
      cartMessages.items.customizations.selectedOption.additionalPrice.invalid
    ),

  body("items.*.customizations.*.selectedSubOptions")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage(
      cartMessages.items.customizations.selectedSubOptions.mustBeArray
    ),

  body("items.*.customizations.*.selectedSubOptions.*.name")
    .notEmpty()
    .withMessage(
      cartMessages.items.customizations.selectedSubOptions.name.required
    )
    .isString()
    .withMessage(
      cartMessages.items.customizations.selectedSubOptions.name.invalid
    ),

  body("items.*.customizations.*.selectedSubOptions.*.additionalPrice")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage(
      cartMessages.items.customizations.selectedSubOptions.additionalPrice
        .invalid
    ),

  body("items.*.itemPrice")
    .notEmpty()
    .withMessage(cartMessages.items.itemPrice.required)
    .isNumeric()
    .withMessage(cartMessages.items.itemPrice.invalid),

  // body("items.*.totalPrice")
  //   .notEmpty()
  //   .withMessage(cartMessages.items.totalPrice.required)
  //   .isNumeric()
  //   .withMessage(cartMessages.items.totalPrice.invalid),

  body("offers.*.offerId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage(cartMessages.offers.offerId.invalid),

  body("offers.*.isOfferComplete")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage(cartMessages.offers.isOfferComplete.invalid),

  // body("totalAmount")
  //   .notEmpty()
  //   .withMessage(cartMessages.totalAmount.required)
  //   .isNumeric()
  //   .withMessage(cartMessages.totalAmount.invalid),
];

// Order validation logic
const orderValidation = () => [
  body("customerId")
    .notEmpty()
    .withMessage(orderMessages.customerId.required)
    .isMongoId()
    .withMessage(orderMessages.customerId.invalid),

  body("branchId")
    .notEmpty()
    .withMessage(orderMessages.branchId.required)
    .isMongoId()
    .withMessage(orderMessages.branchId.invalid),

  body("deliveryDriverId")
    .isMongoId()
    .withMessage(orderMessages.deliveryDriverId.invalid),

  body("items.*.foodItem")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage(orderMessages.items.foodItem.invalid),

  body("items.*.quantity")
    .notEmpty()
    .withMessage(orderMessages.items.quantity.required)
    .isInt({ min: 1 })
    .withMessage(orderMessages.items.quantity.invalid),

  body("items.*.customizations")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage(orderMessages.items.customizations.invalid),

  body("items.*.customizations.*.selectedOption")
    .notEmpty()
    .withMessage(orderMessages.items.selectedOption.required)
    .isObject()
    .withMessage(orderMessages.items.selectedOption.invalid),

  body("items.*.customizations.*.selectedOption.name")
    .notEmpty()
    .withMessage(orderMessages.items.selectedOptionName.required)
    .isString()
    .withMessage(orderMessages.items.selectedOptionName.invalid),

  body("items.*.customizations.*.selectedOption.additionalPrice")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage(orderMessages.items.selectedOptionPrice.invalid),

  body("items.*.customizations.*.selectedSubOptions")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage(orderMessages.items.selectedSubOptions.invalid),

  body("items.*.customizations.*.selectedSubOptions.*.name")
    .notEmpty()
    .withMessage(orderMessages.items.selectedSubOptionName.required)
    .isString()
    .withMessage(orderMessages.items.selectedSubOptionName.invalid),

  body("items.*.customizations.*.selectedSubOptions.*.additionalPrice")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage(orderMessages.items.selectedSubOptionPrice.invalid),

  body("pickupDay")
    .if((value, { req }) => req.body.deliveryType === DeliveryTypes.PICKUP)
    .notEmpty()
    .withMessage(orderMessages.pickupDay.required)
    .isIn(Object.values(BranchOpeningDays))
    .withMessage(orderMessages.pickupDay.invalid),

  body("pickupTime")
    .if((value, { req }) => req.body.deliveryType === DeliveryTypes.PICKUP)
    .notEmpty()
    .withMessage(orderMessages.pickupTime.required)
    .custom((value) => isValidTime(value))
    .withMessage(orderMessages.pickupTime.invalid),

  // body("items.*.itemPrice")
  //   .notEmpty()
  //   .withMessage(orderMessages.items.itemPrice.required)
  //   .isNumeric()
  //   .withMessage(orderMessages.items.itemPrice.invalid),

  // body("items.*.totalPrice")
  //   .notEmpty()
  //   .withMessage(orderMessages.items.totalPrice.required)
  //   .isNumeric()
  //   .withMessage(orderMessages.items.totalPrice.invalid),

  body("offers.*.offerId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage(orderMessages.offers.offerId.invalid),

  body("offers.*.isOfferComplete")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage(orderMessages.offers.isOfferComplete.invalid),

  // body("totalAmount")
  //   .notEmpty()
  //   .withMessage(orderMessages.totalAmount.required)
  //   .isNumeric()
  //   .withMessage(orderMessages.totalAmount.invalid)
  //   .custom((value) => value >= 0)
  //   .withMessage(orderMessages.totalAmount.nonNegative),

  // body("status")
  //   .notEmpty()
  //   .withMessage(orderMessages.status.required)
  //   .isIn(Object.values(OrderStatusses))
  //   .withMessage(orderMessages.status.invalid),

  body("paymentMethod")
    .notEmpty()
    .withMessage(orderMessages.paymentMethod.required)
    .isIn(Object.values(PaymentTypes))
    .withMessage(orderMessages.paymentMethod.invalid),

  body("deliveryType")
    .notEmpty()
    .withMessage(orderMessages.deliveryType.required)
    .isIn(Object.values(DeliveryTypes))
    .withMessage(orderMessages.deliveryType.invalid),

  body("deliveryAddress.address")
    .if((value, { req }) => req.body.deliveryType === DeliveryTypes.DELIVERY)
    .notEmpty()
    .withMessage(orderMessages.deliveryAddress.address.required)
    .isString()
    .withMessage(orderMessages.deliveryAddress.address.invalid),

  body("deliveryAddress.latitude")
    .if((value, { req }) => req.body.deliveryType === DeliveryTypes.DELIVERY)
    .notEmpty()
    .withMessage(orderMessages.deliveryAddress.latitude.required)
    .isNumeric()
    .withMessage(orderMessages.deliveryAddress.latitude.invalid),

  body("deliveryAddress.longitude")
    .if((value, { req }) => req.body.deliveryType === DeliveryTypes.DELIVERY)
    .notEmpty()
    .withMessage(orderMessages.deliveryAddress.longitude.required)
    .isNumeric()
    .withMessage(orderMessages.deliveryAddress.longitude.invalid),

  body("instructions")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage(orderMessages.instructions.invalid),
];

const categoryValidation = () => [
  body("name").notEmpty().withMessage(categoryMessages.name.required),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage(categoryMessages.imageUrl.required),
];

const foodItemValidation = () => [
  body("name")
    .trim()
    .notEmpty()
    .withMessage(foodItemMessages.foodItem.name.required)
    .isString()
    .withMessage(foodItemMessages.foodItem.name.invalid),

  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage(foodItemMessages.foodItem.description.invalid),

  body("price")
    .notEmpty()
    .withMessage(foodItemMessages.foodItem.price.required)
    .isNumeric()
    .withMessage(foodItemMessages.foodItem.price.invalid)
    .custom((value) => value > 0)
    .withMessage(foodItemMessages.foodItem.price.nonNegative),

  body("categories")
    .notEmpty()
    .withMessage(foodItemMessages.foodItem.categories.required)
    .customSanitizer((value) => {
      // If value is a string, try to parse it as JSON
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (err) {
          return value; // Return the original value if parsing fails
        }
      }
      return value; // Return the original value if it's not a string
    })
    .isArray()
    .withMessage(foodItemMessages.foodItem.categories.invalid),
  body("categories.*")
    .isMongoId()
    .withMessage(foodItemMessages.foodItem.categories.categoryId.invalid),

  body("ingredients")
    .notEmpty()
    .withMessage(foodItemMessages.foodItem.ingredients.required)
    .isString()
    .withMessage(foodItemMessages.foodItem.ingredients.invalid),

  body("nutritionalInfo")
    .optional({ checkFalsy: true }) // Allow the field to be optional
    .customSanitizer((value) => {
      // If value is a string, try to parse it as JSON
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (err) {
          return value; // Return the original value if parsing fails
        }
      }
      return value; // Return the original value if it's not a string
    })
    .isObject() // Ensure the value is an object after sanitization
    .withMessage(foodItemMessages.foodItem.nutritionalInfo.invalid),

  body("customizations")
    .optional({ checkFalsy: true })
    .customSanitizer((value) => {
      // If value is a string, try to parse it as JSON
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (err) {
          return value; // Return the original value if parsing fails
        }
      }
      return value; // Return the original value if it's not a string
    })
    .isArray()
    .withMessage(foodItemMessages.foodItem.customizations.invalid),
  body("customizations.*.customization")
    .notEmpty()
    .withMessage(
      foodItemMessages.foodItem.customizations.customizationId.required
    )
    .isMongoId()
    .withMessage(
      foodItemMessages.foodItem.customizations.customizationId.invalid
    ),
  body("customizations.*.isInOffer")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage(foodItemMessages.foodItem.customizations.isInOffer.invalid),

  body("imageUrl")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage(foodItemMessages.foodItem.imageUrl.invalid),
];

const employeeValidation = {
  name: [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage(employeeMessages.firstName.required),

    body("lastName")
      .trim()
      .notEmpty()
      .withMessage(employeeMessages.lastName.required),
  ],
  email: [
    body("email")
      .optional({ checkFalsy: true })
      .normalizeEmail()
      .isEmail()
      .withMessage(employeeMessages.email.invalid),
  ],
  phone: [
    body("phone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\+971[0-9]{8,9}$/)
      .withMessage(employeeMessages.phone.invalid),
  ],
  password: [
    body("password")
      .notEmpty()
      .withMessage(employeeMessages.password.required)
      .isLength({ min: 8 })
      .withMessage(employeeMessages.password.minLength)
      .matches(/[A-Z]/)
      .withMessage(employeeMessages.password.uppercase)
      .matches(/[a-z]/)
      .withMessage(employeeMessages.password.lowercase)
      .matches(/[0-9]/)
      .withMessage(employeeMessages.password.number)
      .matches(/[@$!%*?&]/)
      .withMessage(employeeMessages.password.specialChar),
  ],
  role: [
    body("role")
      .notEmpty()
      .withMessage(employeeMessages.role.label.required)
      .isIn(Object.values(Roles))
      .withMessage(employeeMessages.role.label.invalid),
  ],
  all: () => [
    ...employeeValidation.name,
    ...employeeValidation.email,
    ...employeeValidation.phone,
    ...employeeValidation.password,
    ...employeeValidation.role,
  ],
};

// Employee message validation logic
const employeeMessageValidation = () => [
  body("message")
    .notEmpty()
    .withMessage(employeeMessageMessages.message.required),
  body("receiverId")
    .isMongoId()
    .withMessage(employeeMessageMessages.message.invalid),
];

// Notification validation logic
const notificationValidation = () => [
  body("recipientType")
    .notEmpty()
    .withMessage(notificationMessages.recipientType.required)
    .isIn(Object.values(RecipientTypes))
    .withMessage(notificationMessages.recipientType.invalid),

  body("message").notEmpty().withMessage(notificationMessages.message.required),

  body("type")
    .notEmpty()
    .withMessage(notificationMessages.type.required)
    .isIn(Object.values(NotificationTypes))
    .withMessage(notificationMessages.type.invalid),

  body().custom((value) => {
    if (value.recipientType === RecipientTypes.CUSTOMER && !value.recipientId) {
      throw new Error(notificationMessages.recipientId.customerRequired);
    }
    if (value.recipientType === RecipientTypes.BRANCH && !value.branchId) {
      throw new Error(notificationMessages.branchId.branchRequired);
    }
    return true;
  }),
];

// Offer validation logic
const offerValidation = () => [
  body("name").notEmpty().withMessage(offerMessages.name.required),

  body("categories")
    .notEmpty()
    .withMessage(offerMessages.categories.required)
    .isArray({ min: 1 })
    .withMessage(offerMessages.categories.invalid),

  body("offerPrice")
    .notEmpty()
    .withMessage(offerMessages.offerPrice.required)
    .isNumeric()
    .withMessage(offerMessages.offerPrice.invalid),

  body("validFrom")
    .notEmpty()
    .withMessage(offerMessages.validFrom.required)
    .isISO8601()
    .withMessage(offerMessages.validFrom.invalid),

  body("validUntil")
    .notEmpty()
    .withMessage(offerMessages.validUntil.required)
    .isISO8601()
    .withMessage(offerMessages.validUntil.invalid)
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error(offerMessages.validUntil.invalidDate);
      }
      return true;
    }),

  body("offerCode")
    .notEmpty()
    .withMessage(offerMessages.offerCode.required)
    .isString()
    .withMessage(offerMessages.offerCode.invalid),
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
  cartValidation,
  orderValidation,
  categoryValidation,
  employeeValidation,
  foodItemValidation,
  employeeMessageValidation,
  notificationValidation,
  offerValidation,
  customizationValidation,
};
