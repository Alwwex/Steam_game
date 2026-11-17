// Quick browser smoke test: title -> solo lobby -> in game. Saves screenshots.
// node tools/smoke.js <outdir> [query]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const query = process.argv[3] || '';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('http://localhost:5173/' + query);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'title.png') });
  await page.click('text=Play solo');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'lobby.png') });
  await page.evaluate(() => { const a = window.__qc; a.input.fake = true; a.startRun(); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const a = window.__qc; a.ui.hideScreen(); a.setPaused(false); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, 'game.png') });
  const info = await page.evaluate(() => { const a = window.__qc, g = a.game; return { state: g.state, coh: g.coh, quota: g.quota, q: g.qviews.size, an: g.anoms.size, tris: a.gfx.renderer.info.render.triangles, calls: a.gfx.renderer.info.render.calls }; });
  console.log(JSON.stringify({ info, errors: errors.slice(0, 20) }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
