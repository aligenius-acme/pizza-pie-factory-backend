const mongoose = require("mongoose");
const { Schema } = mongoose;

const CustomizationSchema = new Schema(
  {
    offerId: {
      type: Schema.Types.ObjectId,
      ref: "Offer",
    },
    customizationName: { type: String, required: true },
    customizations: [
      {
        name: { type: String, required: true },
        options: [
          {
            name: { type: String, required: true },
            additionalPrice: { type: Number, default: 0 },
            isDefault: { type: Boolean, default: false },
            subOptions: [
              {
                name: { type: String, required: true },
                additionalPrice: { type: Number, default: 0 },
                isDefault: { type: Boolean, default: false },
              },
            ],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customization", CustomizationSchema);

/*
GENERIC CUSTOMIZATION (PIZZA)
{
  "_id": "605c72ef1532071f1f1f1f1f",
  "customizationName": "Large Heart-Shaped Pizza (Choose Size & Crust)",
  "customizations": [
    {
      "_id": "605c72ef1532071f1f1f1f2f",
      "name": "Size & Crust Options",
      "options": [
        {
          "_id": "605c72ef1532071f1f1f1f3f",
          "name": "Hand Tossed",
          "additionalPrice": 0,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1f4f", "name": "Medium (M)", "additionalPrice": 0, "isDefault": false },
            { "_id": "605c72ef1532071f1f1f1f5f", "name": "Large (L)", "additionalPrice": 2, "isDefault": true }
          ]
        },
        {
          "_id": "605c72ef1532071f1f1f1f6f",
          "name": "Double Melt",
          "description": "Rich, delicious cream cheese between two crunchy crusts.",
          "additionalPrice": 1.5,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1f7f", "name": "Medium (M)", "additionalPrice": 0, "isDefault": false },
            { "_id": "605c72ef1532071f1f1f1f8f", "name": "Large (L)", "additionalPrice": 3, "isDefault": true }
          ]
        },
        {
          "_id": "605c72ef1532071f1f1f1f9f",
          "name": "Handmade Pan",
          "description": "Handmade from fresh, buttery-tasting dough with two layers of mozzarella.",
          "additionalPrice": 2,
          "isDefault": false,
          "subOptions": [{ "_id": "605c72ef1532071f1f1f1faf", "name": "Large (L)", "additionalPrice": 0, "isDefault": true }]
        },
        {
          "_id": "605c72ef1532071f1f1f1fbf",
          "name": "Stuffed Crust",
          "description": "Classic hand-tossed crust with stuffed cheese edges.",
          "additionalPrice": 2.5,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1fcf", "name": "Medium (M)", "additionalPrice": 0, "isDefault": false },
            { "_id": "605c72ef1532071f1f1f1fdf", "name": "Large (L)", "additionalPrice": 4, "isDefault": true }
          ]
        },
        {
          "_id": "605c72ef1532071f1f1f1fef",
          "name": "Crunchy & Thin",
          "description": "Thin and crispy, cut into squares.",
          "additionalPrice": 1,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1ff0", "name": "Medium (M)", "additionalPrice": 0, "isDefault": false },
            { "_id": "605c72ef1532071f1f1f1ff1", "name": "Large (L)", "additionalPrice": 2, "isDefault": true }
          ]
        },
        {
          "_id": "605c72ef1532071f1f1f1ff2",
          "name": "Cheese Burst",
          "description": "Rich, delicious cream cheese between classic hand-tossed crust and crunchy crust.",
          "additionalPrice": 1.5,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1ff3", "name": "Medium (M)", "additionalPrice": 0, "isDefault": false },
            { "_id": "605c72ef1532071f1f1f1ff4", "name": "Large (L)", "additionalPrice": 3, "isDefault": true }
          ]
        }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ff5",
      "name": "Cheese Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ff6", "name": "Mozzarella Cheese", "additionalPrice": 0, "isDefault": true },
        { "_id": "605c72ef1532071f1f1f1ff7", "name": "Light", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ff8", "name": "Extra", "additionalPrice": 1, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ff9",
      "name": "Base Sauce Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ffa", "name": "Pizza Sauce", "additionalPrice": 0, "isDefault": true }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ffb",
      "name": "Meat Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ffc", "name": "Beef", "additionalPrice": 2, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ffd", "name": "Grilled Chicken Breast", "additionalPrice": 3, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ffe", "name": "Philly Meat", "additionalPrice": 2.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1fff", "name": "Beef Pepperoni", "additionalPrice": 1.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2000", "name": "Italian Sausage", "additionalPrice": 2, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f2001",
      "name": "Non-Meat Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f2002", "name": "Oregano", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2003", "name": "Green Peppers", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2004", "name": "Jalapeno", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2005", "name": "Mushrooms", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2006", "name": "Pineapple", "additionalPrice": 1, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2007", "name": "Onions", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2008", "name": "Black Olives", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2009", "name": "Feta", "additionalPrice": 1.5, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f200a",
      "name": "Drizzle Sauces",
      "options": [
        { "_id": "605c72ef1532071f1f1f200b", "name": "BBQ Sauce", "additionalPrice": 0.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f200c", "name": "Hot Buffalo Sauce", "additionalPrice": 0.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f200d", "name": "Ranch Sauce", "additionalPrice": 0.5, "isDefault": false }
      ]
    }
  ]
}


UAE66 (PIZZA)
{
  "_id": "605c72ef1532071f1f1f1f1f",
  "customizationName": "Large Heart-Shaped Pizza (Choose Size & Crust)",
  "customizations": [
    {
      "_id": "605c72ef1532071f1f1f1f2f",
      "name": "Size & Crust Options",
      "options": [
        {
          "_id": "605c72ef1532071f1f1f1f3f",
          "name": "Hand Tossed",
          "additionalPrice": 0,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1f5f", "name": "Large (L)", "additionalPrice": 0, "isDefault": true }
          ]
        },
        {
          "_id": "605c72ef1532071f1f1f1f6f",
          "name": "Double Melt",
          "description": "Rich, delicious cream cheese between two crunchy crusts.",
          "additionalPrice": 1.5,
          "isDefault": false,
          "subOptions": [
            { "_id": "605c72ef1532071f1f1f1f8f", "name": "Large (L)", "additionalPrice": 0, "isDefault": true }
          ]
        },
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ff5",
      "name": "Cheese Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ff6", "name": "Mozzarella Cheese", "additionalPrice": 0, "isDefault": true },
        { "_id": "605c72ef1532071f1f1f1ff7", "name": "Light", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ff8", "name": "Extra", "additionalPrice": 1, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ff9",
      "name": "Base Sauce Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ffa", "name": "Pizza Sauce", "additionalPrice": 0, "isDefault": true }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f1ffb",
      "name": "Meat Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f1ffc", "name": "Beef", "additionalPrice": 2, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ffd", "name": "Grilled Chicken Breast", "additionalPrice": 3, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1ffe", "name": "Philly Meat", "additionalPrice": 2.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f1fff", "name": "Beef Pepperoni", "additionalPrice": 1.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2000", "name": "Italian Sausage", "additionalPrice": 2, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f2001",
      "name": "Non-Meat Options",
      "options": [
        { "_id": "605c72ef1532071f1f1f2002", "name": "Oregano", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2003", "name": "Green Peppers", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2004", "name": "Jalapeno", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2005", "name": "Mushrooms", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2006", "name": "Pineapple", "additionalPrice": 1, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2007", "name": "Onions", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2008", "name": "Black Olives", "additionalPrice": 0, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f2009", "name": "Feta", "additionalPrice": 1.5, "isDefault": false }
      ]
    },
    {
      "_id": "605c72ef1532071f1f1f200a",
      "name": "Drizzle Sauces",
      "options": [
        { "_id": "605c72ef1532071f1f1f200b", "name": "BBQ Sauce", "additionalPrice": 0.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f200c", "name": "Hot Buffalo Sauce", "additionalPrice": 0.5, "isDefault": false },
        { "_id": "605c72ef1532071f1f1f200d", "name": "Ranch Sauce", "additionalPrice": 0.5, "isDefault": false }
      ]
    }
  ]
}
*/
