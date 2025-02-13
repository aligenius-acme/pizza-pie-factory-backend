const PaymentTypes = Object.freeze({
  CREDIT_CARD: "Credit Card",
  COD: "COD",
});

const AddressLabels = Object.freeze({
  HOME: "Home",
  APARTMENT: "Apartment",
  OTHER: "Other",
});

const OrderTypes = Object.freeze({
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
});

const OrderStatusses = Object.freeze({
  PREPARING: "Preparing",
  PREPARING_COMPLETE: "Preparing Complete",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
  NEW_ORDER: "New Order Received",
});

const Roles = Object.freeze({
  KITCHEN_STAFF: "Kitchen Staff",
  DELIVERY_DRIVER: "Delivery Driver",
  CUSTOMER_SUPPORT: "Customer Support",
  SITE_ADMIN: "Site Admin",
});

const RecipientTypes = Object.freeze({
  CUSTOMER: "Customer",
  EMPLOYEE: "Employee",
});

const NotificationTypes = Object.freeze({
  NEW_ORDER: "New Order",
  ORDER_UPDATE: "Order Update",
  PROMOTION: "Promotion",
});

module.exports = {
  PaymentTypes,
  AddressLabels,
  Roles,
  OrderTypes,
  OrderStatusses,
  PaymentTypes,
  RecipientTypes,
  NotificationTypes,
};
