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
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
  isValidJSON,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// @route   POST /admin/fooditem/register
// @desc    Register a new food item (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/fooditem/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [...foodItemValidation()], // Apply food item validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, FoodItem.schema);

      // Parse and validate categories
      let categories = filteredBody.categories;
      if (typeof categories === "string") {
        try {
          categories = JSON.parse(categories);
        } catch (err) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CATEGORY_FORMAT });
        }
      }

      const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      categories = categories.map((id) => id.trim());

      if (!categories.every(isValidObjectId)) {
        return res.status(400).json({ message: messages.INVALID_CATEGORY_ID });
      }

      // Check if all categories exist
      const existingCategories = await Category.find({
        _id: { $in: categories },
      }).lean();

      if (existingCategories.length !== categories.length) {
        return res.status(400).json({ message: messages.CATEGORY_NOT_FOUND });
      }

      // Parse and validate customizations
      let customizations = filteredBody.customizations;
      if (typeof customizations === "string") {
        try {
          customizations = JSON.parse(customizations);
        } catch (err) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_FORMAT });
        }
      }

      // Parse nutritional info if provided
      if (
        filteredBody.nutritionalInfo &&
        typeof filteredBody.nutritionalInfo === "string"
      ) {
        filteredBody.nutritionalInfo = JSON.parse(filteredBody.nutritionalInfo);
      }

      for (let customization of customizations) {
        if (
          !customization.customization ||
          !isValidObjectId(customization.customization)
        ) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_ID });
        }
        if (typeof customization.isInOffer !== "boolean") {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_FORMAT });
        }
      }

      // Check if food item with the same name already exists
      const existingFoodItem = await FoodItem.findOne({
        name: filteredBody.name,
      }).lean();

      if (existingFoodItem) {
        return res.status(400).json({ message: messages.FOOD_ITEM_EXISTS });
      }

      // Prepare food item data
      let foodItemData = {
        name: filteredBody.name,
        price: filteredBody.price,
        categories: categories,
        ingredients: filteredBody.ingredients,
        nutritionalInfo: filteredBody.nutritionalInfo
          ? isValidJSON(filteredBody.nutritionalInfo)
            ? JSON.parse(filteredBody.nutritionalInfo)
            : {}
          : {},
        customizations: filteredBody.customizations
          ? isValidJSON(filteredBody.customizations)
            ? JSON.parse(filteredBody.customizations)
            : []
          : [],
      };

      // Upload image to Cloudinary if provided
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

      // Create and save the food item
      const foodItem = new FoodItem(foodItemData);
      await foodItem.save();

      // Return success response
      res.status(201).json({
        message: messages.FOODITEM_REGISTRATION_SUCCESS,
        foodItem,
      });
    } catch (error) {
      handleError("/admin/fooditem/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/fooditem/update/:id
// @desc    Update an existing food item (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/fooditem/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [
    param("id").isMongoId().withMessage(messages.INVALID_ID), // Validate food item ID
    ...foodItemValidation(), // Apply food item validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, FoodItem.schema);

      // Parse and validate categories
      if (
        filteredBody.categories &&
        typeof filteredBody.categories === "string"
      ) {
        try {
          filteredBody.categories = JSON.parse(filteredBody.categories);
        } catch (err) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CATEGORY_FORMAT });
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
            .json({ message: messages.INVALID_CATEGORY_ID });
        }
      }

      // Check if all categories exist
      const existingCategories = await Category.find({
        _id: { $in: filteredBody.categories || [] },
      }).lean();

      if (
        filteredBody.categories &&
        existingCategories.length !== filteredBody.categories.length
      ) {
        return res.status(400).json({ message: messages.CATEGORY_NOT_FOUND });
      }

      // Find the food item by ID
      const foodItem = await FoodItem.findById(id);
      if (!foodItem) {
        return res.status(404).json({ message: messages.FOOD_ITEM_NOT_FOUND });
      }

      const oldName = foodItem.name;

      // Parse nutritional info if provided
      if (
        filteredBody.nutritionalInfo &&
        typeof filteredBody.nutritionalInfo === "string"
      ) {
        filteredBody.nutritionalInfo = JSON.parse(filteredBody.nutritionalInfo);
      }

      // Parse and validate customizations
      let customizations = filteredBody.customizations;
      if (typeof customizations === "string") {
        try {
          customizations = JSON.parse(customizations);
        } catch (err) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_FORMAT });
        }
      }

      for (let customization of customizations) {
        if (
          !customization.customization ||
          !isValidObjectId(customization.customization)
        ) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_ID });
        }
        if (typeof customization.isInOffer !== "boolean") {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_FORMAT });
        }
      }

      if (filteredBody.customizations) {
        filteredBody.customizations = JSON.parse(customizations);
      }

      // Upload new image to Cloudinary if provided
      if (req.file) {
        // Delete old image from Cloudinary if it exists
        if (foodItem.imageUrl) {
          await cloudinary.uploader.destroy(`foodItems/${oldName}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "foodItems", public_id: filteredBody.name || oldName },
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

      // Update food item fields
      Object.assign(foodItem, filteredBody);
      await foodItem.save();

      // Return success response
      res.status(200).json({
        message: messages.FOODITEM_UPDATE_SUCCESS,
        foodItem,
      });
    } catch (error) {
      handleError(
        `/admin/fooditem/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// @route   DELETE /admin/fooditem/delete/:id
// @desc    Delete a food item (Admin Only)
// @access  PRIVATE (Admin Only)
router.delete(
  "/admin/fooditem/delete/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [param("id").isMongoId().withMessage(messages.INVALID_ID)], // Validate food item ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Check if the food item is referenced in any orders
      const orders = await Order.find({ "items.foodItemId": id }).lean();
      if (orders.length > 0) {
        return res.status(400).json({ message: messages.FOOD_ITEM_HAS_ORDERS });
      }

      // Find the food item by ID
      const foodItem = await FoodItem.findById(id).lean();
      if (!foodItem) {
        return res.status(404).json({ message: messages.FOOD_ITEM_NOT_FOUND });
      }

      // Delete the food item image from Cloudinary if it exists
      if (foodItem.imageUrl) {
        await cloudinary.uploader.destroy(`foodItems/${foodItem.name}`);
      }

      // Delete the food item
      await FoodItem.findByIdAndDelete(id);

      // Return success response
      res.status(200).json({ message: messages.FOOD_ITEM_DELETED_SUCCESS });
    } catch (error) {
      handleError(
        `/admin/fooditem/delete/${req.params.id}`,
        "DELETE",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/fooditem/branch/top/:branchId
// @desc    Get top 10 best-selling products for a specific branch
// @access  PRIVATE
router.get(
  "/admin/fooditem/branch/top/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("branchId").isMongoId().withMessage(messages.INVALID_ID)], // Validate branch ID
  async (req, res) => {
    try {
      // Validate request parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;

      // Aggregate to find top 10 best-selling products
      const topProducts = await Order.aggregate([
        // Match orders for the specific branch
        { $match: { id: mongoose.Types.ObjectId(branchId) } },
        // Unwind the items array to process each item individually
        { $unwind: "$items" },
        // Group by foodItem and calculate total quantity sold
        {
          $group: {
            _id: "$items.foodItem",
            totalQuantity: { $sum: "$items.quantity" },
          },
        },
        // Sort by totalQuantity in descending order
        { $sort: { totalQuantity: -1 } },
        // Limit to top 10 products
        { $limit: 10 },
        // Lookup to populate foodItem details
        {
          $lookup: {
            from: "fooditems", // Collection name for FoodItem
            localField: "_id",
            foreignField: "_id",
            as: "foodItemDetails",
          },
        },
        // Unwind the foodItemDetails array (since lookup returns an array)
        { $unwind: "$foodItemDetails" },
        // Project the required fields, including imageUrl
        {
          $project: {
            _id: 0,
            foodItemId: "$_id",
            name: "$foodItemDetails.name",
            imageUrl: "$foodItemDetails.imageUrl", // Include imageUrl
            totalQuantity: 1,
          },
        },
      ]);

      if (!topProducts || topProducts.length === 0) {
        return res.status(404).json({ message: messages.NO_PRODUCTS_FOUND });
      }

      // Return success response with the top 10 best-selling products
      res.status(200).json({
        success: true,
        data: topProducts,
      });
    } catch (error) {
      handleError(
        `/admin/fooditem/branch/top/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

module.exports = router;
