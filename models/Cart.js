const mongoose = require("mongoose");
const { Schema } = mongoose;

const CartSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
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
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
