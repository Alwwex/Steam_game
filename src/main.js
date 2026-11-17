// Entry point: wires renderer, audio, input, UI, networking and the Steam bridge together.

import { Gfx } from './gfx.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { HostSim } from './host.js';
import { Session, WsTransport, SteamTransport } from './net.js';
import { setLang, t } from './i18n.js';
import { DLC, BASE_KEYS, hatDlc } from './sectors.js';
import { PROTOCOL, MAX_PLAYERS, DEFAULT_PORT } from './config.js';
import { FREE_HATS } from './hats.js';

const SETTINGS_KEY = 'qubitcrew.settings.v1';
const STATS_KEY = 'qubitcrew.stats.v1';
const DEF_SETTINGS = {
  name: '', lang: null, volume: 0.7, sens: 1, pixel: 360, wobble: true, bob: true, fullscreen: false,
  color: 0, fur: 0, hat: 'hardhat', lastAddr: '',
};
const DEF_STATS = { shifts: 0, bestShift: 0, delivered: 0, banished: 0, tunnels: 0, entangled: 0, fullCrew: 0, sectors: [], ach: [] };

// Achievement API names. Create achievements with exactly these names in Steamworks.
const ACHIEVEMENTS = [
  ['QC_FIRST_SHIFT', (s) => s.shifts >= 1],
  ['QC_SHIFT_5', (s) => s.bestShift >= 5],
  ['QC_SHIFT_10', (s) => s.bestShift >= 10],
  ['QC_DELIVER_100', (s) => s.delivered >= 100],
  ['QC_BANISH_25', (s) => s.banished >= 25],
  ['QC_TUNNEL_100', (s) => s.tunnels >= 100],
  ['QC_ENTANGLED', (s) => s.entangled >= 1],
  ['QC_FULL_CREW', (s) => s.fullCrew >= 1],
  ['QC_TOURIST', (s) => BASE_KEYS.every((k) => s.sectors.includes(k))],
];

function loadJSON(key, def) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v && typeof v === 'object' ? { ...def, ...v } : { ...def };
  } catch (e) { return { ...def }; }
}
function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }

class App {
  constructor() {
    this.native = window.native || null;           // Electron preload bridge (undefined in a browser)
    this.params = new URLSearchParams(location.search);
    this.settings = loadJSON(SETTINGS_KEY, DEF_SETTINGS);
    this.stats = loadJSON(STATS_KEY, DEF_STATS);
    if (!Array.isArray(this.stats.sectors)) this.stats.sectors = [];
    if (!Array.isArray(this.stats.ach)) this.stats.ach = [];
    this.canvas = document.getElementById('c');
    this.gfx = new Gfx(this.canvas);
    this.audio = new AudioSys();
    this.input = new Input(this.canvas);
    this.ui = new UI(this);
    this.game = new Game(this);
    this.owned = new Set();
    this.session = null; this.host = null; this.lobby = null; this.lanInfo = null;
    this.steamInfo = null; this.nativeInfo = null; this.connectToken = 0; this.joinTimer = 0;

    this.input.onLockChange = (locked) => this.onLockChange(locked);
    const unlockAudio = () => this.audio.init();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    this.canvas.addEventListener('click', () => {
      if (this.game.state === 'play' && !this.ui.screenName && !this.ui.chatOpen) this.input.lock();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F11' && this.native) { e.preventDefault(); this.setSetting('fullscreen', !this.settings.fullscreen); }
    });
  }

