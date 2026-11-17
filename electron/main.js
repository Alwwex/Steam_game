// Electron main process: creates the game window, talks to Steam, runs the LAN relay.

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const steam = require('./steam');
const { startRelay } = require('../server/relay');

const ROOT = path.join(__dirname, '..');
const DEV = !app.isPackaged;

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'steam_config.json'), 'utf8')); } catch (e) { return { appId: 480, dlc: {} }; }
}

// Steam passes "+connect_lobby <id>" when the game is started from an invite.
function lobbyFromArgs(argv) {
  const i = argv.indexOf('+connect_lobby');
  return i >= 0 && argv[i + 1] && /^\d+$/.test(argv[i + 1]) ? argv[i + 1] : null;
}

const config = loadConfig();
const steamState = process.env.QC_NO_STEAM ? { ok: false } : steam.init(config, { dev: DEV });
if (steamState.restarting) app.quit();

let win = null;
let relay = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 540,
    backgroundColor: '#000000', show: false, title: 'Qubit Crew', autoHideMenuBar: true,
    icon: path.join(ROOT, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,   // keep the host simulation running when the window is in the background
    },
  });
  Menu.setApplicationMenu(null);
  const query = {};
  if (DEV && process.env.QC_DLC) query.dlc = process.env.QC_DLC;   // e.g. QC_DLC=all npm start
  win.loadFile(path.join(ROOT, 'app', 'index.html'), { query });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  if (DEV) win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools(); });
  win.on('closed', () => { win = null; });
  steam.setWindow(win);
}

// ---------------------------------------------------------------- IPC

ipcMain.handle('qc:info', () => ({
  steam: steam.info(),
  dlc: steam.ownedDlc(),
  dev: DEV,
  version: app.getVersion(),
  platform: process.platform,
  joinLobby: lobbyFromArgs(process.argv),
}));
ipcMain.handle('qc:dlc', () => steam.ownedDlc());
ipcMain.on('qc:quit', () => app.quit());
ipcMain.on('qc:fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('qc:store', (e, key) => steam.openStore(String(key)));
ipcMain.on('qc:achieve', (e, id) => steam.achieve(String(id)));

ipcMain.handle('lan:host', async (e, port) => {
  if (relay) { await relay.close(); relay = null; }
  const first = Number(port) || 7777;
  for (let p = first; p < first + 10; p++) {
    try {
      relay = await startRelay(p);
      return { ok: true, port: relay.port, addresses: relay.addresses };
    } catch (err) {
      if (err.code !== 'EADDRINUSE') return { ok: false, error: err.message };
    }
  }
  return { ok: false, error: 'no free port' };
});
ipcMain.handle('lan:stop', async () => { if (relay) { await relay.close(); relay = null; } return true; });

ipcMain.handle('steam:create', (e, max, pub) => steam.createLobby(max, pub));
ipcMain.handle('steam:join', (e, id) => steam.joinLobby(String(id)));
ipcMain.on('steam:leave', () => steam.leaveLobby());
ipcMain.on('steam:invite', () => steam.invite());
ipcMain.on('steam:send', (e, to, text, reliable) => steam.send(String(to), String(text), !!reliable));
ipcMain.on('steam:broadcast', (e, text, reliable) => steam.broadcast(String(text), !!reliable));

// ---------------------------------------------------------------- lifecycle

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  steam.shutdown();
  if (relay) relay.close();
});
