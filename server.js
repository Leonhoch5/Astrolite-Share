const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const peers = new Map(); // { peerId => ws }
app.use(express.static('test'));

wss.on('connection', (ws) => {
  const peerId = uuidv4();
  peers.set(peerId, ws);

  ws.send(JSON.stringify({ type: 'init', peerId }));

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (data.to && peers.has(data.to)) {
      const target = peers.get(data.to);
      target.send(JSON.stringify({ ...data, from: peerId }));
    }
  });

  ws.on('close', () => {
    peers.delete(peerId);
  });
});

app.get('/', (_, res) => {
  res.send('Astrolite Share Signaling Server Running...');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server on http://localhost:${PORT}`);
});