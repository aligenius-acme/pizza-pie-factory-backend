const express = require("express");
const authMiddleware = require("../../middleware/auth");
const mongoose = require("mongoose");
const { offerValidation } = require("../../utils/validation");
const { param } = require("express-validator");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const Offer = require("../../models/Offer");
const Category = require("../../models/Category");
const Customization = require("../../models/Customization");
const { validateRequest } = require("../../utils/helpers");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /admin/offer/register
// Access: PRIVATE (Admin Only)
router.post(
  "/admin/offer/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [...offerValidation()],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const allowedFields = [
        "name",
        "description",
        "categories",
        "customizations",
        "offerPrice",
        "imageUrl",
        "validFrom",
        "validUntil",
        "termsAndConditions",
        "isActive",
        "offerCode",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let customizations = filteredBody.customizations;

      if (typeof customizations === "string") {
        try {
          customizations = JSON.parse(customizations);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for customizations" });
        }
      }

      let isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      customizations = customizations.map((id) => id.trim());

      if (!customizations.every(isValidObjectId)) {
        return res
          .status(400)
          .json({ error: "Invalid customization ID(s) provided" });
      }

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

      isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
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

      const existingCustomizations = await Customization.find({
        _id: { $in: customizations },
      }).lean();

      if (existingCustomizations.length !== customizations.length) {
        return res
          .status(400)
          .json({ error: "One or more customizations do not exist" });
      }

      const existingOffer = await Offer.findOne({
        name: filteredBody.name,
      }).lean();
      if (existingOffer) {
        return res
          .status(400)
          .json({ message: "Offer with this name already exists" });
      }

      let offerData = {
        name: filteredBody.name,
        description: filteredBody.description,
        customizations: customizations,
        offerPrice: filteredBody.offerPrice,
        validFrom: filteredBody.validFrom,
        validUntil: filteredBody.validUntil,
        termsAndConditions: filteredBody.termsAndConditions,
        isActive: filteredBody.isActive,
        offerCode: filteredBody.offerCode,
        categories: categories,
      };

      if (req.file) {
        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "offers", public_id: filteredBody.name },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const result = await uploadStream();
        offerData.imageUrl = result.secure_url;
      }

      const offer = new Offer(offerData);
      await offer.save();
      res.status(201).json(offer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /admin/order/update/:id
// Access: PRIVATE (Admin Only)
router.put(
  "/admin/offer/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
    ...offerValidation(),
  ],
  upload.single("image"),
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const allowedFields = [
        "name",
        "description",
        "items",
        "basePrice",
        "totalPrice",
        "imageUrl",
        "validFrom",
        "validUntil",
        "termsAndConditions",
        "isActive",
        "offerCode",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      let foodItems = filteredBody.items;
      if (typeof foodItems === "string") {
        try {
          foodItems = JSON.parse(foodItems);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for food items" });
        }
      }

      const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      foodItems = foodItems.map((item) => ({
        itemId: item.itemId.trim(),
        quantity: item.quantity || 1,
      }));

      if (!foodItems.every((item) => isValidObjectId(item.itemId))) {
        return res
          .status(400)
          .json({ error: "Invalid food item ID(s) provided" });
      }

      const offer = await Offer.findById(id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      if (req.file) {
        if (offer.imageUrl) {
          await cloudinary.uploader.destroy(`offers/${offer.title}`);
        }

        const uploadStream = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "offers", public_id: filteredBody.title },
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

      Object.assign(offer, { ...filteredBody, items: foodItems });
      await offer.save();

      res.status(200).json(offer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
