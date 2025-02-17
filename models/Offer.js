const mongoose = require("mongoose");
const { Schema } = mongoose;

const OfferSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    categories: [
      { type: Schema.Types.ObjectId, ref: "Category", required: true },
    ],
    customizations: [{ type: Schema.Types.ObjectId, ref: "Customization" }],
    offerPrice: { type: Number, required: true },
    imageUrl: {
      type: String,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    termsAndConditions: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    offerCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);

/*
{
  "_id": "605c72ef1532071f1f1f1rrr"
  "name": "UAE Special Pizza Offer",
  "description": "Exclusive pizza offer for UAE with customizable size, crust, cheese, meat, and non-meat options.",
  "customizations": [
    "605c72ef1532071f1f1f1f1f", 
    "605c72ef1532071f1f1f1f2f", 
    "605c72ef1532071f1f1f1f5f",
    "605c72ef1532071f1f1f1ff5", 
    "605c72ef1532071f1f1f1ff6"
  ],
  "offerPrice": 25.99,
  "imageUrl": "https://example.com/uae-special-pizza.jpg",
  "validFrom": "2025-02-17T00:00:00Z",
  "validUntil": "2025-03-17T23:59:59Z",
  "termsAndConditions": "Offer valid only for orders within UAE. Customization options apply based on availability.",
  "isActive": true,
  "offerCode": "UAE66-OFFER"
}

*/
