const PaymentTypes = Object.freeze({
  CREDIT_CARD: "CREDIT CARD",
  COD: "COD",
});

const AddressLabels = Object.freeze({
  HOME: "HOME",
  APARTMENT: "APARTMENT",
  OTHER: "OTHER",
});

const DeliveryTypes = Object.freeze({
  PICKUP: "PICK UP",
  DELIVERY: "DELIVERY",
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
  CUSTOMER: "CUSTOMER",
  // EMPLOYEE: "Employee",
  BRANCH: "BRANCH",
});

const NotificationTypes = Object.freeze({
  NEW_ORDER: "NEW ORDER",
  ORDER_UPDATE: "ORDER UPDATE",
  PROMOTION: "PROMOTION",
});

const OfferDiscountTypes = Object.freeze({
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED AMOUNT",
});

const BranchOpeningDays = Object.freeze({
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY",
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
