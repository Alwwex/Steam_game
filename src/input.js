// Keyboard + mouse with pointer lock. "hit" = pressed this frame, "down" = currently held.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set(); this.pressed = new Set();
    this.mx = 0; this.my = 0;
    this.locked = false; this.fake = false; this.typing = false;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (this.typing) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (this.locked && (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => { if (this.locked) { this.mx += e.movementX || 0; this.my += e.movementY || 0; } });
    document.addEventListener('mousedown', (e) => { if (this.locked) { this.pressed.add('Mouse' + e.button); this.keys.add('Mouse' + e.button); } });
    document.addEventListener('mouseup', (e) => this.keys.delete('Mouse' + e.button));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.keys.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }
  get active() { return this.locked || this.fake; }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  down(...codes) { for (const c of codes) if (this.keys.has(c)) return true; return false; }
  hit(...codes) { for (const c of codes) if (this.pressed.has(c)) return true; return false; }
  endFrame() { this.pressed.clear(); this.mx = 0; this.my = 0; }
}
