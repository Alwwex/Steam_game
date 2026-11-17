// All textures are painted in code at 32x32 so the game ships with zero external art files
// (nothing to license) and keeps a chunky, hand-pixelled look.

import * as THREE from 'three';
import { mulberry32 } from './rng.js';

const TS = 32, COLS = 4, ROWS = 4;
export const TEX = { WALL: 0, FLOOR: 1, CEIL: 2, MACH: 3, HAZARD: 4, GRATE: 5, NOISE: 6, TRIM: 7, SCREEN: 8, CRATE: 9, WHITE: 10, PANEL: 11, FLOOR2: 12 };

export function uvRect(tile) {
  const u0 = (tile % COLS) / COLS, v0 = 1 - (Math.floor(tile / COLS) + 1) / ROWS;
  const e = 0.5 / (TS * COLS);
  return [u0 + e, v0 + e, u0 + 1 / COLS - e, v0 + 1 / ROWS - e];
}

function finish(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export function makeAtlas() {
  const c = document.createElement('canvas'); c.width = TS * COLS; c.height = TS * ROWS;
  const g = c.getContext('2d');
  const rnd = mulberry32(90210);
  const fill = (tile, fn) => {
    const ox = (tile % COLS) * TS, oy = Math.floor(tile / COLS) * TS;
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const s = Math.max(0, Math.min(255, Math.round(fn(x, y) * 255)));
      g.fillStyle = `rgb(${s},${s},${s})`; g.fillRect(ox + x, oy + y, 1, 1);
    }
  };
  const n = (a) => (rnd() - 0.5) * a;

  fill(TEX.WALL, (x, y) => {
    const sx = x % 16, sy = y % 16;
    if (sx === 0 || sy === 0) return 0.42;
    if (sx === 1 || sy === 1) return 0.95 + n(0.04);
    if ((sx === 3 || sx === 13) && (sy === 3 || sy === 13)) return 0.5;
    return 0.8 + n(0.1);
  });
  fill(TEX.FLOOR, (x, y) => {
    if (x === 0 || y === 0) return 0.4;
    if (x === 31 || y === 31) return 0.55;
    return 0.82 + n(0.14) - (rnd() < 0.03 ? 0.25 : 0);
  });
  fill(TEX.FLOOR2, (x, y) => {
    const a = ((x >> 3) + (y >> 3)) & 1;
    if (x % 8 === 0 || y % 8 === 0) return 0.45;
    return (a ? 0.9 : 0.72) + n(0.08);
  });
  fill(TEX.CEIL, (x, y) => {
    if (x % 16 === 0 || y % 16 === 0) return 0.5;
    if (x % 4 === 2 && y % 4 === 2) return 0.55;
    return 0.8 + n(0.06);
  });
  fill(TEX.MACH, (x, y) => {
    if (x < 2 || y < 2 || x > 29 || y > 29) return 0.5;
    if (y > 5 && y < 14 && x > 4 && x < 27) return y % 2 ? 0.35 : 0.7;      // vent slats
    if (y > 18 && y < 27 && x > 4 && x < 14) return 0.3 + n(0.05);            // dark panel
    if (y > 19 && y < 26 && x > 17 && x < 27 && (x + y) % 3 === 0) return 1;  // rivets
    return 0.85 + n(0.08);
  });
  fill(TEX.HAZARD, (x, y) => (((x + y) >> 3) & 1 ? 1 : 0.18) + n(0.05));
  fill(TEX.GRATE, (x, y) => (x % 4 < 2 && y % 4 < 2 ? 0.2 : 0.75 + n(0.08)));
  fill(TEX.NOISE, () => 0.75 + n(0.4));
  fill(TEX.TRIM, (x, y) => {
    if (y < 3) return 1;
    if (y < 5) return 0.4;
    if (x % 16 === 0) return 0.45;
    return 0.75 + n(0.1);
  });
  fill(TEX.SCREEN, (x, y) => {
    if (x < 2 || y < 2 || x > 29 || y > 29) return 0.15;
    if (y % 4 === 1) return 0.25;
    const line = (y >> 2), len = 6 + ((line * 7919) % 17);
    return x > 3 && x < 3 + len ? 1 : 0.3;
  });
  fill(TEX.CRATE, (x, y) => {
    if (x < 2 || y < 2 || x > 29 || y > 29) return 0.5;
    if (Math.abs(x - y) < 2 || Math.abs(x + y - 31) < 2) return 0.55;
    return 0.85 + n(0.1);
  });
  fill(TEX.WHITE, () => 1);
  fill(TEX.PANEL, (x, y) => {
    if (x % 32 === 0 || y % 32 === 0) return 0.5;
    if (y > 12 && y < 20) return 0.62 + n(0.05);
    return 0.86 + n(0.07);
  });
  return finish(c, false);
}

// Scrolling chevrons for conveyor belts.
export function makeChevronTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#fff';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = (y + Math.abs(x - 7.5)) % 8;
    if (d < 2.5) g.fillRect(x, y, 1, 1);
  }
  return finish(c, true);
}

// Soft noise used by energy barriers, portals and water.
export function makeEnergyTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  const rnd = mulberry32(777);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = 0.35 + 0.35 * Math.sin((x + y) * 0.6) * Math.cos((x - y) * 0.35) + rnd() * 0.3;
    const s = Math.max(0, Math.min(255, Math.round(v * 255)));
    g.fillStyle = `rgb(${s},${s},${s})`; g.fillRect(x, y, 1, 1);
  }
  return finish(c, true);
}

// Text label rendered to a small canvas (player names, signs).
export function makeLabelTexture(text, color = '#ffffff', bg = null) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = 'bold 20px monospace';
  const w = Math.min(256, Math.ceil(g.measureText(text).width) + 12);
  c.width = w; c.height = 28;
  const g2 = c.getContext('2d');
  if (bg) { g2.fillStyle = bg; g2.fillRect(0, 0, w, 28); }
  g2.font = 'bold 20px monospace'; g2.textBaseline = 'middle'; g2.textAlign = 'center';
  g2.fillStyle = '#000'; g2.fillText(text, w / 2 + 1, 15, w - 6);
  g2.fillStyle = color; g2.fillText(text, w / 2, 14, w - 6);
  const t = finish(c, false);
  t.userData = { aspect: w / 28 };
  return t;
}
