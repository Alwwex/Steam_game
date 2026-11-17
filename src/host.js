// Authoritative game simulation. Runs only on the host's machine (in solo play you are the host).
// Clients simulate their own movement and report it; everything else is decided here:
// qubits, anomalies, coherence, shift flow, the shop.

import { BAL, P, BEAM, TILE, UPGRADES, MAX_PLAYERS, PROTOCOL, NET, SUIT_COLORS, DLC_REQUIRE_ALL_PLAYERS } from './config.js';
import { clamp } from './rng.js';
import { T, WHO, toTile, isSolid, los, bfsField, moveCircle, wrapPos, tileAt } from './level.js';
import { SECTORS, sectorByKey, pickSector, hatDlc } from './sectors.js';
import { mutOf, mutPhase, buildLevel } from './mutators.js';
import { FREE_HATS, HATS } from './hats.js';

const r2 = (v) => Math.round(v * 100) / 100;
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const cleanName = (s) => (String(s || 'Cat').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Cat');
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class HostSim {
  constructor(session, opts = {}) {
    this.net = session;
    this.hostId = session.myId;
    this.owned = new Set(opts.ownedDlc || []);
    this.players = new Map();
    this.phase = 'lobby';
    this.mode = 'base';
    this.obsList = [];
    this.lastSeer = null;
    this.resetRun();
    session.onHostMsg = (from, m) => this.onMsg(from, m);
    session.onPeerLeave = (id) => this.removePlayer(id);
    this.last = performance.now(); this.snapAcc = 0;
    this.timer = setInterval(() => this.step(), 1000 / NET.SIM_HZ);
  }

  destroy() { clearInterval(this.timer); }

  resetRun() {
    this.shift = 0; this.credits = 0; this.up = {};
    for (const u of UPGRADES) this.up[u.key] = 0;
    this.stats = { delivered: 0, hits: 0, banished: 0, shifts: 0 };
  }

  rand() { return Math.random(); }
  alive() { const out = []; for (const p of this.players.values()) if (p.st === 0) out.push(p); return out; }
  ev(o) { o.t = 'e'; this.net.toAll(o); }
  addCoh(d) { this.coh = clamp(this.coh + d, -1, 100); }

  // ------------------------------------------------------------------ lobby

  onMsg(from, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hi') return this.onHello(from, m);
    const p = this.players.get(from);
    if (!p) return;
    if (m.t === 'st') this.onState(p, m.d);
    else if (m.t === 'me') { this.customize(p, m); this.sendLobby(); }
    else if (m.t === 'a') this.onAction(p, m);
  }

  validHat(p, hat) {
    if (FREE_HATS.includes(hat)) return hat;
    if (!HATS[hat]) return 'none';
    const d = hatDlc(hat);
    return d && p.dlc.has(d) ? hat : 'none';
  }

  customize(p, m) {
    if (typeof m.hat === 'string') p.hat = this.validHat(p, m.hat);
    if (typeof m.fur === 'number') p.fur = Math.abs(m.fur | 0) % 6;
    if (typeof m.color === 'number') {
      const c = Math.abs(m.color | 0) % SUIT_COLORS.length;
      let taken = false;
      for (const q of this.players.values()) if (q !== p && q.color === c) taken = true;
      if (!taken) p.color = c;
    }
  }

  onHello(id, m) {
    if (this.players.has(id)) return;
    if (m.v !== PROTOCOL) return this.net.toClient(id, { t: 'kick', why: 'version' });
    if (this.players.size >= MAX_PLAYERS) return this.net.toClient(id, { t: 'kick', why: 'full' });
    const p = {
      id, name: cleanName(m.name), color: 0, hat: 'none', fur: 0,
      dlc: new Set(Array.isArray(m.dlc) ? m.dlc.filter((k) => typeof k === 'string').slice(0, 64) : []),
      x: 0, y: 0, z: 0, yaw: 0, pitch: 0, light: 1, st: 0, respawnAt: 0, safeUntil: 0,
      carry: [], depT: 0, hurtT: 0, seq: 0, hist: [],
    };
    const used = new Set(); for (const q of this.players.values()) used.add(q.color);
    let c = Math.abs(m.color | 0) % SUIT_COLORS.length;
    for (let i = 0; i < SUIT_COLORS.length && used.has(c); i++) c = (c + 1) % SUIT_COLORS.length;
    p.color = c;
    p.fur = Math.abs(m.fur | 0) % 6;
    p.hat = this.validHat(p, m.hat);
    this.players.set(id, p);
    this.net.toClient(id, { t: 'wel', id, host: this.hostId });
    this.sendLobby();
    if (this.phase === 'play') {
      this.placeAtSpawn(p, this.players.size);
      p.safeUntil = this.time + 4;
      this.net.toClient(id, this.startMsg());
      this.net.toClient(id, this.qMsg());
    } else if (this.phase === 'shop') this.net.toClient(id, this.endMsg());
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (this.phase === 'play') this.dropCarried(p);
    this.players.delete(id);
    this.sendLobby();
  }

  sendLobby() {
    const players = [];
    for (const p of this.players.values()) players.push({ id: p.id, name: p.name, color: p.color, hat: p.hat, fur: p.fur });
    this.net.toAll({ t: 'lob', phase: this.phase, mode: this.mode, host: this.hostId, players, dlc: [...this.owned], shift: this.shift });
  }

  // Host UI calls these directly.
  canPlay(mode) {
    if (mode === 'base' || mode === 'tour') return true;
    const s = SECTORS[mode];
    if (!s || !s.n) return !!s;
    if (!this.owned.has(mode)) return false;
    if (DLC_REQUIRE_ALL_PLAYERS) for (const p of this.players.values()) if (!p.dlc.has(mode)) return false;
    return true;
  }
  setMode(mode) { if (this.phase === 'lobby' && this.canPlay(mode)) { this.mode = mode; this.sendLobby(); } }
  start() { if (this.phase !== 'lobby') return; this.resetRun(); this.nextShift(); }
  toLobby() { this.phase = 'lobby'; this.resetRun(); this.net.toAll({ t: 'tolobby' }); this.sendLobby(); }

  // ------------------------------------------------------------------ shift setup

  nextShift() {
    if (this.phase === 'play') return;
    this.shift++;
    this.sector = sectorByKey(pickSector(this.mode, this.shift, this.owned, Math.random));
    this.mut = mutOf(this.sector);
    this.slots = this.shift <= 2 ? 3 : this.shift <= 5 ? 4 : 5;
    this.seed = (Math.random() * 0x7fffffff) | 0;
    const L = this.L = buildLevel(this.seed, this.slots, this.sector);
    this.time = 0; this.coh = 100; this.got = 0; this.ready = false; this.mx = {}; this.ph = 0;
    this.quota = Math.min(BAL.quotaMax, Math.round((BAL.quotaBase + BAL.quotaPerShift * this.shift) * (0.85 + 0.15 * this.players.size)));
    this.qubits = []; this.anoms = []; this.things = []; this.nextQ = 1; this.nextA = 1; this.qDirty = false;
    this.field = new Int16Array(L.w * L.h); this.queue = new Int32Array(L.w * L.h); this.fieldT = 0;
    let i = 0;
    for (const p of this.players.values()) { this.placeAtSpawn(p, i++); p.carry = []; p.st = 0; p.safeUntil = 5; p.hist = []; p.depT = 0; }
    this.spawnQubits();
    this.spawnAnomalies();
    if (this.mut && this.mut.host && this.mut.host.init) this.mut.host.init(this);
    this.phase = 'play';
    this.net.toAll(this.startMsg());
    this.net.toAll(this.qMsg());
    this.sendLobby();
  }

  startMsg() {
    const spawn = {};
    for (const p of this.players.values()) spawn[p.id] = [r2(p.x), r2(p.z), r2(p.yaw), p.seq];
    return {
      t: 'start', seed: this.seed, slots: this.slots, sector: this.sector.key, shift: this.shift, quota: this.quota,
      up: { ...this.up }, time: r2(this.time), spawn, got: this.got, coh: this.coh,
    };
  }

  spawnFor(i) {
    const L = this.L, s = L.spawns[(i * 5) % L.spawns.length];
    const fx = L.core.x - s.x, fz = L.core.z - s.z;
    return { x: s.x, z: s.z, yaw: Math.atan2(-fx, -fz) };
  }

  placeAtSpawn(p, i) {
    const s = this.spawnFor(i);
    p.x = s.x; p.z = s.z; p.y = 0; p.yaw = s.yaw; p.pitch = 0; p.seq++;
  }

  tilePos(idx, jitter = 0.7) {
    const L = this.L;
    return [r2(((idx % L.w) + 0.5) * TILE + (Math.random() - 0.5) * 2 * jitter), r2((((idx / L.w) | 0) + 0.5) * TILE + (Math.random() - 0.5) * 2 * jitter)];
  }

  randomSpot() { const p = this.tilePos(this.L.roomTiles[Math.floor(Math.random() * this.L.roomTiles.length)], 0.4); return { x: p[0], z: p[1] }; }

  // A spot far away from every player and from the core.
  farSpot() {
    const L = this.L, alive = this.alive();
    let best = null, bd = -1;
    for (let tries = 0; tries < 30; tries++) {
      const s = this.randomSpot();
      let d = Math.hypot(s.x - L.core.x, s.z - L.core.z) - BAL.safeRadius;
      for (const p of alive) d = Math.min(d, Math.hypot(s.x - p.x, s.z - p.z));
      if (d > bd) { bd = d; best = s; }
      if (d > 20) break;
    }
    return best || this.randomSpot();
  }

  freeForAnomaly(tx, tz) {
    const L = this.L;
    if (tx < 1 || tz < 1 || tx >= L.w - 1 || tz >= L.h - 1) return false;
    if (isSolid(L, tx, tz, WHO.ANOMALY, this.ph)) return false;
    return Math.hypot((tx + 0.5) * TILE - L.core.x, (tz + 0.5) * TILE - L.core.z) > BAL.safeRadius + 1;
  }

  // Centre of the nearest plain floor tile.
  floorNear(x, z) {
    const L = this.L, tx = toTile(x), tz = toTile(z);
    for (let rad = 0; rad <= 5; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== rad) continue;
      const ax = tx + dx, az = tz + dz;
      if (ax < 0 || az < 0 || ax >= L.w || az >= L.h) continue;
      if (L.tiles[az * L.w + ax] === T.FLOOR) return { x: (ax + 0.5) * TILE, z: (az + 0.5) * TILE };
    }
    return this.randomSpot();
  }

  spawnQubits() {
    const L = this.L, count = this.quota + 2 + Math.floor(this.shift / 2), used = new Set();
    const pick = (near, minD, maxD) => {
      for (let tries = 0; tries < 80; tries++) {
        const pool = near != null && Math.random() < 0.3 && L.corrTiles.length ? L.corrTiles : L.roomTiles;
        const idx = pool[Math.floor(Math.random() * pool.length)];
        if (idx == null || used.has(idx)) continue;
        if (near != null) {
          const d = Math.abs((idx % L.w) - (near % L.w)) + Math.abs(((idx / L.w) | 0) - ((near / L.w) | 0));
          if (d < minD || d > maxD) continue;
        }
        used.add(idx); return idx;
      }
      return -1;
    };
    for (let i = 0; i < count; i++) {
      const base = pick(null);
      if (base < 0) break;
      const kind = this.shift >= 2 && Math.random() < 0.28 ? 1 : 0, ng = kind === 1 ? 3 : 2;
      const pos = [this.tilePos(base)];
      for (let g = 1; g < ng; g++) { const o = pick(base, 2, 7); if (o >= 0) pos.push(this.tilePos(o)); }
      this.qubits.push({ id: this.nextQ++, st: 0, kind, pos, x: pos[0][0], z: pos[0][1], holder: 0, pair: -1, val: kind === 1 ? 2 : 1, depAt: -1 });
    }
    if (this.shift >= 2 && this.qubits.length >= 4) {
      const a = this.qubits[0], b = this.qubits[1];
      a.kind = b.kind = 2; a.val = b.val = 1; a.pair = b.id; b.pair = a.id;
    }
  }

  spawnQubit(x, z, kind = 0) {
    const q = { id: this.nextQ++, st: 1, kind, pos: [[x, z]], x, z, holder: 0, pair: -1, val: 1, depAt: -1 };
    this.qubits.push(q); this.qDirty = true;
    return q;
  }

  spawnAnomalies() {
    const s = this.shift, n = this.players.size, m = this.mut || {};
    const lurkers = Math.min(5, 1 + Math.floor((s - 1) / 2) + (n >= 4 ? 1 : 0));
    const drifters = s >= 2 ? (s >= 5 ? 2 : 1) : 0;
    const mites = (s >= 3 ? (s >= 6 ? 2 : 1) : 0) + (m.extraMites || 0);
    for (let i = 0; i < lurkers; i++) this.spawnAnomaly(0).wait = 8 + i * 3;
    for (let i = 0; i < drifters; i++) this.spawnAnomaly(1);
    for (let i = 0; i < mites; i++) this.spawnAnomaly(2);
  }

  // type 0 lurker, 1 drifter, 2 mite.  st: 0 active, 1 banished, 2 fleeing, 3 resting
  spawnAnomaly(type, x, z) {
    const a = { id: this.nextA++, type, x: 0, z: 0, st: 0, obs: 0, obsT: 0, timer: 0, tx: 0, tz: 0, loot: null, wait: 0 };
    if (x == null) { const s = this.farSpot(); a.x = s.x; a.z = s.z; } else { a.x = x; a.z = z; a.wait = 1.2; }
    a.tx = a.x; a.tz = a.z;
    this.anoms.push(a);
    return a;
  }

  // ------------------------------------------------------------------ main loop

  step() {
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.phase !== 'play') return;
    this.tick(dt);
    if (this.phase !== 'play') return;
    this.snapAcc += dt;
    if (this.snapAcc >= 1 / NET.SNAP_HZ) { this.snapAcc = 0; this.sendSnap(); }
  }

  tick(dt) {
    const mut = this.mut;
    this.time += dt;
    this.ph = mutPhase(mut, this.time);
    this.coh -= (BAL.drainBase + BAL.drainPerShift * (this.shift - 1)) * (1 - 0.1 * this.up.ecc) * dt;

    let idx = 0;
    for (const p of this.players.values()) {
      idx++;
      if (p.st === 1 && this.time >= p.respawnAt) {
        const s = this.spawnFor(idx + Math.floor(this.time));
        p.st = 0; p.safeUntil = this.time + 3.5;
        this.teleport(p, s.x, s.z, 'respawn', s.yaw);
      }
      if (mut && mut.delay) {
        p.hist.push({ t: this.time, x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, light: p.light && p.st === 0 });
        while (p.hist.length && p.hist[0].t < this.time - mut.delay - 1) p.hist.shift();
      }
    }

    this.buildObservers();
    this.tickQubits(dt);

    this.fieldT -= dt;
    if (this.fieldT <= 0) {
      this.fieldT = 0.25;
      const src = [], L = this.L;
      for (const p of this.players.values()) if (p.st === 0) {
        const tx = toTile(p.x), tz = toTile(p.z);
        if (tx >= 0 && tz >= 0 && tx < L.w && tz < L.h) src.push(tz * L.w + tx);
      }
      bfsField(L, src, WHO.ANOMALY, this.ph, this.field, this.queue);
    }
    for (const a of this.anoms) {
      if (a.type === 0) this.tickLurker(a, dt); else if (a.type === 1) this.tickDrifter(a, dt); else this.tickMite(a, dt);
    }
    if (mut && mut.host && mut.host.tick) mut.host.tick(this, dt);
    if (this.qDirty) { this.qDirty = false; this.net.toAll(this.qMsg()); }
    if (this.coh <= 0) this.gameOver();
  }

  histAt(p, t) {
    const h = p.hist;
    let out = null;
    for (let i = 0; i < h.length && h[i].t <= t; i++) out = h[i];
    return out;
  }

  // Everything lit by a flashlight is "observed". Echoes (Time Crystal) count too.
  buildObservers() {
    const obs = this.obsList, mut = this.mut;
    obs.length = 0;
    if (mut && mut.blackout && mut.blackout(this.time)) return;
    const range = BEAM.RANGE + 3 * this.up.lens, cosA = Math.cos(BEAM.HALF_ANGLE * (1 + 0.12 * this.up.lens));
    const push = (id, s) => obs.push({ id, x: s.x, z: s.z, dx: -Math.sin(s.yaw), dz: -Math.cos(s.yaw), r: range * Math.max(0.2, Math.cos(s.pitch)), c: cosA });
    for (const p of this.players.values()) {
      if (p.st === 0 && p.light) push(p.id, p);
      if (mut && mut.delay) { const h = this.histAt(p, this.time - mut.delay); if (h && h.light) push(p.id, h); }
    }
  }

  seenBy(x, z, maxR = 1e9) {
    let n = 0;
    for (const o of this.obsList) {
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
      if (d > Math.min(o.r, maxR)) continue;
      if (d > 0.9 && (dx * o.dx + dz * o.dz) / d < o.c) continue;
      if (!los(this.L, o.x, o.z, x, z, this.ph)) continue;
      n++; this.lastSeer = o.id;
    }
    return n;
  }

  isSafe(p) {
    return this.time < p.safeUntil || Math.hypot(p.x - this.L.core.x, p.z - this.L.core.z) < BAL.safeRadius - 0.4;
  }

  teleport(p, x, z, why, yaw) {
    p.x = x; p.z = z; p.y = 0; p.seq++;
    if (yaw != null) p.yaw = yaw;
    this.ev({ k: 'tp', p: p.id, x: r2(x), z: r2(z), yaw: yaw != null ? r2(yaw) : null, why, seq: p.seq });
  }

  // ------------------------------------------------------------------ qubits

  tickQubits(dt) {
    const qr = BEAM.QUBIT_RANGE + 2 * this.up.lens, L = this.L;
    for (const q of this.qubits) {
      if (q.st !== 0) continue;
      let seen = -1;
      for (let i = 0; i < q.pos.length && seen < 0; i++) if (this.seenBy(q.pos[i][0], q.pos[i][1], qr) > 0) seen = i;
      if (seen < 0) continue;
      // Wavefunction collapse: the qubit becomes real at ONE of its positions, chosen at random.
      const k = Math.floor(Math.random() * q.pos.length);
      q.st = 1; q.x = q.pos[k][0]; q.z = q.pos[k][1];
      this.ev({ k: 'col', id: q.id, x: q.x, z: q.z, p: this.lastSeer, here: k === seen ? 1 : 0, gx: q.pos[seen][0], gz: q.pos[seen][1] });
      this.qDirty = true;
    }
    const cap = P.CARRY + this.up.carry;
    for (const p of this.players.values()) {
      if (p.st !== 0) continue;
      if (p.carry.length < cap) {
        for (const q of this.qubits) {
          if (q.st !== 1 || Math.abs(q.x - p.x) > 1.2 || Math.abs(q.z - p.z) > 1.2) continue;
          q.st = 2; q.holder = p.id; p.carry.push(q);
          this.ev({ k: 'pick', id: q.id, p: p.id });
          this.qDirty = true;
          if (p.carry.length >= cap) break;
        }
      }
      if (p.carry.length && Math.hypot(p.x - L.core.x, p.z - L.core.z) < 3.5) {
        p.depT -= dt;
        if (p.depT <= 0) { p.depT = 0.28; this.deposit(p, p.carry.pop()); }
      } else p.depT = 0;
    }
  }

  deposit(p, q) {
    q.st = 3; q.holder = 0; q.depAt = this.time;
    this.got++; this.stats.delivered++;
    this.credits += BAL.credit * q.val;
    let bonus = 0;
    if (q.pair >= 0) {
      const o = this.qubits.find((x) => x.id === q.pair);
      if (o && o.st === 3 && this.time - o.depAt <= BAL.entangleWindow) { bonus = BAL.entangleBonus; this.credits += bonus; this.addCoh(6); }
    }
    this.addCoh(BAL.deposit);
    this.ev({ k: 'dep', id: q.id, p: p.id, got: this.got, bonus });
    this.qDirty = true;
    if (!this.ready && this.got >= this.quota) { this.ready = true; this.ev({ k: 'ready' }); }
  }

  dropCarried(p) {
    for (const q of p.carry) { q.st = 1; q.holder = 0; q.x = r2(p.x + (Math.random() - 0.5) * 0.5); q.z = r2(p.z + (Math.random() - 0.5) * 0.5); }
    if (p.carry.length) this.qDirty = true;
    p.carry = [];
  }

  hit(p, a, why) {
    if (p.st !== 0 || this.isSafe(p)) return;
    const dmg = Math.max(5, BAL.hit - 3 * this.up.shield);
    this.addCoh(-dmg);
    this.stats.hits++;
    this.dropCarried(p);
    p.st = 1; p.respawnAt = this.time + BAL.scatterTime;
    this.ev({ k: 'hit', p: p.id, x: r2(p.x), z: r2(p.z), why: why || 'lurker', dmg });
    if (a) { const s = this.farSpot(); a.x = s.x; a.z = s.z; a.obsT = 0; a.wait = 3; }
  }

  // ------------------------------------------------------------------ anomalies

  anomSpeed(a) {
    const m = this.mut;
    return m && m.host && m.host.anomSpeed ? m.host.anomSpeed(this, a) : 1;
  }

  tickLurker(a, dt) {
    const L = this.L, mut = this.mut || {};
    if (a.st === 1) {
      a.timer -= dt;
      if (a.timer <= 0) { const s = this.farSpot(); a.x = s.x; a.z = s.z; a.st = 0; a.obsT = 0; a.wait = 2; }
      return;
    }
    const seen = this.seenBy(a.x, a.z);
    if (seen > 0) {
      a.obs = 1; a.obsT += dt * seen;
      if (a.obsT >= BAL.lurkerBanish * (1 - 0.2 * this.up.measure)) {
        a.st = 1; a.obs = 0; a.timer = BAL.lurkerRespawn; this.stats.banished++;
        this.ev({ k: 'ban', x: r2(a.x), z: r2(a.z), p: this.lastSeer });
      }
      return;
    }
    a.obs = 0; a.obsT = Math.max(0, a.obsT - dt * 0.6);
    if (a.wait > 0) { a.wait -= dt; return; }
    let tgt = null, bd = 1e9;
    for (const p of this.players.values()) {
      if (p.st !== 0) continue;
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (d < bd) { bd = d; tgt = p; }
    }
    if (!tgt) return;
    const speed = BAL.lurkerSpeed * (1 + 0.025 * (this.shift - 1)) * (mut.lurkerSpeed || 1) * this.anomSpeed(a);
    let gx = tgt.x, gz = tgt.z;
    if (!mut.lurkerGhost) {
      const tx = toTile(a.x), tz = toTile(a.z), w = L.w, f = this.field;
      const cur = tx >= 0 && tz >= 0 && tx < w && tz < L.h ? f[tz * w + tx] : -1;
      if (cur < 0) return;
      if (cur > 0) {
        let best = cur, bx = tx, bz = tz;
        for (const [ox, oz] of DIRS) {
          const nx = tx + ox, nz = tz + oz;
          let wx = nx, wz = nz;
          if (L.wrap) { wx = (nx + w) % w; wz = (nz + L.h) % L.h; } else if (nx < 0 || nz < 0 || nx >= w || nz >= L.h) continue;
          const v = f[wz * w + wx];
          if (v >= 0 && v < best) { best = v; bx = nx; bz = nz; }
        }
        gx = (bx + 0.5) * TILE; gz = (bz + 0.5) * TILE;
      }
    }
    const dx = gx - a.x, dz = gz - a.z, d = Math.hypot(dx, dz) || 1;
    const mx = dx / d * speed * dt, mz = dz / d * speed * dt;
    if (Math.hypot(a.x + mx - L.core.x, a.z + mz - L.core.z) < BAL.safeRadius) return;   // the core's field keeps them out
    if (mut.lurkerGhost) { a.x += mx; a.z += mz; } else { moveCircle(L, a, mx, mz, 0.36, WHO.ANOMALY, this.ph); wrapPos(L, a); }
    for (const p of this.players.values()) {
      if (p.st === 0 && Math.abs(p.x - a.x) < 0.95 && Math.abs(p.z - a.z) < 0.95 && p.y < 2.3) { this.hit(p, a); break; }
    }
  }

  // Moves an anomaly that ignores walls, sliding around the core's safe field.
  glide(a, tx, tz, speed, dt, keep) {
    const L = this.L, dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const st = Math.min(d, speed * dt);
    let nx = a.x + dx / d * st, nz = a.z + dz / d * st;
    const cx = nx - L.core.x, cz = nz - L.core.z, cd = Math.hypot(cx, cz);
    if (cd < keep) { const k = keep / (cd || 1); nx = L.core.x + (cd ? cx * k : keep); nz = L.core.z + cz * k; }
    a.x = clamp(nx, 1, L.W - 1); a.z = clamp(nz, 1, L.H - 1);
    return d;
  }

  tickDrifter(a, dt) {
    const L = this.L, keep = BAL.safeRadius + BAL.cloudRadius;
    a.timer -= dt;
    if (a.timer <= 0 || Math.hypot(a.tx - a.x, a.tz - a.z) < 1) {
      a.timer = 14 + Math.random() * 10;
      const alive = this.alive();
      const s = alive.length && Math.random() < 0.55 ? alive[Math.floor(Math.random() * alive.length)] : this.randomSpot();
      a.tx = s.x; a.tz = s.z;
    }
    this.glide(a, a.tx, a.tz, BAL.cloudSpeed * this.anomSpeed(a), dt, keep);
    for (const p of this.players.values()) {
      if (p.st === 0 && !this.isSafe(p) && Math.hypot(p.x - a.x, p.z - a.z) < BAL.cloudRadius) this.addCoh(-BAL.cloudDps * dt);
    }
  }

  tickMite(a, dt) {
    const speed = BAL.thiefSpeed * this.anomSpeed(a), keep = BAL.safeRadius;
    const seen = this.seenBy(a.x, a.z);
    a.obs = seen > 0 ? 1 : 0;
    if (a.st === 3) {             // resting after a theft
      a.timer -= dt;
      if (a.timer <= 0) a.st = 0;
      return;
    }
    if (a.st === 2) {             // running away
      a.timer -= dt;
      if (seen && a.loot) {
        a.obsT += dt;
        if (a.obsT > 1.1) {       // keep the light on a thief and it drops what it stole
          const q = a.loot, s = this.floorNear(a.x, a.z);
          q.st = 1; q.holder = 0; q.x = s.x; q.z = s.z; a.loot = null; a.obsT = 0;
          this.ev({ k: 'drop', id: q.id, x: s.x, z: s.z });
          this.qDirty = true;
        }
      }
      const d = this.glide(a, a.tx, a.tz, speed * 1.1, dt, keep);
      if (a.timer <= 0 || d < 0.6) {
        if (a.loot) {             // hides the qubit again, back in superposition
          const q = a.loot, s1 = this.floorNear(a.x, a.z), s2 = this.randomSpot();
          q.st = 0; q.holder = 0; q.pos = [[s1.x, s1.z], [s2.x, s2.z]]; q.x = s1.x; q.z = s1.z; a.loot = null;
          this.ev({ k: 'hide', id: q.id });
          this.qDirty = true;
        }
        a.st = 3; a.timer = 9;
      }
      return;
    }
    if (seen) {                   // light scares it
      const s = this.farSpot();
      a.st = 2; a.timer = 2.4; a.tx = s.x; a.tz = s.z; a.obsT = 0;
      return;
    }
    let tgt = null, bd = 1e9;
    for (const p of this.players.values()) {
      if (p.st !== 0 || !p.carry.length || this.isSafe(p)) continue;
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (d < bd) { bd = d; tgt = p; }
    }
    if (!tgt) {
      a.timer -= dt;
      if (a.timer <= 0 || Math.hypot(a.tx - a.x, a.tz - a.z) < 1) { const s = this.randomSpot(); a.tx = s.x; a.tz = s.z; a.timer = 12; }
      this.glide(a, a.tx, a.tz, speed * 0.35, dt, keep);
      return;
    }
    this.glide(a, tgt.x, tgt.z, speed, dt, keep);
    if (Math.hypot(tgt.x - a.x, tgt.z - a.z) < 0.95) {
      const q = tgt.carry.pop(), s = this.farSpot();
      q.st = 4; q.holder = 0; a.loot = q; a.st = 2; a.timer = 7; a.tx = s.x; a.tz = s.z; a.obsT = 0;
      this.ev({ k: 'steal', p: tgt.id, id: q.id, x: r2(a.x), z: r2(a.z) });
      this.qDirty = true;
    }
  }

  // ------------------------------------------------------------------ player input

  onState(p, d) {
    if (this.phase !== 'play' || p.st !== 0 || !Array.isArray(d)) return;
    if ((d[6] | 0) !== p.seq) return;            // stale packet from before a teleport
    const L = this.L;
    p.x = clamp(num(d[0]), 0, L.W); p.y = clamp(num(d[1]), 0, 4); p.z = clamp(num(d[2]), 0, L.H);
    p.yaw = num(d[3]); p.pitch = clamp(num(d[4]), -1.6, 1.6); p.light = d[5] & 1;
  }

  onAction(p, m) {
    switch (m.k) {
      case 'tunnel':
        if (this.phase === 'play' && Array.isArray(m.f) && Array.isArray(m.to)) this.ev({ k: 'tun', p: p.id, f: [num(m.f[0]), num(m.f[1])], to: [num(m.to[0]), num(m.to[1])] });
        break;
      case 'ping':
        if (this.phase === 'play') this.ev({ k: 'ping', p: p.id, x: num(m.x), y: clamp(num(m.y), 0, 4), z: num(m.z) });
        break;
      case 'chat': {
        const text = String(m.text || '').replace(/[\u0000-\u001f]/g, '').slice(0, 140).trim();
        if (text) this.net.toAll({ t: 'chat', p: p.id, name: p.name, text });
        break;
      }
      case 'use': if (this.phase === 'play' && p.st === 0) this.use(p); break;
      case 'buy': if (this.phase === 'shop') this.buy(String(m.key)); break;
      case 'hurt':
        if (this.phase === 'play' && p.st === 0 && this.time - p.hurtT > 0.8 && !this.isSafe(p)) {
          p.hurtT = this.time;
          this.addCoh(-clamp(num(m.amt), 0, 8));
          this.ev({ k: 'hurt', p: p.id, why: String(m.why || '').slice(0, 12) });
        }
        break;
      default:
        if (this.phase === 'play' && this.mut && this.mut.host && this.mut.host.act) this.mut.host.act(this, p, m);
    }
  }

  use(p) {
    const L = this.L;
    if (this.ready && Math.hypot(p.x - (L.core.x + 1.95), p.z - (L.core.z + 1.95)) < 2.6) return this.complete();
    const h = this.mut && this.mut.host;
    if (!h || !h.use) return;
    for (const th of this.things) {
      if (!th.open && Math.hypot(p.x - th.x, p.z - th.z) < 2.3) { h.use(this, th, p); return; }
    }
  }

  buy(key) {
    const u = UPGRADES.find((x) => x.key === key);
    if (!u) return;
    const lvl = this.up[key];
    if (lvl >= u.max || this.credits < u.cost[lvl]) return;
    this.credits -= u.cost[lvl]; this.up[key] = lvl + 1;
    this.net.toAll({ t: 'shop', credits: this.credits, up: { ...this.up }, bought: key });
  }

  // ------------------------------------------------------------------ shift end

  complete() {
    this.phase = 'shop';
    this.stats.shifts++;
    const bonus = Math.max(0, Math.round(this.coh));
    this.credits += bonus;
    this.lastEnd = { shift: this.shift, got: this.got, quota: this.quota, bonus, sector: this.sector.key };
    this.net.toAll(this.endMsg());
    this.sendLobby();
  }

  endMsg() { return { t: 'end', ...this.lastEnd, credits: this.credits, up: { ...this.up }, stats: { ...this.stats } }; }

  gameOver() {
    this.phase = 'over';
    this.net.toAll({ t: 'over', shift: this.shift, stats: { ...this.stats }, sector: this.sector.key });
    this.sendLobby();
  }

  // ------------------------------------------------------------------ network snapshots

  sendSnap() {
    const ps = [], as = [], ban = BAL.lurkerBanish * (1 - 0.2 * this.up.measure);
    for (const p of this.players.values()) {
      ps.push([p.id, r2(p.x), r2(p.y), r2(p.z), r2(p.yaw), r2(p.pitch), (p.light ? 1 : 0) | (p.st === 1 ? 2 : 0) | (this.isSafe(p) ? 4 : 0), p.carry.length]);
    }
    for (const a of this.anoms) {
      as.push([a.id, a.type, r2(a.x), r2(a.z), (a.obs ? 1 : 0) | (a.st === 1 ? 2 : 0) | (a.loot ? 4 : 0) | (a.st === 3 ? 8 : 0), a.type === 0 ? Math.round(clamp(a.obsT / ban, 0, 1) * 9) : 0]);
    }
    this.net.toAll({ t: 's', time: r2(this.time), c: Math.round(this.coh * 10) / 10, g: this.got, r: this.ready ? 1 : 0, cr: this.credits, p: ps, a: as }, false);
  }

  qMsg() {
    return {
      t: 'q',
      q: this.qubits.map((q) => [q.id, q.st, q.kind, r2(q.x), r2(q.z), q.holder || 0, q.pair, q.st === 0 ? q.pos.flat().map(r2) : 0]),
      x: this.things.map((th) => [th.id, th.kind, r2(th.x), r2(th.z), th.open]),
    };
  }
}
