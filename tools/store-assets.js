// Generates every image a Steam store page needs, rendered with the real game.
//   npm run store:assets              -> base game + all 20 DLC
//   node tools/store-assets.js base   -> only the base game
//   node tools/store-assets.js dlc05  -> only one DLC
// Needs Playwright with Chromium:  npm i -D playwright && npx playwright install chromium
// Output: store-assets/base/*, store-assets/dlc01/* ...

const http = require('http');
const fs = require('fs');
const path = require('path');

let pw;
try { pw = require('playwright'); } catch (e) {
  try { pw = require('/opt/node-tools/node_modules/playwright'); } catch (e2) {
    console.error('Playwright is missing. Install it with:\n  npm i -D playwright\n  npx playwright install chromium');
    process.exit(1);
  }
}

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'store-assets');
const sectors = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'sectors.json'), 'utf8'));
const only = process.argv[2] || 'all';

const CAPSULES = {
  header_capsule: ['header', 920, 430],
  small_capsule: ['small', 462, 174],
  main_capsule: ['main', 1232, 706],
  vertical_capsule: ['vertical', 748, 896],
};
const LIBRARY = {
  library_capsule: ['libcap', 600, 900],
  library_header: ['header', 920, 430],
  library_hero: ['hero', 3840, 1240],
  page_background: ['bg', 1438, 810],
};

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      fs.readFile(path.join(APP, p === '/' ? 'index.html' : path.normalize(p)), (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data);
      });
    }).listen(0, () => resolve(srv));
  });
}

async function capsule(page, base, file, kind, w, h, query) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${base}/studio.html?kind=${kind}&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const png = kind === 'logo';
  await page.screenshot({ path: file + (png ? '.png' : '.jpg'), type: png ? 'png' : 'jpeg', quality: png ? undefined : 92, omitBackground: png });
}

// ------------------------------------------------------------------------------------- gameplay shots

const SHOT_HELPERS = () => {
  const a = window.__qc, g = a.game, LIB = window.__qcLib, TILE = 3;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const place = (x, z, tx, tz, pitch = -0.06) => {
    g.me.x = x; g.me.z = z; g.me.y = 0; g.me.vx = g.me.vz = 0;
    g.me.yaw = Math.atan2(-(tx - x), -(tz - z)); g.me.pitch = pitch;
  };
  const floorTiles = () => { const out = []; for (let i = 0; i < g.L.tiles.length; i++) if (g.L.tiles[i] === LIB.T.FLOOR && g.L.roomId[i] !== g.L.core.room) out.push(i); return out; };
  const center = (i) => [((i % g.L.w) + 0.5) * TILE, (((i / g.L.w) | 0) + 0.5) * TILE];
  // A spot 4.5-9 m from the target with a clear line of sight to it.
  const vantage = (tx, tz, minD = 4.5, maxD = 9) => {
    let best = null, bs = -1;
    for (const i of floorTiles()) {
      const [x, z] = center(i), d = Math.hypot(x - tx, z - tz);
      if (d < minD || d > maxD || !LIB.los(g.L, x, z, tx, tz, 0)) continue;
      const open = LIB.raycast(g.L, x, z, (x - tx) / d, (z - tz) / d, 6, 0);   // room behind us = nicer framing
      const s = open + (g.L.kind[i] === 1 ? 2 : 0) - Math.abs(d - 6.5) * 0.3;
      if (s > bs) { bs = s; best = [x, z]; }
    }
    return best;
  };
  const longView = () => {
    let best = null, bd = 0;
    for (const i of floorTiles()) {
      const [x, z] = center(i);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const d = LIB.raycast(g.L, x, z, dx, dz, 40, 0);
        if (d > bd) { bd = d; best = [x, z, x + dx * 10, z + dz * 10]; }
      }
    }
    return best;
  };
  const freezeHost = () => { a.host.paused = true; };
  const tidy = () => { a.ui.clearToasts(); a.ui.alert(null); g.hints = []; };
  const fakeCrew = (spots) => {
    const names = [['Nova', 1, 'party', 2], ['Mochi', 2, 'headlamp', 3], ['Pixel', 3, 'ushanka', 4]];
    const lobby = g.lobby;
    const me = lobby.players.find((p) => p.id === g.myId);
    lobby.players = [me];
    const ps = [[g.myId, g.me.x, 0, g.me.z, g.me.yaw, 0, 1, 0]];
    spots.forEach((s, i) => {
      const [name, color, hat, fur] = names[i];
      const id = 'crew' + i;
      lobby.players.push({ id, name, color, hat, fur });
      ps.push([id, s[0], 0, s[1], s[2], s[3] || 0, 1, i % 2]);
    });
    g.onSnap({ time: g.t, c: g.coh, g: g.got, r: 0, cr: 0, p: ps, a: [...g.anoms.values()].map((v) => [v.id, v.type, v.tx, v.tz, v.flags, 0]) });
  };
  window.__shot = { a, g, LIB, sleep, place, vantage, longView, freezeHost, tidy, fakeCrew, center, floorTiles };
};

