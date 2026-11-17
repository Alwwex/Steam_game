// Sector mutators: the special rule each DLC sector adds to the game.
//
// A mutator may define any of:
//   gen(L, rng)            deterministic changes to the generated level (runs on every machine)
//   mods(m, L, t, p)       per-frame modifiers for the LOCAL player (movement runs client side)
//   phase(t)               which "world" is solid right now (Many-Worlds)
//   blackout(t)            true while flashlights are forced off
//   host: { init, tick, use, anomSpeed }   authoritative logic, host only
//   view(game)             builds visuals, returns { update(dt, t), dispose() }
//   tick(game, dt, t)      client-side logic for the local player (hazard contact etc.)
// Most rules are pure functions of the shared level clock `t`, so they need no network traffic.

import * as THREE from 'three';
import { TILE, WALL_H } from './config.js';
import { T, WHO, toTile, tileAt, bfsField } from './level.js';
import { hash2 } from './rng.js';
import { makeChevronTexture, makeEnergyTexture } from './textures.js';
import { makeCat, makeGhostly, FURS } from './models.js';
import { GEO } from './meshbuilder.js';

const TAU = Math.PI * 2;
const DX = [0, 1, -1, 0, 0], DZ = [0, 0, 0, 1, -1];

function energyMat(color, opacity, extra = {}) {
  const m = new THREE.MeshBasicMaterial({
    color, map: makeEnergyTexture(), transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, ...extra,
  });
  m.userData.ownMap = true;
  return m;
}

function tileBoxes(game, idxs, mat, h = WALL_H) {
  const L = game.L, im = new THREE.InstancedMesh(GEO.box, mat, Math.max(1, idxs.length)), m4 = new THREE.Matrix4();
  idxs.forEach((idx, i) => {
    m4.makeScale(TILE - 0.04, h, TILE - 0.04).setPosition(((idx % L.w) + 0.5) * TILE, h / 2, (((idx / L.w) | 0) + 0.5) * TILE);
    im.setMatrixAt(i, m4);
  });
  im.count = idxs.length; im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
  game.root.add(im);
  return im;
}

const inCoreRoom = (L, x, z) => {
  const tx = toTile(x), tz = toTile(z);
  return tx >= 0 && tz >= 0 && tx < L.w && tz < L.h && L.roomId[tz * L.w + tx] === L.core.room;
};

// ---- shared pure helpers (used by both host and clients)

export function beamPos(b, t) { return b.a0 + (b.a1 - b.a0) * (0.5 - 0.5 * Math.cos(t * TAU / b.per + b.ph)); }

export function vpAt(L, k) {
  const pool = L.roomTiles, idx = pool[Math.floor(hash2(L.seed ^ 0x51ed, k) * pool.length)];
  return { x: ((idx % L.w) + 0.5) * TILE, z: (((idx / L.w) | 0) + 0.5) * TILE };
}
export const VP_PERIOD = 4, VP_LIFE = 7;

export function heatAt(L, tx, tz, t) {
  if (tx < 0 || tz < 0 || tx >= L.w || tz >= L.h) return 0;
  const idx = tz * L.w + tx;
  if (L.tiles[idx] !== T.FLOOR || L.roomId[idx] === L.core.room) return 0;
  return Math.sin(tx * 0.9 + t * 0.35) + Math.cos(tz * 1.1 - t * 0.27) + 0.6 * Math.sin((tx + tz) * 0.5 + t * 0.2);
}
export const HEAT_HOT = 1.3, HEAT_WARM = 0.95;

export function holePos(L, t) {
  const r = L.W * 0.3, a = t * 0.11 + 1;
  return { x: L.W / 2 + Math.cos(a) * r, z: L.H / 2 + Math.sin(a) * r };
}

