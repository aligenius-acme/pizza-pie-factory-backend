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

// PUT /admin/offer/update/:id
// Access: PRIVATE (Admin Only)
router.put(
  "/admin/offer/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  upload.single("image"),
  [
    param("id").isMongoId().withMessage("Invalid Offer ID"),
    ...offerValidation(),
  ],
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
      if (customizations) {
        customizations = customizations.map((id) => id.trim());
        if (
          !customizations.every((id) => mongoose.Types.ObjectId.isValid(id))
        ) {
          return res
            .status(400)
            .json({ error: "Invalid customization ID(s) provided" });
        }
        const existingCustomizations = await Customization.find({
          _id: { $in: customizations },
        }).lean();
        if (existingCustomizations.length !== customizations.length) {
          return res
            .status(400)
            .json({ error: "One or more customizations do not exist" });
        }
        filteredBody.customizations = customizations;
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
      if (categories) {
        categories = categories.map((id) => id.trim());
        if (!categories.every((id) => mongoose.Types.ObjectId.isValid(id))) {
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
        filteredBody.categories = categories;
      }

      if (filteredBody.name) {
        console.log(req.params.id);
        const existingOffer = await Offer.findOne({
          name: filteredBody.name,
          _id: { $ne: req.params.id },
        }).lean();

        if (existingOffer) {
          return res
            .status(400)
            .json({ message: "Offer with this name already exists" });
        }
      }

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
        filteredBody.imageUrl = result.secure_url;
      }

      const updatedOffer = await Offer.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        { new: true }
      );

      if (!updatedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      res.status(200).json(updatedOffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/offer/get/:id
// Access: PRIVATE
router.get(
  "/admin/offer/get/:id",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid offer ID")],
  async (req, res) => {
    try {
      if (validateRequest(req, res)) return;

      const offer = await Offer.findById(req.params.id)
        .populate({ path: "categories" })
        .populate({ path: "customizations" })
        .lean();

      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.status(200).json(offer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /admin/offers
// Access: PRIVATE
router.get(
  "/admin/offers",
  authMiddleware.authenticateJWT,
  [param("id").isMongoId().withMessage("Invalid offer ID")],
  async (req, res) => {
    try {
      const offers = await Offer.find()
        .populate({ path: "categories" })
        .populate({ path: "customizations" })
        .lean();
      res.status(200).json(offers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
