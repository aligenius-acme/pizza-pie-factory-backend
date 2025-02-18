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
        foodItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
          default: null,
        },
        quantity: { type: Number, required: true },
        customizations: [
          {
            customization: {
              type: Schema.Types.ObjectId,
              ref: "Customization",
            },
            selectedOption: {
              _id: { type: Schema.Types.ObjectId, required: true },
              name: { type: String, required: true },
              additionalPrice: { type: Number, default: 0 },
            },
            selectedSubOptions: [
              {
                _id: { type: Schema.Types.ObjectId, required: true },
                name: { type: String, required: true },
                additionalPrice: { type: Number, default: 0 },
              },
            ],
          },
        ],
        itemPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    offers: [{ type: Schema.Types.ObjectId, ref: "Offer" }],
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

/*
{
  "customerId": "67accf18d3b8ec235fb83f56",
  "items": [
    {
      "foodItem": "67b440af1b1feaa341700128",
      "quantity": 2,
      "customizations": [
        {
          "customization": "67b368071dc2259b9c35b09f",
          "selectedOption": {
            "_id": "605c72ef1532071f1f1f1f3f",
            "name": "Hand Tossed",
            "additionalPrice": 0
          },
          "selectedSubOptions": [
            {
              "_id": "605c72ef1532071f1f1f1f5f",
              "name": "Large (L)",
              "additionalPrice": 2
            }
          ]
        },
        {
          "customization": "67b368071dc2259b9c35b09f",
          "selectedOption": {
            "_id": "605c72ef1532071f1f1f200b",
            "name": "BBQ Sauce",
            "additionalPrice": 0.5
          },
          "selectedSubOptions": []
        }
      ],
      "itemPrice": 12.99
    }
  ],
  "offers": ["67b42e38748257d60b1517d0"]
}

*/

module.exports = mongoose.model("Cart", CartSchema);
