const io = require("socket.io-client");

// Replace with your server's URL and correct port
const socket = io("http://localhost:5000", { transports: ["websocket"] });

// Replace 'receiverEmployeeId' with the actual ID of the employee who should receive messages/notifications
const receiverEmployeeId = "67ade7ce59e3e51d199080d0";

socket.on("connect", () => {
  console.log("Connected to Socket.io server, socket id:", socket.id);

  // Join the room for the receiver employee
  socket.emit("join", receiverEmployeeId);
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
