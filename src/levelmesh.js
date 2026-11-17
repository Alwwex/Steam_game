// Turns a generated level into two merged meshes (lit + glowing parts).

import * as THREE from 'three';
import { TILE, WALL_H } from './config.js';
import { T, tileAt } from './level.js';
import { TEX } from './textures.js';
import { hash2 } from './rng.js';
import { MeshBuilder, GEO, M, col, mul, toGroup } from './meshbuilder.js';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const H = WALL_H, BAND = 0.85;

export function buildLevelMesh(L, pal, opts = {}) {
  const lit = new MeshBuilder(), glow = new MeshBuilder();
  const cWall = col(pal.wall), cLow = col(pal.low), cFloor = col(pal.floor), cCeil = col(pal.ceil);
  const cMach = col(pal.mach), cAcc = col(pal.accent), cLamp = col(pal.lamp);
  const lampOn = !opts.noLamps;

  for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) {
    const idx = z * L.w + x, t = L.tiles[idx];
    if (t === T.WALL) continue;
    const x0 = x * TILE, x1 = x0 + TILE, z0 = z * TILE, z1 = z0 + TILE;
    const v = 0.86 + 0.28 * hash2(x * 7 + 3, z * 13 + 1);
    const isRoom = L.kind[idx] === 1, isCore = L.roomId[idx] === L.core.room;

    lit.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0],
      mul(cFloor, v * (isRoom ? 1 : 0.78) * (isCore ? 1.15 : 1)), isCore ? TEX.FLOOR2 : isRoom ? TEX.FLOOR : TEX.GRATE);
    lit.quad([x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1], mul(cCeil, v), TEX.CEIL);

    for (let s = 0; s < 4; s++) {
      const nx = x + N4[s][0], nz = z + N4[s][1];
      if (tileAt(L, nx, nz) !== T.WALL) continue;
      const hv = hash2(x * 31 + s * 5, z * 17 + 11);
      const wv = 0.85 + 0.3 * hv;
      const lo = mul(cLow, wv), a = mul(cWall, wv), b = mul(cWall, wv * 0.6);
      const tile = hv > 0.72 ? TEX.PANEL : TEX.WALL;
      let p0, p1;   // bottom edge, left to right as seen from inside the tile
      if (s === 0) { p0 = [x1, z0]; p1 = [x1, z1]; }
      else if (s === 1) { p0 = [x0, z1]; p1 = [x0, z0]; }
      else if (s === 2) { p0 = [x1, z1]; p1 = [x0, z1]; }
      else { p0 = [x0, z0]; p1 = [x1, z0]; }
      lit.quad([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], BAND, p1[1]], [p0[0], BAND, p0[1]], lo, TEX.TRIM);
      lit.quad([p0[0], BAND, p0[1]], [p1[0], BAND, p1[1]], [p1[0], H, p1[1]], [p0[0], H, p0[1]], [a, a, b, b], tile);
    }

    if (t === T.MACHINE) {
      const cx = x0 + TILE / 2, cz = z0 + TILE / 2, hgt = 1.9 + 0.7 * hash2(x, z);
      lit.add(GEO.box, M(cx, hgt / 2, cz, 2.3, hgt, 2.3), mul(cMach, v), TEX.MACH);
      lit.add(GEO.box, M(cx, hgt + 0.12, cz, 1.3, 0.24, 1.3), mul(cMach, v * 0.6), TEX.GRATE);
      for (let s = 0; s < 4; s++) {
        const ox = N4[s][0] * 1.16, oz = N4[s][1] * 1.16;
        const w = N4[s][0] ? 0.04 : 0.9, d = N4[s][0] ? 0.9 : 0.04;
        glow.add(GEO.box, M(cx + ox, hgt * 0.78, cz + oz, w, 0.08, d), hash2(x + s, z) > 0.5 ? cAcc : mul(cAcc, 0.35));
      }
    }
  }

  // Ceiling lamps.
  for (const lamp of L.lamps) {
    if (lamp.core) continue;
    const s = 0.75;
    lit.add(GEO.box, M(lamp.x, H - 0.06, lamp.z, 1.8, 0.12, 1.8), mul(cCeil, 0.6), TEX.GRATE);
    const c = lampOn ? cLamp : mul(cLamp, 0.04);
    glow.quad([lamp.x - s, H - 0.13, lamp.z - s], [lamp.x + s, H - 0.13, lamp.z - s], [lamp.x + s, H - 0.13, lamp.z + s], [lamp.x - s, H - 0.13, lamp.z + s], c, TEX.WHITE);
  }

  // Wall decoration.
  for (const d of L.decor) {
    const n = N4[d.side];
    const px = (d.tx + 0.5) * TILE + n[0] * (TILE / 2 - 0.02), pz = (d.tz + 0.5) * TILE + n[1] * (TILE / 2 - 0.02);
    const base = new THREE.Matrix4().makeRotationY(Math.atan2(-n[0], -n[1])).setPosition(px, 0, pz);
    const A = (b, geo, c, x, y, z, sx, sy, sz, tile = TEX.WHITE, rx = 0, ry = 0, rz = 0) => b.part(geo, c, x, y, z, sx, sy, sz, rx, ry, rz, tile, base);
    const dark = mul(cMach, 0.45), mid = mul(cMach, 0.8);
    switch (d.type) {
      case 0: // server rack
        A(lit, GEO.box, dark, 0, 1.1, 0.28, 1.1, 2.2, 0.55, TEX.MACH);
        for (let i = 0; i < 5; i++) A(glow, GEO.box, hash2(d.tx * 3 + i, d.tz) > 0.4 ? cAcc : col(0xff5040), -0.35 + (i % 3) * 0.2, 0.5 + i * 0.36, 0.565, 0.07, 0.05, 0.02);
        break;
      case 1: // console
        A(lit, GEO.box, mid, 0, 0.45, 0.35, 1.5, 0.9, 0.7, TEX.MACH);
        A(lit, GEO.box, dark, 0, 1.2, 0.2, 1.3, 0.75, 0.12, TEX.WHITE, -0.25);
        A(glow, GEO.box, cAcc, 0, 1.2, 0.27, 1.14, 0.6, 0.02, TEX.SCREEN, -0.25);
        break;
      case 2: // gas bottles
        A(lit, GEO.cyl8, col(0xd8d8d0), -0.35, 0.85, 0.35, 0.5, 1.7, 0.5);
        A(lit, GEO.cyl8, mul(cAcc, 0.5), 0.3, 0.75, 0.35, 0.5, 1.5, 0.5);
        A(lit, GEO.cyl6, dark, -0.35, 1.8, 0.35, 0.16, 0.25, 0.16);
        A(lit, GEO.cyl6, dark, 0.3, 1.6, 0.35, 0.16, 0.25, 0.16);
        A(lit, GEO.box, dark, 0, 0.9, 0.08, 1.2, 0.08, 0.1);
        break;
      case 3: // pipes
        for (let i = 0; i < 3; i++) A(lit, GEO.cyl6, i === 1 ? mul(cAcc, 0.45) : mid, -0.4 + i * 0.4, H / 2, 0.14, 0.16, H, 0.16);
        A(lit, GEO.box, dark, 0, 1.4, 0.2, 1.2, 0.35, 0.36, TEX.GRATE);
        A(glow, GEO.box, col(0xffc040), 0.42, 1.4, 0.39, 0.08, 0.08, 0.02);
        break;
      case 4: // crates
        A(lit, GEO.box, col(0x9a8660), -0.2, 0.4, 0.5, 0.8, 0.8, 0.8, TEX.CRATE, 0, 0.2);
        A(lit, GEO.box, col(0x7d7460), 0.1, 1.05, 0.45, 0.55, 0.5, 0.55, TEX.CRATE, 0, -0.3);
        break;
      default: // light strip + hazard plate
        A(glow, GEO.box, mul(cAcc, lampOn ? 0.9 : 0.25), 0, 1.9, 0.03, 0.12, 1.5, 0.04);
        A(lit, GEO.box, col(0xd8b020), 0.55, 1.5, 0.03, 0.6, 0.6, 0.04, TEX.HAZARD);
        break;
    }
  }

  const g = toGroup(lit, glow, { world: true, receiveShadow: true });
  g.userData.tris = (lit.count + glow.count) / 3;
  return g;
}
