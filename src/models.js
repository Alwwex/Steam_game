// Every 3D model in the game is assembled from low-poly primitives here.

import * as THREE from 'three';
import { WALL_H } from './config.js';
import { MeshBuilder, GEO, col, mul, mix, mats, toGroup } from './meshbuilder.js';
import { makeLabelTexture } from './textures.js';
import { makeHat } from './hats.js';
import { hash2 } from './rng.js';

const PI = Math.PI;
export const FURS = [0xe08a3c, 0x8a8f98, 0x34343c, 0xe8e4dc, 0xd8c0a0, 0x6b4a2e];

export function makeGhostly(obj, colorMul) {
  obj.traverse((o) => { if (o.isMesh) { o.material = mats().ghost; o.castShadow = false; } });
  return obj;
}

// ------------------------------------------------------------------ crew (lab cats)

export function makeCat(opts) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(1.1); root.add(body);
  const suit = col(opts.suit), suitD = mul(suit, 0.55), fur = col(opts.fur), furL = mix(fur, [1, 1, 1], 0.4);
  const dark = col(0x23262c), pink = col(0xf09aa8), white = [1, 1, 1];

  let L = new MeshBuilder(), G = new MeshBuilder();
  L.part(GEO.box, suit, 0, 0.56, 0, 0.44, 0.46, 0.32);
  L.part(GEO.box, dark, 0, 0.35, 0, 0.46, 0.07, 0.34);
  L.part(GEO.box, suitD, 0, 0.76, 0, 0.36, 0.08, 0.3);
  L.part(GEO.box, col(0x7c838c), 0, 0.6, 0.23, 0.3, 0.36, 0.16);
  L.part(GEO.cyl8, col(0xc8ccd2), 0, 0.6, 0.33, 0.13, 0.34, 0.13);
  G.part(GEO.box, col(0x46e3ff), 0.1, 0.66, -0.165, 0.08, 0.05, 0.02);
  G.part(GEO.box, col(0x46e3ff), 0, 0.72, 0.4, 0.05, 0.05, 0.03);
  body.add(toGroup(L, G));

  const head = new THREE.Group(); head.position.set(0, 0.8, 0); body.add(head);
  L = new MeshBuilder(); G = new MeshBuilder();
  L.part(GEO.box, fur, 0, 0.21, 0, 0.5, 0.4, 0.42);
  L.part(GEO.box, furL, 0, 0.12, -0.215, 0.22, 0.12, 0.06);
  L.part(GEO.box, pink, 0, 0.17, -0.25, 0.06, 0.04, 0.03);
  for (const s of [-1, 1]) {
    L.part(GEO.cone4, fur, s * 0.16, 0.5, 0.03, 0.2, 0.22, 0.16, 0, PI / 4, 0);
    L.part(GEO.cone4, pink, s * 0.16, 0.48, -0.01, 0.11, 0.14, 0.08, 0, PI / 4, 0);
    L.part(GEO.box, white, s * 0.21, 0.13, -0.23, 0.17, 0.012, 0.012, 0, 0, s * 0.18);
    L.part(GEO.box, white, s * 0.21, 0.1, -0.23, 0.17, 0.012, 0.012, 0, 0, -s * 0.1);
    L.part(GEO.cyl8, dark, s * 0.115, 0.36, -0.2, 0.14, 0.06, 0.14, PI / 2, 0, 0);
    G.part(GEO.cyl8, [0.2, 0.55, 0.65], s * 0.115, 0.36, -0.233, 0.095, 0.01, 0.095, PI / 2, 0, 0);
  }
  L.part(GEO.box, dark, 0, 0.355, 0, 0.52, 0.055, 0.44);
  head.add(toGroup(L, G));

  // Eyes are separate so they can blink. Bright, so the crew is visible in the dark.
  const eb = new MeshBuilder(), ep = new MeshBuilder();
  for (const s of [-1, 1]) {
    eb.part(GEO.box, col(0xc8ff66), s * 0.115, 0, -0.214, 0.1, 0.11, 0.02);
    ep.part(GEO.box, dark, s * 0.115, 0, -0.226, 0.028, 0.095, 0.01);
  }
  const eyes = toGroup(ep, eb, { castShadow: false }); eyes.position.y = 0.225; head.add(eyes);

  const hatSlot = new THREE.Group(); hatSlot.position.set(0, 0.41, 0); head.add(hatSlot);

  const mkArm = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.285, 0.74, 0);
    const b = new MeshBuilder(), gl = new MeshBuilder();
    b.part(GEO.box, suit, 0, -0.15, 0, 0.12, 0.32, 0.13);
    b.part(GEO.box, fur, 0, -0.34, 0, 0.11, 0.08, 0.12);
    if (side > 0) {
      b.part(GEO.cyl8, dark, 0, -0.45, 0, 0.11, 0.2, 0.11);
      gl.part(GEO.cyl8, col(0xfff1d8), 0, -0.555, 0, 0.09, 0.02, 0.09);
    }
    g.add(toGroup(b, gl)); body.add(g); return g;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // Visible light cone so team-mates can see where everybody is pointing.
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 7, 10, 1, true), new THREE.MeshBasicMaterial({
    color: 0xfff1d8, transparent: true, opacity: 0.012, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  beam.position.y = -0.56 - 3.5; armR.add(beam);

  const mkLeg = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.12, 0.32, 0);
    const b = new MeshBuilder();
    b.part(GEO.box, suit, 0, -0.12, 0, 0.15, 0.24, 0.17);
    b.part(GEO.box, dark, 0, -0.275, -0.02, 0.16, 0.09, 0.21);
    g.add(toGroup(b, null)); body.add(g); return g;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  const tail = new THREE.Group(); tail.position.set(0, 0.36, 0.16); body.add(tail);
  L = new MeshBuilder();
  L.part(GEO.box, fur, 0, 0.04, 0.1, 0.08, 0.08, 0.24, 0.4);
  L.part(GEO.box, fur, 0, 0.17, 0.2, 0.075, 0.24, 0.075, -0.25);
  L.part(GEO.box, mul(fur, 0.6), 0, 0.33, 0.18, 0.07, 0.14, 0.07, 0.3);
  tail.add(toGroup(L, null));

  const cat = {
    group: root, head, armL, armR, legL, legR, tail, eyes, hatSlot, beam,
    phase: 0, blink: 2 + Math.random() * 3, hatKey: null, hat: null, bodyNode: body,
    setHat(key) {
      if (key === cat.hatKey) return;
      if (cat.hat) { hatSlot.remove(cat.hat); cat.hat.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); cat.hat = null; }
      cat.hatKey = key;
      if (key && key !== 'none') { cat.hat = makeHat(key); if (cat.hat) hatSlot.add(cat.hat); }
    },
    // speed in m/s, pitch in radians (positive = looking up)
    update(dt, speed, pitch, t, lightOn = true) {
      const k = Math.min(1, speed / 3);
      cat.phase += dt * (4 + speed * 1.6) * (k > 0.05 ? 1 : 0);
      const sw = Math.sin(cat.phase) * 0.75 * k;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.8;
      armR.rotation.x = 1.45 + pitch * 0.9;
      body.position.y = Math.abs(Math.sin(cat.phase)) * 0.05 * k;
      head.rotation.x = pitch * 0.55;
      tail.rotation.y = Math.sin(t * 2.3 + cat.blink) * 0.5;
      tail.rotation.x = Math.sin(t * 1.3) * 0.15 - k * 0.3;
      cat.blink -= dt;
      eyes.scale.y = cat.blink < 0.12 ? 0.12 : 1;
      if (cat.blink < 0) cat.blink = 2 + Math.random() * 4;
      beam.visible = lightOn;
      if (cat.hat && cat.hat.userData.spin) cat.hat.userData.spinNode.rotation.y += dt * cat.hat.userData.spin;
    },
    dispose() {
      root.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
      beam.material.dispose();
      if (root.parent) root.parent.remove(root);
    },
  };
  cat.setHat(opts.hat || null);
  return cat;
}

