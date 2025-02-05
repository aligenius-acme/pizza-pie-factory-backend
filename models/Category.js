const mongoose = require("mongoose");
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    foodItems: [{ type: Schema.Types.ObjectId, ref: "FoodItem" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);
