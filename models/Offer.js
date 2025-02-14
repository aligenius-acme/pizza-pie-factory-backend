const mongoose = require("mongoose");
const { OfferDiscountTypes, OfferApplicableDays } = require("../utils/enums");
const { Schema } = mongoose;

const OfferSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    imageUrl: {
      type: String, // URL to the offer image
      required: false,
    },
    discountType: {
      type: String,
      enum: Object.values(OfferDiscountTypes),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    bundleItems: [
      {
        itemId: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    applicableDays: {
      type: [String],
      enum: Object.values(OfferApplicableDays),
    },
    applicableTime: {
      start: {
        type: String, // Format: 'HH:mm'
      },
      end: {
        type: String, // Format: 'HH:mm'
      },
    },
    termsAndConditions: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
