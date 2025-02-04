const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    foodItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "FoodItem" }],
  },
  { timestamps: true }
);

module.exports = {
  Category: mongoose.model("Category", CategorySchema),
};
