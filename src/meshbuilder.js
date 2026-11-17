// Small helper that merges many low-poly primitives into one vertex-coloured geometry.

import * as THREE from 'three';
import { uvRect, TEX, makeAtlas } from './textures.js';
import { retro } from './gfx.js';

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// Linear-space [r,g,b] from a hex/css colour, optionally multiplied.
export function col(c, k = 1) {
  const t = new THREE.Color(c);
  return [t.r * k, t.g * k, t.b * k];
}
export const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Transform matrix from position / scale / rotation.
export function M(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

const shared = (g) => { g.userData.shared = true; return g; };
export const GEO = {
  box: shared(new THREE.BoxGeometry(1, 1, 1)),
  cyl6: shared(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  cyl8: shared(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
  cyl12: shared(new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),
  cone4: shared(new THREE.ConeGeometry(0.5, 1, 4)),
  cone6: shared(new THREE.ConeGeometry(0.5, 1, 6)),
  cone8: shared(new THREE.ConeGeometry(0.5, 1, 8)),
  ico0: shared(new THREE.IcosahedronGeometry(0.5, 0)),
  ico1: shared(new THREE.IcosahedronGeometry(0.5, 1)),
  oct: shared(new THREE.OctahedronGeometry(0.5, 0)),
  torus: shared(new THREE.TorusGeometry(0.5, 0.08, 4, 10)),
  torusThin: shared(new THREE.TorusGeometry(0.5, 0.03, 3, 14)),
  plane: shared(new THREE.PlaneGeometry(1, 1)),
  tetra: shared(new THREE.TetrahedronGeometry(0.5, 0)),
};

export class MeshBuilder {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  get count() { return this.p.length / 3; }

  // Quad a,b,c,d given counter-clockwise as seen from its front. cols: one [r,g,b] or four.
  quad(a, b, c, d, cols, tile = TEX.WHITE) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const r = uvRect(tile);
    const P = [a, b, c, a, c, d], CI = [0, 1, 2, 0, 2, 3];
    const U = [r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[1], r[2], r[3], r[0], r[3]];
    const multi = Array.isArray(cols[0]);
    for (let i = 0; i < 6; i++) {
      this.p.push(P[i][0], P[i][1], P[i][2]); this.n.push(nx, ny, nz); this.u.push(U[i * 2], U[i * 2 + 1]);
      const cc = multi ? cols[CI[i]] : cols; this.c.push(cc[0], cc[1], cc[2]);
    }
  }

  // Appends any three.js geometry, transformed by m, flat shaded, with one colour and atlas tile.
  add(geo, m, color, tile = TEX.WHITE) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const r = uvRect(tile);
    _nm.getNormalMatrix(m);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(m); this.p.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(nor, i).applyMatrix3(_nm).normalize(); this.n.push(_n.x, _n.y, _n.z);
      if (uv) this.u.push(r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); else this.u.push(r[0], r[1]);
      this.c.push(color[0], color[1], color[2]);
    }
    g.dispose();
    return this;
  }

  // Shorthand: primitive placed with position / scale / rotation, optionally under a parent matrix.
  part(geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, tile = TEX.WHITE, parent = null) {
    const m = M(x, y, z, sx, sy, sz, rx, ry, rz);
    if (parent) m.premultiply(parent);
    return this.add(geo, m, color, tile);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// Shared materials. World materials sample the atlas; "lit"/"glow" are plain vertex colour.
let _mats = null;
export function mats() {
  if (_mats) return _mats;
  const atlas = makeAtlas();
  const sh = (m) => { m.userData.shared = true; return m; };
  _mats = {
    atlas,
    world: sh(retro(new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true }))),
    worldGlow: sh(retro(new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }))),
    lit: sh(retro(new THREE.MeshLambertMaterial({ vertexColors: true }))),
    glow: sh(retro(new THREE.MeshBasicMaterial({ vertexColors: true }))),
    ghost: sh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })),
  };
  return _mats;
}

// Builds a Group with a lit mesh and (if used) an unlit glow mesh from two builders.
export function toGroup(lit, glow, opts = {}) {
  const m = mats(), g = new THREE.Group();
  if (lit && lit.count) {
    const mesh = new THREE.Mesh(lit.build(), opts.world ? m.world : m.lit);
    mesh.castShadow = opts.castShadow !== false; mesh.receiveShadow = !!opts.receiveShadow;
    g.add(mesh); g.userData.lit = mesh;
  }
  if (glow && glow.count) {
    const mesh = new THREE.Mesh(glow.build(), opts.world ? m.worldGlow : m.glow);
    g.add(mesh); g.userData.glow = mesh;
  }
  return g;
}
