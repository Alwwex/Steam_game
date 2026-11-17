// Key-art renderer for Steam store capsules. Rendered with the real game engine and models.
// Opened by tools/store-assets.js as app/studio.html?kind=header&sector=cryo[&dlc=dlc05]

import * as THREE from 'three';
import { Gfx } from '../src/gfx.js';
import { buildLevel } from '../src/mutators.js';
import { buildLevelMesh } from '../src/levelmesh.js';
import { makeCat, makeCore, makeLurker, makeQubit, animQubit, FURS, Particles } from '../src/models.js';
import { SECTORS, DLC } from '../src/sectors.js';
import { SUIT_COLORS } from '../src/config.js';
import { setLang, pick } from '../src/i18n.js';

const q = new URLSearchParams(location.search);
const kind = q.get('kind') || 'header';
const dlc = DLC.find((d) => d.key === q.get('dlc')) || null;
const sector = dlc || SECTORS[q.get('sector') || 'cryo'];
setLang(q.get('lang') || 'en');

// ---------------------------------------------------------------- text overlay (title only, per Steam rules)
const overlay = document.getElementById('overlay');
const LOGO = {   // [font px, css position]
  header: [72, 'left:6%;top:50%;transform:translateY(-50%);'],
  small: [64, 'left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;'],
  main: [104, 'left:5%;bottom:9%;'],
  vertical: [104, 'left:50%;top:7%;transform:translateX(-50%);text-align:center;'],
  libcap: [92, 'left:50%;top:7%;transform:translateX(-50%);text-align:center;'],
  logo: [250, 'left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;'],
};
if (kind === 'small') {
  const shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(0,0,0,.72) 0%, rgba(0,0,0,.35) 60%, rgba(0,0,0,0) 100%);';
  overlay.appendChild(shade);
}
if (LOGO[kind]) {
  const [size, pos] = LOGO[kind];
  const box = document.createElement('div');
  box.className = 'studio-title';
  box.style.cssText = 'position:absolute;' + pos;
  const logo = document.createElement('div');
  logo.className = 'logo' + (kind === 'small' || kind === 'logo' || kind === 'vertical' || kind === 'libcap' ? ' centered' : '');
  logo.style.fontSize = size + 'px';
  logo.innerHTML = '<span class="l1">QUBIT</span><span class="l2">CREW</span>';
  box.appendChild(logo);
  if (dlc && kind !== 'logo') {
    const d = document.createElement('div');
    d.className = 'studio-dlc';
    d.style.fontSize = Math.round(size * (kind === 'small' ? 0.3 : 0.34)) + 'px';
    d.style.color = dlc.pal.accent;
    d.textContent = pick(dlc.name);
    box.appendChild(d);
  }
  overlay.appendChild(box);
}