export function waveState(L, t) {
  const PER = 16, u = t % PER, k = Math.floor(t / PER), dir = k % 2 ? -1 : 1, speed = L.W / 6;
  const x = dir > 0 ? (u - 2) * speed : L.W - (u - 2) * speed;
  return { active: u > 2 && u < 8.2, warn: u <= 2 && t > 4, x, dir };
}

// ---------------------------------------------------------------------------------------------

export const MUT = {
  // 01 Deep Freeze ---------------------------------------------------------------------------
  ice: {
    mods(m) { m.accel = 1.15; },
    tick(game) {
      if (Math.random() < 0.4) {
        const p = game.me;
        game.parts.burst(p.x + (Math.random() - 0.5) * 14, WALL_H - 0.3, p.z + (Math.random() - 0.5) * 14, 0xdff6ff, 1, 0.15, 5, 0.5);
      }
    },
  },

  // 02 Laser Grid ----------------------------------------------------------------------------
  lasers: {
    gen(L, rng) {
      const beams = [];
      for (const r of L.rooms) {
        if (r.isCore) continue;
        const w = r.x1 - r.x0 + 1, h = r.z1 - r.z0 + 1;
        if (Math.max(w, h) < 4 || !rng.chance(0.8)) continue;
        const ax = w >= h ? 0 : 1;   // 0: beam line sweeps along x, spans z
        beams.push({
          ax, a0: (ax ? r.z0 : r.x0) * TILE + 0.7, a1: ((ax ? r.z1 : r.x1) + 1) * TILE - 0.7,
          b0: (ax ? r.x0 : r.z0) * TILE, b1: ((ax ? r.x1 : r.z1) + 1) * TILE, per: rng.range(5, 9), ph: rng.range(0, TAU),
        });
      }
      L.extra.beams = beams;
    },
    view(game) {
      const beams = game.L.extra.beams || [], mat = new THREE.MeshBasicMaterial({ color: 0xff2a3a });
      const meshes = beams.map((b) => {
        const len = b.b1 - b.b0, m = new THREE.Mesh(GEO.box, mat);
        m.scale.set(b.ax ? len : 0.07, 0.07, b.ax ? 0.07 : len);
        game.root.add(m); return m;
      });
      return {
        update(dt, t) {
          beams.forEach((b, i) => {
            const p = beamPos(b, t), mid = (b.b0 + b.b1) / 2;
            meshes[i].position.set(b.ax ? mid : p, 0.42, b.ax ? p : mid);
          });
        },
      };
    },
    tick(game, dt, t) {
      const p = game.me, s = game.mx;
      s.zap = Math.max(0, (s.zap || 0) - dt);
      if (s.zap > 0 || p.y > 0.6 || !game.alive) return;
      for (const b of game.L.extra.beams || []) {
        const pos = beamPos(b, t), a = b.ax ? p.z : p.x, c = b.ax ? p.x : p.z;
        if (Math.abs(a - pos) < 0.32 && c > b.b0 && c < b.b1) {
          s.zap = 1.3;
          game.act({ k: 'hurt', amt: 6, why: 'laser' });
          p.vy = 4; p.onGround = false;
          game.audio.sfx('zap'); game.flash(0xff2a3a, 0.5);
          return;
        }
      }
    },
  },

  // 03 Ion Storm -----------------------------------------------------------------------------
  pulse: {
    mods(m, L, t) {
      const c = t % 12;
      if (c > 9 && t > 12) { const a = t * 0.35; m.pushX = Math.cos(a) * 55; m.pushZ = Math.sin(a) * 55; m.glitch = 0.3; }
      else if (c > 7.2 && t > 12) m.alert = 'alert.pulse';
    },
  },

  // 04 Entanglement Station ------------------------------------------------------------------
  swap: {
    host: {
      tick(sim, dt) {
        const s = sim.mx;
        s.swapT = (s.swapT ?? 22) - dt;
        if (s.swapT > 0) return;
        s.swapT = 20 + sim.rand() * 10;
        const alive = sim.alive();
        if (alive.length >= 2) {
          const a = alive[Math.floor(sim.rand() * alive.length)];
          let b = a; while (b === a) b = alive[Math.floor(sim.rand() * alive.length)];
          const ax = a.x, az = a.z;
          sim.teleport(a, b.x, b.z, 'swap'); sim.teleport(b, ax, az, 'swap');
        } else if (alive.length === 1) {
          const p = alive[0];
          let best = null, bd = 1e9;
          for (const an of sim.anoms) if (an.type === 0 && an.st === 0) { const d = Math.hypot(an.x - p.x, an.z - p.z); if (d < bd && d > 6) { bd = d; best = an; } }
          if (!best) return;
          const px = p.x, pz = p.z;
          sim.teleport(p, best.x, best.z, 'swap'); best.x = px; best.z = pz;
        }
      },
    },
  },

  // 05 Many-Worlds Wing ----------------------------------------------------------------------
  worlds: {
    gen(L, rng) {
      const c = L.corrTiles.slice(); rng.shuffle(c);
      const n = Math.max(4, Math.floor(c.length * 0.24));
      let k = 0;
      for (const idx of c) {
        if (k >= n) break;
        if (L.flags[idx] & 2) continue;
        const x = idx % L.w, z = (idx / L.w) | 0;
        let adj = false;
        for (let d = 1; d <= 4; d++) { const t = tileAt(L, x + DX[d], z + DZ[d]); if (t === T.PHASE_A || t === T.PHASE_B) adj = true; }
        if (adj) continue;
        L.tiles[idx] = k & 1 ? T.PHASE_B : T.PHASE_A; k++;
      }
      L.corrTiles = L.corrTiles.filter((i) => L.tiles[i] === T.FLOOR);
    },
    phase(t) { return Math.floor(t / 14) % 2; },
    mods(m, L, t) { if (t % 14 > 12.2) m.alert = 'alert.worlds'; },
    view(game) {
      const L = game.L, a = [], b = [];
      for (let i = 0; i < L.tiles.length; i++) { if (L.tiles[i] === T.PHASE_A) a.push(i); else if (L.tiles[i] === T.PHASE_B) b.push(i); }
      const ma = energyMat(0xff8c2a, 0.6), mb = energyMat(0x2ad0ff, 0.6);
      tileBoxes(game, a, ma); tileBoxes(game, b, mb);
      return {
        update(dt, t) {
          const ph = Math.floor(t / 14) % 2;
          ma.opacity = ph === 0 ? 0.55 : 0.035; mb.opacity = ph === 1 ? 0.55 : 0.035;
          ma.map.offset.y = t * 0.2; mb.map.offset.y = -t * 0.2;
        },
      };
    },
  },

  // 06 Tunnel Junction -----------------------------------------------------------------------
  sealed: {
    gen(L) {
      for (const idx of L.corrTiles) if (L.flags[idx] & 2) L.tiles[idx] = T.BARRIER;
      L.corrTiles = L.corrTiles.filter((i) => L.tiles[i] === T.FLOOR);
    },
    mods(m) { m.tunnelCd = 0.22; },
    view(game) {
      const L = game.L, idxs = [];
      for (let i = 0; i < L.tiles.length; i++) if (L.tiles[i] === T.BARRIER) idxs.push(i);
      const mat = energyMat(0xffd21f, 0.3);
      tileBoxes(game, idxs, mat);
      return { update(dt, t) { mat.map.offset.set(t * 0.15, t * 0.4); mat.opacity = 0.26 + Math.sin(t * 3) * 0.06; } };
    },
  },

  // 07 Zero-Point Chamber --------------------------------------------------------------------
  lowgrav: {
    mods(m) { m.grav = 0.22; m.jump = 0.8; },
    view(game) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x8affc8 });
      const ms = [0, 1].map(() => { const m = new THREE.Mesh(GEO.oct, mat); m.scale.set(0.45, 0.6, 0.45); game.root.add(m); return m; });
      return {
        update(dt, t) {
          const k = Math.floor(t / VP_PERIOD);
          ms.forEach((m, i) => {
            const n = k - i, age = t - n * VP_PERIOD;
            m.visible = n >= 0 && age < VP_LIFE && !game.mx['vp' + n];
            if (!m.visible) return;
            const p = vpAt(game.L, n);
            m.position.set(p.x, 2.1 + Math.sin(t * 3 + i) * 0.15, p.z);
            m.rotation.y = t * 3;
            m.scale.setScalar(age > VP_LIFE - 1.5 ? (Math.sin(t * 30) > 0 ? 0.5 : 0.25) : 0.5);
          });
        },
      };
    },
    tick(game, dt, t) {
      const p = game.me, k = Math.floor(t / VP_PERIOD);
      if (!game.alive || p.y < 0.45) return;
      for (let i = 0; i < 2; i++) {
        const n = k - i;
        if (n < 0 || t - n * VP_PERIOD >= VP_LIFE || game.mx['vp' + n]) continue;
        const v = vpAt(game.L, n);
        if (Math.hypot(v.x - p.x, v.z - p.z) < 1.3) { game.mx['vp' + n] = true; game.act({ k: 'vp', n }); }
      }
    },
    host: {
      act(sim, p, a) {
        const n = a.n | 0, s = sim.mx;
        if (a.k !== 'vp' || n < 0 || s['vp' + n]) return;
        const age = sim.time - n * VP_PERIOD;
        if (age < -1 || age > VP_LIFE + 1) return;
        s['vp' + n] = true;
        sim.addCoh(4);
        const v = vpAt(sim.L, n);
        sim.ev({ k: 'vp', n, x: v.x, z: v.z, p: p.id });
      },
    },
  },

  // 08 Uncertainty Ward ----------------------------------------------------------------------
  uncertain: {
    mods(m) { m.mapNoise = true; },
    host: {
      tick(sim, dt) {
        for (const a of sim.anoms) {
          if (a.type !== 0 || a.st !== 0 || a.obs) continue;
          a.blink = (a.blink ?? 2 + sim.rand() * 2) - dt;
          if (a.blink > 0) continue;
          a.blink = 2.2 + sim.rand() * 2;
          for (let tries = 0; tries < 12; tries++) {
            const tx = toTile(a.x) + Math.floor(sim.rand() * 7) - 3, tz = toTile(a.z) + Math.floor(sim.rand() * 7) - 3;
            if (!sim.freeForAnomaly(tx, tz)) continue;
            sim.ev({ k: 'blink', x: a.x, z: a.z });
            a.x = (tx + 0.5) * TILE; a.z = (tz + 0.5) * TILE;
            break;
          }
        }
      },
    },
  },

  // 09 Annealer Furnace ----------------------------------------------------------------------
  heat: {
    host: {
      tick(sim, dt) {
        for (const p of sim.alive()) {
          if (p.y < 0.3 && heatAt(sim.L, toTile(p.x), toTile(p.z), sim.time) > HEAT_HOT) sim.addCoh(-3.2 * dt, 'heat');
        }
      },
    },
    mods(m, L, t, p) { if (p.y < 0.3 && heatAt(L, toTile(p.x), toTile(p.z), t) > HEAT_HOT) { m.glitch = 0.25; m.alert = 'alert.heat'; } },
    view(game) {
      const N = 260, quad = new THREE.PlaneGeometry(TILE - 0.1, TILE - 0.1); quad.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      const im = new THREE.InstancedMesh(quad, mat, N); im.frustumCulled = false; game.root.add(im);
      const m4 = new THREE.Matrix4(), hot = new THREE.Color(0xff5a10), warm = new THREE.Color(0x4a1806);
      let acc = 1;
      return {
        update(dt, t) {
          acc += dt; if (acc < 0.12) return; acc = 0;
          const L = game.L, cx = toTile(game.me.x), cz = toTile(game.me.z);
          let n = 0;
          for (let z = cz - 8; z <= cz + 8 && n < N; z++) for (let x = cx - 8; x <= cx + 8 && n < N; x++) {
            const h = heatAt(L, x, z, t);
            if (h < HEAT_WARM) continue;
            m4.makeTranslation((x + 0.5) * TILE, 0.03, (z + 0.5) * TILE); im.setMatrixAt(n, m4);
            im.setColorAt(n, h > HEAT_HOT ? hot : warm); n++;
          }
          im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        },
      };
    },
  },

  // 10 Qubit Foundry -------------------------------------------------------------------------
  conveyor: {
    mods(m, L, t, p) {
      const tx = toTile(p.x), tz = toTile(p.z);
      if (p.y > 0.25 || tx < 0 || tz < 0 || tx >= L.w || tz >= L.h) return;
      const idx = tz * L.w + tx, d = L.belt[idx];
      if (d && L.kind[idx] === 2 && L.tiles[idx] === T.FLOOR) { m.driftX = DX[d] * 3.4; m.driftZ = DZ[d] * 3.4; }
    },
    view(game) {
      const L = game.L, idxs = L.corrTiles.filter((i) => L.belt[i]);
      const quad = new THREE.PlaneGeometry(TILE * 0.7, TILE); quad.rotateX(-Math.PI / 2);
      const tex = makeChevronTexture(); tex.repeat.set(1, 2);
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffe85a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      mat.userData.ownMap = true;
      const im = new THREE.InstancedMesh(quad, mat, Math.max(1, idxs.length)), m4 = new THREE.Matrix4();
      const rot = [0, Math.PI / 2, -Math.PI / 2, 0, Math.PI];   // texture chevrons point towards +z
      idxs.forEach((idx, i) => {
        m4.makeRotationY(rot[L.belt[idx]]).setPosition(((idx % L.w) + 0.5) * TILE, 0.03, (((idx / L.w) | 0) + 0.5) * TILE);
        im.setMatrixAt(i, m4);
      });
      im.count = idxs.length; im.frustumCulled = false; game.root.add(im);
      return { update(dt, t) { tex.offset.y = (t * 1.4) % 1; } };
    },
  },

  // 11 Schrödinger's Menagerie ---------------------------------------------------------------
  boxes: {
    host: {
      init(sim) {
        const n = Math.min(10, 4 + sim.shift);
        for (let i = 0; i < n; i++) { const p = sim.randomSpot(); sim.things.push({ id: i + 1, kind: 'box', x: p.x, z: p.z, open: 0 }); }
      },
      use(sim, th, p) {
        th.open = 1;
        const good = sim.rand() < 0.5;
        if (good) { sim.spawnQubit(th.x, th.z, 0); sim.addCoh(4); } else sim.spawnAnomaly(0, th.x, th.z);
        sim.ev({ k: 'box', id: th.id, good: good ? 1 : 0, x: th.x, z: th.z, p: p.id });
        sim.qDirty = true;
      },
    },
  },

  // 12 Condensate Pool -----------------------------------------------------------------------
  slowfield: {
    gen(L, rng) {
      const zones = [];
      for (const r of L.rooms) if (!r.isCore && rng.chance(0.4)) zones.push({ x: r.cx, z: r.cz, r: 4.6 });
      if (!zones.length) { const r = L.rooms.find((q) => !q.isCore); if (r) zones.push({ x: r.cx, z: r.cz, r: 4.6 }); }
      L.extra.zones = zones;
    },
    inZone(L, x, z) { for (const q of L.extra.zones || []) if (Math.hypot(q.x - x, q.z - z) < q.r) return true; return false; },
    mods(m, L, t, p) { if (MUT.slowfield.inZone(L, p.x, p.z)) { m.speed *= 0.55; m.warp = 0.6; } },
    host: { anomSpeed(sim, a) { return MUT.slowfield.inZone(sim.L, a.x, a.z) ? 0.22 : 1; } },
    view(game) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x4ad0ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.MeshBasicMaterial({ color: 0x4ad0ff });
      const ms = (game.L.extra.zones || []).map((q) => {
        const m = new THREE.Mesh(GEO.ico1, mat); m.position.set(q.x, 0.2, q.z); m.scale.setScalar(q.r * 2); game.root.add(m);
        const r = new THREE.Mesh(GEO.torusThin, ring); r.rotation.x = Math.PI / 2; r.position.set(q.x, 0.05, q.z); r.scale.setScalar(q.r * 2); game.root.add(r);
        return m;
      });
      return { update(dt, t) { ms.forEach((m, i) => { m.rotation.y = t * 0.2 + i; }); mat.opacity = 0.04 + Math.sin(t * 1.5) * 0.012; } };
    },
  },

  // 13 Topological Maze ----------------------------------------------------------------------
  torus: {
    gen(L, rng) {
      const n = L.slots, w = L.w, portals = [];
      const open = (x, z) => { const i = z * w + x; if (L.tiles[i] === T.WALL) { L.tiles[i] = T.FLOOR; L.kind[i] = 2; L.corrTiles.push(i); } };
      { // east-west
        const j = rng.int(0, n - 1), A = L.rooms[j * n], B = L.rooms[j * n + n - 1];
        const za = rng.int(A.z0, A.z1), zb = rng.int(B.z0, B.z1);
        for (let x = 0; x < A.x0; x++) open(x, za);
        for (let x = B.x1 + 1; x <= w - 1; x++) open(x, zb);
        for (let z = Math.min(za, zb); z <= Math.max(za, zb); z++) open(w - 1, z);
        portals.push({ x: 0.06, z: (za + 0.5) * TILE, ax: 0 }, { x: L.W - 0.06, z: (za + 0.5) * TILE, ax: 0 });
      }
      { // north-south
        const i = rng.int(0, n - 1), A = L.rooms[i], B = L.rooms[(n - 1) * n + i];
        const xa = rng.int(A.x0, A.x1), xb = rng.int(B.x0, B.x1);
        for (let z = 0; z < A.z0; z++) open(xa, z);
        for (let z = B.z1 + 1; z <= L.h - 1; z++) open(xb, z);
        for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) open(x, L.h - 1);
        portals.push({ x: (xa + 0.5) * TILE, z: 0.06, ax: 1 }, { x: (xa + 0.5) * TILE, z: L.H - 0.06, ax: 1 });
      }
      L.wrap = true; L.extra.portals = portals;
    },
    view(game) {
      const mat = energyMat(0x3dffb0, 0.5);
      for (const p of game.L.extra.portals || []) {
        const m = new THREE.Mesh(GEO.plane, mat); m.scale.set(TILE, WALL_H, 1);
        m.position.set(p.x, WALL_H / 2, p.z); if (p.ax === 0) m.rotation.y = Math.PI / 2;
        game.root.add(m);
      }
      return { update(dt, t) { mat.map.offset.set(Math.sin(t) * 0.2, t * 0.5); } };
    },
  },

  // 14 Error Correction Center ---------------------------------------------------------------
  bitflip: {
    mods(m, L, t) {
      const c = t % 26, n = Math.floor(t / 26) % 2;
      if (c > 20) {
        if (n === 0) { m.invert = true; m.alert = 'alert.bitflip'; m.glitch = 0.15; }
        else { m.invertLook = true; m.invertColors = 1; m.alert = 'alert.phaseflip'; }
      } else if (c > 18) m.alert = n === 0 ? 'alert.bitwarn' : 'alert.phasewarn';
    },
  },

  // 15 Dark Fiber ----------------------------------------------------------------------------
  dark: {
    noLamps: true, fogFar: 21, ambient: 0.015, hideMites: true, extraMites: 1,
    view(game) {
      const L = game.L, src = [];
      for (let d = 1; d <= 4; d++) src.push((L.core.tz + DZ[d]) * L.w + L.core.tx + DX[d]);
      const f = bfsField(L, src, WHO.PLAYER, 0);
      const pos = [];
      for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) {
        const d = f[z * L.w + x];
        if (d <= 0) continue;
        for (let k = 1; k <= 4; k++) {
          const nx = x + DX[k], nz = z + DZ[k];
          if (nx < 0 || nz < 0 || nx >= L.w || nz >= L.h || f[nz * L.w + nx] !== d - 1) continue;
          pos.push((x + 0.5) * TILE, 0.04, (z + 0.5) * TILE, (nx + 0.5) * TILE, 0.04, (nz + 0.5) * TILE);
          break;
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x2a9dff });
      game.root.add(new THREE.LineSegments(g, mat));
      return { update(dt, t) { mat.color.setHex(Math.sin(t * 2) > 0.6 ? 0x6ac4ff : 0x2a9dff); } };
    },
  },

  // 16 Time Crystal Vault --------------------------------------------------------------------
  echo: {
    delay: 6,
    view(game) {
      const ghosts = new Map();
      return {
        update(dt, t) {
          const want = new Set();
          for (const r of game.allPlayers()) {
            const h = game.histAt(r.id, t - 6);
            if (!h) continue;
            want.add(r.id);
            let c = ghosts.get(r.id);
            if (!c) {
              c = makeCat({ suit: 0xffd45a, fur: FURS[0], hat: null }); makeGhostly(c.group);
              game.root.add(c.group); ghosts.set(r.id, c);
            }
            c.group.position.set(h.x, h.y, h.z); c.group.rotation.y = h.yaw;
            c.update(dt, 2, h.pitch, t, true);
            c.group.visible = Math.hypot(h.x - game.me.x, h.z - game.me.z) > 0.9 || r.id !== game.myId;
          }
          for (const [id, c] of ghosts) if (!want.has(id)) { c.dispose(); ghosts.delete(id); }
        },
        dispose() { for (const c of ghosts.values()) c.dispose(); ghosts.clear(); },
      };
    },
  },

  // 17 Quantum Dot Disco ---------------------------------------------------------------------
  strobe: {
    blackout(t) { return t > 12 && t % 12 > 9.6; },
    mods(m, L, t) {
      const c = t % 12;
      if (t > 12 && c > 9.6) { m.lightOff = true; m.alert = 'alert.drop'; } else if (t > 12 && c > 8) m.alert = 'alert.dropwarn';
    },
    lamp(t, out) {
      const beat = t * 2, c = t % 12;
      out.color.setHSL((Math.floor(beat) * 0.17) % 1, 1, 0.6);
      out.mul = t > 12 && c > 9.6 ? 0 : 0.55 + 0.6 * (1 - (beat % 1));
    },
    beat: true,
  },

  // 18 Neutrino Tank -------------------------------------------------------------------------
  flood: {
    lurkerGhost: true, lurkerSpeed: 0.46,
    mods(m, L, t, p) { if (p.y < 0.35) { m.speed *= 0.74; m.wade = 1; } },
    view(game) {
      const L = game.L, mat = energyMat(0x2a6aff, 0.22, { blending: THREE.NormalBlending });
      mat.map.repeat.set(L.w / 2, L.h / 2);
      const m = new THREE.Mesh(GEO.plane, mat); m.rotation.x = -Math.PI / 2; m.scale.set(L.W, L.H, 1); m.position.set(L.W / 2, 0.42, L.H / 2);
      game.root.add(m);
      return { update(dt, t) { mat.map.offset.set(t * 0.02, t * 0.035); m.position.y = 0.42 + Math.sin(t * 1.3) * 0.02; } };
    },
  },

  // 19 Gravity Wave Lab ----------------------------------------------------------------------
  wave: {
    mods(m, L, t, p) {
      const w = waveState(L, t);
      if (w.warn) m.alert = 'alert.wave';
      if (w.active && Math.abs(p.x - w.x) < 2.2) { m.pushX = w.dir * 115; m.warp = 1; m.glitch = 0.2; }
    },
    view(game) {
      const L = game.L, mat = energyMat(0x39ff7a, 0.16);
      mat.map.repeat.set(1, 6);
      const m = new THREE.Mesh(GEO.plane, mat); m.scale.set(L.H, WALL_H, 1); m.rotation.y = Math.PI / 2; game.root.add(m);
      return {
        update(dt, t) {
          const w = waveState(L, t);
          m.visible = w.active;
          m.position.set(w.x, WALL_H / 2, L.H / 2);
          mat.map.offset.x = t * 2;
        },
      };
    },
  },

  // 20 Singularity Core ----------------------------------------------------------------------
  blackhole: {
    mods(m, L, t, p) {
      const h = holePos(L, t), dx = h.x - p.x, dz = h.z - p.z, d = Math.hypot(dx, dz);
      if (d < 13 && d > 0.01) {
        const f = 60 * (1 - d / 13) ** 2;
        m.pushX += dx / d * f; m.pushZ += dz / d * f;
        m.warp = Math.max(m.warp, 1 - d / 13);
        if (d < 5) m.alert = 'alert.hole';
      }
    },
    host: {
      tick(sim) {
        const h = holePos(sim.L, sim.time);
        for (const p of sim.alive()) if (!sim.isSafe(p) && Math.hypot(p.x - h.x, p.z - h.z) < 1.5) sim.hit(p, null, 'hole');
      },
    },
    lights(game, t, out) { const h = holePos(game.L, t); out.push({ x: h.x, y: 1.4, z: h.z, c: 0xff7a2a, i: 16, d: 11, pri: 30 }); },
    view(game) {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(GEO.ico1, new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })); ball.scale.setScalar(2); g.add(ball);
      const rm = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
      const r1 = new THREE.Mesh(GEO.torus, rm); r1.scale.setScalar(3.4); r1.rotation.x = Math.PI / 2 + 0.3; g.add(r1);
      const r2 = new THREE.Mesh(GEO.torusThin, new THREE.MeshBasicMaterial({ color: 0xffd0a0 })); r2.scale.setScalar(4.6); r2.rotation.x = Math.PI / 2 + 0.3; g.add(r2);
      game.root.add(g);
      return {
        update(dt, t) {
          const h = holePos(game.L, t);
          g.position.set(h.x, 1.4, h.z);
          r1.rotation.z = t * 2.4; r2.rotation.z = -t * 1.3;
          if (Math.random() < 0.5) {
            const a = Math.random() * TAU, d = 2 + Math.random() * 3;
            game.parts.burst(h.x + Math.cos(a) * d, 1.4 + (Math.random() - 0.5) * 1.5, h.z + Math.sin(a) * d, 0xff9a4a, 1, 0.3, 0.8, 0);
          }
        },
      };
    },
  },
};

export const mutOf = (sector) => (sector && sector.mut ? MUT[sector.mut] || null : null);
export const mutPhase = (mut, t) => (mut && mut.phase ? mut.phase(t) : 0);

// Generates a level and applies the sector's deterministic changes. Host and clients both call
// this with the same seed, so everybody ends up with exactly the same map.
import { generateLevel } from './level.js';
import { RNG } from './rng.js';
export function buildLevel(seed, slots, sector) {
  const L = generateLevel(seed, slots);
  const mut = mutOf(sector);
  if (mut && mut.gen) mut.gen(L, new RNG((seed ^ 0x9e3779b9) >>> 0));
  return L;
}
