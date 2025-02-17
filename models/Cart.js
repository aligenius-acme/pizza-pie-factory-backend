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
              type: mongoose.Schema.Types.ObjectId,
              ref: "Customization",
            },
            selectedOption: { type: String },
            selectedSubOption: { type: String },
            additionalPrice: { type: Number, default: 0 },
          },
        ],
        itemPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

/*
{
  "customerId": "507f1f77bcf86cd799439000",
  "items": [
    {
      "foodItem": "507f1f77bcf86cd799439000",
      "quantity": 1,
      "customizations": [
        {
          "customization": "507f1f77bcf86cd799439010",
          "selectedOption": "Hand Tossed",
          "selectedSubOption": "Large",
          "additionalPrice": 2.00
        },
        {
          "customization": "507f1f77bcf86cd799439010",
          "selectedOption": "Mozzarella Cheese",
          "selectedSubOption": "Extra",
          "additionalPrice": 1.00
        },
        {
          "customization": "507f1f77bcf86cd799439010",
          "selectedOption": "Beef",
          "selectedSubOption": null,
          "additionalPrice": 0
        },
        {
          "customization": "507f1f77bcf86cd799439010",
          "selectedOption": "Oregano",
          "selectedSubOption": null,
          "additionalPrice": 0
        },
        {
          "customization": "507f1f77bcf86cd799439010",
          "selectedOption": "BBQ Sauce",
          "selectedSubOption": null,
          "additionalPrice": 0
        }
      ],
      "totalPrice": 18.99
    },
    {
      "foodItem": "507f1f77bcf86cd799439001",
      "quantity": 1,
      "customizations": [
        {
          "customization": "507f1f77bcf86cd799439011",
          "selectedOption": "Spicy",
          "selectedSubOption": null,
          "additionalPrice": 0
        }
      ],
      "totalPrice": 8.99
    },
    {
      "foodItem": "507f1f77bcf86cd799439002",
      "quantity": 1,
      "customizations": [
        {
          "customization": "507f1f77bcf86cd799439012",
          "selectedOption": "Classic",
          "selectedSubOption": null,
          "additionalPrice": 0
        }
      ],
      "totalPrice": 5.99
    },
    {
      "foodItem": "507f1f77bcf86cd799439003",
      "quantity": 2,
      "customizations": [
        {
          "customization": "507f1f77bcf86cd799439013",
          "selectedOption": "Coke",
          "selectedSubOption": null,
          "additionalPrice": 0
        }
      ],
      "totalPrice": 7.98
    }
  ],
  "offers": [
    {
      "offer": "507f1f77bcf86cd799439000",
      "items": [
        {
          "foodItem": "507f1f77bcf86cd799439000",
          "quantity": 1,
          "customizations": [
            {
              "customization": "507f1f77bcf86cd799439010",
              "selectedOption": "Hand Tossed",
              "selectedSubOption": "Large",
              "additionalPrice": 2.00
            },
            {
              "customization": "507f1f77bcf86cd799439010",
              "selectedOption": "Mozzarella Cheese",
              "selectedSubOption": "Extra",
              "additionalPrice": 1.00
            },
            {
              "customization": "507f1f77bcf86cd799439010",
              "selectedOption": "Beef",
              "selectedSubOption": null,
              "additionalPrice": 0
            },
            {
              "customization": "507f1f77bcf86cd799439010",
              "selectedOption": "Oregano",
              "selectedSubOption": null,
              "additionalPrice": 0
            },
            {
              "customization": "507f1f77bcf86cd799439010",
              "selectedOption": "BBQ Sauce",
              "selectedSubOption": null,
              "additionalPrice": 0
            }
          ],
          "totalPrice": 18.99
        },
        {
          "foodItem": "507f1f77bcf86cd799439001",
          "quantity": 1,
          "customizations": [
            {
              "customization": "507f1f77bcf86cd799439011",
              "selectedOption": "Spicy",
              "selectedSubOption": null,
              "additionalPrice": 0
            }
          ],
          "totalPrice": 8.99
        },
        {
          "foodItem": "507f1f77bcf86cd799439002",
          "quantity": 1,
          "customizations": [
            {
              "customization": "507f1f77bcf86cd799439012",
              "selectedOption": "Classic",
              "selectedSubOption": null,
              "additionalPrice": 0
            }
          ],
          "totalPrice": 5.99
        },
        {
          "foodItem": "507f1f77bcf86cd799439003",
          "quantity": 2,
          "customizations": [
            {
              "customization": "507f1f77bcf86cd799439013",
              "selectedOption": "Coke",
              "selectedSubOption": null,
              "additionalPrice": 0
            }
          ],
          "totalPrice": 7.98
        }
      ],
      "totalPrice": 41.95
    }
  ],
  "totalAmount": 41.95
}

*/

module.exports = mongoose.model("Cart", CartSchema);
