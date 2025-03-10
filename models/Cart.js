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
    // tax: { type: Number, required: true, min: 0 },
    // deliveryCharges: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);

/*
SAMPLE CART WITH CUSTOMIZATIONS
{
  "customerId": "67accf18d3b8ec235fb83f56",
  "items": [
    {
      "foodItemId": "67b7177d066d02721c439460",
      "quantity": 1,
      "customizations": [
        {
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e43b",
            "name": "Size & Crust: Hand Tossed",
            "additionalPrice": 0
          },
          "selectedSubOptions": [
            {
			"_id": "67cd6b3ac2bdc5b73df1e43e",
              "name": "Large (L)",
              "additionalPrice": 0
            }
          ]
        },
        {
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e44f",
            "name": "Cheese: Mozzarella Cheese",
            "additionalPrice": 0
          },
          "selectedSubOptions": [
            {
			"_id": "67cd6b3ac2bdc5b73df1e451",
              "name": "Extra",
              "additionalPrice": 0
            }
          ]
        },
		{
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e462",
            "name": "Drizzle Sauces: BBQ Sauce",
            "additionalPrice": 0
          },
          "selectedSubOptions":[]
        }
      ],
      "itemPrice": 0
    }
  ],
  "offers": []
}


-----------------------------------------------------------------------


SAMPLE CART WITH CUSTOMIZATIONS & OFFER (COMPLETE)
{
  "customerId": "67accf18d3b8ec235fb83f56",
  "items": [
    {
      "foodItemId": "67b7177d066d02721c439460",
      "quantity": 1,
      "customizations": [
        {
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e43b",
            "name": "Size & Crust: Hand Tossed",
            "additionalPrice": 0
          },
          "selectedSubOptions": [
            {
			"_id": "67cd6b3ac2bdc5b73df1e43e",
              "name": "Large (L)",
              "additionalPrice": 0
            }
          ]
        },
        {
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e44f",
            "name": "Cheese: Mozzarella Cheese",
            "additionalPrice": 0
          },
          "selectedSubOptions": [
            {
			"_id": "67cd6b3ac2bdc5b73df1e451",
              "name": "Extra",
              "additionalPrice": 0
            }
          ]
        },
		{
          "customization": "67cd6b3ac2bdc5b73df1e43a",
          "selectedOption": {
		  "_id": "67cd6b3ac2bdc5b73df1e462",
            "name": "Drizzle Sauces: BBQ Sauce",
            "additionalPrice": 0
          },
          "selectedSubOptions":[]
        }
      ],
      "itemPrice": 0,
      "totalPrice": 0,
      "offer": {
        "offerId": "67bb264e610ebeda42c6d36e",
        "isOfferComplete": true
      }
    }
  ],
  "offers": ["67bb264e610ebeda42c6d36e"]
}
*/
