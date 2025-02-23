const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

const { JWT_SECRET, JWT_EXPIRY } = process.env;

/** Generate JWT Token */
const generateToken = (id, additionalData = {}) =>
  jwt.sign({ id, ...additionalData }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

/** Validate request using express-validator */
const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  return null;
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

module.exports = {
  generateToken,
  validateRequest,
  hashPassword,
  isWithinDeliveryRadius,
  logError,
};
