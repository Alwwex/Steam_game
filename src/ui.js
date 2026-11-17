// DOM user interface: menus, lobby, HUD, shop, chat, minimap.
// Player-supplied text (names, chat) is only ever inserted with textContent.

import { t, pick } from './i18n.js';
import { DLC, SECTORS } from './sectors.js';
import { UPGRADES, SUIT_COLORS, MAX_PLAYERS, TILE, VERSION } from './config.js';
import { FREE_HATS } from './hats.js';
import { FURS, QCOL } from './models.js';
import { T } from './level.js';

const css = (hex) => '#' + (hex >>> 0).toString(16).padStart(6, '0');
const FREE_HAT_NAMES = {
  none: { en: 'No hat', cs: 'Bez čepice' }, hardhat: { en: 'Hard hat', cs: 'Helma' },
  party: { en: 'Party hat', cs: 'Párty čepička' }, headlamp: { en: 'Headlamp', cs: 'Čelovka' },
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function hatName(key) {
  if (FREE_HAT_NAMES[key]) return pick(FREE_HAT_NAMES[key]);
  const d = DLC.find((x) => x.hat === key);
  return d ? pick(d.hatName) : key;
}

export class UI {
  constructor(app) {
    this.app = app;
    const root = this.root = document.getElementById('ui');
    root.innerHTML = '';
    this.hudEl = el('div', 'hud hidden');
    this.screenEl = el('div', 'screen hidden');
    this.toastEl = el('div', 'toasts');
    this.alertEl = el('div', 'alert hidden');
    this.modalEl = el('div', 'modal hidden');
    root.append(this.hudEl, this.screenEl, this.toastEl, this.alertEl);
    this.chatOpen = false;
    this.screenName = null;
    this.crewKey = '';
    this.buildHud();
    this.buildChat();
    root.append(this.modalEl);
  }

  // ------------------------------------------------------------------ helpers

  btn(text, fn, cls = '') {
    const b = el('button', ('btn ' + cls).trim(), text);
    b.addEventListener('click', (e) => { e.stopPropagation(); this.app.audio.sfx('ui'); fn(e); });
    return b;
  }

  clearToasts() { this.toastEl.innerHTML = ''; }

  screen(name, cls = '') {
    if (name !== 'pause') this.clearToasts();
    this.screenName = name;
    const s = this.screenEl;
    s.innerHTML = '';
    s.className = ('screen ' + cls).trim();
    const panel = el('div', 'panel p-' + name);
    s.appendChild(panel);
    return panel;
  }

  hideScreen() { this.screenName = null; this.screenEl.className = 'screen hidden'; this.screenEl.innerHTML = ''; }

  logo() {
    const d = el('div', 'logo');
    d.append(el('span', 'l1', 'QUBIT'), el('span', 'l2', 'CREW'));
    return d;
  }

  choice(opts, cur, fn) {
    const d = el('div', 'choice');
    for (const [v, label] of opts) {
      const b = el('button', 'opt' + (v === cur ? ' on' : ''), label);
      b.addEventListener('click', () => {
        this.app.audio.sfx('ui');
        for (const c of d.children) c.classList.remove('on');
        b.classList.add('on');
        fn(v);
      });
      d.appendChild(b);
    }
    return d;
  }

  slider(min, max, step, val, fn) {
    const i = el('input', 'slider');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
    i.addEventListener('input', () => fn(Number(i.value)));
    return i;
  }

  // ------------------------------------------------------------------ modal

  busy(text, onCancel) {
    const m = this.modalEl;
    m.innerHTML = ''; m.className = 'modal';
    const box = el('div', 'panel');
    box.append(el('div', 'spin'), el('div', 'msg', text));
    if (onCancel) box.appendChild(this.btn(t('busy.cancel'), () => onCancel()));
    m.appendChild(box);
  }

  message(text, onOk) {
    const m = this.modalEl;
    m.innerHTML = ''; m.className = 'modal';
    const box = el('div', 'panel');
    box.appendChild(el('div', 'msg', text));
    box.appendChild(this.btn(t('msg.ok'), () => { this.closeModal(); if (onOk) onOk(); }, 'primary'));
    m.appendChild(box);
  }

  closeModal() { this.modalEl.className = 'modal hidden'; this.modalEl.innerHTML = ''; }

  // ------------------------------------------------------------------ title / join

  showTitle() {
    const app = this.app, p = this.screen('title', 'left');
    p.append(this.logo(), el('div', 'tagline', t('title.tagline')));
    const nameRow = el('label', 'field');
    nameRow.appendChild(el('span', '', t('menu.name')));
    const inp = el('input');
    inp.maxLength = 18; inp.value = app.settings.name; inp.spellcheck = false;
    inp.addEventListener('change', () => app.setName(inp.value));
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Enter') inp.blur(); });
    nameRow.appendChild(inp);
    p.appendChild(nameRow);
    const menu = el('div', 'menu');
    menu.appendChild(this.btn(t('menu.solo'), () => app.playSolo(), 'primary'));
    if (app.hasSteam()) menu.appendChild(this.btn(t('menu.hostSteam'), () => app.hostSteam()));
    menu.appendChild(this.btn(t('menu.hostLan'), () => app.hostLan()));
    menu.appendChild(this.btn(t('menu.joinLan'), () => this.showJoin()));
    menu.appendChild(this.btn(t('menu.dlc'), () => this.showDlc(null, () => this.showTitle())));
    menu.appendChild(this.btn(t('menu.controls'), () => this.showHelp(() => this.showTitle())));
    menu.appendChild(this.btn(t('menu.settings'), () => this.showSettings(() => this.showTitle())));
    if (app.native) menu.appendChild(this.btn(t('menu.quit'), () => app.quit()));
    p.appendChild(menu);
    const status = app.native ? (app.steamInfo ? t('menu.steamOn', { name: app.steamInfo.name }) : t('menu.steamOff')) : t('menu.browser');
    p.appendChild(el('div', 'foot', status + '  ·  v' + VERSION));
  }

  showJoin() {
    const app = this.app, p = this.screen('join', 'left');
    p.appendChild(el('h2', '', t('join.title')));
    const row = el('label', 'field');
    row.appendChild(el('span', '', t('join.address')));
    const inp = el('input');
    inp.value = app.settings.lastAddr || ''; inp.placeholder = '192.168.1.10:7777'; inp.spellcheck = false;
    const go = () => app.joinLan(inp.value.trim());
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Enter') go(); });
    row.appendChild(inp);
    p.append(row, el('p', 'note', t('join.hint')));
    const menu = el('div', 'menu');
    menu.append(this.btn(t('join.connect'), go, 'primary'), this.btn(t('menu.back'), () => this.showTitle()));
    p.appendChild(menu);
    setTimeout(() => inp.focus(), 30);
  }

  // ------------------------------------------------------------------ lobby

  showLobby(m) {
    const app = this.app, isHost = app.isHost(), me = app.game.myId, kind = app.session ? app.session.kind : 'solo';
    const p = this.screen('lobby', 'right');
    const head = el('div', 'lob-head');
    head.appendChild(el('h2', '', kind === 'solo' ? t('lobby.solo') : kind === 'steam' ? t('lobby.steam') : t('lobby.lan')));
    if (kind === 'lan' && app.lanInfo) {
      const addrs = (app.lanInfo.addresses && app.lanInfo.addresses.length ? app.lanInfo.addresses : ['127.0.0.1']).map((a) => a + ':' + app.lanInfo.port);
      head.appendChild(el('div', 'addr', addrs.join('   ')));
    }
    p.appendChild(head);

    if (kind !== 'solo') {
      p.appendChild(el('h3', '', t('lobby.players', { n: m.players.length, max: MAX_PLAYERS })));
      const crew = el('div', 'crewlist');
      for (const pl of m.players) {
        const row = el('div', 'crew-row');
        const dot = el('span', 'dot'); dot.style.background = css(SUIT_COLORS[pl.color]);
        row.append(dot, el('span', 'nm', pl.name));
        if (pl.id === m.host) row.appendChild(el('span', 'tag', t('lobby.host')));
        if (pl.id === me) row.appendChild(el('span', 'tag you', t('lobby.you')));
        crew.appendChild(row);
      }
      p.appendChild(crew);
    }

    const mine = m.players.find((x) => x.id === me);
    if (mine) p.appendChild(this.customizer(mine, m));
    p.appendChild(el('h3', '', t('lobby.mission')));
    p.appendChild(this.missionPicker(m, isHost));

    const menu = el('div', 'menu row');
    if (isHost) menu.appendChild(this.btn(t('lobby.start'), () => app.startRun(), 'primary'));
    else menu.appendChild(el('div', 'note wait', t('lobby.waiting')));
    if (kind === 'steam') menu.appendChild(this.btn(t('lobby.invite'), () => app.invite()));
    menu.appendChild(this.btn(t('lobby.leave'), () => app.leave()));
    p.appendChild(menu);
    if (kind !== 'solo') p.appendChild(el('div', 'foot', t('lobby.chatHint')));
  }

  customizer(mine, m) {
    const app = this.app, box = el('div', 'custom');
    const sRow = el('div', 'swrow');
    sRow.appendChild(el('span', 'lbl', t('lobby.suit')));
    const taken = new Set(m.players.filter((x) => x.id !== mine.id).map((x) => x.color));
    SUIT_COLORS.forEach((c, i) => {
      const b = el('button', 'sw' + (i === mine.color ? ' on' : '') + (taken.has(i) ? ' taken' : ''));
      b.style.background = css(c);
      b.disabled = taken.has(i);
      b.addEventListener('click', () => { app.audio.sfx('ui'); app.customize({ color: i }); });
      sRow.appendChild(b);
    });
    const fRow = el('div', 'swrow');
    fRow.appendChild(el('span', 'lbl', t('lobby.fur')));
    FURS.forEach((c, i) => {
      const b = el('button', 'sw round' + (i === mine.fur ? ' on' : ''));
      b.style.background = css(c);
      b.addEventListener('click', () => { app.audio.sfx('ui'); app.customize({ fur: i }); });
      fRow.appendChild(b);
    });
    const hLbl = el('div', 'lbl', t('lobby.hat') + ': ' + hatName(mine.hat));
    const hats = el('div', 'hats');
    for (const key of FREE_HATS.concat(DLC.map((d) => d.hat))) {
      const d = DLC.find((x) => x.hat === key);
      const owned = !d || app.owned.has(d.key);
      const b = el('button', 'hat' + (key === mine.hat ? ' on' : '') + (owned ? '' : ' locked'), hatName(key));
      b.title = owned ? hatName(key) : t('lobby.lockedHat', { name: pick(d.name) });
      b.addEventListener('click', () => {
        app.audio.sfx('ui');
        if (owned) app.customize({ hat: key });
        else this.showDlc(d.key, () => this.showLobby(app.lobby));
      });
      hats.appendChild(b);
    }
    box.append(sRow, fRow, hLbl, hats);
    return box;
  }

  missionPicker(m, isHost) {
    const app = this.app, box = el('div', 'missions-wrap');
    const opts = [
      { key: 'base', name: t('mode.base'), desc: t('mode.baseDesc') },
      { key: 'tour', name: t('mode.tour'), desc: t('mode.tourDesc') },
    ];
    for (const d of DLC) opts.push({ key: d.key, name: String(d.n).padStart(2, '0') + ' · ' + pick(d.name), desc: pick(d.tag) + ' ' + t('mode.dlcDesc'), dlc: d });
    const cur = opts.find((o) => o.key === m.mode) || opts[0];
    if (!isHost) {
      const row = el('div', 'mission on static', cur.name);
      box.append(row, el('div', 'mdesc', cur.desc), el('div', 'note', t('lobby.hostPicks')));
      return box;
    }
    const list = el('div', 'missions');
    const hostOwns = new Set(m.dlc || []);
    for (const o of opts) {
      const owned = !o.dlc || hostOwns.has(o.dlc.key);
      const row = el('button', 'mission' + (o.key === m.mode ? ' on' : '') + (owned ? '' : ' locked'));
      if (o.dlc) { const sw = el('span', 'acc'); sw.style.background = o.dlc.pal.accent; row.appendChild(sw); }
      row.appendChild(el('span', 'mn', o.name));
      if (!owned) row.appendChild(el('span', 'badge', 'DLC'));
      row.addEventListener('click', () => {
        app.audio.sfx('ui');
        if (owned) app.setMode(o.key); else this.showDlc(o.dlc.key, () => this.showLobby(app.lobby));
      });
      list.appendChild(row);
    }
    box.append(list, el('div', 'mdesc', cur.desc));
    setTimeout(() => { const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }, 0);
    return box;
  }

  // ------------------------------------------------------------------ shop / game over

  showShop(m) {
    const app = this.app, p = this.screen('shop', 'center');
    const sec = SECTORS[m.sector];
    p.append(el('h2', 'big', t('shop.title', { n: m.shift })), el('div', 'sub', t('shop.sector', { name: sec ? pick(sec.name) : '' })));
    const stats = el('div', 'stats');
    stats.append(el('div', '', t('shop.delivered', { got: m.got, quota: m.quota })), el('div', '', t('shop.bonus', { n: m.bonus })));
    p.appendChild(stats);
    this.shopCredits = el('div', 'credits');
    this.shopGrid = el('div', 'upgrades');
    p.append(this.shopCredits, el('h3', '', t('shop.upgrades')), this.shopGrid);
    this.updateShop(m);
    const menu = el('div', 'menu row');
    if (app.isHost()) menu.append(this.btn(t('shop.next'), () => app.nextShift(), 'primary'), this.btn(t('shop.end'), () => app.endRun()));
    else menu.appendChild(el('div', 'note wait', t('shop.waitHost')));
    p.appendChild(menu);
  }

  updateShop(m) {
    if (this.screenName !== 'shop') return;
    this.shopCredits.textContent = t('shop.credits', { n: m.credits });
    this.shopGrid.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = m.up[u.key] || 0, card = el('div', 'upg');
      card.append(el('div', 'un', t('up.' + u.key)), el('div', 'ud', t('up.' + u.key + '.d')));
      const pips = el('div', 'pips');
      for (let i = 0; i < u.max; i++) pips.appendChild(el('span', i < lvl ? 'on' : ''));
      card.appendChild(pips);
      if (lvl >= u.max) card.appendChild(el('div', 'maxed', t('shop.max')));
      else {
        const b = this.btn(t('shop.buy', { n: u.cost[lvl] }), () => this.app.buy(u.key), 'small');
        b.disabled = m.credits < u.cost[lvl];
        card.appendChild(b);
      }
      this.shopGrid.appendChild(card);
    }
  }

  showOver(m) {
    const app = this.app, p = this.screen('over', 'center');
    p.append(el('h2', 'big bad', t('over.title')), el('div', 'sub', t('over.sub', { n: m.shift })));
    const st = el('div', 'statgrid');
    for (const [k, v] of [['over.delivered', m.stats.delivered], ['over.banished', m.stats.banished], ['over.hits', m.stats.hits], ['over.shifts', m.stats.shifts]]) {
      st.append(el('div', 'k', t(k)), el('div', 'v', String(v)));
    }
    p.appendChild(st);
    const menu = el('div', 'menu row');
    if (app.isHost()) menu.appendChild(this.btn(t('over.lobby'), () => app.endRun(), 'primary'));
    else menu.appendChild(el('div', 'note wait', t('shop.waitHost')));
    menu.appendChild(this.btn(t('pause.leave'), () => app.leave()));
    p.appendChild(menu);
  }

  // ------------------------------------------------------------------ pause / settings / help / DLC

  showPause(first) {
    const app = this.app, p = this.screen('pause', 'center dim');
    p.appendChild(el('h2', '', first ? t('pause.click') : t('pause.title')));
    if (app.session && app.session.kind !== 'solo') p.appendChild(el('div', 'note', t('pause.note')));
    const menu = el('div', 'menu');
    menu.appendChild(this.btn(t('pause.resume'), () => app.resume(), 'primary'));
    menu.appendChild(this.btn(t('menu.controls'), () => this.showHelp(() => this.showPause(first))));
    menu.appendChild(this.btn(t('menu.settings'), () => this.showSettings(() => this.showPause(first))));
    menu.appendChild(this.btn(t('pause.leave'), () => app.leave()));
    p.appendChild(menu);
  }

  showSettings(back) {
    const app = this.app, s = app.settings, p = this.screen('settings', 'center');
    p.appendChild(el('h2', '', t('set.title')));
    const grid = el('div', 'setgrid');
    const row = (label, ctrl) => grid.append(el('div', 'k', label), ctrl);
    const onOff = [[true, t('set.on')], [false, t('set.off')]];
    row(t('set.lang'), this.choice([['en', 'English'], ['cs', 'Čeština']], s.lang, (v) => { app.setSetting('lang', v); this.showSettings(back); }));
    row(t('set.volume'), this.slider(0, 1, 0.05, s.volume, (v) => app.setSetting('volume', v)));
    row(t('set.sens'), this.slider(0.3, 3, 0.05, s.sens, (v) => app.setSetting('sens', v)));
    row(t('set.pixel'), this.choice([[240, '240p'], [360, '360p'], [540, '540p'], [0, t('set.pixelFull')]], s.pixel, (v) => app.setSetting('pixel', v)));
    row(t('set.wobble'), this.choice(onOff, s.wobble, (v) => app.setSetting('wobble', v)));
    row(t('set.bob'), this.choice(onOff, s.bob, (v) => app.setSetting('bob', v)));
    row(t('set.fullscreen'), this.choice(onOff, !!s.fullscreen, (v) => app.setSetting('fullscreen', v)));
    p.appendChild(grid);
    const menu = el('div', 'menu row');
    menu.appendChild(this.btn(t('menu.back'), () => back(), 'primary'));
    p.appendChild(menu);
  }

  showHelp(back) {
    const p = this.screen('help', 'center');
    p.appendChild(el('h2', '', t('help.title')));
    for (const k of ['help.goal', 'help.qubits', 'help.anoms']) p.appendChild(el('p', '', t(k)));
    p.appendChild(el('h3', '', t('help.keys')));
    const ul = el('ul', 'keys');
    for (let i = 1; i <= 6; i++) ul.appendChild(el('li', '', t('help.k' + i)));
    p.appendChild(ul);
    const menu = el('div', 'menu row');
    menu.appendChild(this.btn(t('menu.back'), () => back(), 'primary'));
    p.appendChild(menu);
  }

  showDlc(focusKey, back) {
    const app = this.app, p = this.screen('dlc', 'center wide');
    p.append(el('h2', '', t('dlc.title')), el('p', 'note', t('dlc.intro')));
    const wrap = el('div', 'dlcwrap'), grid = el('div', 'dlcgrid'), detail = el('div', 'dlcdetail');
    const cards = new Map();
    const select = (d) => {
      for (const [k, c] of cards) c.classList.toggle('on', k === d.key);
      detail.innerHTML = '';
      detail.style.borderColor = d.pal.accent;
      const owned = app.owned.has(d.key);
      detail.append(
        el('div', 'dn', t('dlc.sector', { n: d.n })), el('h3', '', pick(d.name)), el('div', 'dtag', pick(d.tag)),
        el('p', '', pick(d.desc)), el('div', 'dhat', t('dlc.hat', { name: pick(d.hatName) })),
      );
      if (owned) detail.appendChild(el('div', 'owned', t('dlc.owned')));
      else detail.appendChild(this.btn(t('dlc.store'), () => app.openStore(d.key), 'primary'));
    };
    for (const d of DLC) {
      const c = el('button', 'dcard' + (app.owned.has(d.key) ? ' owned' : ''));
      c.style.setProperty('--acc', d.pal.accent);
      c.append(el('span', 'dn', String(d.n).padStart(2, '0')), el('span', 'dnm', pick(d.name)));
      if (app.owned.has(d.key)) c.appendChild(el('span', 'check', '✓'));
      c.addEventListener('click', () => { app.audio.sfx('ui'); select(d); });
      cards.set(d.key, c);
      grid.appendChild(c);
    }
    wrap.append(grid, detail);
    p.appendChild(wrap);
    select(DLC.find((d) => d.key === focusKey) || DLC[0]);
    const menu = el('div', 'menu row');
    menu.appendChild(this.btn(t('menu.back'), () => back(), 'primary'));
    p.appendChild(menu);
  }

  // ------------------------------------------------------------------ HUD

  miniBar(parent, cls) {
    const wrap = el('div', 'mini ' + cls), lbl = el('span', 'ml'), bar = el('div', 'mbar'), fill = el('div', 'mfill');
    bar.appendChild(fill); wrap.append(lbl, bar); parent.appendChild(wrap);
    return { lbl, fill, wrap };
  }

  buildHud() {
    const H = this.hudEl;
    const tl = el('div', 'hud-tl');
    this.hShift = el('div', 'shift');
    const cl = el('div', 'cohlabel');
    this.hCohLabel = el('span', '');
    this.hCohVal = el('span', 'val');
    cl.append(this.hCohLabel, this.hCohVal);
    const bar = el('div', 'cohbar');
    this.hCohFill = el('div', 'fill');
    bar.appendChild(this.hCohFill);
    tl.append(this.hShift, cl, bar);

    const tr = el('div', 'hud-tr');
    this.map = el('canvas', 'map');
    this.map.width = this.map.height = 168;
    this.mapCtx = this.map.getContext('2d');
    this.hQubits = el('div', 'qubits');
    this.hReady = el('div', 'ready hidden');
    tr.append(this.map, this.hQubits, this.hReady);

    this.hCrew = el('div', 'hud-bl');

    const bc = el('div', 'hud-bc');
    this.hCompass = el('div', 'compass');
    this.hArrow = el('div', 'arrow');
    this.hDist = el('div', 'dist');
    this.hCompass.append(this.hArrow, this.hDist);
    this.hCarry = el('div', 'carry');
    const bars = el('div', 'minibars');
    this.hTunnel = this.miniBar(bars, 'tun');
    this.hStam = this.miniBar(bars, 'stam');
    bc.append(this.hCompass, this.hCarry, bars);

    this.hCross = el('div', 'cross');
    this.hPrompt = el('div', 'prompt hidden');
    this.hSafe = el('div', 'safe hidden');
    this.hLight = el('div', 'lightoff hidden');
    this.hDown = el('div', 'down hidden');
    this.hDownT = el('div', 'dt');
    this.hDownS = el('div', 'ds');
    this.hDown.append(this.hDownT, this.hDownS);
    H.append(tl, tr, this.hCrew, bc, this.hCross, this.hPrompt, this.hSafe, this.hLight, this.hDown);
  }

  showHud(on) {
    this.hudEl.classList.toggle('hidden', !on);
    if (on) {
      this.hCohLabel.textContent = t('hud.coherence');
      this.hTunnel.lbl.textContent = t('hud.tunnel');
      this.hStam.lbl.textContent = t('hud.stamina');
      this.hReady.textContent = t('hud.ready');
      this.hSafe.textContent = t('hud.safe');
      this.hLight.textContent = t('hud.lightOff');
      this.hDownT.textContent = t('hud.scattered');
      this.hDownS.textContent = t('hud.rematerialise');
      this.crewKey = '';
    } else this.alert(null);
  }

  hud(d) {
    const coh = Math.max(0, d.coh);
    this.hCohFill.style.width = coh.toFixed(1) + '%';
    this.hCohFill.style.background = coh > 50 ? '#46e3ff' : coh > 25 ? '#ffd24a' : '#ff2bd0';
    this.hCohVal.textContent = Math.ceil(coh) + '%';
    this.hudEl.classList.toggle('low', coh < 25);
    this.hShift.textContent = t('hud.shift', { n: d.shift }) + ' · ' + d.sector;
    this.hQubits.textContent = t('hud.qubits') + '  ' + d.got + ' / ' + d.quota;
    this.hQubits.classList.toggle('done', d.ready);
    this.hReady.classList.toggle('hidden', !d.ready);
    let s = '';
    for (let i = 0; i < d.cap; i++) s += i < d.carry ? '◆' : '◇';
    this.hCarry.textContent = s;
    this.hTunnel.fill.style.width = (d.tunnel * 100).toFixed(0) + '%';
    this.hTunnel.wrap.classList.toggle('full', d.tunnel >= 1);
    this.hStam.fill.style.width = (d.stamina * 100).toFixed(0) + '%';
    this.hStam.wrap.classList.toggle('tired', d.tired);
    this.hArrow.style.transform = 'rotate(' + d.rel.toFixed(3) + 'rad)';
    this.hDist.textContent = Math.round(d.dist) + ' m';
    this.hPrompt.classList.toggle('hidden', !d.prompt);
    if (d.prompt) this.hPrompt.textContent = d.prompt;
    this.hSafe.classList.toggle('hidden', !d.safe || !d.alive);
    this.hLight.classList.toggle('hidden', d.light || !d.alive);
    this.hDown.classList.toggle('hidden', d.alive);
    this.hCross.classList.toggle('hidden', !d.alive);
    const key = d.players.map((p) => p.name + p.color + (p.down ? 1 : 0) + p.carry).join('|');
    if (key !== this.crewKey) {
      this.crewKey = key;
      this.hCrew.innerHTML = '';
      if (d.players.length > 1) {
        for (const p of d.players) {
          const r = el('div', 'cm' + (p.down ? ' down' : ''));
          const dot = el('span', 'dot'); dot.style.background = p.color;
          r.append(dot, el('span', 'nm', p.name), el('span', 'cc', '◆'.repeat(p.carry)));
          this.hCrew.appendChild(r);
        }
      }
    }
  }

  // North-up minimap of everything the local player has seen.
  drawMap(game, noise) {
    const c = this.mapCtx, L = game.L, me = game.me;
    if (!L || !game.explored) return;
    const S = 168, half = S / 2, px = 6;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, S, S);
    c.fillStyle = 'rgba(3,7,11,0.82)';
    c.fillRect(0, 0, S, S);
    let ox = 0, oz = 0;
    if (noise) { ox = (Math.random() - 0.5) * 12; oz = (Math.random() - 0.5) * 12; }
    const mx = me.x / TILE, mz = me.z / TILE, cx0 = Math.floor(mx), cz0 = Math.floor(mz), R = Math.ceil(half / px) + 1;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      let tx = cx0 + dx, tz = cz0 + dz;
      if (L.wrap) { tx = ((tx % L.w) + L.w) % L.w; tz = ((tz % L.h) + L.h) % L.h; } else if (tx < 0 || tz < 0 || tx >= L.w || tz >= L.h) continue;
      const i = tz * L.w + tx;
      if (!game.explored[i]) continue;
      const tt = L.tiles[i];
      c.fillStyle = L.roomId[i] === L.core.room ? '#28505c' : tt === T.MACHINE ? '#40525e' : tt === T.PHASE_A || tt === T.PHASE_B ? '#5a4420' : tt === T.BARRIER ? '#6a5c10' : L.kind[i] === 2 ? '#1a2830' : '#20343f';
      c.fillRect(Math.round(half + (cx0 + dx - mx) * px + ox), Math.round(half + (cz0 + dz - mz) * px + oz), px, px);
    }
    const rel = (x, z) => {
      let dx = x / TILE - mx, dz = z / TILE - mz;
      if (L.wrap) { dx = ((dx + L.w * 1.5) % L.w) - L.w / 2; dz = ((dz + L.h * 1.5) % L.h) - L.h / 2; }
      return [half + dx * px + ox, half + dz * px + oz];
    };
    const clampEdge = (p) => [Math.max(5, Math.min(S - 5, p[0])), Math.max(5, Math.min(S - 5, p[1]))];
    for (const v of game.qviews.values()) {
      if (v.st !== 1) continue;
      const p = rel(v.x, v.z);
      if (p[0] < 0 || p[1] < 0 || p[0] > S || p[1] > S) continue;
      c.fillStyle = css(QCOL[v.kind]);
      c.fillRect(p[0] - 2, p[1] - 2, 4, 4);
    }
    for (const pg of game.pings) {
      const p = clampEdge(rel(pg.x, pg.z));
      c.fillStyle = css(pg.color);
      c.beginPath(); c.moveTo(p[0], p[1] - 4); c.lineTo(p[0] + 4, p[1]); c.lineTo(p[0], p[1] + 4); c.lineTo(p[0] - 4, p[1]); c.fill();
    }
    const core = clampEdge(rel(L.core.x, L.core.z));
    c.fillStyle = game.ready ? (Math.sin(performance.now() / 120) > 0 ? '#40ff70' : '#1a8a38') : css(game.accentHex || 0x46e3ff);
    c.fillRect(core[0] - 4, core[1] - 4, 8, 8);
    c.strokeStyle = '#000'; c.strokeRect(core[0] - 4.5, core[1] - 4.5, 9, 9);
    const tri = (x, y, yaw, col, size) => {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x + fx * size, y + fz * size);
      c.lineTo(x - fx * size * 0.6 + fz * size * 0.6, y - fz * size * 0.6 - fx * size * 0.6);
      c.lineTo(x - fx * size * 0.6 - fz * size * 0.6, y - fz * size * 0.6 + fx * size * 0.6);
      c.closePath(); c.fill();
    };
    for (const r of game.remotes.values()) {
      if (r.flags & 2) continue;
      const p = clampEdge(rel(r.x, r.z));
      tri(p[0], p[1], r.yaw, css(SUIT_COLORS[r.color]), 5);
    }
    tri(half + ox, half + oz, me.yaw, '#ffffff', 6);
    if (noise) {
      c.fillStyle = 'rgba(214,255,74,0.35)';
      for (let i = 0; i < 40; i++) c.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    c.strokeStyle = 'rgba(70,227,255,0.6)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, S - 2, S - 2);
  }

  // ------------------------------------------------------------------ toasts / alert / chat

  toast(text, kind = 'info', secs = 3.5) {
    const d = el('div', 'toast ' + kind, text);
    this.toastEl.appendChild(d);
    while (this.toastEl.children.length > 4) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), secs * 1000);
    setTimeout(() => d.remove(), secs * 1000 + 600);
  }

  alert(text) {
    if (!text) { this.alertEl.classList.add('hidden'); return; }
    this.alertEl.textContent = text;
    this.alertEl.classList.remove('hidden');
  }

  buildChat() {
    this.chatLog = el('div', 'chatlog');
    this.chatIn = el('input', 'chatin hidden');
    this.chatIn.maxLength = 140;
    this.chatIn.spellcheck = false;
    this.root.append(this.chatLog, this.chatIn);
    this.chatIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter') { const txt = this.chatIn.value.trim(); if (txt) this.app.sendChat(txt); this.closeChat(); e.preventDefault(); }
      else if (e.code === 'Escape') { this.closeChat(); e.preventDefault(); }
    });
    window.addEventListener('keydown', (e) => {
      if (this.chatOpen || e.repeat) return;
      if ((e.code === 'Enter' || e.code === 'KeyT') && this.app.canChat()) { e.preventDefault(); this.openChat(); }
    });
  }

  openChat() {
    this.chatOpen = true;
    this.app.input.typing = true;
    this.app.input.keys.clear();
    this.chatIn.value = '';
    this.chatIn.placeholder = t('chat.placeholder');
    this.chatIn.classList.remove('hidden');
    this.chatLog.classList.add('open');
    setTimeout(() => this.chatIn.focus(), 0);
  }

  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false;
    this.app.input.typing = false;
    this.chatIn.blur();
    this.chatIn.classList.add('hidden');
    this.chatLog.classList.remove('open');
  }

  chatLine(name, text, color) {
    const line = el('div', 'cl');
    const n = el('span', 'cn', name + ': ');
    n.style.color = color;
    line.append(n, el('span', '', text));
    this.chatLog.appendChild(line);
    while (this.chatLog.children.length > 8) this.chatLog.firstChild.remove();
    setTimeout(() => line.classList.add('old'), 12000);
  }

  clearChat() { this.chatLog.innerHTML = ''; }
}
