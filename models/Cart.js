const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    cartId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [
      {
        foodItemId: {
          type: mongoose.Schema.Types.ObjectId,
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

module.exports = {
  Cart: mongoose.model("Cart", CartSchema),
};
