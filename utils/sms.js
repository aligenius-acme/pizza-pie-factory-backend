const twilio = require("twilio");
require("dotenv").config();

// Retrieve Twilio credentials and sender phone number from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Send an SMS using Twilio.
 * @param {string} to - The recipient phone number in E.164 format (e.g., "+1234567890").
 * @param {string} message - The SMS message content.
 * @returns {Promise<object>} - The response from Twilio.
 */
const sendSms = async (to, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    console.log("SMS sent successfully!");
    console.log(response);
    return response;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error("Error sending SMS");
  }
};

module.exports = { sendSms };
