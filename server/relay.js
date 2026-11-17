// Tiny WebSocket relay for LAN / direct-IP multiplayer.
// The first player to join a room becomes the host; everyone else only ever talks to the host.
// The game runs it inside Electron when you click "Host LAN game". It can also run standalone:
//     node server/relay.js [port]

const { WebSocketServer } = require('ws');
const os = require('os');

function localAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

function startRelay(port = 7777, opts = {}) {
  const maxPeers = opts.maxPeers || 8;
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, maxPayload: 64 * 1024 });
    const rooms = new Map();
    let nextId = 1;
    const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

    function leave(ws) {
      const room = ws.room;
      if (!room) return;
      ws.room = null;
      room.peers.delete(ws.id);
      if (room.host === ws) {
        for (const p of room.peers.values()) { send(p, { t: 'closed', reason: 'host-left' }); p.room = null; p.close(); }
        rooms.delete(room.name);
      } else {
        send(room.host, { t: 'left', id: ws.id });
        if (room.peers.size === 0) rooms.delete(room.name);
      }
    }

    wss.on('connection', (ws) => {
      ws.id = null; ws.room = null; ws.alive = true;
      ws.on('pong', () => { ws.alive = true; });
      ws.on('error', () => {});
      ws.on('close', () => leave(ws));
      ws.on('message', (raw, isBinary) => {
        if (isBinary) return;
        let m;
        try { m = JSON.parse(raw.toString()); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'join') {
          if (ws.room) return;
          const name = String(m.room || 'main').slice(0, 32);
          let room = rooms.get(name);
          if (!room) { room = { name, host: null, peers: new Map() }; rooms.set(name, room); }
          if (room.peers.size >= maxPeers) { send(ws, { t: 'closed', reason: 'full' }); ws.close(); return; }
          ws.id = String(nextId++); ws.room = room;
          room.peers.set(ws.id, ws);
          if (!room.host) room.host = ws;
          send(ws, { t: 'joined', id: ws.id, host: room.host.id });
          if (room.host !== ws) send(room.host, { t: 'peer', id: ws.id });
          return;
        }
        const room = ws.room;
        if (!room || m.t !== 'd') return;
        if (ws === room.host) {
          if (m.to === '*') { for (const p of room.peers.values()) if (p !== ws) send(p, { t: 'd', from: ws.id, d: m.d }); }
          else { const p = room.peers.get(String(m.to)); if (p) send(p, { t: 'd', from: ws.id, d: m.d }); }
        } else {
          send(room.host, { t: 'd', from: ws.id, d: m.d });
        }
      });
    });

    const beat = setInterval(() => {
      for (const ws of wss.clients) {
        if (!ws.alive) { ws.terminate(); continue; }
        ws.alive = false;
        try { ws.ping(); } catch (e) { /* ignore */ }
      }
    }, 15000);

    wss.on('error', reject);
    wss.on('listening', () => resolve({
      port: wss.address().port,
      addresses: localAddresses(),
      close: () => new Promise((done) => {
        clearInterval(beat);
        for (const c of wss.clients) c.terminate();
        wss.close(() => done());
      }),
    }));
  });
}

module.exports = { startRelay, localAddresses };

if (require.main === module) {
  const port = Number(process.argv[2]) || 7777;
  startRelay(port).then((r) => {
    console.log(`Qubit Crew relay listening on port ${r.port}`);
    for (const a of r.addresses) console.log(`  friends on your network can join:  ${a}:${r.port}`);
  }).catch((e) => { console.error('Could not start relay:', e.message); process.exit(1); });
}
