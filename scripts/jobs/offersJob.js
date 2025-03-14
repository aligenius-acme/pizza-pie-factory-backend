const cron = require("node-cron");
const mongoose = require("mongoose");
const Offer = require("../../models/Offer");

// Function to check and update offer validity
const checkOfferValidity = async () => {
  try {
    const currentDate = new Date();

    // Find all active offers where validUntil is less than the current date
    const expiredOffers = await Offer.find({
      isActive: true,
      validUntil: { $lt: currentDate },
    });
    console.log(expiredOffers);
    // Mark expired offers as inactive
    for (const offer of expiredOffers) {
      offer.isActive = false;
      await offer.save();
      console.log(
        `Offer ${offer._id} (${offer.name}) has expired and is now inactive.`
      );
    }

    if (expiredOffers.length === 0) {
      console.log("No expired offers found.");
    }
  } catch (error) {
    console.error("Error checking offer validity:", error);
  }
};

// Schedule the cron job to run daily at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Running daily offer validity check...");
  checkOfferValidity();
});

module.exports = checkOfferValidity;
