// Development helper: serves app/ over HTTP and runs a multiplayer relay, so the game can be
// tried in a normal browser without Electron.   Usage: npm run dev
const http = require('http');
const fs = require('fs');
const path = require('path');
const { startRelay } = require('../server/relay');

const PORT = Number(process.env.PORT) || 5173;
const RELAY_PORT = Number(process.env.RELAY_PORT) || 7777;
const root = path.join(__dirname, '..', 'app');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, path.normalize(p));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Game:  http://localhost:${PORT}   (add ?dlc=all to unlock every DLC sector for testing)`));

startRelay(RELAY_PORT).then((r) => console.log(`Relay: ws://localhost:${r.port}`));
