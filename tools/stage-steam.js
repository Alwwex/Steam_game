// Prepares an upload for SteamPipe:
//   1. copies dist/win-unpacked and dist/linux-unpacked into steam/content/<platform>
//   2. writes steam/scripts/app_build.vdf using the IDs from steam_config.json
// Then upload with steamcmd (see docs/NAVOD_STEAM.md):
//   steamcmd +login <builder_account> +run_app_build <full path to steam/scripts/app_build.vdf> +quit

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'steam_config.json'), 'utf8'));
const appId = Number(cfg.appId);
if (!appId || appId === 480) {
  console.error('steam_config.json still has the test App ID 480. Put your own App ID there first (docs/NAVOD_STEAM.md, step 6).');
  process.exit(1);
}
const depots = { windows: Number(cfg.depots && cfg.depots.windows) || appId + 1, linux: Number(cfg.depots && cfg.depots.linux) || 0 };

const staged = [];
for (const [plat, dir] of [['windows', 'win-unpacked'], ['linux', 'linux-unpacked']]) {
  const src = path.join(root, 'dist', dir);
  if (!fs.existsSync(src)) continue;
  if (plat === 'linux' && !depots.linux) { console.log('skipping linux build: no linux depot id in steam_config.json'); continue; }
  const dst = path.join(root, 'steam', 'content', plat);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
  staged.push(plat);
  console.log(`staged ${dir} -> steam/content/${plat}`);
}
if (!staged.length) { console.error('Nothing to stage. Run "npm run dist:win" (and/or dist:linux) first.'); process.exit(1); }

const depotBlock = (id, plat) => `\t\t"${id}"\n\t\t{\n\t\t\t"FileMapping"\n\t\t\t{\n\t\t\t\t"LocalPath"\t"${plat}\\\\*"\n\t\t\t\t"DepotPath"\t"."\n\t\t\t\t"recursive"\t"1"\n\t\t\t}\n\t\t}\n`;
const vdf = `"AppBuild"
{
\t"AppID"\t"${appId}"
\t"Desc"\t"Qubit Crew ${require('../package.json').version}"
\t"ContentRoot"\t"..\\\\content\\\\"
\t"BuildOutput"\t"..\\\\output\\\\"
\t"Depots"
\t{
${staged.map((p) => depotBlock(depots[p], p)).join('')}\t}
}
`;
fs.mkdirSync(path.join(root, 'steam', 'scripts'), { recursive: true });
fs.writeFileSync(path.join(root, 'steam', 'scripts', 'app_build.vdf'), vdf);
console.log('wrote steam/scripts/app_build.vdf for app', appId, 'depots', staged.map((p) => p + '=' + depots[p]).join(', '));
