const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

const peers = new Map(); //
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'astrolite_secret',
  resave: false,
  saveUninitialized: true,
}));
app.use(cors({
  origin: "https://astrolite-share.vercel.app",
  credentials: true,
}));

wss.on('connection', async (ws, req) => {
  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    // Register peerId as before
    if (data.type === "register" && data.peerId) {
      peers.set(data.peerId, ws);
      ws.send(JSON.stringify({ type: 'init', peerId: data.peerId }));
      ws.peerId = data.peerId;
      return;
    }

    if (!ws.peerId) return;

    // Handle requests/messages/chunks by username
    if (data.toUsername) {
      // Look up peerId by username in DB
      const user = await prisma.user.findUnique({ where: { username: data.toUsername } });
      if (user && peers.has(user.peerId)) {
        const target = peers.get(user.peerId);
        // Forward all types: request, message, file-chunk, file-end
        target.send(JSON.stringify({ ...data, from: ws.peerId }));
      } else {
        ws.send(JSON.stringify({ type: "error", message: "User not online" }));
      }
      return;
    }

    // Direct peerId-based routing (for legacy or direct messages)
    if (data.to && peers.has(data.to)) {
      const target = peers.get(data.to);
      target.send(JSON.stringify({ ...data, from: ws.peerId }));
    }
  });

  ws.on('close', () => {
    if (ws.peerId) peers.delete(ws.peerId);
  });
});

app.get('/', (_, res) => {
  res.send('Astrolite Share Signaling Server Running...');
});

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const peerId = uuidv4(); // Generate peerId here
  try {
    const user = await prisma.user.create({
      data: { username, password: hash, peerId }
    });
    res.json({ success: true, userId: user.id, peerId: user.peerId });
  } catch (e) {
    res.status(400).json({ error: 'Username taken' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.user = { id: user.id, username: user.username, peerId: user.peerId };
  res.json({ success: true, username: user.username, peerId: user.peerId });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Auth check
app.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server on http://localhost:${PORT}`);
});