async function startSector(page, key) {
  await page.evaluate(async (key) => {
    const a = window.__qc;
    if (!a.session) a.playSolo();
    await new Promise((r) => setTimeout(r, 400));
    if (a.game.state !== 'lobby') { a.host.phase = 'over'; a.endRun(); await new Promise((r) => setTimeout(r, 300)); }
    a.setMode(key);
    a.input.fake = true;
    a.startRun();
    await new Promise((r) => setTimeout(r, 700));
    a.ui.hideScreen(); a.setPaused(false);
  }, key);
}

const VIEWS = {
  // A flickering superposition right in the beam.
  async observe(page) {
    return page.evaluate(async () => {
      const { a, g, sleep, place, vantage, freezeHost, tidy } = window.__shot;
      freezeHost();
      const ghost = [...g.qviews.values()].find((v) => v.st === 0 && v.pts.length >= 2) || [...g.qviews.values()].find((v) => v.st === 0);
      if (!ghost) return 'no ghost';
      const [gx, gz] = ghost.pts[0];
      const v = vantage(gx, gz, 4, 7);
      if (!v) return 'no vantage';
      place(v[0], v[1], gx, gz, -0.1);
      await sleep(900); tidy(); await sleep(200);
      return 'ok';
    });
  },
  // A lurker frozen by the flashlight.
  async lurker(page) {
    return page.evaluate(async () => {
      const { a, g, sleep, place, vantage, tidy } = window.__shot;
      const lur = a.host.anoms.find((x) => x.type === 0);
      if (!lur) return 'no lurker';
      const rooms = g.L.rooms.filter((r) => !r.isCore);
      const room = rooms.sort((p, q) => (q.x1 - q.x0) * (q.z1 - q.z0) - (p.x1 - p.x0) * (p.z1 - p.z0))[0];
      const v = vantage(room.cx, room.cz, 5, 8);
      if (!v) return 'no vantage';
      lur.x = room.cx; lur.z = room.cz; lur.wait = 99; lur.obsT = 0;
      for (const o of a.host.anoms) if (o !== lur) { o.x = 3; o.z = 3; }
      place(v[0], v[1], room.cx, room.cz, 0.02);
      a.host.paused = false;
      await sleep(500);
      a.host.paused = true;
      await sleep(700); tidy(); await sleep(150);
      return 'ok';
    });
  },
  // Delivering qubits at the quantum core.
  async core(page) {
    return page.evaluate(async () => {
      const { a, g, sleep, place, freezeHost, tidy } = window.__shot;
      freezeHost();
      const L = g.L;
      place(L.core.x - 2.2, L.core.z + 5.4, L.core.x, L.core.z, 0.08);
      g.quota = Math.max(g.quota, 8);
      g.onEvent({ k: 'dep', id: -1, p: 'nobody', got: 5, bonus: 0 });
      await sleep(150);
      g.onEvent({ k: 'dep', id: -2, p: 'nobody', got: 6, bonus: 0 });
      g.me.carry = 2;
      await sleep(250); tidy(); await sleep(50);
      return 'ok';
    });
  },
  // The co-op crew sweeping a room with flashlights.
  async crew(page) {
    return page.evaluate(async () => {
      const { g, sleep, place, vantage, freezeHost, tidy, fakeCrew } = window.__shot;
      freezeHost();
      const rooms = g.L.rooms.filter((r) => !r.isCore).sort((p, q) => (q.x1 - q.x0) * (q.z1 - q.z0) - (p.x1 - p.x0) * (p.z1 - p.z0));
      let room = null, v = null;
      for (const r of rooms) { v = vantage(r.cx, r.cz, 5, 10); if (v) { room = r; break; } }
      if (!v) return 'no vantage';
      place(v[0], v[1], room.cx, room.cz, -0.04);
      const dx = room.cx - v[0], dz = room.cz - v[1], d = Math.hypot(dx, dz), fx = dx / d, fz = dz / d, sx = -fz, sz = fx;
      const at = (f, s) => [v[0] + fx * f + sx * s, v[1] + fz * f + sz * s];
      const yawTo = (p, tx, tz) => Math.atan2(-(tx - p[0]), -(tz - p[1]));
      const p1 = at(3.2, -1.4), p2 = at(4.6, 1.3), p3 = at(6.4, -0.2);
      fakeCrew([[...p1, yawTo(p1, room.cx - sx * 6, room.cz - sz * 6), 0.1], [...p2, yawTo(p2, v[0], v[1]), -0.05], [...p3, yawTo(p3, room.cx + sx * 6 + fx * 3, room.cz + sz * 6 + fz * 3), 0.05]]);
      await sleep(900); tidy(); await sleep(150);
      return 'ok';
    });
  },
  async long(page) {
    return page.evaluate(async () => {
      const { g, sleep, place, longView, freezeHost, tidy } = window.__shot;
      freezeHost();
      const v = longView();
      place(v[0], v[1], v[2], v[3], 0);
      await sleep(900); tidy(); await sleep(150);
      return 'ok';
    });
  },
  // Points the camera at whatever makes the current DLC sector special.
  async feature(page) {
    return page.evaluate(async () => {
      const { a, g, sleep, place, vantage, longView, tidy, center } = window.__shot;
      const L = g.L, mut = g.sector.mut, x = L.extra || {};
      let target = null;
      const firstTile = (tt) => { for (let i = 0; i < L.tiles.length; i++) if (L.tiles[i] === tt) return center(i); return null; };
      if (mut === 'lasers' && x.beams && x.beams.length) { const b = x.beams[0]; target = b.ax ? [(b.b0 + b.b1) / 2, (b.a0 + b.a1) / 2] : [(b.a0 + b.a1) / 2, (b.b0 + b.b1) / 2]; }
      else if (mut === 'worlds') target = firstTile(window.__qcLib.T.PHASE_A);
      else if (mut === 'sealed') target = firstTile(window.__qcLib.T.BARRIER);
      else if (mut === 'boxes' && a.host.things.length) target = [a.host.things[0].x, a.host.things[0].z];
      else if (mut === 'slowfield' && x.zones && x.zones.length) target = [x.zones[0].x, x.zones[0].z];
      else if (mut === 'torus' && x.portals && x.portals.length) { const p = x.portals[0]; target = [p.ax === 0 ? (p.x < 1 ? 1.5 : L.W - 1.5) : p.x, p.ax === 1 ? (p.z < 1 ? 1.5 : L.H - 1.5) : p.z]; }
      else if (mut === 'blackhole') { a.host.time = g.t = 30; const r = L.W * 0.3, an = 30 * 0.11 + 1; target = [L.W / 2 + Math.cos(an) * r, L.H / 2 + Math.sin(an) * r]; }
      else if (mut === 'lowgrav') { const k = Math.floor(g.t / 4); const pool = L.roomTiles; const idx = pool[Math.floor(((Math.imul((L.seed ^ 0x51ed) | 0, 374761393) + Math.imul(k, 668265263)) >>> 0) / 4294967296 * pool.length)]; target = idx != null ? center(idx) : null; }
      if (['strobe', 'bitflip', 'pulse', 'wave', 'heat'].includes(mut)) { a.host.time = g.t = mut === 'strobe' ? 26 : mut === 'heat' ? 40 : mut === 'wave' ? 37 : 33; }
      let v = target ? vantage(target[0], target[1], 4.5, 9) : null;
      a.host.paused = true;
      if (v) place(v[0], v[1], target[0], target[1], mut === 'boxes' || mut === 'slowfield' ? -0.25 : -0.05);
      else { const lv = longView(); place(lv[0], lv[1], lv[2], lv[3], 0); }
      if (mut === 'lowgrav') { g.me.y = 1.3; }
      await sleep(1000); tidy(); await sleep(150);
      return target ? 'feature' : 'long';
    });
  },
  async shop(page) {
    return page.evaluate(async () => {
      const { a, sleep } = window.__shot;
      a.host.paused = false;
      a.host.got = a.host.quota; a.host.credits = 230; a.host.up.lens = 1; a.host.up.carry = 1;
      a.host.complete();
      await sleep(900);
      return 'ok';
    });
  },
};

