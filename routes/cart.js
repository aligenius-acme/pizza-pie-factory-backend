const express = require("express");
const { param } = require("express-validator");
const Cart = require("../models/Cart");
const Offer = require("../models/Offer");
const FoodItem = require("../models/FoodItem");
const { cartValidation } = require("../utils/validation");
const { validateRequest } = require("../utils/helpers");

const router = express.Router();
router.post("/cart/create", [...cartValidation()], async (req, res) => {
  try {
    if (validateRequest(req, res)) return;
    const { customerId, items, offers } = req.body;

    let totalAmount = 0;
    let appliedOffers = [];
    let updatedItems = [];
    let offerItems = new Set();

    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res.status(400).json({ message: "Invalid food item" });
      }

      let itemTotal = foodItem.price * item.quantity;
      let additionalPrice = 0;

      if (item.customizations) {
        for (const cust of item.customizations) {
          additionalPrice +=
            cust.selectedOption.additionalPrice * item.quantity;
          for (const subOpt of cust.selectedSubOptions) {
            additionalPrice += subOpt.additionalPrice * item.quantity;
          }
        }
      }

      itemTotal += additionalPrice;

      updatedItems.push({
        ...item,
        itemPrice: foodItem.price,
        additionalPrice,
        totalPrice: itemTotal,
      });
    }

    let offerPriceTotal = 0;
    let additionalOfferPrice = 0;
    for (const offerId of offers) {
      const offer = await Offer.findById(offerId).populate("customizations");
      if (!offer) continue;

      const offerCustomizationIds = offer.customizations.map((c) =>
        c._id.toString()
      );
      const cartCustomizationIds = items.flatMap((item) =>
        item.customizations.map((c) => c.customization.toString())
      );

      const allItemsIncluded = offerCustomizationIds.every((id) =>
        cartCustomizationIds.includes(id)
      );

      if (allItemsIncluded) {
        appliedOffers.push({
          offerId: offerId,
          isOfferComplete: true,
        });
        offerPriceTotal += offer.offerPrice;

        for (const item of items) {
          if (
            item.customizations.some((cust) =>
              offerCustomizationIds.includes(cust.customization.toString())
            )
          ) {
            offerItems.add(item.foodItem);
          }
        }

        for (const item of updatedItems) {
          if (offerItems.has(item.foodItem)) {
            additionalOfferPrice += item.additionalPrice;
          }
        }
      }
    }

    for (const item of updatedItems) {
      if (!offerItems.has(item.foodItem)) {
        totalAmount += item.totalPrice;
      }
    }

    totalAmount += offerPriceTotal + additionalOfferPrice;

    const cart = new Cart({
      customerId,
      items: updatedItems,
      offers: appliedOffers,
      totalAmount,
    });

    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put(
  "/cart/update/:id",
  [param("id").isMongoId().withMessage("Invalid cart ID"), ...cartValidation()],
  async (req, res) => {
    try {
      const { customerId, items, offers } = req.body;

      // Fetch existing cart for the customer
      let cart = await Cart.findOne({ customerId });

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      let totalAmount = 0;
      let appliedOffers = [];
      let updatedItems = [...cart.items]; // Start with existing items
      let offerItems = new Set(); // Tracks ONLY offer-related food items

      // Update or Add new items
      for (const item of items) {
        const foodItem = await FoodItem.findById(item.foodItem);
        if (!foodItem) {
          return res.status(400).json({ message: "Invalid food item" });
        }

        let itemTotal = foodItem.price * item.quantity;
        let additionalPrice = 0;

        if (item.customizations) {
          for (const cust of item.customizations) {
            additionalPrice +=
              cust.selectedOption.additionalPrice * item.quantity;
            for (const subOpt of cust.selectedSubOptions) {
              additionalPrice += subOpt.additionalPrice * item.quantity;
            }
          }
        }

        itemTotal += additionalPrice;

        // Check if item already exists in cart
        const existingItemIndex = updatedItems.findIndex(
          (cartItem) =>
            cartItem.foodItem.toString() === item.foodItem.toString()
        );

        if (existingItemIndex !== -1) {
          // Update existing item
          updatedItems[existingItemIndex].quantity = item.quantity;
          updatedItems[existingItemIndex].totalPrice = itemTotal;
          updatedItems[existingItemIndex].additionalPrice = additionalPrice;
        } else {
          // Add new item
          updatedItems.push({
            ...item,
            itemPrice: foodItem.price,
            additionalPrice,
            totalPrice: itemTotal,
          });
        }
      }

      // Check and apply offers
      let offerPriceTotal = 0;
      let additionalOfferPrice = 0;
      for (const offerId of offers) {
        const offer = await Offer.findById(offerId).populate("customizations");
        if (!offer) continue;

        const offerCustomizationIds = offer.customizations.map((c) =>
          c._id.toString()
        );
        const cartCustomizationIds = updatedItems.flatMap((item) =>
          item.customizations.map((c) => c.customization.toString())
        );

        const allItemsIncluded = offerCustomizationIds.every((id) =>
          cartCustomizationIds.includes(id)
        );

        if (allItemsIncluded) {
          appliedOffers.push({
            offerId: offerId,
            isOfferComplete: true,
          });
          offerPriceTotal += offer.offerPrice;

          for (const item of updatedItems) {
            if (
              item.customizations.some((cust) =>
                offerCustomizationIds.includes(cust.customization.toString())
              )
            ) {
              offerItems.add(item.foodItem);
            }
          }

          for (const item of updatedItems) {
            if (offerItems.has(item.foodItem)) {
              additionalOfferPrice += item.additionalPrice;
            }
          }
        }
      }

      for (const item of updatedItems) {
        if (!offerItems.has(item.foodItem)) {
          totalAmount += item.totalPrice;
        }
      }

      totalAmount += offerPriceTotal + additionalOfferPrice;

      cart.items = updatedItems;
      cart.offers = appliedOffers;
      cart.totalAmount = totalAmount;

      await cart.save();
      res.status(200).json(cart);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// // POST /api/cart/create
// // Access: PUBLIC
// router.post("/cart/create", [...cartValidation()], async (req, res) => {
//   try {
//     if (validateRequest(req, res)) return;

//     const { customerId, items = [], offers = [] } = req.body;

//     // Validate customerId
//     if (!customerId) {
//       return res.status(400).json({ error: "Customer ID is required" });
//     }

//     // Fetch and validate offers
//     const validOffers = [];
//     for (const offerId of offers) {
//       const offer = await Offer.findById(offerId);
//       if (offer && offer.isActive) {
//         validOffers.push(offer);
//       } else {
//         return res
//           .status(404)
//           .json({ error: `Offer with ID ${offerId} not found or inactive` });
//       }
//     }

//     let totalAmount = 0;
//     const processedItems = [];
//     const offerItemIds = new Set();

//     // Collect all item IDs from valid offers
//     validOffers.forEach((offer) => {
//       if (offer.customizations && Array.isArray(offer.customizations)) {
//         offer.customizations.forEach((customizationId) => {
//           // Fetch customization details
//           const customization = Customization.findById(customizationId);
//           if (
//             customization &&
//             customization.items &&
//             Array.isArray(customization.items)
//           ) {
//             customization.items.forEach((item) =>
//               offerItemIds.add(item.toString())
//             );
//           }
//         });
//       }
//     });

//     console.log(offerItemIds);

//     const nonOfferItems = [];
//     const offerItems = [];

//     // Separate items into offerItems and nonOfferItems
//     for (const item of items) {
//       if (offerItemIds.has(item.foodItem)) {
//         offerItems.push(item);
//       } else {
//         nonOfferItems.push(item);
//       }
//     }

//     // Function to process individual items
//     const processItem = async (item) => {
//       const foodItem = await FoodItem.findById(item.foodItem);
//       if (!foodItem) {
//         throw new Error(`Food item with ID ${item.foodItem} not found`);
//       }

//       if (foodItem.price !== item.itemPrice) {
//         throw new Error(
//           `Price mismatch for food item ${item.foodItem}. Expected: ${foodItem.price}, Received: ${item.itemPrice}`
//         );
//       }

//       let itemPrice = foodItem.price;

//       for (const customization of item.customizations) {
//         const selectedCustomization = await Customization.findById(
//           customization.customization
//         );
//         if (!selectedCustomization) {
//           throw new Error(
//             `Customization with ID ${customization.customization} not found`
//           );
//         }

//         const selectedOption = selectedCustomization.customizations
//           .flatMap((c) => c.options)
//           .find((option) =>
//             option._id.equals(customization.selectedOption._id)
//           );

//         if (selectedOption) {
//           if (
//             selectedOption.additionalPrice !==
//             customization.selectedOption.additionalPrice
//           ) {
//             throw new Error(
//               `Additional price mismatch for option ${customization.selectedOption._id}. Expected: ${selectedOption.additionalPrice}, Received: ${customization.selectedOption.additionalPrice}`
//             );
//           }
//           itemPrice += selectedOption.additionalPrice;

//           for (const subOption of customization.selectedSubOptions) {
//             const selectedSubOption = selectedOption.subOptions.find((sub) =>
//               sub._id.equals(subOption._id)
//             );
//             if (selectedSubOption) {
//               if (
//                 selectedSubOption.additionalPrice !== subOption.additionalPrice
//               ) {
//                 throw new Error(
//                   `Sub-option price mismatch for sub-option ${subOption._id}. Expected: ${selectedSubOption.additionalPrice}, Received: ${subOption.additionalPrice}`
//                 );
//               }
//               itemPrice += selectedSubOption.additionalPrice;
//             }
//           }
//         }
//       }

//       const totalPrice = itemPrice * item.quantity;
//       totalAmount += totalPrice;

//       processedItems.push({
//         foodItem: item.foodItem,
//         quantity: item.quantity,
//         customizations: item.customizations,
//         itemPrice,
//         totalPrice,
//       });
//     };

//     // Process non-offer items
//     for (const item of nonOfferItems) {
//       await processItem(item);
//     }

//     // Process offer items
//     for (const offer of validOffers) {
//       if (!offer.categories || !Array.isArray(offer.categories)) {
//         return res.status(400).json({
//           error: `Offer with ID ${offer._id} has invalid or missing categories.`,
//         });
//       }

//       // Get category IDs from the offer
//       const offerCategoryIds = offer.categories.map((category) =>
//         category.toString()
//       );

//       // Find items that belong to these categories
//       const itemsInOffer = offerItems.filter(
//         (item) => offerCategoryIds.includes(item.category.toString()) // Ensure item has category field
//       );

//       if (itemsInOffer.length === offerCategoryIds.length) {
//         // All required category items are present → Apply offer price
//         let offerTotalPrice = offer.offerPrice;

//         // Process each item for customizations and validation
//         for (const item of itemsInOffer) {
//           await processItem(item);
//         }

//         totalAmount += offerTotalPrice;
//       } else {
//         // Not all required category items are present → Calculate based on individual item prices
//         for (const item of itemsInOffer) {
//           await processItem(item);
//         }
//       }
//     }

//     // Create cart entry
//     const cart = new Cart({
//       customerId,
//       items: processedItems,
//       totalAmount,
//     });

//     await cart.save();

//     res.status(201).json({ message: "Cart created successfully", cart });
//   } catch (error) {
//     console.error("Error creating cart:", error);
//     res.status(500).json({ error: "Failed to create cart" });
//   }
// });

// // PUT /api/cart/update/:id
// // Access: PUBLIC
// router.put(
//   "/cart/update/:id",
//   [
//     param("id").isMongoId().withMessage("Invalid branch ID"),
//     ...cartValidation(),
//   ],
//   async (req, res) => {
//     try {
//       if (validateRequest(req, res)) return;

//       const { id } = req.params;
//       const { customerId, items, offers } = req.body;

//       const cart = await Cart.findById(id);
//       if (!cart) {
//         return res.status(404).json({ error: `Cart with ID ${id} not found` });
//       }

//       const validOffers = [];
//       if (offers && offers.length > 0) {
//         for (const offerId of offers) {
//           const offer = await Offer.findById(offerId);
//           if (offer && offer.isActive) {
//             validOffers.push(offer);
//           } else {
//             return res.status(404).json({
//               error: `Offer with ID ${offerId} not found or inactive`,
//             });
//           }
//         }
//       }

//       let totalAmount = 0;
//       const processedItems = [];

//       for (const item of items) {
//         const foodItem = await FoodItem.findById(item.foodItem);
//         if (!foodItem) {
//           return res
//             .status(404)
//             .json({ error: `Food item with ID ${item.foodItem} not found` });
//         }

//         if (foodItem.price !== item.itemPrice) {
//           return res.status(400).json({
//             error: `Price mismatch for food item ${item.foodItem}. Expected: ${foodItem.price}, Received: ${item.itemPrice}`,
//           });
//         }

//         let itemPrice = foodItem.price;

//         for (const customization of item.customizations) {
//           const selectedCustomization = await Customization.findById(
//             customization.customization
//           );
//           if (!selectedCustomization) {
//             return res.status(404).json({
//               error: `Customization with ID ${customization.customization} not found`,
//             });
//           }

//           const selectedOption = selectedCustomization.customizations
//             .flatMap((c) => c.options)
//             .find((option) =>
//               option._id.equals(customization.selectedOption._id)
//             );

//           if (selectedOption) {
//             if (
//               selectedOption.additionalPrice !==
//               customization.selectedOption.additionalPrice
//             ) {
//               return res.status(400).json({
//                 error: `Additional price mismatch for option ${customization.selectedOption._id}. Expected: ${selectedOption.additionalPrice}, Received: ${customization.selectedOption.additionalPrice}`,
//               });
//             }
//             itemPrice += selectedOption.additionalPrice;

//             for (const subOption of customization.selectedSubOptions) {
//               const selectedSubOption = selectedOption.subOptions.find((sub) =>
//                 sub._id.equals(subOption._id)
//               );
//               if (selectedSubOption) {
//                 if (
//                   selectedSubOption.additionalPrice !==
//                   subOption.additionalPrice
//                 ) {
//                   return res.status(400).json({
//                     error: `Sub-option price mismatch for sub-option ${subOption._id}. Expected: ${selectedSubOption.additionalPrice}, Received: ${subOption.additionalPrice}`,
//                   });
//                 }
//                 itemPrice += selectedSubOption.additionalPrice;
//               }
//             }
//           }
//         }

//         const totalPrice = itemPrice * item.quantity;
//         totalAmount += totalPrice;

//         processedItems.push({
//           foodItem: item.foodItem,
//           quantity: item.quantity,
//           customizations: item.customizations,
//           itemPrice,
//           totalPrice,
//         });
//       }

//       for (const offer of validOffers) {
//         totalAmount -= offer.offerPrice;
//       }

//       totalAmount = Math.max(totalAmount, 0);

//       cart.customerId = customerId;
//       cart.items = processedItems;
//       cart.offers = validOffers.map((offer) => offer._id);
//       cart.totalAmount = totalAmount;

//       await cart.save();

//       res.status(200).json({
//         customerId,
//         items: processedItems,
//         offers: validOffers.map((offer) => offer._id),
//         totalAmount,
//       });
//     } catch (error) {
//       console.error("Error updating cart:", error);
//       res.status(500).json({ error: "Failed to update cart" });
//     }
//   }
// );

module.exports = router;