  async boot() {
    if (this.native) {
      try {
        this.nativeInfo = await this.native.info();
        this.steamInfo = this.nativeInfo.steam || null;
        for (const k of this.nativeInfo.dlc || []) this.owned.add(k);
      } catch (e) { console.warn('native info failed', e); }
      if (this.native.steam) this.native.steam.onJoinRequest((lobby) => this.joinSteam(lobby));
      setInterval(() => this.refreshDlc(), 10000);
    }
    // Development only: ?dlc=all or ?dlc=dlc01,dlc05 unlocks sectors for testing.
    const q = this.params.get('dlc');
    if (q && (__DEV__ || (this.nativeInfo && this.nativeInfo.dev))) {
      for (const d of DLC) if (q === 'all' || q.split(',').includes(d.key)) this.owned.add(d.key);
    }
    const s = this.settings;
    if (!s.name) s.name = (this.steamInfo && this.steamInfo.name) || 'Cat' + (100 + Math.floor(Math.random() * 900));
    if (!s.lang) {
      const sl = this.steamInfo && this.steamInfo.lang;
      s.lang = sl ? (sl === 'czech' ? 'cs' : 'en') : (navigator.language || '').toLowerCase().startsWith('cs') ? 'cs' : 'en';
    }
    this.save();
    this.applySettings();
    this.game.showLobbyScene();
    this.titleCats();
    this.ui.showTitle();
    if (this.nativeInfo && this.nativeInfo.joinLobby) this.joinSteam(this.nativeInfo.joinLobby);

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      this.game.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.__ready = true;
  }

  // ------------------------------------------------------------------ settings

  save() { saveJSON(SETTINGS_KEY, this.settings); }

  applySettings() {
    const s = this.settings;
    setLang(s.lang);
    this.audio.setVolume(s.volume);
    this.game.me.sens = 0.0023 * s.sens;
    this.gfx.wobble = !!s.wobble;
    if (this.gfx.pixelH !== s.pixel) this.gfx.setPixelHeight(s.pixel);
    if (this.native) this.native.setFullscreen(!!s.fullscreen);
  }

  setSetting(k, v) {
    this.settings[k] = v;
    this.save();
    this.applySettings();
  }

