// Steam integration for the Electron main process, built on steamworks.js.
// Everything degrades gracefully: if Steam is not running the game still works (solo + LAN).

let sw = null;          // the steamworks.js module
let client = null;      // initialised Steam client API
let lobby = null;       // current matchmaking lobby
let win = null;         // BrowserWindow that receives events
let cfg = { appId: 480, dlc: {} };
let pollTimer = null;

const SEND = { UnreliableNoDelay: 1, Reliable: 2 };
const LOBBY = { FriendsOnly: 1, Public: 2 };
const MEMBER_ENTERED = 0;

function emit(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

// Must run before Electron's "ready" event (the overlay needs extra command line switches).
function init(config, { dev }) {
  cfg = config;
  try { sw = require('steamworks.js'); } catch (e) { console.warn('[steam] steamworks.js not available:', e.message); return { ok: false }; }
  const appId = Number(cfg.appId) || 480;
  if (!dev && appId !== 480) {
    // Started outside Steam (e.g. by double-clicking the exe): ask Steam to launch us properly.
    try { if (sw.restartAppIfNecessary(appId)) return { ok: false, restarting: true }; } catch (e) { /* ignore */ }
  }
  try { client = sw.init(appId); } catch (e) {
    console.warn('[steam] init failed - is the Steam client running?', e.message);
    client = null;
    return { ok: false };
  }
  try { sw.electronEnableSteamOverlay(); } catch (e) { console.warn('[steam] overlay:', e.message); }

  const C = sw.SteamCallback;
  client.callback.register(C.P2PSessionRequest, (ev) => {
    if (lobby) client.networking.acceptP2PSession(ev.remote);
  });
  client.callback.register(C.LobbyChatUpdate, (ev) => {
    if (!lobby || String(ev.lobby) !== String(lobby.id)) return;
    emit('steam:lobby', { type: ev.member_state_change === MEMBER_ENTERED ? 'joined' : 'left', id: String(ev.user_changed) });
  });
  client.callback.register(C.GameLobbyJoinRequested, (ev) => emit('steam:joinRequest', String(ev.lobby_steam_id)));

  pollTimer = setInterval(poll, 8);
  console.log('[steam] ready, app', appId, 'user', client.localplayer.getName());
  return { ok: true };
}

function poll() {
  if (!client) return;
  let size, n = 0;
  while ((size = client.networking.isP2PPacketAvailable()) > 0 && n++ < 512) {
    const pkt = client.networking.readP2PPacket(size);
    if (lobby) emit('steam:msg', String(pkt.steamId.steamId64), pkt.data.toString('utf8'));
  }
}

const myId = () => String(client.localplayer.getSteamId().steamId64);

function ownedDlc() {
  if (!client) return [];
  const out = [];
  for (const [key, id] of Object.entries(cfg.dlc || {})) {
    const appId = Number(id);
    if (!appId) continue;
    try { if (client.apps.isDlcInstalled(appId)) out.push(key); } catch (e) { /* ignore */ }
  }
  return out;
}

function info() {
  if (!client) return null;
  let lang = 'english';
  try { lang = client.apps.currentGameLanguage() || 'english'; } catch (e) { /* ignore */ }
  return { name: client.localplayer.getName(), id: myId(), lang, appId: Number(cfg.appId) };
}

async function createLobby(maxPlayers, isPublic) {
  if (!client) return { ok: false, error: 'steam' };
  try {
    leaveLobby();
    lobby = await client.matchmaking.createLobby(isPublic ? LOBBY.Public : LOBBY.FriendsOnly, Math.max(2, Math.min(8, maxPlayers | 0)));
    lobby.setData('game', 'qubitcrew');
    return { ok: true, lobby: String(lobby.id), me: myId() };
  } catch (e) { lobby = null; return { ok: false, error: 'steam-lobby-failed' }; }
}

async function joinLobby(id) {
  if (!client) return { ok: false, error: 'steam' };
  try {
    leaveLobby();
    lobby = await client.matchmaking.joinLobby(BigInt(id));
    return { ok: true, lobby: String(lobby.id), me: myId(), owner: String(lobby.getOwner().steamId64) };
  } catch (e) { lobby = null; return { ok: false, error: 'steam-join-failed' }; }
}

function leaveLobby() {
  if (!lobby) return;
  try { lobby.leave(); } catch (e) { /* ignore */ }
  lobby = null;
}

function invite() {
  if (client && lobby) { try { client.overlay.activateInviteDialog(lobby.id); } catch (e) { lobby.openInviteDialog(); } }
}

function send(to, text, reliable) {
  if (!client || !lobby) return;
  const data = Buffer.from(text, 'utf8');
  // Unreliable packets are limited to 1200 bytes, so big messages always go reliable.
  const type = reliable || data.length > 1100 ? SEND.Reliable : SEND.UnreliableNoDelay;
  try { client.networking.sendP2PPacket(BigInt(to), type, data); } catch (e) { /* peer gone */ }
}

function broadcast(text, reliable) {
  if (!client || !lobby) return;
  const me = myId();
  for (const m of lobby.getMembers()) {
    const id = String(m.steamId64);
    if (id !== me) send(id, text, reliable);
  }
}

function openStore(key) {
  if (!client) return false;
  const appId = key === 'base' ? Number(cfg.appId) : Number((cfg.dlc || {})[key]);
  if (!appId) return false;
  try { client.overlay.activateToStore(appId, 0); return true; } catch (e) { return false; }
}

function achieve(id) {
  if (!client) return;
  try { client.achievement.activate(String(id)); } catch (e) { /* unknown achievement name */ }
}

module.exports = {
  init, info, ownedDlc, createLobby, joinLobby, leaveLobby, invite, send, broadcast, openStore, achieve,
  setWindow(w) { win = w; },
  get ready() { return !!client; },
  shutdown() { clearInterval(pollTimer); leaveLobby(); },
};
