const mongoose = require("mongoose");
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

// Set virtuals to be included when converting documents to JSON or plain objects
CategorySchema.set("toJSON", { virtuals: true });
CategorySchema.set("toObject", { virtuals: true });

// Define the virtual field for food items in this category
CategorySchema.virtual("foodItems", {
  ref: "FoodItem", // The model to use
  localField: "_id", // Find food items where the Category _id...
  foreignField: "categories", // ...matches an entry in the food item's "categories" array
});

module.exports = mongoose.model("Category", CategorySchema);