  setName(n) {
    const clean = String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18);
    if (!clean) return;
    this.settings.name = clean;
    this.save();
    this.titleCats();
  }

  validHat(h) {
    if (FREE_HATS.includes(h)) return h;
    const d = hatDlc(h);
    return d && this.owned.has(d) ? h : 'none';
  }

  titleCats() {
    if (this.session) return;
    const s = this.settings;
    this.game.lobbyCamX = -1.5;
    this.game.setLobbyCats([{ id: 'me', name: s.name, color: s.color, fur: s.fur, hat: this.validHat(s.hat) }]);
  }

  customize(o) {
    if (o.hat != null) o.hat = this.validHat(o.hat);
    Object.assign(this.settings, o);
    this.save();
    if (this.session) this.session.toHost({ t: 'me', ...o });
    else this.titleCats();
  }

  // ------------------------------------------------------------------ platform

  hasSteam() { return !!(this.native && this.steamInfo); }
  isHost() { return !!(this.session && this.session.isHost); }
  canChat() { return !!(this.session && this.session.kind !== 'solo' && this.lobby); }
  quit() { if (this.native) this.native.quit(); }
  invite() { if (this.session && this.session.tr && this.session.tr.invite) this.session.tr.invite(); }

  openStore(key) {
    if (this.native && this.steamInfo) this.native.openStore(key);
    else this.ui.message(t('dlc.noSteam'));
  }

  async refreshDlc() {
    if (!this.native || !this.steamInfo) return;
    try {
      const list = await this.native.refreshDlc();
      if (!Array.isArray(list)) return;
      let changed = false;
      for (const k of list) if (!this.owned.has(k)) { this.owned.add(k); changed = true; }
      if (!changed) return;
      if (this.host) { this.host.owned = new Set(this.owned); this.host.sendLobby(); }
      if (this.ui.screenName === 'title') this.ui.showTitle();
    } catch (e) { /* ignore */ }
  }

  stat(k, n = 1) {
    this.stats[k] = (this.stats[k] || 0) + n;
    this.checkAchievements();
  }

  checkAchievements() {
    for (const [id, test] of ACHIEVEMENTS) {
      if (this.stats.ach.includes(id) || !test(this.stats)) continue;
      this.stats.ach.push(id);
      if (this.native) this.native.achieve(id);
    }
    saveJSON(STATS_KEY, this.stats);
  }

  // ------------------------------------------------------------------ sessions

  errText(key) {
    const s = t(key);
    return s === key ? t('err.generic', { msg: key.replace(/^err\./, '') }) : s;
  }

  fail(e) {
    const msg = String((e && e.message) || e);
    console.warn('connection failed:', msg);
    this.leave(msg.startsWith('relay:') ? null : 'err.' + msg);
    if (msg.startsWith('relay:')) this.ui.message(t('err.relay', { msg: msg.slice(6) }));
  }

  playSolo() { this.begin(new Session(null)); }

  async hostLan() {
    const token = ++this.connectToken;
    this.ui.busy(t('busy.hosting'), () => this.leave());
    try {
      let url, info;
      if (this.native) {
        info = await this.native.lan.host(DEFAULT_PORT);
        if (!info || !info.ok) throw new Error('relay:' + ((info && info.error) || 'unknown'));
        url = 'ws://127.0.0.1:' + info.port;
      } else {
        const port = Number(this.params.get('relay')) || DEFAULT_PORT;
        info = { port, addresses: [location.hostname || 'localhost'] };
        url = 'ws://' + (location.hostname || 'localhost') + ':' + port;
      }
      if (token !== this.connectToken) { if (this.native) this.native.lan.stop(); return; }
      this.lanInfo = info;
      const tr = await WsTransport.connect(url, this.params.get('room') || 'main', 'host');
      if (token !== this.connectToken) { tr.close(); return; }
      this.begin(new Session(tr));
    } catch (e) { if (token === this.connectToken) this.fail(e); }
  }

  async joinLan(addr) {
    let a = String(addr || '').trim().replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
    if (!a) return;
    if (!/^[A-Za-z0-9.\-:[\]]+$/.test(a)) { this.ui.message(t('err.bad-address')); return; }
    if (!/:\d+$/.test(a) || /^[^[]*:[^:]*:/.test(a)) a += ':' + DEFAULT_PORT;
    this.settings.lastAddr = addr; this.save();
    const token = ++this.connectToken;
    this.ui.busy(t('busy.connecting'), () => this.leave());
    try {
      const tr = await WsTransport.connect('ws://' + a, this.params.get('room') || 'main', 'client');
      if (token !== this.connectToken) { tr.close(); return; }
      this.begin(new Session(tr));
    } catch (e) { if (token === this.connectToken) this.fail(e); }
  }

  async hostSteam() {
    if (!this.hasSteam()) { this.ui.message(t('err.steam')); return; }
    const token = ++this.connectToken;
    this.ui.busy(t('busy.steam'), () => this.leave());
    try {
      const tr = await SteamTransport.host(this.native, MAX_PLAYERS, false);
      if (token !== this.connectToken) { tr.close(); return; }
      this.begin(new Session(tr));
    } catch (e) { if (token === this.connectToken) this.fail(e); }
  }

  async joinSteam(lobbyId) {
    if (!this.hasSteam() || !lobbyId) return;
    if (this.session) this.leave();
    const token = ++this.connectToken;
    this.ui.busy(t('busy.joining'), () => this.leave());
    try {
      const tr = await SteamTransport.join(this.native, lobbyId);
      if (token !== this.connectToken) { tr.close(); return; }
      this.begin(new Session(tr));
    } catch (e) { if (token === this.connectToken) this.fail(e); }
  }

  begin(session) {
    this.session = session;
    this.lobby = null;
    this.input.unlock();
    if (session.isHost) this.host = new HostSim(session, { ownedDlc: [...this.owned] });
    this.game.attach(session);
    session.onClosed = (why) => this.leave('err.' + why);
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if (this.session === session && !this.lobby) this.leave('err.timeout'); }, 12000);
    const s = this.settings;
    session.toHost({ t: 'hi', v: PROTOCOL, name: s.name, color: s.color, fur: s.fur, hat: this.validHat(s.hat), dlc: [...this.owned] });
    this.ui.busy(t('busy.joining'), () => this.leave());
  }

  leave(reasonKey) {
    this.connectToken++;
    clearTimeout(this.joinTimer);
    if (this.host) { this.host.destroy(); this.host = null; }
    if (this.session) { const s = this.session; this.session = null; s.close(); }
    if (this.native && this.lanInfo) this.native.lan.stop();
    this.lanInfo = null; this.lobby = null;
    this.input.unlock();
    this.ui.showHud(false);
    this.ui.closeChat();
    this.ui.clearChat();
    this.game.detach();
    this.game.showLobbyScene();
    this.titleCats();
    this.ui.showTitle();
    if (reasonKey) this.ui.message(this.errText(reasonKey)); else this.ui.closeModal();
  }

  // ------------------------------------------------------------------ host controls

  setMode(m) { if (this.host) this.host.setMode(m); }
  startRun() { if (this.host) this.host.start(); }
  nextShift() { if (this.host) this.host.nextShift(); }
  endRun() { if (this.host) this.host.toLobby(); }
  buy(key) { if (this.session) this.session.toHost({ t: 'a', k: 'buy', key }); }
  sendChat(text) { if (this.session) this.session.toHost({ t: 'a', k: 'chat', text }); }

  // ------------------------------------------------------------------ callbacks from Game

  onWelcome() { /* the lobby message right after this one closes the "joining" dialog */ }

  onLobby(m) {
    const prev = this.lobby;
    this.lobby = m;
    if (!prev) {
      clearTimeout(this.joinTimer);
      this.ui.closeModal();
      if (this.game.state !== 'play') {
        this.game.showLobbyScene();
        this.game.lobbyCamX = 1.7;
        this.game.setLobbyCats(m.players);
        this.ui.showLobby(m);
      }
      return;
    }
    const before = new Map(prev.players.map((p) => [p.id, p.name]));
    const now = new Set(m.players.map((p) => p.id));
    for (const p of m.players) if (!before.has(p.id)) this.ui.toast(t('toast.joined', { name: p.name }), 'info');
    for (const [id, name] of before) if (!now.has(id)) this.ui.toast(t('toast.left', { name }), 'info');
    if (this.game.state === 'lobby' && this.ui.screenName === 'lobby') this.ui.showLobby(m);
  }

  onLevelStart(m, sector) {
    this.ui.closeModal();
    this.ui.hideScreen();
    this.ui.showHud(true);
    if (!this.input.locked && !this.input.fake) { this.ui.showPause(true); this.setPaused(true); } else this.setPaused(false);
    if (!this.stats.sectors.includes(sector.key)) this.stats.sectors.push(sector.key);
    if (this.lobby && this.lobby.players.length >= 4) this.stats.fullCrew++;
    this.checkAchievements();
  }

  onShiftEnd(m) {
    this.input.unlock();
    this.setPaused(false);
    this.ui.showHud(false);
    this.ui.showShop(m);
    this.stats.shifts++;
    this.stats.bestShift = Math.max(this.stats.bestShift, m.shift);
    this.checkAchievements();
  }

  onShop(m) { this.ui.updateShop(m); }

  onGameOver(m) {
    this.input.unlock();
    this.setPaused(false);
    this.ui.showHud(false);
    this.ui.showOver(m);
  }

  onBackToLobby() {
    this.game.showLobbyScene();
    this.game.lobbyCamX = 1.7;
    if (this.lobby) { this.game.setLobbyCats(this.lobby.players); this.ui.showLobby(this.lobby); }
  }

  // ------------------------------------------------------------------ pause / pointer lock

  setPaused(p) {
    const solo = this.session && this.session.kind === 'solo';
    this.game.paused = !!(p && solo);
    if (this.host) this.host.paused = !!(p && solo);
  }

  onLockChange(locked) {
    if (locked) {
      if (this.ui.screenName === 'pause') this.ui.hideScreen();
      this.setPaused(false);
    } else if (this.game.state === 'play' && !this.ui.screenName) {
      this.ui.closeChat();
      this.ui.showPause(false);
      this.setPaused(true);
    }
  }

  resume() {
    this.ui.hideScreen();
    if (this.input.fake) { this.setPaused(false); return; }
    this.input.lock();
  }
}

const app = new App();
if (__DEV__) window.__qc = app;
app.boot();
