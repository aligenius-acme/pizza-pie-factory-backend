const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
// const axios = require("axios");
const { validationResult } = require("express-validator");
const messages = require("../utils/messages");
const crypto = require("crypto");
const ErrorLog = require("../models/ErrorLog");
const { Roles, BranchOpeningDays } = require("../utils/enums"); // Import Roles from enums
const Employee = require("../models/Employee");
const { JWT_SECRET, JWT_EXPIRY } = process.env;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

/** Generate JWT Token */
const generateToken = (id, additionalData = {}) =>
  jwt.sign({ id, ...additionalData }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

/** Validate request using express-validator */
const validateRequest = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

/** Hash password using bcrypt */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const haversineDistance = (coords1, coords2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in KM

  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in KM
};

/**
 * Check if a given address is within the branch's delivery radius
 * @param {Object} branch - Branch document with location and deliveryRadius
 * @param {Object} deliveryAddress - Delivery address with latitude and longitude
 * @returns {Boolean}
 */
const isWithinDeliveryRadius = (branch, deliveryAddress) => {
  if (!branch || !branch.location || !deliveryAddress) return false;

  const branchCoords = [branch.location.latitude, branch.location.longitude];
  const customerCoords = [deliveryAddress.latitude, deliveryAddress.longitude];

  const distance = haversineDistance(branchCoords, customerCoords);
  return distance <= branch.deliveryRadius;
};

/**
 * Logs error details to MongoDB
 * @param {String} endpoint - The API endpoint where the error occurred
 * @param {String} method - HTTP method (GET, POST, etc.)
 * @param {String} errorMessage - Error message
 * @param {String} stackTrace - Full stack trace (optional)
 * @param {Object} requestBody - Request body for debugging (optional)
 */
const logError = async (
  endpoint,
  method,
  errorMessage,
  stackTrace = "",
  requestBody = {}
) => {
  try {
    await ErrorLog.create({
      endpoint,
      method,
      errorMessage,
      stackTrace,
      requestBody,
    });
    console.error(`Error logged: ${errorMessage}`);
  } catch (logError) {
    console.error("Failed to log error:", logError);
  }
};

// Utility function to strip unwanted fields
const stripUnwantedFields = (body, schema) => {
  const schemaPaths = Object.keys(schema.paths);

  // Helper function to check if a key is valid
  const isValidKey = (key) => {
    return schemaPaths.some((path) => path.startsWith(key));
  };

  // Filter the body to include only valid keys
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => isValidKey(key))
  );
};

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Centralized error handling
const handleError = async (route, method, error, req, res) => {
  console.error(`${route} error:`, error);
  await logError(route, method, error.message, error.stack, req.body);
  res.status(500).json({
    message: messages.INTERNAL_SERVER_ERROR,
    error: error.message,
  });
};

// Helper function to validate time format (HH:MM)
const isValidTime = (time) => {
  if (time === "Closed") return true; // Allow "Closed" as a valid value
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

// Helper function to validate openingTimings
const validateOpeningTimings = (openingTimings) => {
  const days = new Set(); // To track unique days

  for (const timing of openingTimings) {
    console.log(`Validating timing: ${JSON.stringify(timing)}`); // Debugging

    // Check if required fields are present
    if (!timing.day || !timing.openingTime || !timing.closingTime) {
      throw new Error("Missing required fields in openingTimings.");
    }

    // Check if the day is valid
    if (!Object.values(BranchOpeningDays).includes(timing.day)) {
      throw new Error(`Invalid day: ${timing.day}`);
    }

    // Check if the day is unique
    if (days.has(timing.day)) {
      throw new Error(`Duplicate day: ${timing.day}`);
    }
    days.add(timing.day);

    // Check if openingTime and closingTime are valid
    if (!isValidTime(timing.openingTime)) {
      throw new Error(`Invalid openingTime: ${timing.openingTime}`);
    }
    if (!isValidTime(timing.closingTime)) {
      throw new Error(`Invalid closingTime: ${timing.closingTime}`);
    }

    // Skip time comparison if the branch is closed
    if (timing.openingTime === "Closed" && timing.closingTime === "Closed") {
      continue;
    }

    // Check if closingTime is after openingTime
    const opening = new Date(`1970-01-01T${timing.openingTime}:00`);
    const closing = new Date(`1970-01-01T${timing.closingTime}:00`);
    if (closing <= opening) {
      throw new Error(
        `Closing time must be after opening time for ${timing.day}`
      );
    }
  }
};

// Helper function to validate pickup time against branch opening timings
const validatePickupTime = (branch, pickupDay, pickupTime) => {
  // Find the branch's opening timings for the selected day
  const openingTiming = branch.openingTimings.find(
    (timing) => timing.day === pickupDay
  );

  if (!openingTiming) {
    throw new Error(messages.BRANCH_CLOSED);
  }

  // Convert opening and closing times to Date objects for comparison
  const opening = new Date(`1970-01-01T${openingTiming.openingTime}:00`);
  const closing = new Date(`1970-01-01T${openingTiming.closingTime}:00`);
  const selectedTime = new Date(`1970-01-01T${pickupTime}:00`);

  // Check if the selected pickup time is within the branch's opening hours
  if (selectedTime < opening || selectedTime > closing) {
    throw new Error(messages.PICKUP_TIME_OUTSIDE_HOURS);
  }
};

// Encrypt text
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

// Decrypt text
function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Validate if the employee is associated with the specified branch.
 * @param {string} employeeId - The ID of the authenticated employee.
 * @param {string} branchId - The ID of the branch to validate against.
 * @returns {Object} - Returns an object with `isValid` (boolean) and `message` (string).
 */
const validateEmployeeBranchAssociation = async (employeeId, branchId) => {
  try {
    // Find the employee by ID and select role and branchId
    const employee = await Employee.findById(employeeId).select(
      "role branchId"
    );
    if (!employee) {
      return { isValid: false, message: messages.EMPLOYEE_NOT_FOUND };
    }

    // If the employee's role is "Site Admin", skip branch validation
    if (employee.role === Roles.SITE_ADMIN) {
      return { isValid: true, message: messages.SITE_ADMIN_VALIDATION_SKIP };
    }

    // For other roles, check if the employee's branchId matches the provided branchId
    if (employee.branchId.toString() !== branchId) {
      return { isValid: false, message: messages.FORBIDDEN };
    }

    // If validation passes
    return { isValid: true, message: messages.EMPLOYEE_VALIDATION_SUCCESS };
  } catch (error) {
    console.error("Error in validateEmployeeBranchAssociation:", error);
    return { isValid: false, message: messages.SERVER_ERROR };
  }
};

// Utility function to check if a string is valid JSON

const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = { isValidJSON };

module.exports = {
  generateToken,
  validateRequest,
  hashPassword,
  isWithinDeliveryRadius,
  stripUnwantedFields,
  handleError,
  generateOTP,
  isValidTime,
  validateOpeningTimings,
  validatePickupTime,
  encrypt,
  decrypt,
  validateEmployeeBranchAssociation,
  isValidJSON,
};
