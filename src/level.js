// Procedural facility generator + grid helpers (collision, line of sight, path field).
// The map is a tile grid. Rooms sit on a coarse grid of "slots" and are joined by corridors.

import { RNG } from './rng.js';
import { TILE } from './config.js';

export const T = { FLOOR: 0, WALL: 1, MACHINE: 2, PHASE_A: 3, PHASE_B: 4, BARRIER: 5, CORE: 6 };
export const WHO = { PLAYER: 0, ANOMALY: 1, SIGHT: 2 };
export const SLOT = 7;

export function generateLevel(seed, slots) {
  const rng = new RNG(seed);
  const n = slots, w = n * SLOT + 1, h = w;
  const tiles = new Uint8Array(w * h).fill(T.WALL);
  const kind = new Uint8Array(w * h);        // 0 rock, 1 room, 2 corridor
  const roomId = new Int16Array(w * h).fill(-1);
  const belt = new Uint8Array(w * h);        // corridor flow direction 1:+x 2:-x 3:+z 4:-z
  const flags = new Uint8Array(w * h);       // 1 = door tile (room side), 2 = corridor mouth
  const rooms = [];
  const mid = n >> 1;

  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const isCore = i === mid && j === mid;
    const rw = isCore ? 5 : rng.int(3, 6), rh = isCore ? 5 : rng.int(3, 6);
    const x0 = i * SLOT + 1 + rng.int(0, 6 - rw), z0 = j * SLOT + 1 + rng.int(0, 6 - rh);
    const room = { id: rooms.length, i, j, x0, z0, x1: x0 + rw - 1, z1: z0 + rh - 1, isCore, dark: false, links: 0 };
    room.cx = (room.x0 + room.x1 + 1) / 2 * TILE;
    room.cz = (room.z0 + room.z1 + 1) / 2 * TILE;
    rooms.push(room);
    for (let z = room.z0; z <= room.z1; z++) for (let x = room.x0; x <= room.x1; x++) {
      const idx = z * w + x; tiles[idx] = T.FLOOR; kind[idx] = 1; roomId[idx] = room.id;
    }
  }

  const carve = (x, z, dir) => {
    const idx = z * w + x;
    if (tiles[idx] === T.WALL) { tiles[idx] = T.FLOOR; kind[idx] = 2; }
    if (kind[idx] === 2) belt[idx] = dir;
  };

  // Random spanning tree over the slot grid plus some extra links so there are loops to escape through.
  const edges = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (i < n - 1) edges.push([j * n + i, j * n + i + 1, 0]);
    if (j < n - 1) edges.push([j * n + i, (j + 1) * n + i, 1]);
  }
  rng.shuffle(edges);
  const parent = []; for (let i = 0; i < n * n; i++) parent.push(i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (const e of edges) {
    const a = find(e[0]), b = find(e[1]);
    let use = false;
    if (a !== b) { parent[a] = b; use = true; } else if (rng.chance(0.42)) use = true;
    if (!use) continue;
    const A = rooms[e[0]], B = rooms[e[1]];
    A.links++; B.links++;
    const flip = rng.chance(0.5);
    if (e[2] === 0) {
      const za = rng.int(A.z0, A.z1), zb = rng.int(B.z0, B.z1), xb = (A.i + 1) * SLOT;
      const d = flip ? 2 : 1, zs = Math.sign(zb - za);
      for (let x = A.x1 + 1; x <= xb; x++) carve(x, za, d);
      for (let z = za; z !== zb; z += zs) carve(xb, z, (zs > 0) !== flip ? 3 : 4);
      for (let x = xb; x < B.x0; x++) carve(x, zb, d);
    } else {
      const xa = rng.int(A.x0, A.x1), xb = rng.int(B.x0, B.x1), zb = (A.j + 1) * SLOT;
      const d = flip ? 4 : 3, xs = Math.sign(xb - xa);
      for (let z = A.z1 + 1; z <= zb; z++) carve(xa, z, d);
      for (let x = xa; x !== xb; x += xs) carve(x, zb, (xs > 0) !== flip ? 1 : 2);
      for (let z = zb; z < B.z0; z++) carve(xb, z, d);
    }
  }

  // Door / mouth flags.
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let z = 1; z < h - 1; z++) for (let x = 1; x < w - 1; x++) {
    const idx = z * w + x;
    if (kind[idx] !== 2) continue;
    for (const [dx, dz] of N4) {
      const j = (z + dz) * w + x + dx;
      if (kind[j] === 1) { flags[j] |= 1; flags[idx] |= 2; }
    }
  }

  // The quantum core sits in the middle of the centre room.
  const coreRoom = rooms[mid * n + mid];
  const ctx = coreRoom.x0 + 2, ctz = coreRoom.z0 + 2;
  tiles[ctz * w + ctx] = T.CORE;
  const core = { x: (ctx + 0.5) * TILE, z: (ctz + 0.5) * TILE, tx: ctx, tz: ctz, room: coreRoom.id };

  // Solid machines on interior tiles (never on the outer ring, so rooms cannot be cut in two).
  for (const r of rooms) {
    if (r.isCore) continue;
    r.dark = rng.chance(0.3);
    const iw = r.x1 - r.x0 - 1, ih = r.z1 - r.z0 - 1;
    if (iw < 1 || ih < 1) continue;
    const count = iw * ih === 1 ? (rng.chance(0.45) ? 1 : 0) : rng.int(0, 2);
    for (let k = 0; k < count; k++) {
      const x = r.x0 + 1 + rng.int(0, iw - 1), z = r.z0 + 1 + rng.int(0, ih - 1);
      tiles[z * w + x] = T.MACHINE;
    }
  }

  const lamps = [];
  for (const r of rooms) if (!r.dark) lamps.push({ x: r.cx, z: r.cz, room: r.id, core: r.isCore });

  // Wall decoration (purely visual, no collision).
  const decor = [];
  for (const r of rooms) {
    const cand = [];
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) {
      const idx = z * w + x;
      if (tiles[idx] !== T.FLOOR || (flags[idx] & 1)) continue;
      for (let s = 0; s < 4; s++) {
        const j = (z + N4[s][1]) * w + x + N4[s][0];
        if (tiles[j] === T.WALL && kind[j] === 0) cand.push([x, z, s]);
      }
    }
    rng.shuffle(cand);
    const k = Math.min(cand.length, r.isCore ? 4 : rng.int(2, 5));
    for (let i = 0; i < k; i++) decor.push({ tx: cand[i][0], tz: cand[i][1], side: cand[i][2], type: rng.int(0, 5), v: rng.next() });
  }

  const spawns = [];
  for (let z = coreRoom.z0; z <= coreRoom.z1; z++) for (let x = coreRoom.x0; x <= coreRoom.x1; x++) {
    if (Math.max(Math.abs(x - ctx), Math.abs(z - ctz)) === 2) spawns.push({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE });
  }

  const roomTiles = [], corrTiles = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const idx = z * w + x;
    if (tiles[idx] !== T.FLOOR) continue;
    if (kind[idx] === 1 && roomId[idx] !== coreRoom.id) roomTiles.push(idx);
    else if (kind[idx] === 2) corrTiles.push(idx);
  }

  return {
    seed, slots: n, w, h, W: w * TILE, H: h * TILE, tiles, kind, roomId, belt, flags, rooms, core, coreRoom,
    lamps, decor, spawns, roomTiles, corrTiles, wrap: false, extra: {},
  };
}

