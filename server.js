// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// Middleware to parse JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public" directory
app.use(express.static("public"));

// 404 error handler for invalid routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
    // Echo the received message back to the client
    ws.send(`Echo: ${message}`);
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
