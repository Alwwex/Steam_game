// Client side of a running game: renders the world, runs the local player, and mirrors
// whatever the host says about everyone and everything else.

import * as THREE from 'three';
import { TILE, WALL_H, P, BEAM, BAL, NET, SUIT_COLORS } from './config.js';
import { clamp, angleDiff } from './rng.js';
import { toTile, raycast, los, T } from './level.js';
import { sectorByKey, BASE } from './sectors.js';
import { mutOf, mutPhase, buildLevel } from './mutators.js';
import { buildLevelMesh } from './levelmesh.js';
import { disposeObject } from './gfx.js';
import { MeshBuilder, GEO, col, toGroup } from './meshbuilder.js';
import { makeCat, makeCore, makeLurker, makeDrifter, makeMite, makeQubit, animQubit, makeNameTag, makePing, makeBox, Particles, FURS, QCOL } from './models.js';
import { LocalPlayer, defaultMods } from './player.js';
import { t as tr, pick } from './i18n.js';

const r2 = (v) => Math.round(v * 100) / 100;
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

export class Game {
  constructor(app) {
    this.app = app; this.gfx = app.gfx; this.audio = app.audio; this.input = app.input; this.ui = app.ui;
    this.me = new LocalPlayer();
    this.myId = null; this.session = null; this.lobby = null;
    this.state = 'idle';             // idle | lobby | play | shop | over
    this.root = null; this.view = null; this.core = null; this.L = null; this.mut = null;
    this.remotes = new Map(); this.anoms = new Map(); this.qviews = new Map(); this.things = new Map();
    this.pings = []; this.lobbyCats = new Map(); this.hist = new Map();
    this.parts = new Particles(this.gfx.scene, 700);
    this.mods = defaultMods(); this.mx = {};
    this.t = 0; this.coh = 100; this.got = 0; this.quota = 1; this.ready = false; this.credits = 0; this.shift = 0;
    this.up = {}; this.alive = true; this.safe = true; this.seq = 0;
    this.stateAcc = 0; this.hudAcc = 0; this.mapAcc = 0; this.exploreAcc = 0; this.flashV = 0; this.lobbyT = 0;
    this.lastAlert = null; this.hints = []; this.wasReady = false; this.paused = false; this.lobbyCamX = 0;
    this.lightSrc = [];
    this.link = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)),
      new THREE.LineBasicMaterial({ color: QCOL[2], transparent: true, opacity: 0.6 }));
    this.link.frustumCulled = false; this.link.visible = false; this.gfx.scene.add(this.link);
    this.makeViewModel();
  }

  attach(session) {
    this.session = session; this.myId = session.myId;
    session.onClientMsg = (m) => this.onMsg(m);
  }

  detach() {
    this.disposeLevel(); this.session = null; this.lobby = null; this.state = 'idle'; this.paused = false;
  }

  act(o) { if (this.session) { o.t = 'a'; this.session.toHost(o); } }
  flash(color, amount) { this.gfx.fx.tint.set(color); this.flashV = Math.max(this.flashV, amount); }
  playerInfo(id) { return this.lobby ? this.lobby.players.find((p) => p.id === id) : null; }
  nameOf(id) { const p = this.playerInfo(id); return p ? p.name : '?'; }

  // First-person device: a chunky flashlight with a row of lights showing carried qubits.
  makeViewModel() {
    // Unlit and drawn on top of everything, so it never clips into walls or gets blown out by the flashlight.
    const G = new MeshBuilder();
    G.part(GEO.cyl8, col(0x6a7480), 0, 0, -0.085, 0.085, 0.05, 0.085, Math.PI / 2, 0, 0);
    G.part(GEO.cyl8, col(0xfff1d8), 0, 0, -0.111, 0.068, 0.006, 0.068, Math.PI / 2, 0, 0);
    G.part(GEO.box, col(0x2c3038), 0, 0, 0, 0.06, 0.06, 0.13);
    G.part(GEO.box, col(0x4a5260), 0, 0.031, 0, 0.044, 0.004, 0.12);
    G.part(GEO.box, col(0xf2c230), 0, 0.034, 0.03, 0.062, 0.01, 0.04);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, fog: false });
    const vm = this.viewModel = toGroup(null, G, { castShadow: false });
    vm.traverse((o) => { if (o.isMesh) { o.material = mat; o.renderOrder = 50; } });
    vm.position.set(0.17, -0.15, -0.42);
    vm.rotation.y = 0.06;
    vm.scale.setScalar(0.82);
    this.vmDots = [];
    const dg = new THREE.BoxGeometry(0.014, 0.01, 0.024);
    const dm = new THREE.MeshBasicMaterial({ color: QCOL[0], depthTest: false, depthWrite: false, fog: false });
    for (let i = 0; i < 5; i++) {
      const d = new THREE.Mesh(dg, dm); d.renderOrder = 51;
      d.position.set(0, 0.04, 0.045 - i * 0.022); vm.add(d); this.vmDots.push(d);
    }
    vm.visible = false;
    this.gfx.camera.add(vm);
  }

  // ------------------------------------------------------------------ messages from the host

  onMsg(m) {
    switch (m.t) {
      case 'wel': this.app.onWelcome(m); break;
      case 'lob': this.lobby = m; this.app.onLobby(m); this.syncCosmetics(); break;
      case 'start': this.startLevel(m); break;
      case 's': if (this.state === 'play') this.onSnap(m); break;
      case 'q': if (this.L) this.onQubits(m); break;
      case 'e': if (this.state === 'play') this.onEvent(m); break;
      case 'chat': { const p = this.playerInfo(m.p); this.ui.chatLine(m.name, m.text, p ? css(SUIT_COLORS[p.color]) : '#fff'); this.audio.sfx('chat'); break; }
      case 'end': this.state = 'shop'; this.credits = m.credits; this.up = m.up; this.audio.sfx('win'); this.app.onShiftEnd(m); break;
      case 'shop': this.credits = m.credits; this.up = m.up; this.audio.sfx('buy'); this.app.onShop(m); break;
      case 'over': this.state = 'over'; this.audio.sfx('over'); this.app.onGameOver(m); break;
      case 'tolobby': this.disposeLevel(); this.app.onBackToLobby(); break;
      case 'kick': this.app.leave(m.why === 'version' ? 'err.version' : 'err.full'); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ level lifecycle

  disposeLevel() {
    for (const r of this.remotes.values()) this.dropRemote(r);
    this.remotes.clear();
    for (const a of this.anoms.values()) a.model.dispose();
    this.anoms.clear();
    for (const v of this.qviews.values()) this.dropQView(v);
    this.qviews.clear();
    for (const th of this.things.values()) disposeObject(th.mesh);
    this.things.clear();
    for (const p of this.pings) disposeObject(p.g);
    this.pings.length = 0;
    for (const c of this.lobbyCats.values()) { if (c.tag) disposeObject(c.tag); c.cat.dispose(); }
    this.lobbyCats.clear();
    if (this.view && this.view.dispose) this.view.dispose();
    this.view = null;
    if (this.core) { this.core.dispose(); this.core = null; }
    if (this.root) { disposeObject(this.root); this.root = null; }
    this.parts.clear();
    this.link.visible = false; this.viewModel.visible = false;
    this.hist.clear(); this.L = null; this.mut = null;
    const fx = this.gfx.fx; fx.glitch = 0; fx.invert = 0; fx.warp = 0; fx.flash = 0;
    this.audio.setDanger(0);
  }

  setupWorld(L, sector) {
    const mut = this.mut || {};
    this.L = L; this.sector = sector; this.pal = sector.pal;
    this.root = new THREE.Group(); this.gfx.scene.add(this.root);
    this.gfx.setPalette(this.pal, { fogFar: mut.fogFar, ambient: mut.ambient });
    this.root.add(buildLevelMesh(L, this.pal, { noLamps: mut.noLamps }));
    this.core = makeCore(this.pal); this.core.group.position.set(L.core.x, 0, L.core.z); this.root.add(this.core.group);
    const lamp = new THREE.Color(this.pal.lamp).getHex(), acc = new THREE.Color(this.pal.accent).getHex();
    this.lamps = mut.noLamps ? [] : L.lamps.filter((l) => !l.core).map((l) => ({ x: l.x, y: WALL_H - 0.7, z: l.z, c: lamp, i: 11, d: 13, base: lamp }));
    this.coreLight = { x: L.core.x, y: 1.5, z: L.core.z, c: acc, i: 13, d: 13, pri: 60 };
    this.accentHex = acc;
  }

  startLevel(m) {
    this.disposeLevel();
    const sector = sectorByKey(m.sector);
    this.mut = mutOf(sector);
    const L = buildLevel(m.seed, m.slots, sector);
    this.setupWorld(L, sector);
    this.shift = m.shift; this.quota = m.quota; this.got = m.got || 0; this.coh = m.coh ?? 100; this.ready = false; this.wasReady = false;
    this.up = m.up; this.t = m.time || 0; this.mx = {}; this.alive = true; this.safe = true; this.lastAlert = null;
    this.view = this.mut && this.mut.view ? this.mut.view(this) : null;
    const sp = m.spawn[this.myId];
    if (sp) { this.me.spawn(sp[0], sp[1], sp[2]); this.seq = sp[3]; } else this.me.spawn(L.spawns[0].x, L.spawns[0].z, 0);
    this.me.carry = 0; this.me.tunnelCd = 0; this.me.lightOn = true;
    this.explored = new Uint8Array(L.w * L.h);
    this.core.setProgress(this.got / this.quota);
    this.state = 'play';
    this.primed = false; this.hudAcc = 1; this.mapAcc = 1; this.exploreAcc = 1;
    this.viewModel.visible = true;
    this.hints = this.shift === 1 ? [[1.5, 'hint.move'], [8, 'hint.light'], [17, 'hint.carry'], [27, 'hint.lurker'], [38, 'hint.tunnel']] : [];
    if (this.mut && sector.n) this.hints.push([3, null, pick(sector.tag)]);
    this.app.onLevelStart(m, sector);
  }

  // Scene behind the menus: the core room with everybody's cat lined up.
  showLobbyScene() {
    if (this.state === 'lobby' && this.root) return;
    this.disposeLevel();
    this.mut = null;
    this.setupWorld(buildLevel(4242, 1, BASE[0]), BASE[0]);
    this.core.setProgress(1);
    this.state = 'lobby';
  }

  setLobbyCats(players) {
    if (this.state !== 'lobby' || !this.L) return;
    const want = new Map(players.map((p) => [p.id, p]));
    for (const [id, c] of this.lobbyCats) {
      const p = want.get(id);
      if (!p || p.color !== c.color || p.fur !== c.fur || p.name !== c.name) { if (c.tag) disposeObject(c.tag); c.cat.dispose(); this.lobbyCats.delete(id); }
    }
    let i = 0;
    const n = players.length;
    for (const p of players) {
      let c = this.lobbyCats.get(p.id);
      if (!c) {
        const cat = makeCat({ suit: SUIT_COLORS[p.color], fur: FURS[p.fur % FURS.length], hat: p.hat });
        cat.beam.visible = false;
        this.root.add(cat.group);
        const tag = makeNameTag(p.name, css(SUIT_COLORS[p.color])); tag.position.y = 1.85; cat.group.add(tag);
        c = { cat, tag, color: p.color, fur: p.fur, name: p.name };
        this.lobbyCats.set(p.id, c);
      }
      c.cat.setHat(p.hat);
      c.cat.group.position.set(this.L.core.x + (i - (n - 1) / 2) * 1.15, 0, this.L.core.z + 3.3);
      c.cat.group.rotation.y = Math.PI + (i - (n - 1) / 2) * -0.12;
      i++;
    }
  }

  // ------------------------------------------------------------------ remote players

  addRemote(id, a) {
    const info = this.playerInfo(id) || { name: '?', color: 0, hat: 'none', fur: 0 };
    const cat = makeCat({ suit: SUIT_COLORS[info.color], fur: FURS[info.fur % FURS.length], hat: info.hat });
    const tag = makeNameTag(info.name, css(SUIT_COLORS[info.color])); tag.position.y = 1.85; cat.group.add(tag);
    const orbit = [];
    for (let i = 0; i < 5; i++) { const q = makeQubit(0, false); q.scale.setScalar(0.38); q.visible = false; cat.group.add(q); orbit.push(q); }
    this.root.add(cat.group);
    const r = { id, cat, tag, orbit, x: a[1], y: a[2], z: a[3], yaw: a[4], pitch: a[5], tx: a[1], ty: a[2], tz: a[3], tyaw: a[4], tpitch: a[5], flags: a[6], carry: a[7], color: info.color, fur: info.fur, name: info.name };
    this.remotes.set(id, r);
    return r;
  }

  dropRemote(r) { disposeObject(r.tag); r.cat.dispose(); }

  syncCosmetics() {
    if (this.state === 'lobby') { if (this.lobby) this.setLobbyCats(this.lobby.players); return; }
    for (const r of this.remotes.values()) {
      const info = this.playerInfo(r.id);
      if (!info) continue;
      if (info.color !== r.color || info.fur !== r.fur || info.name !== r.name) { this.dropRemote(r); this.remotes.delete(r.id); } else r.cat.setHat(info.hat);
    }
  }

  allPlayers() { const out = [{ id: this.myId }]; for (const r of this.remotes.values()) out.push(r); return out; }

  histAt(id, t) {
    const h = this.hist.get(id);
    if (!h) return null;
    let out = null;
    for (let i = 0; i < h.length && h[i].t <= t; i++) out = h[i];
    return out;
  }

  pushHist(id, t, x, y, z, yaw, pitch) {
    let h = this.hist.get(id);
    if (!h) { h = []; this.hist.set(id, h); }
    h.push({ t, x, y, z, yaw, pitch });
    while (h.length && h[0].t < t - 8) h.shift();
  }

  // ------------------------------------------------------------------ snapshots

  onSnap(m) {
    if (Math.abs(this.t - m.time) > 0.3) this.t = m.time; else this.t += (m.time - this.t) * 0.1;
    this.coh = m.c; this.got = m.g; this.ready = !!m.r; this.credits = m.cr;
    const keepHist = this.mut && this.mut.delay;
    const seen = new Set();
    for (const a of m.p) {
      const id = a[0];
      if (id === this.myId) {
        this.alive = !(a[6] & 2); this.safe = !!(a[6] & 4); this.me.carry = a[7];
        if (keepHist) this.pushHist(id, m.time, this.me.x, this.me.y, this.me.z, this.me.yaw, this.me.pitch);
        continue;
      }
      seen.add(id);
      let r = this.remotes.get(id);
      if (!r) r = this.addRemote(id, a);
      r.tx = a[1]; r.ty = a[2]; r.tz = a[3]; r.tyaw = a[4]; r.tpitch = a[5]; r.flags = a[6]; r.carry = a[7];
      if (Math.hypot(r.tx - r.x, r.tz - r.z) > 9) { r.x = r.tx; r.z = r.tz; r.y = r.ty; }
      if (keepHist && !(a[6] & 2)) this.pushHist(id, m.time, a[1], a[2], a[3], a[4], a[5]);
    }
    for (const [id, r] of this.remotes) if (!seen.has(id)) { this.dropRemote(r); this.remotes.delete(id); }

    const live = new Set();
    for (const a of m.a) {
      const id = a[0];
      live.add(id);
      let v = this.anoms.get(id);
      if (!v) {
        const model = a[1] === 0 ? makeLurker() : a[1] === 1 ? makeDrifter() : makeMite();
        this.root.add(model.group);
        v = { id, type: a[1], model, x: a[2], z: a[3], tx: a[2], tz: a[3], flags: a[4], frac: 0 };
        this.anoms.set(id, v);
      }
      v.tx = a[2]; v.tz = a[3]; v.flags = a[4]; v.frac = a[5] / 9;
      if (Math.hypot(v.tx - v.x, v.tz - v.z) > 7) { v.x = v.tx; v.z = v.tz; }
    }
    for (const [id, v] of this.anoms) if (!live.has(id)) { v.model.dispose(); this.anoms.delete(id); }
  }

  dropQView(v) { for (const m of v.meshes) { if (m.parent) m.parent.remove(m); } v.meshes.length = 0; }

  onQubits(m) {
    const live = new Set();
    for (const a of m.q) {
      const id = a[0], st = a[1], kind = a[2], x = a[3], z = a[4], gh = a[7];
      live.add(id);
      const key = st + ':' + kind + ':' + (st === 0 ? gh.join(',') : st === 1 ? x + ',' + z : '');
      let v = this.qviews.get(id);
      if (!v || v.key !== key) {
        if (v) this.dropQView(v);
        v = { id, key, st, kind, x, z, pair: a[6], meshes: [], pts: [] };
        if (st === 0) {
          for (let i = 0; i < gh.length; i += 2) {
            const g = makeQubit(kind, true); g.position.set(gh[i], 1.05, gh[i + 1]);
            this.root.add(g); v.meshes.push(g); v.pts.push([gh[i], gh[i + 1]]);
          }
        } else if (st === 1) {
          const g = makeQubit(kind, false); g.position.set(x, 1.0, z);
          this.root.add(g); v.meshes.push(g); v.pts.push([x, z]);
        }
        this.qviews.set(id, v);
      }
      v.st = st; v.pair = a[6]; v.x = x; v.z = z;
    }
    for (const [id, v] of this.qviews) if (!live.has(id)) { this.dropQView(v); this.qviews.delete(id); }

    for (const a of m.x || []) {
      let th = this.things.get(a[0]);
      if (!th) {
        const mesh = makeBox(); mesh.position.set(a[2], 0, a[3]); mesh.rotation.y = a[0] * 1.3;
        this.root.add(mesh);
        th = { id: a[0], x: a[2], z: a[3], mesh, open: 0 };
        this.things.set(a[0], th);
      }
      th.open = a[4];
      th.mesh.visible = !th.open;
    }
  }

  // ------------------------------------------------------------------ events

  onEvent(m) {
    const au = this.audio, pa = this.parts, mine = m.p === this.myId, acc = this.accentHex;
    switch (m.k) {
      case 'col':
        pa.burst(m.gx, 1.05, m.gz, 0xffffff, 14, 2.5, 0.5);
        pa.burst(m.x, 1.0, m.z, QCOL[0], 26, 3, 0.9);
        au.sfx(mine && !m.here ? 'collapseMiss' : 'collapse', m.x, m.z);
        if (mine) this.ui.toast(tr(m.here ? 'toast.collapseHere' : 'toast.collapseElse'), m.here ? 'good' : 'info');
        this.addPing(m.x, 1.0, m.z, QCOL[0], 5);
        break;
      case 'pick': { const r = this.remotes.get(m.p); if (mine) au.sfx('pick'); else if (r) au.sfx('pick', r.x, r.z); break; }
      case 'dep':
        this.got = m.got; this.core.pulse = 1; this.core.setProgress(m.got / this.quota);
        pa.burst(this.L.core.x, 1.2, this.L.core.z, acc, 30, 3.5, 1.0);
        au.sfx('deposit', this.L.core.x, this.L.core.z);
        if (m.bonus) { this.ui.toast(tr('toast.entangled', { n: m.bonus }), 'good'); au.sfx('bonus'); }
        if (mine) { this.app.stat('delivered'); if (m.bonus) this.app.stat('entangled'); }
        break;
      case 'ready': this.ui.toast(tr('toast.ready'), 'good', 6); au.sfx('ready'); break;
      case 'hit':
        pa.burst(m.x, 1.0, m.z, 0xff2bd0, 70, 6, 1.2);
        au.sfx('hit', m.x, m.z);
        if (mine) { this.alive = false; this.flash(0xff2bd0, 0.9); this.ui.toast(tr(m.why === 'hole' ? 'toast.spaghetti' : 'toast.scattered'), 'bad', 3); }
        else this.ui.toast(tr('toast.mateScattered', { name: this.nameOf(m.p) }), 'bad');
        break;
      case 'tp':
        if (mine) {
          this.me.x = m.x; this.me.z = m.z; this.me.y = 0; this.me.vx = this.me.vy = this.me.vz = 0;
          if (m.yaw != null) { this.me.yaw = m.yaw; this.me.pitch = 0; }
          this.seq = m.seq; this.alive = true;
          this.flash(m.why === 'swap' ? 0xff5fb0 : acc, 0.6);
          au.sfx(m.why === 'swap' ? 'swap' : 'respawn');
          if (m.why === 'swap') this.ui.toast(tr('toast.swapped'), 'info');
        } else { const r = this.remotes.get(m.p); if (r) { r.x = r.tx = m.x; r.z = r.tz = m.z; } }
        pa.burst(m.x, 1.0, m.z, m.why === 'swap' ? 0xff5fb0 : acc, 30, 3, 0.8);
        break;
      case 'tun':
        if (!mine) {
          for (let i = 0; i <= 8; i++) pa.burst(m.f[0] + (m.to[0] - m.f[0]) * i / 8, 0.9, m.f[1] + (m.to[1] - m.f[1]) * i / 8, acc, 3, 0.6, 0.5);
          au.sfx('tunnel', m.to[0], m.to[1]);
        }
        break;
      case 'ping': this.addPing(m.x, m.y, m.z, SUIT_COLORS[(this.playerInfo(m.p) || { color: 0 }).color], 7); au.sfx('ping', m.x, m.z); break;
      case 'ban':
        pa.burst(m.x, 1.2, m.z, 0xffffff, 60, 5, 1.0); au.sfx('ban', m.x, m.z);
        if (mine) { this.ui.toast(tr('toast.banished'), 'good'); this.app.stat('banished'); }
        break;
      case 'steal': au.sfx('steal', m.x, m.z); if (mine) this.ui.toast(tr('toast.stolen'), 'bad'); break;
      case 'drop': pa.burst(m.x, 1.0, m.z, 0x40ffd0, 20, 3, 0.7); au.sfx('drop', m.x, m.z); break;
      case 'hurt': if (mine) this.flash(0xff3030, 0.35); break;
      case 'box':
        pa.burst(m.x, 0.6, m.z, m.good ? 0xc58aff : 0xff2bd0, 40, 4, 0.9, 6);
        au.sfx(m.good ? 'boxGood' : 'boxBad', m.x, m.z);
        if (mine) this.ui.toast(tr(m.good ? 'toast.boxGood' : 'toast.boxBad'), m.good ? 'good' : 'bad');
        break;
      case 'vp': this.mx['vp' + m.n] = true; pa.burst(m.x, 2.1, m.z, 0x8affc8, 24, 3, 0.7); au.sfx('vp', m.x, m.z); break;
      case 'blink': pa.burst(m.x, 1.2, m.z, 0xff2bd0, 12, 2, 0.4); break;
      default: break;
    }
  }

  addPing(x, y, z, color, life) {
    const g = makePing(color); g.position.set(x, y, z);
    this.root.add(g);
    this.pings.push({ g, life, x, z, color });
    if (this.pings.length > 12) { const p = this.pings.shift(); disposeObject(p.g); }
  }

  sendPing() {
    const me = this.me, L = this.L, cp = Math.cos(me.pitch), sp = Math.sin(me.pitch);
    const dx = -Math.sin(me.yaw), dz = -Math.cos(me.yaw), ey = me.y + P.EYE;
    let d = raycast(L, me.x, me.z, dx, dz, 30, mutPhase(this.mut, this.t));
    if (sp < -0.01) d = Math.min(d, ey / -sp * cp);
    if (sp > 0.01) d = Math.min(d, (WALL_H - ey) / sp * cp);
    d = Math.max(0.5, d - 0.25);
    this.act({ k: 'ping', x: r2(me.x + dx * d), y: r2(clamp(ey + sp / Math.max(cp, 0.05) * d, 0.1, WALL_H - 0.1)), z: r2(me.z + dz * d) });
  }

  onLocalEvent(e) {
    const au = this.audio, me = this.me;
    switch (e.k) {
      case 'step': au.sfx(this.mods.wade ? 'splash' : 'step'); break;
      case 'jump': au.sfx('jump'); break;
      case 'land': au.sfx('land'); break;
      case 'light': au.sfx('light'); break;
      case 'tunnelFail': au.sfx('tunnelFail'); break;
      case 'wrap': this.flash(this.accentHex, 0.4); au.sfx('swap'); break;
      case 'tunnel':
        au.sfx('tunnel'); this.flash(this.accentHex, 0.35);
        for (let i = 0; i <= 8; i++) this.parts.burst(e.from[0] + (e.to[0] - e.from[0]) * i / 8, 0.9, e.from[1] + (e.to[1] - e.from[1]) * i / 8, this.accentHex, 3, 0.6, 0.5);
        this.act({ k: 'tunnel', f: [r2(e.from[0]), r2(e.from[1])], to: [r2(me.x), r2(me.z)] });
        this.app.stat('tunnels');
        break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ per-frame update

  frame(dt) {
    if (this.state === 'lobby') this.frameLobby(dt);
    else if (this.state === 'play') {
      if (!this.paused) this.framePlay(dt);
      else if (!this.primed) this.framePlay(0);   // fill the HUD and map even if the shift starts paused
      this.primed = true;
    }
    else if (this.L) this.frameIdle(dt);
    this.flashV = Math.max(0, this.flashV - dt * 2.2);
    this.gfx.fx.flash = this.flashV * 0.5;
    this.parts.update(dt);
    this.input.endFrame();
    this.gfx.render(dt);
  }

  frameLobby(dt) {
    this.lobbyT += dt;
    const L = this.L, cam = this.gfx.camera, t = this.lobbyT;
    cam.position.set(L.core.x + this.lobbyCamX + Math.sin(t * 0.25) * 0.4, 1.25 + Math.sin(t * 0.4) * 0.05, L.core.z + 6.4);
    cam.rotation.set(0.04, Math.sin(t * 0.25) * 0.05, 0);
    cam.fov = 62; cam.updateProjectionMatrix();
    this.gfx.flash.intensity = 15; this.gfx.flash.distance = 20; this.gfx.flash.angle = 0.75;
    for (const c of this.lobbyCats.values()) c.cat.update(dt, 0, Math.sin(t * 0.7 + c.color) * 0.1, t, false);
    this.core.update(dt); this.core.setReady(true, t);
    if (Math.random() < 0.15) this.parts.burst(L.core.x, 1.25, L.core.z, this.accentHex, 1, 0.6, 1.5);
    this.gfx.setPointLights([this.coreLight]);
    this.gfx.setSpotLights([], 0);
    const fx = this.gfx.fx; fx.glitch = 0; fx.invert = 0; fx.warp = 0;
  }

  frameIdle(dt) {
    this.core.update(dt);
    const fx = this.gfx.fx; fx.glitch = this.state === 'over' ? 0.6 : 0; fx.invert = 0; fx.warp = 0;
    this.gfx.flash.intensity = this.state === 'over' ? 0 : 15;
  }

  framePlay(dt) {
    const L = this.L, me = this.me, mut = this.mut, inp = this.input, au = this.audio, gfx = this.gfx;
    this.t += dt;
    const t = this.t, phase = mutPhase(mut, t);

    const m = this.mods = defaultMods();
    if (mut && mut.mods) mut.mods(m, L, t, me);
    const stats = { stamina: P.STAMINA * (1 + 0.3 * (this.up.stamina || 0)), tunnelCd: P.TUNNEL_CD * (1 - 0.2 * (this.up.tunnel || 0)) * m.tunnelCd };
    me.canMove = this.alive && !this.ui.chatOpen;
    if (!this.alive) { me.vx = 0; me.vz = 0; }
    const evs = me.update(dt, inp, L, m, phase, stats);
    for (const e of evs) this.onLocalEvent(e);
    if (mut && mut.tick) mut.tick(this, dt, t);

    if (inp.active && this.alive && !this.ui.chatOpen) {
      if (inp.hit('KeyE')) this.act({ k: 'use' });
      if (inp.hit('KeyG', 'Mouse1')) this.sendPing();
    }

    const lightOn = me.lightOn && !m.lightOff && this.alive;
    this.stateAcc += dt;
    if (this.stateAcc >= 1 / NET.STATE_HZ) {
      this.stateAcc = 0;
      if (this.alive) this.session.toHost({ t: 'st', d: [r2(me.x), r2(me.y), r2(me.z), r2(me.yaw), r2(me.pitch), lightOn ? 1 : 0, this.seq] }, false);
    }

    // camera + flashlight
    const cam = gfx.camera;
    me.applyToCamera(cam, this.app.settings.bob ? 1 : 0);
    const fov = 76 + (me.sprinting ? 6 : 0) + m.warp * 5;
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }
    const lens = this.up.lens || 0;
    gfx.flash.intensity = lightOn ? 17 : 0;
    gfx.flash.distance = BEAM.RANGE + 4 + 3 * lens;
    gfx.flash.angle = BEAM.HALF_ANGLE * (1 + 0.12 * lens) + 0.1;
    this.viewModel.visible = this.alive;
    const sway = Math.min(1, me.speed / P.WALK);
    this.viewModel.position.set(0.17 + Math.cos(me.bob) * 0.006 * sway, -0.15 + Math.sin(me.bob * 2) * 0.006 * sway, -0.42);
    for (let i = 0; i < 5; i++) this.vmDots[i].visible = i < me.carry;
    au.setListener(me.x, me.z, me.yaw);

    // team-mates
    const spots = [], blackout = !!(mut && mut.blackout && mut.blackout(t));
    for (const r of this.remotes.values()) {
      const k = Math.min(1, dt * 14), px = r.x, pz = r.z;
      r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k;
      r.yaw += angleDiff(r.tyaw, r.yaw) * k; r.pitch += (r.tpitch - r.pitch) * k;
      const gone = !!(r.flags & 2), lit = !!(r.flags & 1) && !gone && !blackout;
      r.cat.group.visible = !gone;
      r.cat.group.position.set(r.x, r.y, r.z); r.cat.group.rotation.y = r.yaw;
      r.cat.update(dt, Math.hypot(r.x - px, r.z - pz) / Math.max(dt, 1e-3), r.pitch, t, lit);
      for (let i = 0; i < r.orbit.length; i++) {
        const q = r.orbit[i]; q.visible = i < r.carry;
        if (q.visible) { const a = t * 2.5 + i * 2.1; q.position.set(Math.cos(a) * 0.45, 1.75, Math.sin(a) * 0.45); animQubit(q, t, i); q.scale.setScalar(0.38); }
      }
      if (lit) {
        const cp = Math.cos(r.pitch), fx = -Math.sin(r.yaw), fz = -Math.cos(r.yaw);
        spots.push({ x: r.x + fx * 0.4, y: r.y + 1.0, z: r.z + fz * 0.4, dx: fx * cp, dy: Math.sin(r.pitch), dz: fz * cp });
      }
    }
    gfx.setSpotLights(spots, 26);

    // lights
    const src = this.lightSrc; src.length = 0;
    if (mut && mut.lamp) {
      const o = this._lampOut || (this._lampOut = { color: new THREE.Color(), mul: 1 });
      mut.lamp(t, o);
      const hex = o.color.getHex();
      for (const l of this.lamps) { l.c = hex; l.i = 11 * o.mul; src.push(l); }
      if (mut.beat) au.beat(t, false);
    } else for (const l of this.lamps) src.push(l);
    src.push(this.coreLight);
    if (mut && mut.lights) mut.lights(this, t, src);

    // qubits
    let linkA = null, linkB = null;
    for (const v of this.qviews.values()) {
      for (let i = 0; i < v.meshes.length; i++) animQubit(v.meshes[i], t, v.id + i * 3.7);
      if (v.st === 1) {
        v.meshes[0].position.y = 1.0 + Math.sin(t * 2 + v.id) * 0.12;
        src.push({ x: v.x, y: 1.0, z: v.z, c: QCOL[v.kind], i: 2.6, d: 5 });
      }
      if (v.kind === 2 && v.st <= 1 && v.pair >= 0 && !linkA) {
        const o = this.qviews.get(v.pair);
        if (o && o.st <= 1 && v.pts.length && o.pts.length && (Math.hypot(v.pts[0][0] - me.x, v.pts[0][1] - me.z) < 16 || Math.hypot(o.pts[0][0] - me.x, o.pts[0][1] - me.z) < 16)) { linkA = v.pts[0]; linkB = o.pts[0]; }
      }
    }
    this.link.visible = !!linkA;
    if (linkA) {
      const p = this.link.geometry.attributes.position;
      p.setXYZ(0, linkA[0], 1.05, linkA[1]); p.setXYZ(1, linkB[0], 1.05, linkB[1]); p.needsUpdate = true;
      this.link.material.opacity = 0.35 + Math.sin(t * 6) * 0.25;
    }

    // anomalies
    let danger = 0, inCloud = 0;
    for (const v of this.anoms.values()) {
      const k = Math.min(1, dt * 12);
      v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k;
      const g = v.model.group, d = Math.hypot(v.x - me.x, v.z - me.z), banished = !!(v.flags & 2), obs = !!(v.flags & 1);
      g.position.set(v.x, 0, v.z);
      if (v.type === 0) {
        g.visible = !banished;
        g.rotation.y = Math.atan2(-(me.x - v.x), -(me.z - v.z));
        v.model.update(dt, t, obs, v.frac, v.id * 7.3);
        if (!banished) { danger = Math.max(danger, 1 - d / 15); src.push({ x: v.x, y: 1.9, z: v.z, c: obs ? 0xffffff : 0xff2bd0, i: 2.2, d: 5 }); }
      } else if (v.type === 1) {
        v.model.update(dt, t, v.id * 3.1);
        src.push({ x: v.x, y: 1.4, z: v.z, c: 0xb6ff8a, i: 5, d: 8 });
        if (d < BAL.cloudRadius) inCloud = 1;
        danger = Math.max(danger, 0.6 * (1 - d / 10));
      } else {
        g.visible = !(mut && mut.hideMites) || obs;
        g.rotation.y += dt * 2;
        v.model.update(dt, t, v.id, !!(v.flags & 4));
        if (g.visible) src.push({ x: v.x, y: 1, z: v.z, c: 0x40ffd0, i: 1.6, d: 4 });
      }
    }
    au.setDanger(this.alive && !this.safe ? danger : danger * 0.3);
    gfx.setPointLights(src);

    // pings
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i]; p.life -= dt;
      p.g.userData.d.position.y = 0.5 + Math.sin(t * 5) * 0.12; p.g.userData.d.rotation.y = t * 3;
      if (p.life <= 0) { disposeObject(p.g); this.pings.splice(i, 1); }
    }

    if (this.view) this.view.update(dt, t);
    this.core.update(dt);
    this.core.setReady(this.ready, t);
    if (this.ready && !this.wasReady) { this.wasReady = true; this.core.setProgress(1); }

    // screen effects
    const fx = gfx.fx;
    const g = (this.coh < 25 ? (25 - this.coh) / 25 * 0.45 : 0) + inCloud * 0.7 + (this.alive ? 0 : 1) + m.glitch;
    fx.glitch += (clamp(g, 0, 1) - fx.glitch) * Math.min(1, dt * 8);
    fx.invert += (m.invertColors - fx.invert) * Math.min(1, dt * 10);
    fx.warp += (m.warp - fx.warp) * Math.min(1, dt * 6);

    if (m.alert !== this.lastAlert) { this.lastAlert = m.alert; this.ui.alert(m.alert ? tr(m.alert) : null); if (m.alert) au.sfx('alert'); }
    while (this.hints.length && t >= this.hints[0][0]) { const h = this.hints.shift(); this.ui.toast(h[2] || tr(h[1]), 'hint', 7); }

    this.exploreAcc += dt;
    if (this.exploreAcc > 0.3) { this.exploreAcc = 0; this.explore(phase); }
    this.hudAcc += dt;
    if (this.hudAcc > 0.1) { this.hudAcc = 0; this.updateHud(stats, m); }
    this.mapAcc += dt;
    if (this.mapAcc > 0.12) { this.mapAcc = 0; this.ui.drawMap(this, m.mapNoise); }
  }

  explore(phase) {
    const L = this.L, me = this.me, cx = toTile(me.x), cz = toTile(me.z);
    for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) {
      if (x < 0 || z < 0 || x >= L.w || z >= L.h) continue;
      const i = z * L.w + x;
      if (this.explored[i] || L.tiles[i] === T.WALL) continue;
      if (los(L, me.x, me.z, (x + 0.5) * TILE, (z + 0.5) * TILE, phase)) this.explored[i] = 1;
    }
  }

  updateHud(stats, m) {
    const me = this.me, L = this.L;
    const dx = L.core.x - me.x, dz = L.core.z - me.z, dist = Math.hypot(dx, dz);
    // angle of the core relative to where we are looking (0 = straight ahead, clockwise positive)
    const rel = angleDiff(Math.atan2(dx, -dz), -me.yaw);
    let prompt = null;
    const bd = Math.hypot(me.x - (L.core.x + 1.95), me.z - (L.core.z + 1.95));
    if (bd < 2.6) prompt = this.ready ? 'prompt.run' : 'prompt.need';
    else for (const th of this.things.values()) if (!th.open && Math.hypot(me.x - th.x, me.z - th.z) < 2.3) { prompt = 'prompt.box'; break; }
    const players = [];
    if (this.lobby) for (const p of this.lobby.players) {
      const r = this.remotes.get(p.id);
      players.push({ name: p.name, color: css(SUIT_COLORS[p.color]), down: p.id === this.myId ? !this.alive : !!(r && r.flags & 2), carry: p.id === this.myId ? me.carry : r ? r.carry : 0 });
    }
    this.ui.hud({
      coh: this.coh, got: this.got, quota: this.quota, ready: this.ready, shift: this.shift, sector: pick(this.sector.name),
      carry: me.carry, cap: P.CARRY + (this.up.carry || 0), tunnel: 1 - clamp(me.tunnelCd / Math.max(0.01, stats.tunnelCd), 0, 1),
      stamina: clamp(me.stamina / stats.stamina, 0, 1), tired: me.tired, alive: this.alive, safe: dist < BAL.safeRadius - 0.4, rel, dist,
      prompt: prompt ? tr(prompt, { n: this.quota - this.got }) : null, players, light: me.lightOn && !m.lightOff, credits: this.credits,
    });
  }
}
