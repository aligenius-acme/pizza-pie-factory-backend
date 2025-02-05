// enums.js
const AuthProviders = Object.freeze({
  GOOGLE: "Google",
  APPLE: "Apple",
  FACEBOOK: "Facebook",
  LOCAL: "Local",
});

const PaymentTypes = Object.freeze({
  CREDIT_CARD: "CreditCard",
  COD: "COD",
});

const AddressLabels = Object.freeze({
  HOME: "Home",
  OFFICE: "Office",
});

module.exports = { AuthProviders, PaymentTypes, AddressLabels };
