// enums.js
const AuthProviders = Object.freeze({
  GOOGLE: "Google",
  APPLE: "Apple",
  FACEBOOK: "Facebook",
  LOCAL: "Local",
  GUEST: "Guest",
});

const PaymentTypes = Object.freeze({
  CREDIT_CARD: "Credit Card",
  COD: "COD",
});

const AddressLabels = Object.freeze({
  HOME: "Home",
  OFFICE: "Office",
});

const OrderTypes = Object.freeze({
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
});

const OrderStatusses = Object.freeze({
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
});

const Roles = Object.freeze({
  KITCHEN_STAFF: "Kitchen Staff",
  DELIVERY_DRIVER: "Delivery Driver",
  CUSTOMER_SUPPORT: "Customer Support",
  SITE_ADMIN: "Site Admin",
});

module.exports = {
  AuthProviders,
  PaymentTypes,
  AddressLabels,
  Roles,
  OrderTypes,
  OrderStatusses,
  PaymentTypes,
};
