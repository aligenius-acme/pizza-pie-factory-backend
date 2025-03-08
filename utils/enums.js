const PaymentTypes = Object.freeze({
  CREDIT_CARD: "Credit Card",
  COD: "COD",
});

const AddressLabels = Object.freeze({
  HOME: "Home",
  APARTMENT: "Apartment",
  OTHER: "Other",
});

const DeliveryTypes = Object.freeze({
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
});

const OrderStatusses = Object.freeze({
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT FOR DELIVERY",
  DELIVERED: "DELIVERED",
  NEW_ORDER: "NEW ORDER",
  CANCELLED: "CANCELLED",
  NOT_DELIVERED: "NOT DELIVERED",
  PENDING_PAYMENT: "PENDING PAYMENT",
});

const Roles = Object.freeze({
  KITCHEN_STAFF: "KITCHEN STAFF",
  DELIVERY_DRIVER: "DELIVERY DRIVER",
  CUSTOMER_SUPPORT: "CUSTOMER SUPPORT",
  SITE_ADMIN: "SITE ADMIN",
});

const RecipientTypes = Object.freeze({
  CUSTOMER: "Customer",
  // EMPLOYEE: "Employee",
  BRANCH: "Branch",
});

const NotificationTypes = Object.freeze({
  NEW_ORDER: "New Order",
  ORDER_UPDATE: "Order Update",
  PROMOTION: "Promotion",
});

const OfferDiscountTypes = Object.freeze({
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
});

const BranchOpeningDays = Object.freeze({
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
});

module.exports = {
  PaymentTypes,
  AddressLabels,
  Roles,
  DeliveryTypes,
  OrderStatusses,
  PaymentTypes,
  RecipientTypes,
  NotificationTypes,
  OfferDiscountTypes,
  BranchOpeningDays,
};
