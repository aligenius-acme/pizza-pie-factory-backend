const cors = require("cors");
const passport = require("passport");

const connectToMongo = require("./db");
const express = require("express");

connectToMongo();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup
app.use(express.json());
app.use(cors());

// Passport initialization
app.use(passport.initialize());

// Available Routes
app.use("/api", require("./routes/auth"));

app.listen(port, () => {
  console.log(`Pizza Pie Factory backend app listening on port ${port}`);
});
