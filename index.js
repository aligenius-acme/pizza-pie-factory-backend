const cors = require("cors");
const passport = require("passport");

const connectToMongo = require("./db");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

connectToMongo();

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("New client connected, socket id:", socket.id);
  socket.on("join", (employeeId) => {
    socket.join(employeeId);
    console.log(`Employee ${employeeId} joined room ${employeeId}`);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Make Socket.io instance available to routes
app.set("io", io);

const port = process.env.PORT || 5000;

// Middleware setup
app.use(express.json());
app.use(cors());

// Passport initialization
app.use(passport.initialize());

// Available Routes
app.use("/api", require("./routes/customer"));
app.use("/api", require("./routes/admin/employee"));
app.use("/api", require("./routes/admin/branch"));
app.use("/api", require("./routes/admin/category"));
app.use("/api", require("./routes/admin/foodItem"));
app.use("/api", require("./routes/admin/employeeMessage"));

server.listen(port, () => {
  console.log(`Pizza Pie Factory backend app listening on port ${port}`);
});
