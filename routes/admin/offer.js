const express = require("express");
const authMiddleware = require("../../middleware/auth");
const mongoose = require("mongoose");
const { offerValidation } = require("../../utils/validation");
const { param, query } = require("express-validator");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const Offer = require("../../models/Offer");
const Category = require("../../models/Category");
const Customization = require("../../models/Customization");
const {
  validateRequest,
  stripUnwantedFields,
  handleError,
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

// @route   POST /admin/offer/register
// @desc    Register a new offer (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/offer/register",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [...offerValidation()], // Apply offer validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Offer.schema);

      // Parse customizations if provided
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

      // Validate customization IDs
      if (customizations) {
        customizations = customizations.map((id) => id.trim());
        if (
          !customizations.every((id) => mongoose.Types.ObjectId.isValid(id))
        ) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_ID });
        }
        const existingCustomizations = await Customization.find({
          _id: { $in: customizations },
          isActive: true,
        }).lean();
        if (existingCustomizations.length !== customizations.length) {
          return res
            .status(400)
            .json({ message: messages.CUSTOMIZATION_NOT_FOUND_OR_INACTIVE });
        }
      }

      // Parse categories if provided
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

      // Validate category IDs
      if (categories) {
        categories = categories.map((id) => id.trim());
        if (!categories.every((id) => mongoose.Types.ObjectId.isValid(id))) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CATEGORY_ID });
        }
        const existingCategories = await Category.find({
          _id: { $in: categories },
        }).lean();
        if (existingCategories.length !== categories.length) {
          return res.status(400).json({ message: messages.CATEGORY_NOT_FOUND });
        }
      }

      // Check if an offer with the same name already exists
      const existingOffer = await Offer.findOne({
        name: filteredBody.name,
      }).lean();
      if (existingOffer) {
        return res.status(400).json({ message: messages.OFFER_EXISTS });
      }

      // Prepare offer data
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

      // Upload image to Cloudinary if provided
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

      // Create and save the offer
      const offer = new Offer(offerData);
      await offer.save();

      // Return success response
      res.status(201).json(offer);
    } catch (error) {
      handleError("/admin/offer/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/offer/update/:id
// @desc    Update an existing offer (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/offer/update/:id",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  upload.single("image"), // Handle image upload
  [
    param("id").isMongoId().withMessage("Invalid Offer ID"), // Validate offer ID
    ...offerValidation(), // Apply offer validation rules
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Offer.schema);

      // Parse customizations if provided
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

      // Validate customization IDs
      if (customizations) {
        customizations = customizations.map((id) => id.trim());
        if (
          !customizations.every((id) => mongoose.Types.ObjectId.isValid(id))
        ) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CUSTOMIZATION_ID });
        }
        const existingCustomizations = await Customization.find({
          _id: { $in: customizations },
          isActive: true,
        }).lean();
        if (existingCustomizations.length !== customizations.length) {
          return res
            .status(400)
            .json({ message: messages.CUSTOMIZATION_NOT_FOUND_OR_INACTIVE });
        }
        filteredBody.customizations = customizations;
      }

      // Parse categories if provided
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

      // Validate category IDs
      if (categories) {
        categories = categories.map((id) => id.trim());
        if (!categories.every((id) => mongoose.Types.ObjectId.isValid(id))) {
          return res
            .status(400)
            .json({ message: messages.INVALID_CATEGORY_ID });
        }
        const existingCategories = await Category.find({
          _id: { $in: categories },
        }).lean();
        if (existingCategories.length !== categories.length) {
          return res.status(400).json({ message: messages.CATEGORY_NOT_FOUND });
        }
        filteredBody.categories = categories;
      }

      // Check if an offer with the same name already exists (excluding the current offer)
      if (filteredBody.name) {
        const existingOffer = await Offer.findOne({
          name: filteredBody.name,
          _id: { $ne: id },
        }).lean();
        if (existingOffer) {
          return res.status(400).json({ message: messages.OFFER_EXISTS });
        }
      }

      // Upload image to Cloudinary if provided
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

      // Update the offer
      const updatedOffer = await Offer.findByIdAndUpdate(id, filteredBody, {
        new: true,
      });

      if (!updatedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Return success response
      res.status(200).json(updatedOffer);
    } catch (error) {
      handleError(
        `/admin/offer/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// // @route   GET /admin/offer/get/:id
// // @desc    Get offer details by ID
// // @access  PRIVATE
// router.get(
//   "/admin/offer/get/:id",
//   authMiddleware.authenticateJWT,
//   [param("id").isMongoId().withMessage(messages.INVALID_OFFER_ID)],
//   async (req, res) => {
//     try {
//       // Validate request parameters
//       const errors = validateRequest(req);
//       if (errors) return res.status(400).json({ errors });

//       const { id } = req.params;

//       // Find the offer by ID and populate related fields
//       const offer = await Offer.findById(id)
//         .populate({ path: "categories" })
//         .populate({ path: "customizations" })
//         .lean();

//       if (!offer) {
//         return res.status(404).json({ message: messages.OFFER_NOT_FOUND });
//       }

//       // Return success response
//       res.status(200).json(offer);
//     } catch (error) {
//       handleError(`/admin/offer/get/${req.params.id}`, "GET", error, req, res);
//     }
//   }
// );

// @route   GET /admin/offers
// @desc    Get all offers
// @access  PRIVATE
router.get(
  "/admin/offers",
  authMiddleware.authenticateJWT,
  [
    query("offerId").optional().isMongoId().withMessage(messages.INVALID_ID), // Validate ID (optional)
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("isActive").optional().isBoolean(), // Validate isActive (optional)
    query("startDate").optional().isISO8601(), // Validate startDate (optional)
    query("endDate").optional().isISO8601(), // Validate endDate (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request query parameters
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const {
        offerId,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        isActive,
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = {};

      // Filter by ID
      if (offerId) {
        filter._id = offerId;
      }

      // Filter by isActive status
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Filter by date range
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      } else if (startDate) {
        filter.createdAt = {
          $gte: new Date(startDate), // Greater than or equal to startDate
        };
      } else if (endDate) {
        filter.createdAt = {
          $lte: new Date(endDate), // Less than or equal to endDate
        };
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { name: { $regex: searchRegex } }, // Search by name
          { description: { $regex: searchRegex } }, // Search by description
        ];
      }

      // Fetch offers with pagination, sorting, and population
      const offers = await Offer.find(filter)
        .populate({ path: "categories" }) // Populate categories
        .populate({ path: "customizations" }) // Populate customizations
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!offers || offers.length === 0) {
        return res.status(404).json({ message: messages.OFFER_NOT_FOUND });
      }

      // Get the total count of offers
      const totalCount = await Offer.countDocuments(filter);

      // Return success response with offers and pagination details
      res.status(200).json({
        success: true,
        data: offers,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError("/admin/offers", "GET", error, req, res);
    }
  }
);

module.exports = router;
