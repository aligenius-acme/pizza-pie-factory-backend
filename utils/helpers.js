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

module.exports = { generateToken, validateRequest, hashPassword };
