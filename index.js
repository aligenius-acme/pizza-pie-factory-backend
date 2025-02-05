const connectToMongo = require("./db");
const express = require("express");

connectToMongo();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Available Routes
app.use("/api/customer/auth", require("./routes/auth"));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