export function makeNameTag(name, color = '#ffffff') {
  const tex = makeLabelTexture(name, color);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
  mat.userData.ownMap = true;
  const s = new THREE.Sprite(mat);
  s.scale.set(0.24 * tex.userData.aspect, 0.24, 1);
  return s;
}

// ------------------------------------------------------------------ qubits (Bloch spheres)

export const QCOL = [0x46e3ff, 0xffd24a, 0xff5fd0];   // normal, valuable, entangled
let _q = null;
function qShared() {
  if (_q) return _q;
  const edge = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.36, 1));
  const core = new THREE.IcosahedronGeometry(0.17, 0);
  const arrow = new THREE.ConeGeometry(0.05, 0.3, 4); arrow.translate(0, 0.17, 0);
  for (const g of [edge, core, arrow]) g.userData.shared = true;
  const sh = (m) => { m.userData.shared = true; return m; };
  _q = { edge, core, arrow, real: [], ghost: [], white: sh(new THREE.MeshBasicMaterial({ color: 0xffffff })) };
  for (const c of QCOL) {
    _q.real.push({ line: sh(new THREE.LineBasicMaterial({ color: c })), core: sh(new THREE.MeshBasicMaterial({ color: c })) });
    _q.ghost.push({
      line: sh(new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })),
      core: sh(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })),
    });
  }
  return _q;
}

