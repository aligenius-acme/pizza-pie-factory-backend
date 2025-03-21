const io = require("socket.io-client");

// Replace with your server's URL and correct port
const socket = io("http://localhost:5000", { transports: ["websocket"] });

// Replace 'receiverId' with the actual ID of the employee who should receive messages
const receiverId = "67ade7ce59e3e51d199080d0";

// Replace with the actual ID of the branch
const receiverBranchId = "67bb225a01583dc4cafc8a18";

socket.on("connect", () => {
  console.log("Connected to Socket.io server, socket id:", socket.id);

  // Join the room for the receiver employee
  socket.emit("join", receiverId);

  // Join the branch room
  socket.emit("joinBranch", receiverBranchId);
});

// Listen for new messages
socket.on("newMessage", (message) => {
  console.log("📩 New Message Received:", message);
});

// Listen for new notifications
socket.on("newNotification", (notification) => {
  console.log("🔔 New Notification Received:", notification);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

// COMMAND: node scripts/socketTestClient.js
