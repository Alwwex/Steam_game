// Bundles src/main.js into app/game.js with esbuild.  Usage: node tools/build.js [--watch] [--dev]
const esbuild = require('esbuild');
const path = require('path');
const pkg = require('../package.json');

const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');
const root = path.join(__dirname, '..');

const options = {
  entryPoints: { game: path.join(root, 'src', 'main.js') },
  bundle: true,
  outdir: path.join(root, 'app'),
  format: 'iife',
  target: ['chrome120'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  define: { __VERSION__: JSON.stringify(pkg.version), __DEV__: JSON.stringify(dev) },
  logLevel: 'info',
};
if (process.argv.includes('--preview')) {
  options.entryPoints.preview = path.join(root, 'tools', 'preview.js');
  options.entryPoints.studio = path.join(root, 'tools', 'studio.js');
}

(async () => {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watching src/ ...');
  } else {
    await esbuild.build(options);
  }
})().catch((e) => { console.error(e); process.exit(1); });
