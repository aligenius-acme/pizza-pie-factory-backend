const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const Offer = require("../../models/Offer");
const { offerValidation } = require("../../utils/helpers");
const { OfferDiscountTypes } = require("../../utils/enums");

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
        "title",
        "description",
        "imageUrl",
        "discountType",
        "discountValue",
        "bundleItems",
        "validFrom",
        "validUntil",
        "applicableDays",
        "applicableTime",
        "termsAndConditions",
        "isActive",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      if (
        filteredBody.discountType !== OfferDiscountTypes.BUNDLE &&
        (filteredBody.discountValue === undefined ||
          filteredBody.discountValue === null)
      ) {
        return res.status(400).json({
          message: "Discount value is required for non-bundle offers",
        });
      }

      let foodItems = filteredBody.bundleItems;

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
      foodItems = foodItems.map((id) => id.trim());

      if (!foodItems.every(isValidObjectId)) {
        return res
          .status(400)
          .json({ error: "Invalid food item ID(s) provided" });
      }

      const existingFoodItems = await FoodItem.find({
        _id: { $in: foodItems },
      }).lean();

      if (existingFoodItems.length !== foodItems.length) {
        return res
          .status(400)
          .json({ error: "One or more food items do not exist" });
      }

      const existingOffer = await Offer.findOne({
        name: filteredBody.name,
      }).lean();
      if (existingOffer) {
        return res
          .status(400)
          .json({ message: "Offer with this name already exists" });
      }

      let offerData = filteredBody;

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
  upload.single("image"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
    ...offerValidation(),
  ],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const { id } = req.params;

      const allowedFields = [
        "title",
        "description",
        "imageUrl",
        "discountType",
        "discountValue",
        "bundleItems",
        "validFrom",
        "validUntil",
        "applicableDays",
        "applicableTime",
        "termsAndConditions",
        "isActive",
      ];

      let filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(
          ([key, value]) =>
            allowedFields.includes(key) && value !== undefined && value !== null
        )
      );

      if (
        filteredBody.discountType !== OfferDiscountTypes.BUNDLE &&
        (filteredBody.discountValue === undefined ||
          filteredBody.discountValue === null)
      ) {
        return res.status(400).json({
          message: "Discount value is required for non-bundle offers",
        });
      }

      let foodItems = filteredBody.bundleItems;
      if (typeof foodItems === "string") {
        try {
          foodItems = JSON.parse(foodItems);
        } catch (err) {
          return res
            .status(400)
            .json({ error: "Invalid format for bundle items" });
        }
      }

      const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
      foodItems = foodItems.map((id) => id.trim());

      if (!foodItems.every(isValidObjectId)) {
        return res
          .status(400)
          .json({ error: "Invalid bundle item ID(s) provided" });
      }

      const existingFoodItems = await FoodItem.find({
        _id: { $in: foodItems },
      }).lean();

      if (existingFoodItems.length !== foodItems.length) {
        return res
          .status(400)
          .json({ error: "One or more bundle items do not exist" });
      }

      const offer = await Offer.findById(id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const oldName = offer.name;

      if (req.file) {
        if (offer.imageUrl) {
          await cloudinary.uploader.destroy(`offers/${oldName}`);
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

      Object.assign(offer, filteredBody);
      await offer.save();

      res.status(200).json(offer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