export function makeQubit(kind, ghost) {
  const S = qShared(), m = (ghost ? S.ghost : S.real)[kind];
  const g = new THREE.Group();
  const shell = new THREE.LineSegments(S.edge, m.line);
  const core = new THREE.Mesh(S.core, m.core);
  const pivot = new THREE.Group();
  if (!ghost) pivot.add(new THREE.Mesh(S.arrow, S.white));
  g.add(shell, core, pivot);
  g.userData = { shell, core, pivot, ghost, kind };
  return g;
}

export function animQubit(g, t, seed) {
  const u = g.userData;
  u.shell.rotation.y = t * 0.9 + seed; u.shell.rotation.x = t * 0.5;
  u.pivot.rotation.set(Math.sin(t * 1.7 + seed) * 1.2, t * 2.1, Math.cos(t * 1.3 + seed) * 1.2);
  if (u.ghost) {
    const f = hash2(Math.floor(t * 14), (seed * 97) | 0);
    g.visible = f > 0.22;
    g.scale.setScalar(0.9 + f * 0.35);
  } else g.scale.setScalar(1 + Math.sin(t * 4 + seed) * 0.06);
}

// ------------------------------------------------------------------ the quantum core (cryostat)

export function makeCore(pal) {
  const g = new THREE.Group();
  const L = new MeshBuilder(), G = new MeshBuilder();
  const gold = col(0xd9a84a), copper = col(0xc87840), steel = col(0x596270), dark = col(0x22262c), acc = col(pal.accent);
  L.part(GEO.cyl12, steel, 0, WALL_H - 0.08, 0, 2.2, 0.16, 2.2);
  const ys = [3.05, 2.65, 2.3, 2.0, 1.75], rs = [1.9, 1.6, 1.3, 1.0, 0.76];
  for (let i = 0; i < ys.length; i++) {
    L.part(GEO.cyl12, gold, 0, ys[i], 0, rs[i], 0.07, rs[i]);
    if (i < ys.length - 1) L.part(GEO.torus, copper, 0, (ys[i] + ys[i + 1]) / 2, 0, rs[i + 1] * 0.8, rs[i + 1] * 0.8, 1.2, PI / 2, 0, 0);
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2;
    L.part(GEO.cyl6, gold, Math.cos(a) * 0.72, 2.95, Math.sin(a) * 0.72, 0.05, 1.0, 0.05);
    L.part(GEO.cyl6, steel, Math.cos(a + 0.5) * 0.3, 2.5, Math.sin(a + 0.5) * 0.3, 0.04, 2.0, 0.04);
  }
  L.part(GEO.cyl8, gold, 0, 1.5, 0, 0.42, 0.34, 0.42);
  L.part(GEO.cyl8, copper, 0, 1.3, 0, 0.26, 0.08, 0.26);
  G.part(GEO.box, acc, 0, 1.23, 0, 0.2, 0.04, 0.2);
  // floor pedestal
  L.part(GEO.cyl8, dark, 0, 0.13, 0, 2.6, 0.26, 2.6);
  L.part(GEO.cyl8, steel, 0, 0.3, 0, 1.6, 0.1, 1.6);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * PI * 2;
    L.part(GEO.box, i % 2 ? col(0xe8c020) : dark, Math.cos(a) * 1.18, 0.27, Math.sin(a) * 1.18, 0.5, 0.04, 0.26, 0, -a + PI / 2, 0);
  }
  G.part(GEO.cyl8, mul(acc, 0.7), 0, 0.37, 0, 0.5, 0.04, 0.5);
  const body = toGroup(L, G, { receiveShadow: true });
  g.add(body);

  // Progress ring: segments light up as qubits are delivered.
  const segGeo = new THREE.BoxGeometry(0.22, 0.05, 0.1);
  const on = new THREE.MeshBasicMaterial({ color: pal.accent }), off = new THREE.MeshBasicMaterial({ color: 0x1b2026 });
  const segs = [];
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * PI * 2, m = new THREE.Mesh(segGeo, off);
    m.position.set(Math.sin(a) * 1.42, 0.3, -Math.cos(a) * 1.42); m.rotation.y = -a;
    g.add(m); segs.push(m);
  }
  // Delivery beam between the floor pad and the chip.
  const beamMat = new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.9, 6, 1, true), beamMat);
  beam.position.y = 0.8; g.add(beam);

  // "RUN" button on its own pedestal.
  const bL = new MeshBuilder();
  bL.part(GEO.box, steel, 0, 0.45, 0, 0.4, 0.9, 0.4);
  bL.part(GEO.box, dark, 0, 0.93, 0, 0.5, 0.08, 0.5);
  const ped = toGroup(bL, null); ped.position.set(1.95, 0, 1.95); g.add(ped);
  const btnMat = new THREE.MeshBasicMaterial({ color: 0x5a1010 });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.08, 8), btnMat);
  btn.position.set(1.95, 1.01, 1.95); g.add(btn);

  return {
    group: g, button: { x: 1.95, z: 1.95 }, pulse: 0,
    setProgress(f) { const n = Math.round(Math.min(1, f) * 24); for (let i = 0; i < 24; i++) segs[i].material = i < n ? on : off; },
    setReady(r, t) { btnMat.color.setHex(r ? (Math.sin(t * 6) > 0 ? 0x40ff70 : 0x1a8a38) : 0x5a1010); },
    update(dt) { this.pulse = Math.max(0, this.pulse - dt * 1.6); beamMat.opacity = this.pulse * 0.8; },
    dispose() { segGeo.dispose(); on.dispose(); off.dispose(); beamMat.dispose(); beam.geometry.dispose(); btnMat.dispose(); btn.geometry.dispose(); },
  };
}

