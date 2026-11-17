// Networking. One player is the host; everybody else only talks to the host (star topology).
// Three interchangeable transports:
//   - none          solo play, messages are delivered locally
//   - WsTransport   LAN / direct IP through the tiny relay in server/relay.js
//   - SteamTransport Steam lobby + Steam peer-to-peer networking (works across the internet,
//                    no port forwarding, friends join from the Steam friends list)

export class Session {
  constructor(transport) {
    this.tr = transport || null;
    this.myId = transport ? transport.myId : 'local';
    this.hostId = transport ? transport.hostId : 'local';
    this.isHost = transport ? transport.isHost : true;
    this.kind = transport ? transport.kind : 'solo';
    this.onHostMsg = null; this.onClientMsg = null; this.onPeerLeave = null; this.onClosed = null;
    this.closed = false;
    if (transport) {
      transport.onMessage = (from, m) => {
        if (this.closed) return;
        if (this.isHost) { if (this.onHostMsg) this.onHostMsg(from, m); } else if (from === this.hostId && this.onClientMsg) this.onClientMsg(m);
      };
      transport.onPeerLeave = (id) => { if (!this.closed && this.onPeerLeave) this.onPeerLeave(id); };
      transport.onClose = (why) => { if (!this.closed) { this.closed = true; if (this.onClosed) this.onClosed(why); } };
    }
  }

  // Local deliveries are deferred to a microtask so handlers never re-enter each other.
  toHost(m, reliable = true) {
    if (this.closed) return;
    if (this.isHost) queueMicrotask(() => { if (!this.closed && this.onHostMsg) this.onHostMsg(this.myId, m); });
    else this.tr.send(this.hostId, m, reliable);
  }
  toClient(id, m, reliable = true) {
    if (this.closed) return;
    if (id === this.myId) queueMicrotask(() => { if (!this.closed && this.onClientMsg) this.onClientMsg(m); });
    else if (this.tr) this.tr.send(id, m, reliable);
  }
  toAll(m, reliable = true) {
    if (this.closed) return;
    if (this.tr) this.tr.broadcast(m, reliable);
    queueMicrotask(() => { if (!this.closed && this.onClientMsg) this.onClientMsg(m); });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.tr) this.tr.close();
  }
}

export class WsTransport {
  // Resolves once the relay has assigned us an id.
  static connect(url, room = 'main', role = 'client', timeoutMs = 7000) {
    return new Promise((resolve, reject) => {
      let done = false, ws;
      const fail = (why) => { if (done) return; done = true; try { ws.close(); } catch (e) { /* ignore */ } reject(new Error(why)); };
      try { ws = new WebSocket(url); } catch (e) { reject(new Error('bad-address')); return; }
      const timer = setTimeout(() => fail('timeout'), timeoutMs);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', room, role }));
      ws.onerror = () => { clearTimeout(timer); fail('unreachable'); };
      ws.onclose = () => { clearTimeout(timer); fail('closed'); };
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.t === 'joined' && !done) { done = true; clearTimeout(timer); resolve(new WsTransport(ws, String(m.id), String(m.host))); }
        else if (m.t === 'closed') { clearTimeout(timer); fail(m.reason || 'closed'); }
      };
    });
  }

  constructor(ws, id, hostId) {
    this.kind = 'lan';
    this.ws = ws; this.myId = id; this.hostId = hostId; this.isHost = id === hostId;
    this.onMessage = null; this.onPeerLeave = null; this.onClose = null;
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'd') { if (this.onMessage) this.onMessage(String(m.from), m.d); }
      else if (m.t === 'left') { if (this.onPeerLeave) this.onPeerLeave(String(m.id)); }
      else if (m.t === 'closed') { if (this.onClose) this.onClose(m.reason || 'closed'); }
    };
    ws.onclose = () => { if (this.onClose) this.onClose('disconnected'); };
    ws.onerror = () => {};
  }
  send(to, m) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'd', to, d: m })); }
  broadcast(m) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'd', to: '*', d: m })); }
  close() { this.onClose = null; try { this.ws.close(); } catch (e) { /* ignore */ } }
}

// Talks to electron/steam.js through the preload bridge (window.native.steam).
export class SteamTransport {
  static async host(native, maxPlayers, isPublic) {
    const r = await native.steam.createLobby(maxPlayers, !!isPublic);
    if (!r || !r.ok) throw new Error((r && r.error) || 'steam-lobby-failed');
    return new SteamTransport(native, r.me, r.me, r.lobby);
  }
  static async join(native, lobbyId) {
    const r = await native.steam.joinLobby(String(lobbyId));
    if (!r || !r.ok) throw new Error((r && r.error) || 'steam-join-failed');
    return new SteamTransport(native, r.me, r.owner, r.lobby);
  }

  constructor(native, me, hostId, lobby) {
    this.kind = 'steam';
    this.native = native; this.myId = String(me); this.hostId = String(hostId); this.isHost = this.myId === this.hostId; this.lobby = String(lobby);
    this.onMessage = null; this.onPeerLeave = null; this.onClose = null;
    this.offMsg = native.steam.onMessage((from, text) => {
      let m; try { m = JSON.parse(text); } catch (e) { return; }
      if (this.onMessage) this.onMessage(String(from), m);
    });
    this.offLobby = native.steam.onLobby((ev) => {
      if (!ev || ev.type !== 'left') return;
      if (String(ev.id) === this.hostId) { if (this.onClose) this.onClose('host-left'); }
      else if (this.onPeerLeave) this.onPeerLeave(String(ev.id));
    });
  }
  send(to, m, reliable = true) { this.native.steam.send(String(to), JSON.stringify(m), reliable); }
  broadcast(m, reliable = true) { this.native.steam.broadcast(JSON.stringify(m), reliable); }
  invite() { this.native.steam.invite(); }
  close() {
    this.onClose = null;
    if (this.offMsg) this.offMsg();
    if (this.offLobby) this.offLobby();
    this.native.steam.leaveLobby();
  }
}
