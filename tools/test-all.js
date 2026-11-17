// Automated end-to-end tests in headless Chromium. A bot plays the real game through the dev API.
//   node tools/test-all.js [solo|sectors|mp|all] [screenshotDir]
// Requires a development build (npm run build -- --dev is done automatically by `npm test`).

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { startRelay } = require('../server/relay');

const which = process.argv[2] || 'all';
const shotDir = process.argv[3] || null;
const root = path.join(__dirname, '..', 'app');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) failures++; };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(root, p === '/' ? 'index.html' : path.normalize(p));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
      });
    });
    srv.listen(0, () => resolve(srv));
  });
}

async function openGame(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return page;
}

const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: path.join(shotDir, name + '.png') }); };

// Injected into the page: helpers the bot uses.
const BOT = () => {
  const a = window.__qc, g = a.game;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tp = (x, z) => { g.me.x = x; g.me.z = z; g.me.vx = 0; g.me.vz = 0; g.me.y = 0; };
  const face = (x, z) => { g.me.yaw = Math.atan2(-(x - g.me.x), -(z - g.me.z)); g.me.pitch = -0.08; };
  const enter = () => { a.input.fake = true; a.ui.hideScreen(); a.setPaused(false); };
  // One bot decision. Returns a short string describing what it did.
  const step = () => {
    if (!g.alive || g.state !== 'play') return 'wait';
    const qs = [...g.qviews.values()];
    const cap = 2 + ((g.up && g.up.carry) || 0);
    if (g.me.carry >= cap || (g.me.carry > 0 && !qs.some((v) => v.st <= 1))) { tp(g.L.core.x, g.L.core.z + 2.4); face(g.L.core.x, g.L.core.z); return 'deliver'; }
    const real = qs.find((v) => v.st === 1);
    if (real) { tp(real.x, real.z); return 'pick'; }
    const ghost = qs.find((v) => v.st === 0);
    if (ghost) { const p = ghost.pts[0]; tp(p[0] + 0.25, p[1] + 0.25); face(p[0], p[1]); return 'observe'; }
    return 'idle';
  };
  const pressRun = () => { tp(g.L.core.x + 1.95, g.L.core.z + 1.95); g.act({ k: 'use' }); };
  window.__bot = { a, g, sleep, tp, face, enter, step, pressRun };
};

async function playShift(page, maxMs = 120000) {
  return page.evaluate(async (maxMs) => {
    const { g, sleep, step, pressRun } = window.__bot;
    const t0 = performance.now(), acts = {};
    while (!g.ready && performance.now() - t0 < maxMs && g.state === 'play') {
      const s = step(); acts[s] = (acts[s] || 0) + 1;
      await sleep(s === 'deliver' ? 1300 : 450);
    }
    const ready = g.ready;
    if (ready) { pressRun(); await sleep(800); if (g.state === 'play') { pressRun(); await sleep(800); } }
    return { ready, state: g.state, got: g.got, quota: g.quota, coh: g.coh, acts, secs: Math.round((performance.now() - t0) / 1000) };
  }, maxMs);
}

// ------------------------------------------------------------------------------------------------

