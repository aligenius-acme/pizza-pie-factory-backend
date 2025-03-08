const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  DeliveryTypes,
  OrderStatusses,
  PaymentTypes,
  BranchOpeningDays,
} = require("../utils/enums");

const OrderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    deliveryDriverId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    items: [
      {
        foodItemId: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
          default: null,
        },
        quantity: { type: Number, required: true },
        customizations: [
          {
            customizationId: {
              type: Schema.Types.ObjectId,
              ref: "Customization",
            },
            selectedOption: {
              name: { type: String, required: true },
              additionalPrice: { type: Number, default: 0 },
            },
            selectedSubOptions: [
              {
                name: { type: String, required: true },
                additionalPrice: { type: Number, default: 0 },
              },
            ],
          },
        ],
        itemPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        offer: {
          offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
        },
      },
    ],
    offers: [
      {
        offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
        isOfferComplete: { type: Boolean, default: false },
      },
    ],
    tax: { type: Number, required: true, min: 0 },
    deliveryCharges: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatusses),
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    paymentMethod: {
      type: String,
      required: true,
      enum: Object.values(PaymentTypes),
    },
    deliveryType: {
      type: String,
      required: true,
      enum: Object.values(DeliveryTypes),
    },
    deliveryAddress: {
      address: {
        type: String,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
      latitude: {
        type: Number,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
      longitude: {
        type: Number,
        required: function () {
          return this.orderType === DeliveryTypes.DELIVERY;
        },
      },
    },
    pickupDay: {
      type: String,
      required: function () {
        return this.deliveryType === DeliveryTypes.PICKUP;
      },
      enum: Object.values(BranchOpeningDays), // Assuming BranchOpeningDays is defined in enums
    },
    pickupTime: {
      type: String,
      required: function () {
        return this.deliveryType === DeliveryTypes.PICKUP;
      },
      validate: {
        validator: function (time) {
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
          return timeRegex.test(time);
        },
        message: (props) =>
          `${props.value} is not a valid time (HH:MM format)!`,
      },
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    instructions: { type: String },
    orderPlacedAt: { type: Date, default: Date.now },
    estimatedDeliveryTime: { type: Date },
    completedAt: { type: Date },
    orderDeliveredAt: { type: Date },
  },
  { timestamps: true }
);

// OrderSchema.virtual("deliveryDriverId", {
//   ref: "Employee",
//   localField: "deliveryDriverId",
//   foreignField: "_id",
//   justOne: true,
// });

// OrderSchema.virtual("branch", {
//   ref: "Branch",
//   localField: "branchId",
//   foreignField: "_id",
//   justOne: true, // Ensures that it returns a single object instead of an array
// });

OrderSchema.set("toJSON", { virtuals: true });
OrderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", OrderSchema);
