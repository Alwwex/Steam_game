// All sound is synthesised with WebAudio at runtime - no audio files, nothing to license.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class AudioSys {
  constructor() {
    this.ctx = null; this.vol = 0.7;
    this.lx = 0; this.lz = 0; this.lyaw = 0;
    this.danger = 0; this.lastBeat = -1;
  }

  // Must be called from a user gesture (click / key press).
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(ctx.destination);
    const len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // Ambient facility hum.
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0.05;
    for (const f of [55, 55.7, 82.4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    lp.connect(this.humGain); this.humGain.connect(this.master);

    // Danger layer: a pulsing low tone that swells when an anomaly is close.
    this.dangerGain = ctx.createGain(); this.dangerGain.gain.value = 0;
    const dOsc = ctx.createOscillator(); dOsc.type = 'triangle'; dOsc.frequency.value = 46;
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 2.2; const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
    dOsc.connect(trem); trem.connect(this.dangerGain); this.dangerGain.connect(this.master); dOsc.start();
    this.lfo = lfo;
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setListener(x, z, yaw) { this.lx = x; this.lz = z; this.lyaw = yaw; }

  setDanger(v) {
    if (!this.ctx) return;
    this.danger += (clamp(v, 0, 1) - this.danger) * 0.08;
    this.dangerGain.gain.value = this.danger * 0.22;
    this.lfo.frequency.value = 1.6 + this.danger * 3.5;
  }

  out(pan) {
    if (!pan || !this.ctx.createStereoPanner) return this.master;
    const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.master);
    return p;
  }

  tone(freq, dur, type = 'sine', vol = 0.2, to = 0, when = 0, pan = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to > 0) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out(pan)); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.2, freq = 1000, q = 1, when = 0, pan = 0, to = 0) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to > 0) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(pan)); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // Plays a named effect. Pass x,z for a positional sound.
  sfx(name, x, z) {
    if (!this.ctx) return;
    let v = 1, pan = 0;
    if (x != null) {
      const dx = x - this.lx, dz = z - this.lz, d = Math.hypot(dx, dz);
      v = clamp(1 - d / 30, 0, 1) ** 2;
      if (v < 0.01) return;
      if (d > 0.5) pan = clamp((dx * Math.cos(this.lyaw) - dz * Math.sin(this.lyaw)) / d, -1, 1) * 0.8;
    }
    const T = (f, d, ty, vol, to, w) => this.tone(f, d, ty, vol * v, to, w, pan);
    const N = (d, vol, f, q, w, to) => this.noise(d, vol * v, f, q, w, pan, to);
    switch (name) {
      case 'step': N(0.05, 0.05, 260 + Math.random() * 120, 1.5); break;
      case 'splash': N(0.12, 0.07, 900 + Math.random() * 400, 0.8); break;
      case 'jump': T(210, 0.1, 'triangle', 0.08, 330); break;
      case 'land': N(0.09, 0.12, 160, 1); break;
      case 'tunnel': N(0.3, 0.25, 3000, 0.7, 0, 200); T(880, 0.28, 'sine', 0.14, 110); T(1320, 0.2, 'sine', 0.06, 220, 0.03); break;
      case 'tunnelFail': T(120, 0.07, 'square', 0.06); T(100, 0.09, 'square', 0.06, 0, 0.09); break;
      case 'collapse': T(1320, 0.2, 'sine', 0.16, 660); T(1980, 0.12, 'triangle', 0.08, 990, 0.02); break;
      case 'collapseMiss': T(520, 0.3, 'triangle', 0.12, 240); break;
      case 'pick': T(660, 0.08, 'square', 0.07); T(990, 0.12, 'square', 0.07, 0, 0.07); break;
      case 'deposit': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.14, 'triangle', 0.13, 0, i * 0.055)); break;
      case 'bonus': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => T(f, 0.18, 'square', 0.08, 0, i * 0.06)); break;
      case 'ready': [392, 523, 659, 784, 1047].forEach((f, i) => T(f, 0.3, 'triangle', 0.15, 0, i * 0.11)); break;
      case 'hit': N(0.5, 0.4, 900, 0.5, 0, 90); T(220, 0.6, 'sawtooth', 0.18, 40); break;
      case 'respawn': T(220, 0.35, 'sine', 0.12, 880); break;
      case 'ban': T(300, 0.4, 'sine', 0.14, 1500); N(0.35, 0.12, 2500, 2); break;
      case 'steal': [900, 700, 500].forEach((f, i) => T(f, 0.07, 'square', 0.09, 0, i * 0.06)); break;
      case 'drop': T(400, 0.12, 'triangle', 0.1, 800); break;
      case 'zap': N(0.16, 0.3, 2400, 3); T(110, 0.2, 'sawtooth', 0.14, 60); break;
      case 'alert': T(880, 0.1, 'square', 0.07); T(880, 0.1, 'square', 0.07, 0, 0.16); break;
      case 'ui': T(700, 0.035, 'square', 0.05); break;
      case 'buy': T(660, 0.07, 'square', 0.08); T(880, 0.07, 'square', 0.08, 0, 0.07); T(1320, 0.14, 'square', 0.08, 0, 0.14); break;
      case 'deny': T(160, 0.14, 'square', 0.07); break;
      case 'ping': T(1046, 0.1, 'sine', 0.12); T(1568, 0.2, 'sine', 0.12, 0, 0.09); break;
      case 'swap': T(300, 0.3, 'sine', 0.14, 1200); T(1200, 0.3, 'sine', 0.1, 300, 0.05); break;
      case 'boxGood': [659, 784, 1047].forEach((f, i) => T(f, 0.12, 'triangle', 0.12, 0, i * 0.07)); break;
      case 'boxBad': T(180, 0.5, 'sawtooth', 0.16, 70); N(0.3, 0.2, 500, 1); break;
      case 'vp': T(1400, 0.1, 'sine', 0.1, 2100); break;
      case 'wave': N(0.9, 0.3, 200, 0.6, 0, 1800); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, 0.22, 'triangle', 0.14, 0, i * 0.12)); break;
      case 'over': [392, 330, 262, 196, 131].forEach((f, i) => T(f, 0.45, 'sawtooth', 0.1, 0, i * 0.22)); break;
      case 'light': T(1800, 0.02, 'square', 0.04); break;
      case 'chat': T(1200, 0.03, 'sine', 0.05); break;
      default: break;
    }
  }

  // Four-on-the-floor kick for the disco sector, locked to the shared level clock.
  beat(t, muted) {
    if (!this.ctx) return;
    const b = Math.floor(t * 2);
    if (b === this.lastBeat) return;
    this.lastBeat = b;
    if (muted) return;
    this.tone(120, 0.16, 'sine', 0.22, 40);
    if (b % 2) this.noise(0.04, 0.05, 6000, 2);
    if (b % 8 === 0) this.tone([196, 233, 262, 175][(b / 8) % 4 | 0], 0.5, 'sawtooth', 0.04);
  }
}
