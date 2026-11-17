// Takes a screenshot of a URL served by the dev server.  node tools/shot.js <url> <out.png> [w] [h]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [url, out, w = 1280, h = 720] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => errors.push('timeout waiting for __ready'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out });
  const info = await page.evaluate(() => (window.__info ? window.__info() : null)).catch(() => null);
  console.log(JSON.stringify({ info, errors: errors.slice(0, 15) }, null, 1));
  await browser.close();
})();