// ------------------------------------------------------------------ anomalies

const SHARDS = [
  [0, 0.26, 0, 0.5, 0.5, 0.4], [0.04, 0.72, 0, 0.42, 0.44, 0.36], [-0.03, 1.12, 0.02, 0.56, 0.4, 0.42],
  [0.02, 1.52, 0, 0.38, 0.42, 0.34], [0, 1.93, 0, 0.6, 0.36, 0.46], [0.44, 1.42, 0, 0.2, 0.52, 0.22],
  [-0.44, 1.42, 0, 0.2, 0.52, 0.22], [0.52, 0.92, 0, 0.13, 0.56, 0.13], [-0.52, 0.92, 0, 0.13, 0.56, 0.13],
  [0.2, 2.36, 0.05, 0.2, 0.2, 0.2], [-0.24, 2.5, -0.04, 0.14, 0.14, 0.14],
];

// The Lurker: a totem of dark shards. Unobserved it smears into ghost copies; observed it locks solid.
export function makeLurker() {
  const g = new THREE.Group();
  const shards = [];
  const all = new MeshBuilder();
  SHARDS.forEach((s, i) => {
    const c = col(i % 3 === 0 ? 0x2a1838 : i % 3 === 1 ? 0x1c1226 : 0x38204a);
    const b = new MeshBuilder(); b.part(GEO.box, c, 0, 0, 0, s[3], s[4], s[5]);
    const m = toGroup(b, null); m.position.set(s[0], s[1], s[2]);
    g.add(m); shards.push(m);
    all.part(GEO.box, col(0xff2bd0, 0.5), s[0], s[1], s[2], s[3], s[4], s[5]);
  });
  const spineB = new MeshBuilder(); spineB.part(GEO.box, col(0xff2bd0, 0.6), 0, 1.05, 0, 0.1, 1.7, 0.1);
  g.add(toGroup(null, spineB));
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2bd0 });
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.04), eyeMat); eye.position.set(0, 1.95, -0.24); g.add(eye);
  const ghostGeo = all.build();
  const ghosts = [];
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(ghostGeo, mats().ghost); g.add(m); ghosts.push(m); }
  let lock = 0;
  return {
    group: g,
    update(dt, t, observed, frac, seed) {
      lock += ((observed ? 1 : 0) - lock) * Math.min(1, dt * 14);
      const amp = (1 - lock) * 0.09 + 0.006;
      for (let i = 0; i < shards.length; i++) {
        const s = SHARDS[i], m = shards[i], f = t * 9 + i * 1.7 + seed;
        m.position.set(s[0] + Math.sin(f) * amp, s[1] + Math.sin(f * 1.3 + 2) * amp, s[2] + Math.cos(f * 0.9) * amp);
        m.rotation.set(Math.sin(f * 0.7) * amp * 3, Math.cos(f * 0.5) * amp * 3, 0);
      }
      g.scale.set(1, 1 - 0.3 * frac, 1);
      eyeMat.color.setHex(observed ? 0xffffff : 0xff2bd0);
      for (let i = 0; i < 2; i++) {
        const m = ghosts[i], side = i ? 1 : -1;
        m.visible = !observed && hash2(Math.floor(t * 16) + i * 31, seed | 0) > 0.3;
        m.position.set(side * (0.45 + 0.4 * Math.sin(t * 3.1 + i + seed)), 0, 0.3 * Math.sin(t * 2.3 + i * 2));
      }
    },
    dispose() { g.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); eyeMat.dispose(); if (g.parent) g.parent.remove(g); },
  };
}

