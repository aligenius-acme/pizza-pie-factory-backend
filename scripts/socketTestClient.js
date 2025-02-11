const io = require("socket.io-client");

// Replace with your server's URL and correct port
const socket = io("http://localhost:5000", { transports: ["websocket"] });

// Replace 'receiverEmployeeId' with the actual ID of the employee who should receive the message
const receiverEmployeeId = "67a9f7e3a9bcafd6492b1396";

socket.on("connect", () => {
  console.log("Connected to Socket.io server, socket id:", socket.id);
  // Join the room for the receiver employee
  socket.emit("join", receiverEmployeeId);
});

socket.on("newMessage", (message) => {
  console.log("New message received:", message);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
