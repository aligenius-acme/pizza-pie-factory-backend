const express = require("express");
const { param, body, validationResult } = require("express-validator");
const FoodItem = require("../../models/FoodItem");
const Order = require("../../models/Order");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const { foodItemValidation } = require("../../utils/validation");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /admin/fooditem/register
// Register a new food item with optional image upload
// Access: Site admin only
router.post(
  "/admin/fooditem/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  ...foodItemValidation(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        price,
        ingredients,
        nutritionalInfo,
        customizationOptions,
      } = req.body;

      let categories = req.body.categories;
      if (typeof categories === "string") {
        try {
          categories = JSON.parse(categories);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for categories" });
        }
      }

      const existingFoodItem = await FoodItem.findOne({ name });
      if (existingFoodItem) {
        return res
          .status(400)
          .json({ message: "Food item with this name already exists" });
      }

      let foodItemData = {
        name,
        price,
        categories,
        ingredients,
        nutritionalInfo: nutritionalInfo ? JSON.parse(nutritionalInfo) : {},
        customizationOptions: customizationOptions
          ? JSON.parse(customizationOptions)
          : {},
      };

      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "foodItems", public_id: name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        foodItemData.imageUrl = result.secure_url;
      }

      const foodItem = new FoodItem(foodItemData);
      await foodItem.save();
      res.status(201).json(foodItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /admin/fooditem/update/:id
// Update a food item and optionally update its image
// Access: Site admin only
router.put(
  "/admin/fooditem/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [
    param("id").isMongoId().withMessage("Invalid food item ID"),
    ...foodItemValidation(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const {
        name,
        price,
        ingredients,
        nutritionalInfo,
        customizationOptions,
      } = req.body;

      const foodItem = await FoodItem.findById(id);
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }

      const oldName = foodItem.name;
      let updateData = { name, price };

      let categories = req.body.categories;
      if (typeof categories === "string") {
        try {
          categories = JSON.parse(categories);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for categories" });
        }
      }

      if (categories) updateData.categories = categories;
      if (ingredients) updateData.ingredients = ingredients;
      if (nutritionalInfo)
        updateData.nutritionalInfo = JSON.parse(nutritionalInfo);
      if (customizationOptions)
        updateData.customizationOptions = JSON.parse(customizationOptions);

      if (req.file) {
        if (foodItem.imageUrl) {
          await cloudinary.uploader.destroy(`foodItems/${oldName}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "foodItems", public_id: name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        updateData.imageUrl = result.secure_url;
      }

      const updatedFoodItem = await FoodItem.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.json(updatedFoodItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/fooditems
// Get all food items
// Access: Site admin only
router.get(
  "/admin/fooditems",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  async (req, res) => {
    try {
      const foodItems = await FoodItem.find()
        .populate("categories")
        .populate("orders");
      res.json(foodItems);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/fooditem/get/:id
// Get a food item by ID
// Access: Site admin only
router.get(
  "/admin/fooditem/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid food item ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const foodItem = await FoodItem.findById(req.params.id)
        .populate("categories")
        .populate("orders");
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }
      res.json(foodItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /admin/fooditem/delete/:id
// Delete a food item only if no orders reference it
// Access: Site admin only
router.delete(
  "/admin/fooditem/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid food item ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const orders = await Order.find({ "items.foodItemId": id });
      if (orders.length > 0) {
        return res.status(400).json({
          message: "Food item cannot be deleted as it is referenced in orders",
        });
      }

      const foodItem = await FoodItem.findById(id);
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }

      if (foodItem.imageUrl) {
        await cloudinary.uploader.destroy(`foodItems/${foodItem.name}`);
      }

      await FoodItem.findByIdAndDelete(id);
      res.json({ message: "Food item deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