async function gameplay(browser, base, outDir, plan) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.warn('   page error:', e.message));
  await page.goto(base + '/index.html?dlc=all');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.evaluate(() => { window.__qc.setSetting('name', 'Whiskers'); window.__qc.setName('Whiskers'); });
  for (const [name, sector, view, seed] of plan) {
    await page.evaluate(SHOT_HELPERS);
    if (seed !== undefined) await page.evaluate((s) => { Math.random = (() => { let x = s; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })(); }, seed);
    await startSector(page, sector);
    await page.evaluate(SHOT_HELPERS);
    const r = await VIEWS[view](page);
    await page.screenshot({ path: path.join(outDir, name + '.jpg'), type: 'jpeg', quality: 90 });
    console.log(`   ${path.basename(outDir)}/${name}.jpg  (${sector}, ${view}: ${r})`);
  }
  await page.close();
}

(async () => {
  const srv = await serve();
  const base = 'http://localhost:' + srv.address().port;
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.warn('   page error:', e.message));

  if (only === 'all' || only === 'base') {
    const dir = path.join(OUT, 'base');
    fs.mkdirSync(dir, { recursive: true });
    console.log('base game');
    for (const [name, [kind, w, h]] of Object.entries({ ...CAPSULES, ...LIBRARY })) {
      await capsule(page, base, path.join(dir, `${name}_${w}x${h}`), kind, w, h, 'sector=cryo');
      console.log(`   base/${name}_${w}x${h}`);
    }
    await capsule(page, base, path.join(dir, 'library_logo_1280x720'), 'logo', 1280, 720, '');
    const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'build', 'icon.png')).toString('base64');
    for (const [file, size, type] of [['app_icon_184x184.jpg', 184, 'jpeg'], ['shortcut_icon_256x256.png', 256, 'png']]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<body style="margin:0;background:#081018"><img src="${icon}" style="width:${size}px;height:${size}px;image-rendering:pixelated;display:block"></body>`);
      await page.screenshot({ path: path.join(dir, file), type, quality: type === 'jpeg' ? 95 : undefined, omitBackground: type === 'png' });
    }
    console.log('   base/icons');
    await gameplay(browser, base, dir, [
      ['screenshot_1_crew', 'cryo', 'crew', 7], ['screenshot_2_superposition', 'photon', 'observe', 3],
      ['screenshot_3_lurker', 'ion', 'lurker', 5], ['screenshot_4_core', 'vault', 'core', 2],
      ['screenshot_5_corridors', 'cryo', 'long', 11], ['screenshot_6_upgrades', 'photon', 'shop', 4],
    ]);
  }

  for (const d of sectors.dlc) {
    if (only !== 'all' && only !== d.key) continue;
    const dir = path.join(OUT, d.key);
    fs.mkdirSync(dir, { recursive: true });
    console.log(d.key, d.name.en);
    for (const [name, [kind, w, h]] of Object.entries(CAPSULES)) {
      await capsule(page, base, path.join(dir, `${name}_${w}x${h}`), kind, w, h, 'dlc=' + d.key + '&seed=' + (20 + d.n));
    }
    await gameplay(browser, base, dir, [
      ['screenshot_1_feature', d.key, 'feature', d.n * 13], ['screenshot_2_crew', d.key, 'crew', d.n * 7],
      ['screenshot_3_superposition', d.key, 'observe', d.n * 5],
    ]);
  }
  await browser.close();
  srv.close();
  console.log('done ->', path.relative(process.cwd(), OUT));
})().catch((e) => { console.error(e); process.exit(1); });
