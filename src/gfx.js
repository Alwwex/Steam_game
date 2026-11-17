// Renderer: low resolution render target + a post pass (dither, colour quantise, glitch) that
// gives the game its chunky retro look. Also owns the pooled dynamic lights.

import * as THREE from 'three';

// Shared uniform for the vertex-snap ("wobble") effect.
export const SNAP = { value: new THREE.Vector2(0, 0) };

// Patches a mesh material so vertices snap to the low-res pixel grid, like old consoles did.
export function retro(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = SNAP;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform vec2 uSnap;\nvoid main() {')
      .replace('#include <project_vertex>', `#include <project_vertex>
        if (uSnap.x > 0.0 && gl_Position.w > 0.05) {
          vec2 sn = gl_Position.xy / gl_Position.w;
          sn = floor(sn * uSnap + 0.5) / uSnap;
          gl_Position.xy = sn * gl_Position.w;
        }`);
  };
  return mat;
}

const POST_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uTime, uGlitch, uInvert, uFlash, uVig, uExposure, uWarp;
uniform vec3 uTint;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m = 0.0;
  if (i == 0) m = 0.0; else if (i == 1) m = 8.0; else if (i == 2) m = 2.0; else if (i == 3) m = 10.0;
  else if (i == 4) m = 12.0; else if (i == 5) m = 4.0; else if (i == 6) m = 14.0; else if (i == 7) m = 6.0;
  else if (i == 8) m = 3.0; else if (i == 9) m = 11.0; else if (i == 10) m = 1.0; else if (i == 11) m = 9.0;
  else if (i == 12) m = 15.0; else if (i == 13) m = 7.0; else if (i == 14) m = 13.0; else m = 5.0;
  return m / 16.0;
}
void main() {
  vec2 uv = vUv;
  if (uWarp > 0.0) { vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 + uWarp * sin(length(c) * 18.0 - uTime * 9.0) * 0.06); }
  float g = uGlitch;
  if (g > 0.001) {
    float line = floor(uv.y * uRes.y / 3.0);
    float nz = hash(vec2(line, floor(uTime * 24.0)));
    uv.x += (nz - 0.5) * 0.12 * g * step(1.0 - 0.45 * g, nz);
  }
  float ca = (0.0012 + 0.012 * g);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
  col = 1.0 - exp(-col * uExposure);            // soft exposure curve, no harsh clipping
  col = pow(col, vec3(1.0 / 2.2));
  vec2 px = floor(vUv * uRes);
  col += (hash(px + uTime) - 0.5) * (0.025 + 0.12 * g);   // film grain
  float d = bayer(px) - 0.5;
  col = floor(col * 28.0 + d + 0.5) / 28.0;       // limited colour depth with ordered dither
  float v = smoothstep(1.05, 0.25, length(vUv - 0.5) * 1.25);
  col *= mix(1.0, v, uVig);
  col = mix(col, 1.0 - col, uInvert);
  col += uFlash * uTint;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const N_POINT = 8, N_SPOT = 3;

