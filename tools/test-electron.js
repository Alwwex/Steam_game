// Launches the real Electron app (no Steam client available -> offline mode) and checks it works,
// including hosting a LAN game that a second (browser) client joins.
//   xvfb-run -a node tools/test-electron.js [screenshotDir] [electronExecutable]
const path = require('path');
const http = require('http');
const fs = require('fs');
const { _electron: electron, chromium } = require('/opt/node-tools/node_modules/playwright');

const shotDir = process.argv[2] || null;
const exe = process.argv[3] || path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron');
const packaged = !!process.argv[3];
let failures = 0;
const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) failures++; };

(async () => {
  const args = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  if (!packaged) args.push(path.join(__dirname, '..'));
  const appProc = await electron.launch({ executablePath: exe, args, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' } });
  const logs = [];
  appProc.process().stdout.on('data', (d) => logs.push(String(d)));
  appProc.process().stderr.on('data', (d) => logs.push(String(d)));
  const win = await appProc.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await win.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await win.waitForTimeout(1500);
  if (shotDir) await win.screenshot({ path: path.join(shotDir, 'electron-title.png') });
  const native = await win.evaluate(async () => { const i = await window.native.info(); return { hasNative: !!window.native, steam: i.steam, dlc: i.dlc, dev: i.dev, nodeAccess: typeof window.require }; });
  console.log('  info:', JSON.stringify(native));
  ok(native.hasNative && native.nodeAccess === 'undefined', 'preload bridge present, page has no Node.js access');
  ok(native.steam === null, 'runs without a Steam client (offline mode)');
  const footer = await win.textContent('.foot');
  ok(/Steam/.test(footer), 'title shows Steam status: ' + footer.trim());

  // Host a LAN game from Electron, join it from a browser page that loads the same build.
  await win.click('text=Host LAN game');
  await win.waitForFunction(() => document.querySelector('.p-lobby') !== null, null, { timeout: 15000 });
  const addr = await win.textContent('.addr');
  ok(/:\d+/.test(addr), 'LAN lobby shows the join address: ' + addr.trim());
  const port = Number((addr.match(/:(\d+)/) || [])[1]);

  const root = path.join(__dirname, '..', 'app');
  const srv = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    fs.readFile(path.join(root, p === '/' ? 'index.html' : p), (err, data) => { if (err) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(data); } });
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:' + srv.address().port + '/');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.click('text=Join by IP');
  await page.fill('.p-join input', '127.0.0.1:' + port);
  await page.click('text=Connect');
  await page.waitForFunction(() => document.querySelector('.p-lobby') !== null, null, { timeout: 15000 });
  await win.waitForTimeout(800);
  const crew = await win.$$eval('.crew-row', (rows) => rows.length);
  ok(crew === 2, 'browser client joined the Electron-hosted LAN game (crew of ' + crew + ')');
  await win.click('text=Start shift');
  await win.waitForTimeout(1500);
  const states = [await win.evaluate(() => document.querySelector('.p-pause') !== null), await page.evaluate(() => document.querySelector('.p-pause') !== null)];
  ok(states[0] && states[1], 'both players got into the level ("click to play")');
  if (shotDir) await win.screenshot({ path: path.join(shotDir, 'electron-level.png') });
  await win.click('text=Leave game');
  await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.querySelector('.p-title') !== null), 'client is told when the Electron host leaves');
  ok(errors.length === 0, 'no errors in the Electron window' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  srv.close();
  await appProc.close();
  const steamLog = logs.join('').split('\n').filter((l) => l.includes('[steam]')).slice(0, 3);
  console.log('  main-process log:', steamLog.join(' / ') || '(none)');
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nELECTRON CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
