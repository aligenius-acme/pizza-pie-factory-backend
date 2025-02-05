const mongoose = require("mongoose");
const { Schema } = mongoose;

const FoodItemSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
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
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodItem", FoodItemSchema);
