const express = require("express");
const { param } = require("express-validator");
const FoodItem = require("../../models/FoodItem");
const Order = require("../../models/Order");
const Category = require("../../models/Category");
const mongoose = require("mongoose");
const authMiddleware = require("../../middleware/auth");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const { foodItemValidation } = require("../../utils/validation");
const { validateRequest } = require("../../utils/helpers");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /admin/fooditem/register
// Access: PRIVATE (Admin Only)
router.post(
  "/admin/fooditem/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [...foodItemValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = [
        "name",
        "price",
        "categories",
        "ingredients",
        "nutritionalInfo",
        "customizationOptions",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let categories = filteredBody.categories;
      if (typeof categories === "string") {
        try {
          categories = JSON.parse(categories);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for categories" });
        }
      }

      const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      categories = categories.map((id) => id.trim());

      if (!categories.every(isValidObjectId)) {
        return res
          .status(400)
          .json({ error: "Invalid category ID(s) provided" });
      }

      const existingCategories = await Category.find({
        _id: { $in: categories },
      }).lean();

      if (existingCategories.length !== categories.length) {
        return res
          .status(400)
          .json({ error: "One or more categories do not exist" });
      }

      const existingFoodItem = await FoodItem.findOne({
        name: filteredBody.name,
      });
      if (existingFoodItem) {
        return res
          .status(400)
          .json({ message: "Food item with this name already exists" });
      }

      let foodItemData = {
        name: filteredBody.name,
        price: filteredBody.price,
        categories: categories,
        ingredients: filteredBody.ingredients,
        nutritionalInfo: filteredBody.nutritionalInfo
          ? JSON.parse(filteredBody.nutritionalInfo)
          : {},
        customizationOptions: filteredBody.customizationOptions
          ? JSON.parse(filteredBody.customizationOptions)
          : {},
      };

      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "foodItems", public_id: filteredBody.name },
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
// Access: PRIVATE (Admin Only)
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
      if (validateRequest(req, res)) return;

      const { id } = req.params;
      const allowedFields = [
        "name",
        "price",
        "categories",
        "ingredients",
        "nutritionalInfo",
        "customizationOptions",
      ];

      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      if (
        filteredBody.categories &&
        typeof filteredBody.categories === "string"
      ) {
        try {
          filteredBody.categories = JSON.parse(filteredBody.categories);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for categories" });
        }
      }

      const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      if (filteredBody.categories) {
        filteredBody.categories = filteredBody.categories.map((id) =>
          id.trim()
        );
        if (!filteredBody.categories.every(isValidObjectId)) {
          return res
            .status(400)
            .json({ error: "Invalid category ID(s) provided" });
        }
      }

      const existingCategories = await Category.find({
        _id: { $in: filteredBody.categories || [] },
      }).lean();

      if (
        filteredBody.categories &&
        existingCategories.length !== filteredBody.categories.length
      ) {
        return res
          .status(400)
          .json({ error: "One or more categories do not exist" });
      }

      const foodItem = await FoodItem.findById(id);
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }

      const oldName = foodItem.name;

      if (filteredBody.nutritionalInfo) {
        filteredBody.nutritionalInfo = JSON.parse(filteredBody.nutritionalInfo);
      }
      if (filteredBody.customizationOptions) {
        filteredBody.customizationOptions = JSON.parse(
          filteredBody.customizationOptions
        );
      }

      if (req.file) {
        if (foodItem.imageUrl) {
          await cloudinary.uploader.destroy(`foodItems/${oldName}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "foodItems", public_id: filteredBody.name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        filteredBody.imageUrl = result.secure_url;
      }

      Object.assign(foodItem, filteredBody);
      await foodItem.save();

      res.status(200).json(foodItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/fooditems
// Access: PRIVATE
router.get(
  "/admin/fooditems",
  [authMiddleware.authenticateJWT],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        categoryid,
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      let filter = {};
      if (categoryid) {
        filter.categories = categoryid;
      }

      const foodItems = await FoodItem.find(filter)
        .populate({ path: "categories", select: "name" })
        .populate({ path: "orders", select: "status createdAt" })
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean();

      if (!foodItems.length) {
        return res.status(404).json({ message: "No food items found" });
      }

      const totalCount = await FoodItem.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: foodItems,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /admin/fooditem/get/:id
// Access: PRIVATE
router.get(
  "/admin/fooditem/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid food item ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const foodItem = await FoodItem.findById(req.params.id)
        .populate({ path: "categories", select: "name" })
        .populate({ path: "orders", select: "status createdAt" })
        .lean();

      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }
      res.status(200).json(foodItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /admin/fooditem/delete/:id
// Access: PRIVATE (Admin Only)
router.delete(
  "/admin/fooditem/delete/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage("Invalid food item ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const orders = await Order.find({ "items.foodItemId": id }).lean();
      if (orders.length > 0) {
        return res.status(400).json({
          message: "Food item cannot be deleted as it is referenced in orders",
        });
      }

      const foodItem = await FoodItem.findById(id).lean();
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }

      if (foodItem.imageUrl) {
        await cloudinary.uploader.destroy(`foodItems/${foodItem.name}`);
      }

      await FoodItem.findByIdAndDelete(id);
      res.status(200).json({ message: "Food item deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
