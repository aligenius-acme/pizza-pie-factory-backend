const mongoose = require("mongoose");

const ErrorLogSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true }, // API endpoint where the error occurred
    method: { type: String, required: true }, // HTTP method (GET, POST, etc.)
    errorMessage: { type: String, required: true }, // Error message
    stackTrace: { type: String }, // Full stack trace (optional)
    requestBody: { type: Object }, // Store request body for debugging
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ErrorLog", ErrorLogSchema);
