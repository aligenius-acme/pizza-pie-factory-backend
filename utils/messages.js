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
  // Cart messages
  CART_CREATED_SUCCESS: "Cart created successfully",
  CART_UPDATED_SUCCESS: "Cart updated successfully",
  CART_NOT_FOUND: "Cart not found",
  INVALID_CART_ID: "Invalid cart ID",
  INVALID_FOOD_ITEM: "Invalid food item",
};
