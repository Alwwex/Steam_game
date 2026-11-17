// Cosmetic hats. Origin = centre of the top of the cat's head. Three are free, twenty come from DLC.
// b.L = lit parts, b.G = glowing parts, b.X = translucent parts, b.SL / b.SG = parts that spin.

import * as THREE from 'three';
import { MeshBuilder, GEO, col, mul, mats, toGroup } from './meshbuilder.js';

const PI = Math.PI;
const rainbow = [0xff3b3b, 0xffd23b, 0x49ff6a, 0x3bd0ff, 0xd45cff];

function hardhat(b, c) {
  b.L.part(GEO.ico1, col(c), 0, 0.02, 0, 0.56, 0.3, 0.5);
  b.L.part(GEO.cyl8, col(c, 0.8), 0, 0.03, -0.06, 0.62, 0.03, 0.62);
  b.L.part(GEO.box, col(c, 0.7), 0, 0.16, 0, 0.08, 0.05, 0.48);
}

export const HATS = {
  hardhat: (b) => hardhat(b, 0xf2c230),
  party: (b) => {
    b.L.part(GEO.cone8, col(0xe8409a), 0, 0.22, 0, 0.26, 0.42, 0.26);
    b.L.part(GEO.cyl8, col(0x3fd0e8), 0, 0.03, 0, 0.3, 0.05, 0.3);
    b.G.part(GEO.ico0, col(0xffe24a), 0, 0.45, 0, 0.09, 0.09, 0.09);
  },
  headlamp: (b) => {
    b.L.part(GEO.box, col(0x2c3038), 0, 0.02, 0, 0.1, 0.04, 0.46);
    b.L.part(GEO.box, col(0x2c3038), 0, 0.07, -0.2, 0.16, 0.13, 0.1);
    b.G.part(GEO.box, col(0xfff1d8), 0, 0.07, -0.255, 0.11, 0.08, 0.02);
  },
  // ---- DLC 01-20
  ushanka: (b) => {
    b.L.part(GEO.box, col(0x6a4a30), 0, 0.09, 0, 0.56, 0.2, 0.48);
    b.L.part(GEO.box, col(0x8a6a48), 0, 0, 0, 0.6, 0.08, 0.52);
    for (const s of [-1, 1]) b.L.part(GEO.box, col(0x8a6a48), s * 0.3, -0.15, 0.02, 0.07, 0.3, 0.3);
    b.G.part(GEO.box, col(0xff3030), 0, 0.1, -0.245, 0.08, 0.08, 0.02);
  },
  prism: (b) => {
    b.L.part(GEO.cyl8, col(0xd9a84a), 0, 0.03, 0, 0.5, 0.06, 0.46);
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      b.G.part(GEO.cone4, col(rainbow[i]), Math.sin(a) * 0.22, 0.2, -Math.cos(a) * 0.2, 0.1, 0.3, 0.1);
    }
  },
  electrode: (b) => {
    b.SL.part(GEO.torus, col(0xd9a84a), 0, 0, 0, 0.5, 0.5, 0.5, PI / 2, 0, 0);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2;
      b.SL.part(GEO.cyl6, col(0x9aa4b0), Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16, 0.03, 0.14, 0.03, 0, -a, PI / 2);
    }
    b.SG.part(GEO.oct, col(0xffe24a), 0, 0, 0, 0.1, 0.1, 0.1);
    return { spinY: 0.3, spin: 2.2 };
  },
  antennas: (b) => {
    b.L.part(GEO.box, col(0x2c3038), 0, 0.02, 0, 0.52, 0.04, 0.08);
    b.L.part(GEO.cyl6, col(0x9aa4b0), -0.12, 0.2, 0, 0.025, 0.36, 0.025, 0, 0, 0.25);
    b.L.part(GEO.cyl6, col(0x9aa4b0), 0.12, 0.2, 0, 0.025, 0.36, 0.025, 0, 0, -0.25);
    b.G.part(GEO.ico0, col(0xff5fb0), -0.165, 0.39, 0, 0.1, 0.1, 0.1);
    b.G.part(GEO.ico0, col(0x6ab0ff), 0.165, 0.39, 0, 0.1, 0.1, 0.1);
  },
  splitmask: (b) => {
    b.L.part(GEO.box, col(0xff8c2a), -0.125, -0.19, -0.235, 0.245, 0.3, 0.03);
    b.L.part(GEO.box, col(0x2ad0ff), 0.125, -0.19, -0.235, 0.245, 0.3, 0.03);
    b.G.part(GEO.box, col(0x2ad0ff), -0.12, -0.18, -0.253, 0.12, 0.035, 0.01);
    b.G.part(GEO.box, col(0xff8c2a), 0.12, -0.18, -0.253, 0.12, 0.035, 0.01);
    b.L.part(GEO.box, col(0xe8e8e8), 0, 0.06, 0, 0.03, 0.14, 0.32);
  },
  drill: (b) => {
    hardhat(b, 0xffd21f);
    b.L.part(GEO.cone8, col(0x9aa4b0), 0, 0.1, -0.42, 0.22, 0.36, 0.22, -PI / 2, 0, 0);
    b.L.part(GEO.torus, col(0x4a5058), 0, 0.1, -0.34, 0.2, 0.2, 0.3);
    b.L.part(GEO.torus, col(0x4a5058), 0, 0.1, -0.46, 0.12, 0.12, 0.3);
    b.G.part(GEO.box, col(0xff5030), 0.2, 0.08, -0.22, 0.06, 0.06, 0.03);
  },
  bubble: (b) => {
    b.X.part(GEO.ico1, [0.45, 0.75, 0.85], 0, -0.18, 0, 0.92, 0.9, 0.9);
    b.L.part(GEO.cyl8, col(0xc8ccd2), 0, -0.43, 0, 0.62, 0.07, 0.58);
    b.G.part(GEO.box, col(0x8affc8), 0.3, -0.43, 0, 0.05, 0.05, 0.05);
  },
  question: (b) => {
    const c = col(0xd6ff4a);
    b.SG.part(GEO.box, c, 0, 0.2, 0, 0.2, 0.06, 0.06);
    b.SG.part(GEO.box, c, -0.1, 0.16, 0, 0.06, 0.08, 0.06);
    b.SG.part(GEO.box, c, 0.1, 0.13, 0, 0.06, 0.14, 0.06);
    b.SG.part(GEO.box, c, 0.04, 0.05, 0, 0.12, 0.06, 0.06);
    b.SG.part(GEO.box, c, 0, -0.02, 0, 0.06, 0.1, 0.06);
    b.SG.part(GEO.box, c, 0, -0.15, 0, 0.07, 0.07, 0.07);
    return { spinY: 0.34, spin: 1.6 };
  },
  flame: (b) => {
    const hs = [0.2, 0.3, 0.38, 0.28, 0.18], cs = [0xffe24a, 0xffb02a, 0xff6a1f, 0xff4a1a, 0xd8301a];
    for (let i = 0; i < 5; i++) b.G.part(GEO.cone4, col(cs[i]), 0, hs[i] / 2, -0.17 + i * 0.085, 0.13, hs[i], 0.13);
  },
  hood: (b) => {
    b.L.part(GEO.box, col(0xf0f2f4), 0, -0.08, 0.06, 0.58, 0.34, 0.4);
    b.L.part(GEO.box, col(0xf0f2f4), 0, 0.1, 0, 0.5, 0.1, 0.44);
    b.L.part(GEO.box, col(0x5aa8e8), 0, -0.24, 0.06, 0.6, 0.04, 0.42);
    b.L.part(GEO.box, col(0x9ad0f0), 0, -0.31, -0.23, 0.3, 0.14, 0.03);
  },
  cardbox: (b) => {
    const c = col(0xa98a5c);
    b.L.part(GEO.box, c, 0, 0.12, 0, 0.62, 0.36, 0.56);
    b.L.part(GEO.box, mul(c, 0.8), -0.2, 0.34, 0, 0.3, 0.02, 0.56, 0, 0, 0.5);
    b.L.part(GEO.box, mul(c, 0.8), 0.2, 0.34, 0, 0.3, 0.02, 0.56, 0, 0, -0.5);
    b.G.part(GEO.box, col(0xc58aff), 0, 0.16, -0.285, 0.06, 0.14, 0.01);
    b.G.part(GEO.box, col(0xc58aff), 0, 0.04, -0.285, 0.06, 0.05, 0.01);
  },
  droplet: (b) => {
    const c = [0.2, 0.62, 0.85];
    b.G.part(GEO.ico1, c, 0, 0.14, 0, 0.32, 0.28, 0.32);
    b.G.part(GEO.cone8, c, 0, 0.38, 0, 0.26, 0.3, 0.26);
    b.G.part(GEO.box, [0.8, 0.95, 1], -0.07, 0.2, -0.13, 0.05, 0.08, 0.02);
  },
  mobius: (b) => {
    b.SG.part(GEO.torusThin, col(0x3dffb0), 0, 0, 0, 0.5, 0.5, 0.5, PI / 2, 0, 0.4);
    b.SG.part(GEO.torusThin, col(0xd8c8ff), 0, 0, 0, 0.5, 0.5, 0.5, 0.3, 0, PI / 2);
    return { spinY: 0.32, spin: 2.2 };
  },
  parity: (b) => {
    const c = col(0xffae1f);
    b.L.part(GEO.box, col(0x3a3528), 0, 0.06, 0, 0.52, 0.14, 0.46);
    b.L.part(GEO.box, col(0x2a261d), 0, 0.0, -0.3, 0.4, 0.03, 0.2);
    b.G.part(GEO.box, c, -0.15, 0.06, -0.235, 0.03, 0.09, 0.02);
    b.G.part(GEO.box, c, 0.15, 0.06, -0.235, 0.03, 0.09, 0.02);
    b.G.part(GEO.box, c, 0, 0.1, -0.235, 0.09, 0.025, 0.02);
    b.G.part(GEO.box, c, 0, 0.02, -0.235, 0.09, 0.025, 0.02);
    b.G.part(GEO.box, c, -0.035, 0.06, -0.235, 0.025, 0.09, 0.02);
    b.G.part(GEO.box, c, 0.035, 0.06, -0.235, 0.025, 0.09, 0.02);
  },
  mohawk: (b) => {
    const hs = [0.18, 0.26, 0.32, 0.36, 0.32, 0.26, 0.18];
    for (let i = 0; i < 7; i++) {
      const z = -0.18 + i * 0.06;
      b.L.part(GEO.box, col(0x1a2030), 0, hs[i] / 2, z, 0.035, hs[i], 0.035);
      b.G.part(GEO.box, col(0x2a9dff), 0, hs[i] + 0.02, z, 0.05, 0.05, 0.05);
    }
  },
  hourglass: (b) => {
    b.SG.part(GEO.cone8, col(0xffd45a), 0, 0.1, 0, 0.2, 0.2, 0.2, PI, 0, 0);
    b.SG.part(GEO.cone8, col(0xffd45a, 0.6), 0, -0.1, 0, 0.2, 0.2, 0.2);
    for (const s of [-1, 1]) {
      b.SL.part(GEO.cyl8, col(0x7a5230), 0, s * 0.21, 0, 0.27, 0.03, 0.27);
      b.SL.part(GEO.cyl6, col(0x7a5230), s * 0.11, 0, 0, 0.02, 0.42, 0.02);
    }
    return { spinY: 0.3, spin: 1 };
  },
  disco: (b) => {
    b.L.part(GEO.cyl6, col(0x9aa4b0), 0, 0.06, 0, 0.02, 0.12, 0.02);
    b.SL.part(GEO.ico1, [0.6, 0.63, 0.7], 0, 0, 0, 0.34, 0.34, 0.34);
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4, y = -0.12 + (i % 5) * 0.06, r = Math.sqrt(Math.max(0, 0.03 - y * y)) + 0.005;
      b.SG.part(GEO.box, col(rainbow[i % 5]), Math.cos(a) * r, y, Math.sin(a) * r, 0.05, 0.05, 0.05, 0, -a, 0);
    }
    return { spinY: 0.3, spin: 2.6 };
  },
  diver: (b) => {
    const brass = col(0xb8873a);
    b.L.part(GEO.cyl8, brass, 0, -0.4, 0, 0.64, 0.1, 0.6);
    b.L.part(GEO.ico1, brass, 0, -0.08, 0, 0.66, 0.62, 0.62);
    b.L.part(GEO.cyl6, mul(brass, 0.7), 0, 0.27, 0, 0.1, 0.1, 0.1);
    b.L.part(GEO.torus, mul(brass, 0.7), 0, -0.14, -0.3, 0.26, 0.26, 0.4);
    b.G.part(GEO.cyl8, [0.3, 0.7, 0.8], 0, -0.14, -0.305, 0.2, 0.02, 0.2, PI / 2, 0, 0);
    for (const s of [-1, 1]) b.G.part(GEO.cyl8, [0.2, 0.5, 0.6], s * 0.325, -0.1, 0, 0.14, 0.02, 0.14, 0, 0, PI / 2);
  },
  visor: (b) => {
    b.L.part(GEO.box, col(0x2c3038), 0, -0.185, 0, 0.52, 0.045, 0.44);
    b.G.part(GEO.box, col(0x39ff7a), 0, -0.185, -0.235, 0.54, 0.075, 0.04);
    for (const s of [-1, 1]) b.L.part(GEO.cyl6, col(0x4a5058), s * 0.28, -0.185, -0.08, 0.08, 0.1, 0.08, 0, 0, PI / 2);
    b.G.part(GEO.box, col(0x39ff7a), 0.2, 0.15, 0, 0.012, 0.3, 0.012);
    b.G.part(GEO.box, col(0xd0ffe0), 0.2, 0.31, 0, 0.04, 0.04, 0.04);
  },
  accretion: (b) => {
    b.SL.part(GEO.ico1, [0.01, 0.01, 0.015], 0, 0, 0, 0.2, 0.2, 0.2);
    b.SG.part(GEO.torus, col(0xff7a2a), 0, 0, 0, 0.44, 0.44, 0.44, PI / 2 + 0.35, 0, 0);
    b.SG.part(GEO.torusThin, col(0xffd0a0), 0, 0, 0, 0.62, 0.62, 0.62, PI / 2 + 0.35, 0, 0);
    return { spinY: 0.36, spin: 3 };
  },
};

export const FREE_HATS = ['none', 'hardhat', 'party', 'headlamp'];

export function makeHat(key) {
  const f = HATS[key];
  if (!f) return null;
  const b = { L: new MeshBuilder(), G: new MeshBuilder(), X: new MeshBuilder(), SL: new MeshBuilder(), SG: new MeshBuilder() };
  const meta = f(b) || {};
  const g = toGroup(b.L, b.G);
  if (b.X.count) g.add(new THREE.Mesh(b.X.build(), mats().ghost));
  if (b.SL.count || b.SG.count) {
    const s = toGroup(b.SL, b.SG);
    s.position.y = meta.spinY || 0;
    g.add(s);
    g.userData.spin = meta.spin || 1.5;
    g.userData.spinNode = s;
  }
  return g;
}