// ---------------------------------------------------------------- grid helpers

export const toTile = (v) => Math.floor(v / TILE);
export const tileCenter = (t) => (t + 0.5) * TILE;

export function tileAt(L, tx, tz) {
  if (L.wrap) { tx = ((tx % L.w) + L.w) % L.w; tz = ((tz % L.h) + L.h) % L.h; }
  else if (tx < 0 || tz < 0 || tx >= L.w || tz >= L.h) return T.WALL;
  return L.tiles[tz * L.w + tx];
}

export function isSolid(L, tx, tz, who, phase) {
  switch (tileAt(L, tx, tz)) {
    case T.FLOOR: return false;
    case T.PHASE_A: return phase === 0;
    case T.PHASE_B: return phase === 1;
    case T.BARRIER: return who === WHO.PLAYER;
    default: return true;
  }
}

export function circleHits(L, x, z, r, who, phase) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const z0 = Math.floor((z - r) / TILE), z1 = Math.floor((z + r) / TILE);
  for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) if (isSolid(L, tx, tz, who, phase)) return true;
  return false;
}

// Moves p {x,z} by (dx,dz) with axis separated collision. Returns bit 1 if X was blocked, bit 2 for Z.
export function moveCircle(L, p, dx, dz, r, who, phase) {
  let hit = 0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.9)));
  const sx = dx / steps, sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      const old = p.x; p.x += sx;
      if (circleHits(L, p.x, p.z, r, who, phase)) {
        p.x = sx > 0 ? Math.floor((p.x + r) / TILE) * TILE - r - 1e-3 : (Math.floor((p.x - r) / TILE) + 1) * TILE + r + 1e-3;
        if (circleHits(L, p.x, p.z, r, who, phase)) p.x = old;
        hit |= 1;
      }
    }
    if (sz !== 0) {
      const old = p.z; p.z += sz;
      if (circleHits(L, p.x, p.z, r, who, phase)) {
        p.z = sz > 0 ? Math.floor((p.z + r) / TILE) * TILE - r - 1e-3 : (Math.floor((p.z - r) / TILE) + 1) * TILE + r + 1e-3;
        if (circleHits(L, p.x, p.z, r, who, phase)) p.z = old;
        hit |= 2;
      }
    }
  }
  return hit;
}

