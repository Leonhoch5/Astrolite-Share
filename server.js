//server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const axios = require("axios");

const app = express();
const server = http.createServer(app);


const { encrypt, decrypt } = require("./utils/encryption");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));



// Error handling for invalid routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
  res.writeHead(200, { 'Content-Type': 'text/html' });

    const url = req.url;

    if (url === '/about') {
        res.write(' Welcome to about us page');
        res.end();
    }
    else if (url === '/contact') {
        res.write(' Welcome to contact us page');
        res.end();
    }
    else {
        res.write('Hello World!');
        res.end();
    }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