// The Drifter: a slow cloud of decoherence that floats through walls.
export function makeDrifter() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xb6ff8a, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false });
  const blobs = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(GEO.ico0, mat); g.add(m); blobs.push(m);
  }
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xeaffd0, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(GEO.oct, coreMat); core.scale.setScalar(0.5); core.position.y = 1.4; g.add(core);
  return {
    group: g,
    update(dt, t, seed) {
      for (let i = 0; i < blobs.length; i++) {
        const a = t * (0.4 + i * 0.07) + i * 2.1 + seed, r = 0.6 + (i % 4) * 0.55;
        blobs[i].position.set(Math.cos(a) * r, 1.3 + Math.sin(a * 1.7 + i) * 0.8, Math.sin(a) * r);
        blobs[i].scale.setScalar(1.6 + Math.sin(t * 1.9 + i) * 0.5);
        blobs[i].rotation.set(a, a * 0.7, 0);
      }
      core.rotation.y = t * 2; core.rotation.x = t * 1.3;
    },
    dispose() { mat.dispose(); coreMat.dispose(); if (g.parent) g.parent.remove(g); },
  };
}

// The Mite: a small thief that tunnels through walls and steals carried qubits.
export function makeMite() {
  const g = new THREE.Group();
  const L = new MeshBuilder(), G = new MeshBuilder();
  L.part(GEO.oct, col(0x1f6a66), 0, 0, 0, 0.5, 0.42, 0.6);
  L.part(GEO.cone4, col(0x15403e), 0, 0.02, 0.36, 0.2, 0.36, 0.2, PI / 2 + 0.3, 0, 0);
  G.part(GEO.box, col(0xffe24a), 0.09, 0.06, -0.24, 0.07, 0.07, 0.03);
  G.part(GEO.box, col(0xffe24a), -0.09, 0.06, -0.24, 0.07, 0.07, 0.03);
  const body = toGroup(L, G); g.add(body);
  const ringB = new MeshBuilder(); ringB.part(GEO.torusThin, col(0x40ffd0), 0, 0, 0, 0.9, 0.9, 0.9, PI / 2, 0, 0);
  const ring = toGroup(null, ringB); g.add(ring);
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const b = new MeshBuilder(); b.part(GEO.box, col(0x15403e), 0, -0.16, 0, 0.04, 0.32, 0.04);
    const m = toGroup(b, null); const a = i / 3 * PI * 2;
    m.position.set(Math.cos(a) * 0.16, -0.12, Math.sin(a) * 0.16); g.add(m); legs.push(m);
  }
  const loot = makeQubit(0, false); loot.scale.setScalar(0.6); loot.position.y = 0.5; loot.visible = false; g.add(loot);
  return {
    group: g, loot,
    update(dt, t, seed, carrying) {
      body.position.y = 0.95 + Math.sin(t * 5 + seed) * 0.08; ring.position.y = body.position.y; loot.position.y = body.position.y + 0.5;
      ring.rotation.y = t * 6; ring.rotation.z = Math.sin(t * 2) * 0.4;
      for (let i = 0; i < 3; i++) { legs[i].position.y = body.position.y - 0.12; legs[i].rotation.x = Math.sin(t * 12 + i * 2) * 0.6; }
      loot.visible = !!carrying;
    },
    dispose() { g.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); if (g.parent) g.parent.remove(g); },
  };
}

