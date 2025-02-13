const cors = require("cors");
const passport = require("passport");

const connectToMongo = require("./db");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const updateAnalytics = require("./scripts/jobs/analyticsJob");

connectToMongo();

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("New client connected, socket id:", socket.id);

  // Handle employee joining their own room
  socket.on("join", (employeeId) => {
    socket.join(employeeId);
    console.log(`Employee ${employeeId} joined room ${employeeId}`);
  });

  // Handle real-time messaging
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    console.log(`Message from ${senderId} to ${receiverId}: ${message}`);
    io.to(receiverId).emit("receiveMessage", { senderId, message });
  });

  // Handle real-time notifications
  socket.on("sendNotification", ({ recipientId, notification }) => {
    console.log(`Notification for ${recipientId}: ${notification}`);
    io.to(recipientId).emit("receiveNotification", { notification });
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
app.use("/api", require("./routes/admin/employee"));
app.use("/api", require("./routes/admin/employeeMessage"));
app.use("/api", require("./routes/admin/notification"));
app.use("/api", require("./routes/admin/branch"));
app.use("/api", require("./routes/admin/category"));
app.use("/api", require("./routes/admin/foodItem"));
app.use("/api", require("./routes/admin/cart"));
app.use("/api", require("./routes/customer"));
app.use("/api", require("./routes/cart"));
app.use("/api", require("./routes/customer"));

server.listen(port, () => {
  console.log(`Pizza Pie Factory backend app listening on port ${port}`);
});

updateAnalytics();