// Wraps a position around the map edges (only used by the toroidal sector).
export function wrapPos(L, p) {
  if (!L.wrap) return false;
  let moved = false;
  if (p.x < 0) { p.x += L.W; moved = true; } else if (p.x >= L.W) { p.x -= L.W; moved = true; }
  if (p.z < 0) { p.z += L.H; moved = true; } else if (p.z >= L.H) { p.z -= L.H; moved = true; }
  return moved;
}

// Distance along a ray until the first sight-blocking tile (grid DDA).
export function raycast(L, x0, z0, dx, dz, maxDist, phase, who = WHO.SIGHT) {
  let tx = Math.floor(x0 / TILE), tz = Math.floor(z0 / TILE);
  const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(TILE / dz) : Infinity;
  let tMaxX = dx !== 0 ? (dx > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx) : Infinity;
  let tMaxZ = dz !== 0 ? (dz > 0 ? (tz + 1) * TILE - z0 : z0 - tz * TILE) / Math.abs(dz) : Infinity;
  let t = 0;
  for (let guard = 0; guard < 256; guard++) {
    if (tMaxX < tMaxZ) { t = tMaxX; tMaxX += tDeltaX; tx += stepX; } else { t = tMaxZ; tMaxZ += tDeltaZ; tz += stepZ; }
    if (t >= maxDist) return maxDist;
    if (isSolid(L, tx, tz, who, phase)) return t;
  }
  return maxDist;
}

export function los(L, x0, z0, x1, z1, phase) {
  const dx = x1 - x0, dz = z1 - z0;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return true;
  return raycast(L, x0, z0, dx / d, dz / d, d, phase) >= d - 0.05;
}

const NB = [1, 0, -1, 0, 0, 1, 0, -1];

// Breadth-first distance field from a set of tiles. Anomalies walk "downhill" on it.
export function bfsField(L, sources, who, phase, out, queue) {
  const n = L.w * L.h;
  const dist = out || new Int16Array(n);
  const q = queue || new Int32Array(n);
  dist.fill(-1);
  let head = 0, tail = 0;
  for (const s of sources) if (s >= 0 && s < n && dist[s] < 0) { dist[s] = 0; q[tail++] = s; }
  while (head < tail) {
    const cur = q[head++], cx = cur % L.w, cz = (cur / L.w) | 0, d = dist[cur] + 1;
    for (let k = 0; k < 8; k += 2) {
      let x = cx + NB[k], z = cz + NB[k + 1];
      if (L.wrap) { x = (x + L.w) % L.w; z = (z + L.h) % L.h; }
      else if (x < 0 || z < 0 || x >= L.w || z >= L.h) continue;
      const idx = z * L.w + x;
      if (dist[idx] >= 0 || isSolid(L, x, z, who, phase)) continue;
      dist[idx] = d; q[tail++] = idx;
    }
  }
  return dist;
}

// Pushes a point out of solid tiles (used after a phase wall materialises on top of someone).
export function unstick(L, p, r, who, phase) {
  if (!circleHits(L, p.x, p.z, r, who, phase)) return false;
  const tx = toTile(p.x), tz = toTile(p.z);
  let best = null, bd = 1e9;
  for (let rad = 0; rad <= 4 && !best; rad++) {
    for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== rad) continue;
      if (isSolid(L, tx + dx, tz + dz, who, phase)) continue;
      const cx = tileCenter(tx + dx), cz = tileCenter(tz + dz), d = Math.hypot(cx - p.x, cz - p.z);
      if (d < bd) { bd = d; best = [cx, cz]; }
    }
  }
  if (best) { p.x = best[0]; p.z = best[1]; }
  return true;
}
