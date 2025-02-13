const mongoose = require("mongoose");
const { Schema } = mongoose;

const FoodItemSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    categories: [
      { type: Schema.Types.ObjectId, ref: "Category", required: true },
    ],
    ingredients: { type: String, required: true },
    nutritionalInfo: {
      type: Schema.Types.Mixed,
      default: {},
    },
    customizationOptions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

// Ensure virtuals are included when converting to JSON or plain objects
FoodItemSchema.set("toJSON", { virtuals: true });
FoodItemSchema.set("toObject", { virtuals: true });

// Virtual for orders:
// This virtual finds all Order documents where this FoodItem’s _id
// appears in the Order’s items array as foodItemId.
// (Make sure that in your Order schema, each item has a field "foodItemId")
FoodItemSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "items.foodItemId",
});

module.exports = mongoose.model("FoodItem", FoodItemSchema);
