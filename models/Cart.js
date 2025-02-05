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
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        customizations: {
          extraToppings: [{ type: String }],
          spiceLevel: { type: String, enum: ["Mild", "Medium", "Spicy"] },
        },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
