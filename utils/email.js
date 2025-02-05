const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// Get SendGrid API Key and sender email from .env
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

// Set SendGrid API Key
sgMail.setApiKey(SENDGRID_API_KEY);

// Function to send email using SendGrid
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const msg = {
      to, // recipient address
      from: SENDER_EMAIL, // sender address
      subject, // subject line
      html: htmlContent, // html body
    };

    // Send email using SendGrid API
    const response = await sgMail.send(msg);
    console.log("Email sent successfully!");
    console.log(response);
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response ? error.response.body : error
    );
    throw new Error("Error sending email");
  }
};

module.exports = { sendEmail };
