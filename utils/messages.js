const { OrderStatusses } = require("./enums");

module.exports = {
  // General messages
  VALIDATION_FAILED: "Validation failed",
  INTERNAL_SERVER_ERROR: "Internal server error",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  INVALID_ID: "Invalid ID provided",
  INVALID_CREDENTIALS: "Invalid credentials",
  LOGIN_SUCCESS: "Login successful",
  RESET_EMAIL_SENT: "Password reset link sent to your email",
  RESET_EMAIL_FAILED: "Failed to send reset email",
  INVALID_RESET_TOKEN: "Invalid or expired reset token",
  PASSWORD_RESET_SUCCESS: "Password reset successful",
  REGISTRATION_SUCCESS: "Registration successful",
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully",
  FORBIDDEN: "Forbidden",

  // Customer messages
  CUSTOMER_EXISTS: "Customer with this email or phone already exists",
  GUEST_ACCOUNT_UPDATED: "Guest account updated successfully",
  CUSTOMER_NOT_FOUND: "Customer not found",
  INVALID_CUSTOMER_ID: "Invalid customer ID",
  NO_ORDERS_FOUND: "No order(s) found",

  // Employee messages
  EMPLOYEE_EXISTS: "Employee with this email or phone already exists",
  INVALID_EMPLOYEE_ID: "Invalid employee ID",
  EMPLOYEE_NOT_FOUND: "Employee not found",
  EMPLOYEE_NOT_ACTIVE: "Employee not active",
  NO_EMPLOYEES_FOUND: "No Employee(s) found",
  SITE_ADMIN_VALIDATION_SKIP: "Validation skipped for Site Admin",
  EMPLOYEE_VALIDATION_SUCCESS: "Validation successful",

  // Email messages
  RESET_EMAIL_SUBJECT: "Password Reset Request",
  RESET_EMAIL_HTML: (resetLink) =>
    `<p>Click below to reset your password:</p> 
    <a href="${resetLink}">Reset Password</a>`,

  // Branch messages
  BRANCH_EXISTS: "Branch with this name already exists",
  BRANCH_NOT_FOUND: "Branch not found",
  BRANCH_REGISTRATION_SUCCESS: "Branch registered successfully",
  BRANCH_UPDATE_SUCCESS: "Branch updated successfully",
  NO_BRANCHES_FOUND: "No branches found",
  INVALID_BRANCH_ID: "Invalid branch ID",

  // Cart messages
  CART_CREATED_SUCCESS: "Cart created successfully",
  CART_UPDATED_SUCCESS: "Cart updated successfully",
  CART_NOT_FOUND: "Cart not found",
  INVALID_CART_ID: "Invalid cart ID",
  INVALID_FOOD_ITEM: "Invalid food item",

  // Delivery messages
  DELIVERY_NOT_AVAILABLE: "Delivery not available in your area",

  // Order messages
  ORDER_NOT_FOUND: "Order not found",
  ORDER_CREATED_SUCCESS: "Order created successfully",
  INVALID_ORDER_STATUS: `Order status must be one of: ${Object.values(
    OrderStatusses
  ).join(", ")}`,
  ORDER_STATUS_UPDATED_SUCCESS: "Order status updated successfully",
  ORDER_INVALID_REQUEST: "Invalid request",
  DELIVERY_DRIVER_REQUIRED:
    "Delivery driver ID is required for OUT_FOR_DELIVERY status",

  // Notification messages
  NOTIFICATION_CUSTOMER_ORDER_CREATED: {
    title: OrderStatusses.PREPARING,
    message: (orderId) =>
      `Your order #${orderId} has been successfully created.`,
  },
  NOTIFICATION_BRANCH_NEW_ORDER: {
    title: OrderStatusses.NEW_ORDER,
    message: (orderId) => `A new order #${orderId} has been placed.`,
  },
  NOTIFICATION_ORDER_STATUS_UPDATED: {
    title: "Order Status Updated",
    message: (orderId, status) =>
      `Your order #${orderId} status has been updated to ${status}.`,
  },

  // Category messages
  CATEGORY_EXISTS: "Category with this name already exists",
  CATEGORY_NOT_FOUND_OR_INACTIVE: "Category not found or inactive",
  CATEGORY_DELETED_SUCCESS: "Category deleted successfully",
  CATEGORY_HAS_FOOD_ITEMS:
    "Category cannot be deleted as it has associated food items",
  NO_CATEGORIES_FOUND: "No categories found",
  CATEGORY_REGISTRATION_SUCCESS: "Category registered successfully",
  CATEGORY_UPDATE_SUCCESS: "Category updated successfully",

  // Food item messages
  FOOD_ITEM_EXISTS: "Food item with this name already exists",
  FOOD_ITEM_NOT_FOUND_OR_INACTIVE: "Food item not found or is inactive",
  FOOD_ITEM_DELETED_SUCCESS: "Food item deleted successfully",
  FOOD_ITEM_HAS_ORDERS:
    "Food item cannot be deleted as it is referenced in orders",
  INVALID_CATEGORY_ID: "Invalid category ID(s) provided",
  INVALID_CUSTOMIZATION_ID: "Invalid customization ID provided",
  INVALID_CUSTOMIZATION_FORMAT: "Invalid format for customizations",
  INVALID_CATEGORY_FORMAT: "Invalid format for categories",
  FOODITEM_REGISTRATION_SUCCESS: "Food item registered successfully",
  FOODITEM_UPDATE_SUCCESS: "Food item updated successfully",

  // OTP messages
  OTP_SENT: "OTP sent successfully. Please check your phone.",
  INVALID_OTP: "Invalid OTP or OTP has expired.",
  OTP_MESSAGE: (otp, expiry) =>
    `Your OTP for login is: ${otp}. It will expire in ${expiry} minutes.`,

  // Pick-up messages
  INVALID_DAY:
    "Invalid day. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.",
  DUPLICATE_DAY: "Duplicate day found in opening timings.",
  INVALID_TIME_FORMAT: "Invalid time format. Use HH:MM.",
  CLOSING_BEFORE_OPENING: "Closing time must be after opening time.",
  PICKUP_TIME_OUTSIDE_HOURS:
    "The selected pickup time is outside the branch's opening hours.",
  BRANCH_CLOSED: "The branch is closed on the selected day.",

  // Payment messages
  REDIRECT_TO_PAYMENT: "Redirecting to payment gateway...",
  PAYMENT_SUCCESS: "Payment successful",
  PAYMENT_FAILED: "Payment failed",

  // Order tracking messages
  PHONE_NUMBER_OR_ORDER_ID_REQUIRED: "Phone number or order id required",
  ORDER_FETCHED_SUCCESS: "Order successfully fetched",

  // Search messages
  VALIDATE_SEARCH_FOOD_ITEMS_BY_CATEGORYIDS_EMPTY:
    "CategoryIds must be a string",
  VALIDATE_SEARCH_FOOD_ITEMS_BY_CATEGORYIDS_INVALID:
    "CategoryIds must be a comma-separated list of valid MongoDB ObjectIds",
  VALIDATE_SEARCH_FOOD_ITEMS_BY_CUSTOMIZATIONIDS_EMPTY:
    "CustomizationIds must be a string",
  VALIDATE_SEARCH_FOOD_ITEMS_BY_CUSTOMIZATIONIDS_INVALID:
    "CustomizationIds must be a comma-separated list of valid MongoDB ObjectIds",

  // Customization messages
  CUSTOMIZATION_NOT_FOUND_OR_INACTIVE:
    "One or more customizations do not exist or inactive",
  CUSTOMIZATION_EXISTS: "Customization with this name already exists",
  CUSTOMIZATION_REGISTRATION_SUCCESS: "Customization registered successfully",
  CUSTOMIZATION_UPDATE_SUCCESS: "Customization updated successfully",

  // Offer messages
  OFFER_NOT_FOUND_OR_INACTIVE: "One or more offers do not exist or inactive",
  OFFER_EXISTS: "Offer with this name already exists",
  INVALID_OFFER_ID: "Invalid Offer ID provided",

  // Notification messages
  SAME_SENDER_RECEIVER: "Sender and receiver cannot be the same",
  NO_MESSAGE_FOUND: "No message(s) found",
  NOTIFICATIONS_NOT_FOUND: "No notification(s) found",
};
