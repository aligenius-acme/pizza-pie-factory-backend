const mongoose = require("mongoose");

const FoodItemSchema = new mongoose.Schema(
  {
    foodItemId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    ingredients: [{ type: String }],
    nutritionalInfo: {
      calories: { type: Number },
      protein: { type: String },
      fat: { type: String },
    },
    customizationOptions: {
      extraToppings: [{ type: String }],
      spiceLevels: [{ type: String }],
      dietaryOptions: [{ type: String }],
    },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  },
  { timestamps: true }
);

module.exports = {
  FoodItem: mongoose.model("FoodItem", FoodItemSchema),
};
