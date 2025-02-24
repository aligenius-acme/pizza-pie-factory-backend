const { OrderStatusses } = require("./enums");

module.exports = {
  // General messages
  VALIDATION_FAILED: "Validation failed",
  INTERNAL_SERVER_ERROR: "Internal server error",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  INVALID_ID: "Invalid ID provided",

  // Customer messages
  CUSTOMER_EXISTS: "Customer with this email or phone already exists",
  GUEST_ACCOUNT_UPDATED: "Guest account updated successfully",
  REGISTRATION_SUCCESS: "Registration successful",
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully",
  CUSTOMER_NOT_FOUND: "Customer not found",
  INVALID_CREDENTIALS: "Invalid credentials",
  LOGIN_SUCCESS: "Login successful",
  RESET_EMAIL_SENT: "Password reset link sent to your email",
  RESET_EMAIL_FAILED: "Failed to send reset email",
  INVALID_RESET_TOKEN: "Invalid or expired reset token",
  PASSWORD_RESET_SUCCESS: "Password reset successful",

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
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_DELETED_SUCCESS: "Category deleted successfully",
  CATEGORY_HAS_FOOD_ITEMS:
    "Category cannot be deleted as it has associated food items",
  NO_CATEGORIES_FOUND: "No categories found",
};
