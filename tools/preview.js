// Model/level viewer used during development and for making store screenshots.
import * as THREE from 'three';
import { Gfx } from '../src/gfx.js';
import { generateLevel } from '../src/level.js';
import { buildLevelMesh } from '../src/levelmesh.js';
import { makeCat, makeCore, makeLurker, makeDrifter, makeMite, makeQubit, animQubit, FURS, Particles } from '../src/models.js';
import { HATS } from '../src/hats.js';
import data from '../src/data/sectors.json';
import { TILE, WALL_H, SUIT_COLORS } from '../src/config.js';

const q = new URLSearchParams(location.search);
const gfx = new Gfx(document.getElementById('c'));
const all = [...data.base, ...data.dlc];
const sector = all.find((s) => s.key === (q.get('sector') || 'cryo')) || all[0];
const L = generateLevel(Number(q.get('seed') || 7), Number(q.get('slots') || 3));
gfx.setPalette(sector.pal);
gfx.scene.add(buildLevelMesh(L, sector.pal));
const core = makeCore(sector.pal); core.group.position.set(L.core.x, 0, L.core.z); gfx.scene.add(core.group); core.setProgress(0.4);

const mode = q.get('mode') || 'scene';
const cats = [], things = [];
const hatKeys = Object.keys(HATS);
if (mode === 'hats') {
  const off = Number(q.get('off') || 0);
  for (let i = 0; i < 8; i++) {
    const cat = makeCat({ suit: SUIT_COLORS[i % 8], fur: FURS[i % FURS.length], hat: hatKeys[off + i] });
    cat.group.position.set(L.core.x - 3.2 + i * 0.9, 0, L.core.z + 4.2); cat.group.rotation.y = Math.PI;
    gfx.scene.add(cat.group); cats.push(cat);
  }
} else {
  for (let i = 0; i < 4; i++) {
    const cat = makeCat({ suit: SUIT_COLORS[i], fur: FURS[i], hat: ['hardhat', 'party', 'headlamp', 'ushanka'][i] });
    cat.group.position.set(L.core.x - 2 + i * 1.3, 0, L.core.z + 4.5); cat.group.rotation.y = Math.PI + (i - 1.5) * 0.25;
    gfx.scene.add(cat.group); cats.push(cat);
  }
  const lur = makeLurker(); lur.group.position.set(L.core.x + 4.5, 0, L.core.z + 2); lur.group.rotation.y = -1; gfx.scene.add(lur.group); things.push((dt, t) => lur.update(dt, t, q.get('obs') === '1', 0, 1));
  const dr = makeDrifter(); dr.group.position.set(L.core.x - 5, 0, L.core.z + 1); gfx.scene.add(dr.group); things.push((dt, t) => dr.update(dt, t, 2));
  const mi = makeMite(); mi.group.position.set(L.core.x + 2.5, 0, L.core.z + 4.5); gfx.scene.add(mi.group); things.push((dt, t) => mi.update(dt, t, 3, true));
  for (let i = 0; i < 3; i++) { const qb = makeQubit(i, false); qb.position.set(L.core.x - 3 + i * 1.2, 1.0, L.core.z + 2.6); gfx.scene.add(qb); things.push((dt, t) => animQubit(qb, t, i)); }
  for (let i = 0; i < 2; i++) { const qb = makeQubit(0, true); qb.position.set(L.core.x + 1.5 + i * 1.2, 1.0, L.core.z + 2.6); gfx.scene.add(qb); things.push((dt, t) => animQubit(qb, t, i + 5)); }
}
const parts = new Particles(gfx.scene);
parts.burst(L.core.x, 1.3, L.core.z + 1.6, sector.pal.accent, 60, 2, 3, 0);

const cam = gfx.camera;
cam.position.set(L.core.x + Number(q.get('cx') || 0), Number(q.get('cy') || 1.3), L.core.z + Number(q.get('cz') || 7.2));
cam.rotation.set(Number(q.get('pitch') || 0), Number(q.get('yaw') || 0), 0);
gfx.flash.intensity = Number(q.get('flash') ?? 34);
const lights = L.lamps.map((l) => ({ x: l.x, y: WALL_H - 0.5, z: l.z, c: new THREE.Color(l.core ? sector.pal.accent : sector.pal.lamp).getHex(), i: l.core ? 14 : 10, d: 13 }));
let t = 0, last = performance.now(), frames = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  for (const c of cats) c.update(dt, q.get('walk') ? 3 : 0, 0, t);
  for (const f of things) f(dt, t);
  core.update(dt); core.setReady(true, t);
  parts.update(dt);
  gfx.setPointLights(lights);
  gfx.render(dt);
  frames++;
  if (frames > 3) window.__ready = true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__info = () => ({ tris: gfx.renderer.info.render.triangles, calls: gfx.renderer.info.render.calls, w: L.w });
