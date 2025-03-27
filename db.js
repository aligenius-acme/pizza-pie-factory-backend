const mongoose = require("mongoose");

// DEV
// const mongoURI = "mongodb://localhost:27017/pizzapiefactory";

// PROD
const mongoURI =
  "mongodb+srv://aligenius:iplewSpTXpUZYc4A@pizzapiefactoryclustor.k3qvwca.mongodb.net/pizzapiefactory?retryWrites=true&w=majority&appName=PizzaPieFactoryClustor";

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

module.exports = connectToMongo;