if (kind === 'logo') {
  document.getElementById('c').style.display = 'none';
  document.body.style.background = 'transparent';
  document.documentElement.style.background = 'transparent';
  window.__ready = true;
} else {
  // ---------------------------------------------------------------- 3D scene
  const gfx = new Gfx(document.getElementById('c'));
  gfx.wobble = false;
  gfx.setPixelHeight(Number(q.get('px')) || Math.min(innerHeight, 620));
  const L = buildLevel(Number(q.get('seed')) || 11, 3, sector);
  gfx.setPalette(sector.pal, { ambient: 0.32, fogFar: 40 });
  const scene = gfx.scene;
  scene.add(buildLevelMesh(L, sector.pal));
  const cx = L.core.x, cz = L.core.z;
  const core = makeCore(sector.pal);
  core.group.position.set(cx, 0, cz);
  core.setProgress(0.7);
  scene.add(core.group);

  const hats = dlc ? ['hardhat', dlc.hat, 'party', 'headlamp'] : ['hardhat', 'party', 'headlamp', 'none'];
  const center = dlc ? 1 : -1;
  const cats = [];
  const layout = [[-1.75, 3.0, 0.75], [-0.6, 3.35, 0.12], [0.6, 3.25, -0.18], [1.75, 2.95, -0.8]];
  layout.forEach(([x, z, turn], i) => {
    const cat = makeCat({ suit: SUIT_COLORS[[0, 2, 1, 3][i]], fur: FURS[[0, 1, 3, 2][i]], hat: hats[i] });
    cat.group.position.set(cx + x, 0, cz + z);
    cat.group.rotation.y = Math.PI + turn;
    if (i === center) cat.group.scale.setScalar(1.12);
    scene.add(cat.group);
    cats.push({ cat, lit: i === 0 || i === 3, pitch: i === 0 || i === 3 ? 0.15 : -0.1 });
  });

  const lur = makeLurker();
  lur.group.position.set(cx + 3.4, 0, cz - 0.4);
  lur.group.rotation.y = -0.9;
  scene.add(lur.group);

  const qubits = [[0, false, -2.5, 1.75, 1.6], [1, true, 1.6, 2.35, 1.0], [2, true, -1.2, 2.6, 0.5], [0, true, 2.7, 1.5, 2.2]].map(([k, ghost, x, y, z]) => {
    const m = makeQubit(k, ghost); m.position.set(cx + x, y, cz + z); scene.add(m); return m;
  });
  const parts = new Particles(scene, 300);
  parts.burst(cx, 1.4, cz, sector.pal.accent, 120, 2.2, 3.5, 0, 2.5);

  // camera presets per capsule shape: [x offset, y, z offset, pitch, fov]
  const CAM = {
    header: [-2.0, 1.45, 8.4, -0.02, 50], small: [0, 1.5, 7.2, -0.02, 48], main: [-1.1, 1.5, 7.4, -0.02, 54],
    vertical: [0, 1.75, 7.4, -0.06, 66], libcap: [0, 1.8, 7.4, -0.07, 70], hero: [0, 1.5, 7.2, -0.02, 44], bg: [1.2, 1.6, 7.0, 0, 60],
  };
  const c = CAM[kind] || CAM.header;
  const cam = gfx.camera;
  cam.position.set(cx + c[0], c[1], cz + c[2]);
  cam.rotation.set(c[3], 0, 0);
  cam.fov = c[4];
  cam.updateProjectionMatrix();
  gfx.flash.intensity = 9; gfx.flash.angle = 0.9; gfx.flash.distance = 30;
  if (kind === 'bg') gfx.fx.vig = 1.6;

  const accent = new THREE.Color(sector.pal.accent).getHex();
  const lights = [
    { x: cx, y: 1.5, z: cz, c: accent, i: 16, d: 14, pri: 50 },
    { x: cx + c[0], y: 2.6, z: cz + 5.6, c: 0xfff1d8, i: 7, d: 12, pri: 40 },
    { x: cx + 3.4, y: 2.2, z: cz - 0.4, c: 0xff2bd0, i: 6, d: 6, pri: 30 },
    { x: cx - 3.5, y: 2.8, z: cz + 2.5, c: accent, i: 6, d: 9, pri: 20 },
  ];
  for (const l of L.lamps) if (!l.core) lights.push({ x: l.x, y: 2.9, z: l.z, c: new THREE.Color(sector.pal.lamp).getHex(), i: 9, d: 12 });

  const T0 = 3.7;
  let frames = 0;
  const loop = () => {
    const t = T0;   // frozen moment, so every capsule renders identically
    cats.forEach(({ cat, lit, pitch }) => cat.update(0, 0, pitch, t, lit));
    lur.update(1, t, false, 0, 4);
    qubits.forEach((m, i) => { animQubit(m, t, i * 1.3); m.visible = true; });
    core.update(0); core.setReady(false, t);
    parts.update(frames < 2 ? 0.25 : 0);
    gfx.setPointLights(lights);
    gfx.setSpotLights([], 0);
    gfx.render(1 / 60);
    if (++frames === 4) window.__ready = true;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
