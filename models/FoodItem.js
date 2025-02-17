const mongoose = require("mongoose");
const { Schema } = mongoose;

const FoodItemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    categories: [
      { type: Schema.Types.ObjectId, ref: "Category", required: true },
    ],
    ingredients: { type: String, required: true },
    nutritionalInfo: {
      type: Schema.Types.Mixed,
      default: {},
    },
    customizations: [{ type: Schema.Types.ObjectId, ref: "Customization" }],
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

/*
  {
    _id: "507f1f77bcf86cd799439000",
    name: "Large Heart-Shaped Pizza",
    description: "A large heart-shaped pizza with your choice of crust, cheese, and toppings.",
    price: 15.99,
    categories: ["Pizza", "Special Offers"], // Replace with actual category ObjectIds
    ingredients: "Flour, water, yeast, mozzarella cheese, tomato sauce, various toppings.",
    nutritionalInfo: {
      calories: 300,
      fat: 12,
      carbs: 35,
      protein: 10,
    },
    customizations: ["605c72ef1532071f1f1f1f1f"], // Replace with actual customization ObjectIds
    offers: ["605c72ef1532071f1f1f1rrr"], // Replace with actual customization ObjectIds
    imageUrl: "https://example.com/images/heart-shaped-pizza.jpg",
  },
  {
    _id: "507f1f77bcf86cd799439001",
    name: "8 Pieces Chicken Kickers",
    description: "Eight pieces of spicy chicken kickers served with your choice of dipping sauce.",
    price: 8.99,
    categories: ["Chicken", "Appetizers"], // Replace with actual category ObjectIds
    ingredients: "Chicken, flour, spices, oil.",
    nutritionalInfo: {
      calories: 400,
      fat: 20,
      carbs: 30,
      protein: 25,
    },
    customizations: ["507f1f77bcf86cd799439011"], // Replace with actual customization ObjectIds
    offers: ["605c72ef1532071f1f1f1rrr"], // Replace with actual customization ObjectIds
    imageUrl: "https://example.com/images/chicken-kickers.jpg",
  },
  {
    _id: "507f1f77bcf86cd799439002",
    name: "2 Pieces Chocolate Lava Soufflé",
    description: "Two pieces of warm chocolate lava soufflé with a molten center.",
    price: 5.99,
    categories: ["Desserts"], // Replace with actual category ObjectIds
    ingredients: "Flour, sugar, eggs, chocolate, butter.",
    nutritionalInfo: {
      calories: 250,
      fat: 15,
      carbs: 30,
      protein: 5,
    },
    customizations: ["507f1f77bcf86cd799439012"], // Replace with actual customization ObjectIds
    offers: ["605c72ef1532071f1f1f1rrr"], // Replace with actual customization ObjectIds
    imageUrl: "https://example.com/images/chocolate-lava-souffle.jpg",
  },
  {
    _id: "507f1f77bcf86cd799439003",
    name: "2 Drinks",
    description: "Two drinks of your choice from our selection.",
    price: 3.99,
    categories: ["Beverages"], // Replace with actual category ObjectIds
    ingredients: "Water, sugar, flavorings.",
    nutritionalInfo: {
      calories: 150,
      fat: 0,
      carbs: 40,
      protein: 0,
    },
    customizations: [507f1f77bcf86cd799439013], // Replace with actual customization ObjectIds
    offers: ["605c72ef1532071f1f1f1rrr"], // Replace with actual customization ObjectIds
    imageUrl: "https://example.com/images/drinks.jpg",
  }
*/