export class Gfx {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.BasicShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080d);
    this.scene.fog = new THREE.Fog(0x05080d, 3, 34);
    this.camera = new THREE.PerspectiveCamera(76, 16 / 9, 0.06, 140);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.ambient = new THREE.AmbientLight(0x2a3a4d, 1.0);
    this.scene.add(this.ambient);

    // The player's flashlight lives in camera space and is the only shadow caster.
    const fl = this.flash = new THREE.SpotLight(0xfff1d8, 0, 20, 0.52, 0.5, 0.6);
    fl.castShadow = true;
    fl.shadow.mapSize.set(512, 512);
    fl.shadow.camera.near = 0.3; fl.shadow.camera.far = 26;
    fl.shadow.bias = -0.004;
    fl.position.set(0.2, -0.16, 0.45);   // a little behind the eye, so walls right in front do not blow out
    fl.target.position.set(0.02, -0.03, -1);
    this.camera.add(fl); this.camera.add(fl.target);

    this.points = [];
    for (let i = 0; i < N_POINT; i++) { const p = new THREE.PointLight(0xffffff, 0, 12, 1.4); this.scene.add(p); this.points.push(p); }
    this.spots = [];
    for (let i = 0; i < N_SPOT; i++) {
      const s = new THREE.SpotLight(0xfff1d8, 0, 16, 0.5, 0.5, 1.0);
      this.scene.add(s); this.scene.add(s.target); this.spots.push(s);
    }

    this.pixelH = 360;
    this.wobble = true;
    this.fx = { glitch: 0, invert: 0, flash: 0, vig: 1, warp: 0, exposure: 1.4, tint: new THREE.Color(1, 1, 1) };
    this.time = 0;
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = new THREE.ShaderMaterial({
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
      uniforms: {
        tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(640, 360) }, uTime: { value: 0 },
        uGlitch: { value: 0 }, uInvert: { value: 0 }, uFlash: { value: 0 }, uVig: { value: 1 }, uWarp: { value: 0 },
        uExposure: { value: 1.25 }, uTint: { value: this.fx.tint },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
    this.rt = null;
    this._lightTmp = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setPixelHeight(h) { this.pixelH = h; this.resize(); }

  resize() {
    const w = Math.max(320, window.innerWidth), h = Math.max(200, window.innerHeight);
    this.renderer.setSize(w, h, false);
    const ph = this.pixelH > 0 ? Math.min(this.pixelH, h) : h;
    const pw = Math.max(2, Math.round(ph * w / h));
    if (this.rt) this.rt.dispose();
    this.rt = new THREE.WebGLRenderTarget(pw, ph, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, depthBuffer: true,
    });
    this.postMat.uniforms.tDiffuse.value = this.rt.texture;
    this.postMat.uniforms.uRes.value.set(pw, ph);
    this.rtW = pw; this.rtH = ph;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setPalette(pal, opts = {}) {
    const fog = new THREE.Color(pal.fog);
    this.scene.background.copy(fog);
    this.scene.fog.color.copy(fog);
    this.scene.fog.near = opts.fogNear ?? 3;
    this.scene.fog.far = opts.fogFar ?? 34;
    this.ambient.color.set(pal.wall).lerp(new THREE.Color(pal.accent), 0.25);
    this.ambient.intensity = opts.ambient ?? 0.3;
  }

  // sources: [{x,y,z,c,i,d}] -> the closest ones to the camera get a real light.
  setPointLights(sources) {
    const cam = this.camera.position, tmp = this._lightTmp;
    tmp.length = 0;
    for (const s of sources) {
      const dx = s.x - cam.x, dy = s.y - cam.y, dz = s.z - cam.z;
      s._d = dx * dx + dy * dy + dz * dz - (s.pri || 0);
      tmp.push(s);
    }
    tmp.sort((a, b) => a._d - b._d);
    for (let i = 0; i < N_POINT; i++) {
      const L = this.points[i], s = tmp[i];
      if (!s) { L.intensity = 0; continue; }
      const dist = Math.sqrt(Math.max(0, s._d));
      const fade = dist < 20 ? 1 : Math.max(0, 1 - (dist - 20) / 10);
      L.position.set(s.x, s.y, s.z);
      L.color.setHex(s.c);
      L.intensity = s.i * fade;
      L.distance = s.d;
    }
  }

  // Team-mates' flashlights: [{x,y,z,dx,dy,dz}]
  setSpotLights(list, intensity) {
    const cam = this.camera.position;
    list.sort((a, b) => ((a.x - cam.x) ** 2 + (a.z - cam.z) ** 2) - ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2));
    for (let i = 0; i < N_SPOT; i++) {
      const L = this.spots[i], s = list[i];
      if (!s) { L.intensity = 0; continue; }
      L.position.set(s.x, s.y, s.z);
      L.target.position.set(s.x + s.dx, s.y + s.dy, s.z + s.dz);
      L.intensity = intensity;
    }
  }

  render(dt) {
    this.time += dt;
    const u = this.postMat.uniforms, f = this.fx;
    u.uTime.value = this.time; u.uGlitch.value = f.glitch; u.uInvert.value = f.invert;
    u.uFlash.value = f.flash; u.uVig.value = f.vig; u.uWarp.value = f.warp; u.uExposure.value = f.exposure;
    if (this.wobble) SNAP.value.set(this.rtW * 0.5, this.rtH * 0.5); else SNAP.value.set(0, 0);
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}

// Removes an object and frees its GPU resources.
export function disposeObject(obj) {
  if (!obj) return;
  if (obj.parent) obj.parent.remove(obj);
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const m = o.material;
    if (m && !m.userData.shared) {
      if (Array.isArray(m)) m.forEach((x) => x.dispose()); else { if (m.map && m.userData.ownMap) m.map.dispose(); m.dispose(); }
    }
  });
}