async function testSolo(browser, base) {
  console.log('SOLO');
  const page = await openGame(browser, base + '/?dlc=dlc11');
  await page.evaluate(BOT);
  await shot(page, 'solo-title');
  await page.click('text=Play solo');
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => window.__qc.ui.screenName === 'lobby'), 'solo lobby shown');
  await page.evaluate(() => { window.__bot.a.customize({ hat: 'cardbox', color: 2 }); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__qc.lobby.players[0].hat === 'cardbox'), 'owned DLC hat can be worn');
  await page.evaluate(() => { window.__bot.a.customize({ hat: 'ushanka' }); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__qc.lobby.players[0].hat === 'none'), 'unowned DLC hat is refused');
  await page.evaluate(() => { const b = window.__bot; b.a.input.fake = true; b.a.startRun(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__bot.enter());
  await page.waitForTimeout(1500);
  await shot(page, 'solo-start');
  const r = await playShift(page);
  console.log('   shift 1:', JSON.stringify(r));
  ok(r.ready && r.state === 'shop', 'bot completed shift 1 and reached the shop');
  await shot(page, 'solo-shop');
  const shop = await page.evaluate(async () => {
    const { a, g, sleep } = window.__bot, before = g.credits;
    a.buy('lens'); await sleep(300);
    return { before, after: g.credits, lens: g.up.lens };
  });
  ok(shop.lens === 1 && shop.after < shop.before, 'buying an upgrade works (' + shop.before + ' -> ' + shop.after + ')');
  await page.evaluate(async () => { const { a, sleep, enter } = window.__bot; a.nextShift(); await sleep(800); enter(); });
  await page.waitForTimeout(1500);
  const s2 = await page.evaluate(() => ({ shift: window.__qc.game.shift, state: window.__qc.game.state }));
  ok(s2.shift === 2 && s2.state === 'play', 'shift 2 started');
  const r2 = await playShift(page, 25000);
  console.log('   shift 2 (25 s sample):', JSON.stringify(r2));
  ok(r2.got > 0, 'qubits delivered in shift 2');
  await shot(page, 'solo-shift2');
  await page.evaluate(async () => { const { a, sleep } = window.__bot; if (a.game.state === 'shop') { a.nextShift(); await sleep(800); } a.host.coh = 0; await sleep(600); });
  ok(await page.evaluate(() => window.__qc.game.state === 'over'), 'coherence 0 ends the run');
  await shot(page, 'solo-over');
  await page.evaluate(async () => { window.__bot.a.endRun(); await window.__bot.sleep(500); });
  ok(await page.evaluate(() => window.__qc.ui.screenName === 'lobby'), 'back in the lobby after game over');
  ok(page.errors.length === 0, 'no page errors' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  await page.close();
}

async function testSectors(browser, base) {
  console.log('SECTORS');
  const page = await openGame(browser, base + '/?dlc=all');
  await page.evaluate(BOT);
  await page.click('text=Play solo');
  await page.waitForTimeout(600);
  const keys = ['cryo', 'photon', 'ion', 'vault'].concat(Array.from({ length: 20 }, (_, i) => 'dlc' + String(i + 1).padStart(2, '0')));
  for (const key of keys) {
    const res = await page.evaluate(async (key) => {
      const { a, g, sleep, enter, step } = window.__bot;
      a.setMode(key);
      await sleep(100);
      a.startRun();
      await sleep(700);
      enter();
      const sector = g.sector && g.sector.key;
      if (key.startsWith('dlc')) a.host.time = 24;  // jump into the part of the cycle where most mutators are active
      g.t = a.host.time;
      const acts = {};
      for (let i = 0; i < 12; i++) { const s = step(); acts[s] = (acts[s] || 0) + 1; await sleep(400); }
      const out = { sector, got: g.got, coh: Math.round(g.coh), tris: a.gfx.renderer.info.render.triangles, acts };
      return out;
    }, key);
    const errs = page.errors.splice(0);
    ok(res.sector === (key.startsWith('dlc') ? key : 'cryo') || !key.startsWith('dlc'), `sector ${key} loads (${JSON.stringify(res)})`);
    ok(errs.length === 0, `sector ${key} has no errors` + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
    await page.evaluate(() => { const b = window.__bot; b.g.me.yaw += 0.6; b.g.me.pitch = 0; });
    await page.waitForTimeout(250);
    await shot(page, 'sector-' + key);
    await page.evaluate(async () => { const { a, sleep } = window.__bot; a.host.phase = 'over'; a.endRun(); await sleep(300); });
  }
  await page.close();
}

async function testMultiplayer(browser, base, relayPort) {
  console.log('MULTIPLAYER');
  const A = await openGame(browser, base + `/?relay=${relayPort}&room=t1`);
  const B = await openGame(browser, base + `/?relay=${relayPort}&room=t1`);
  for (const p of [A, B]) await p.evaluate(BOT);
  await A.evaluate(() => { window.__qc.setName('Alice'); window.__qc.hostLan(); });
  await A.waitForFunction(() => window.__qc.ui.screenName === 'lobby', null, { timeout: 10000 });
  await B.evaluate((port) => { window.__qc.setName('Bob'); window.__qc.joinLan('localhost:' + port); }, relayPort);
  await B.waitForFunction(() => window.__qc.ui.screenName === 'lobby', null, { timeout: 10000 });
  await A.waitForTimeout(500);
  const names = await A.evaluate(() => window.__qc.lobby.players.map((p) => p.name));
  ok(names.includes('Alice') && names.includes('Bob'), 'both players in the lobby: ' + names.join(', '));
  const colors = await A.evaluate(() => window.__qc.lobby.players.map((p) => p.color));
  ok(colors[0] !== colors[1], 'players got different suit colours');
  await B.evaluate(() => window.__qc.sendChat('hello crew'));
  await A.waitForTimeout(400);
  ok(await A.evaluate(() => document.querySelector('.chatlog').textContent.includes('hello crew')), 'chat message arrives at the host');
  await shot(A, 'mp-lobby');
  await A.evaluate(() => { window.__qc.input.fake = true; window.__qc.startRun(); });
  await A.waitForTimeout(1000);
  for (const p of [A, B]) await p.evaluate(() => window.__bot.enter());
  await A.waitForTimeout(1500);
  const seen = await Promise.all([A, B].map((p) => p.evaluate(() => ({ state: window.__qc.game.state, remotes: window.__qc.game.remotes.size, seed: window.__qc.game.L && window.__qc.game.L.seed }))));
  ok(seen[0].state === 'play' && seen[1].state === 'play', 'both clients are in the level');
  ok(seen[0].seed === seen[1].seed, 'both clients generated the same map');
  ok(seen[0].remotes === 1 && seen[1].remotes === 1, 'each client sees the other player');
  await B.evaluate(() => { const b = window.__bot; b.tp(b.g.L.spawns[3].x, b.g.L.spawns[3].z); b.face(b.g.L.core.x, b.g.L.core.z); });
  await A.evaluate(() => { const b = window.__bot; b.face(b.g.L.spawns[3].x, b.g.L.spawns[3].z); });
  await A.waitForTimeout(600);
  await shot(A, 'mp-host-view');
  const r = await playShift(B, 120000);
  console.log('   client bot:', JSON.stringify(r));
  ok(r.got >= r.quota && r.state === 'shop', 'the client delivered the quota and both reached the shop');
  ok(await A.evaluate(() => window.__qc.game.state === 'shop'), 'host is in the shop too');
  await B.evaluate(() => window.__qc.buy('carry'));
  await A.waitForTimeout(400);
  ok(await A.evaluate(() => window.__qc.game.up.carry === 1), 'an upgrade bought by the client applies to the team');
  await A.evaluate(() => window.__qc.leave());
  await B.waitForTimeout(1200);
  ok(await B.evaluate(() => window.__qc.ui.screenName === 'title' && !!document.querySelector('.modal:not(.hidden)')), 'client returns to the title when the host leaves');
  ok(A.errors.length === 0 && B.errors.length === 0, 'no page errors' + (A.errors.concat(B.errors).length ? ': ' + A.errors.concat(B.errors).slice(0, 3).join(' | ') : ''));
  await A.close(); await B.close();
}

(async () => {
  const srv = await serve();
  const relay = await startRelay(0);
  const base = 'http://localhost:' + srv.address().port;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  try {
    if (which === 'solo' || which === 'all') await testSolo(browser, base);
    if (which === 'mp' || which === 'all') await testMultiplayer(browser, base, relay.port);
    if (which === 'sectors' || which === 'all') await testSectors(browser, base);
  } catch (e) { console.error(e); failures++; }
  await browser.close();
  await relay.close();
  srv.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
