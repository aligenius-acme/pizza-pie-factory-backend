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
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
  NEW_ORDER: "New Order Received",
  CANCELLED: "Cancelled",
  NOT_DELIVERED: "Not Delivered",
});

const Roles = Object.freeze({
  KITCHEN_STAFF: "Kitchen Staff",
  DELIVERY_DRIVER: "Delivery Driver",
  CUSTOMER_SUPPORT: "Customer Support",
  SITE_ADMIN: "Site Admin",
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

const OfferApplicableDays = Object.freeze({
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
  OfferApplicableDays,
};