// ------------------------------------------------------------------ small props

export function makePing(color = 0xffe24a) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false, fog: false });
  const d = new THREE.Mesh(GEO.oct, mat); d.scale.set(0.3, 0.45, 0.3); d.position.y = 0.5; d.renderOrder = 10; g.add(d);
  const beam = new THREE.Mesh(GEO.cyl6, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.scale.set(0.06, 3, 0.06); beam.position.y = 1.5; g.add(beam);
  g.userData = { d, mats: [mat, beam.material] };
  return g;
}

// Mystery box for the Schrödinger sector.
export function makeBox() {
  const L = new MeshBuilder(), G = new MeshBuilder();
  const c = col(0xa98a5c);
  L.part(GEO.box, c, 0, 0.35, 0, 0.9, 0.7, 0.9);
  L.part(GEO.box, mul(c, 0.7), 0, 0.72, 0, 0.96, 0.06, 0.96);
  L.part(GEO.box, mul(c, 0.5), 0, 0.35, 0, 0.92, 0.08, 0.92);
  G.part(GEO.box, col(0xc58aff), 0, 0.45, -0.46, 0.08, 0.26, 0.02);
  G.part(GEO.box, col(0xc58aff), 0, 0.22, -0.46, 0.08, 0.07, 0.02);
  G.part(GEO.box, col(0xc58aff), 0.08, 0.56, -0.46, 0.16, 0.07, 0.02);
  return toGroup(L, G);
}

// Square, pixel-like particles.
export class Particles {
  constructor(scene, n = 500) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3).fill(-9999); this.colr = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.grav = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.colr, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, sizeAttenuation: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._c = new THREE.Color();
  }
  burst(x, y, z, color, count, speed, life, grav = 0, spread = 0.1) {
    this._c.set(color);
    for (let k = 0; k < count; k++) {
      const i = this.i; this.i = (this.i + 1) % this.n;
      const a = Math.random() * PI * 2, b = Math.acos(Math.random() * 2 - 1), s = speed * (0.3 + Math.random() * 0.7);
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread; this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread; this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = Math.sin(b) * Math.cos(a) * s; this.vel[i * 3 + 1] = Math.cos(b) * s; this.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s;
      this.colr[i * 3] = this._c.r; this.colr[i * 3 + 1] = this._c.g; this.colr[i * 3 + 2] = this._c.b;
      this.life[i] = life * (0.5 + Math.random() * 0.5); this.grav[i] = grav;
    }
  }
  update(dt) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { p[i * 3 + 1] = -9999; continue; }
      v[i * 3 + 1] -= this.grav[i] * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < 0.03 && this.grav[i] > 0) { p[i * 3 + 1] = 0.03; v[i * 3 + 1] *= -0.4; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.pos.fill(-9999); this.points.geometry.attributes.position.needsUpdate = true; }
  dispose() { this.points.geometry.dispose(); this.points.material.dispose(); if (this.points.parent) this.points.parent.remove(this.points); }
}
