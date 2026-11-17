// The local player's first-person controller. Movement is simulated on each player's own
// machine (it feels instant) and reported to the host.

import { P, WALL_H } from './config.js';
import { clamp } from './rng.js';
import { WHO, moveCircle, circleHits, wrapPos, unstick } from './level.js';

export function defaultMods() {
  return {
    speed: 1, accel: 12, grav: 1, jump: 1, invert: false, invertLook: false,
    pushX: 0, pushZ: 0, driftX: 0, driftZ: 0, lightOff: false, tunnelCd: 1,
    glitch: 0, invertColors: 0, warp: 0, mapNoise: false, wade: 0, alert: null,
  };
}

export class LocalPlayer {
  constructor() {
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0; this.onGround = true;
    this.stamina = P.STAMINA; this.tired = false; this.tunnelCd = 0;
    this.lightOn = true; this.sprinting = false; this.canMove = true;
    this.bob = 0; this.lastStep = 0; this.carry = 0; this.sens = 0.0023;
    this.events = [];
  }

  spawn(x, z, yaw = 0) {
    this.x = x; this.z = z; this.y = 0; this.vx = this.vy = this.vz = 0;
    this.yaw = yaw; this.pitch = 0; this.onGround = true; this.stamina = P.STAMINA; this.tired = false;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }

  // stats: { stamina, tunnelCd }  m: modifiers from the sector mutator
  update(dt, inp, L, m, phase, stats) {
    const ev = this.events; ev.length = 0;
    if (inp.active) {
      const s = m.invertLook ? -1 : 1;
      this.yaw -= inp.mx * this.sens * s;
      this.pitch = clamp(this.pitch - inp.my * this.sens * s, -1.45, 1.45);
    }
    let f = 0, s = 0;
    if (this.canMove && inp.active) {
      f = (inp.down('KeyW', 'ArrowUp') ? 1 : 0) - (inp.down('KeyS', 'ArrowDown') ? 1 : 0);
      s = (inp.down('KeyD', 'ArrowRight') ? 1 : 0) - (inp.down('KeyA', 'ArrowLeft') ? 1 : 0);
    }
    if (m.invert) { f = -f; s = -s; }
    const moving = f !== 0 || s !== 0;
    const len = Math.hypot(f, s) || 1; f /= len; s /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = -sin * f + cos * s, wz = -cos * f - sin * s;

    if (this.stamina <= 0) this.tired = true; else if (this.stamina > 1.2) this.tired = false;
    const sprint = inp.active && inp.down('ShiftLeft', 'ShiftRight') && moving && !this.tired;
    if (sprint) this.stamina = Math.max(0, this.stamina - dt);
    else this.stamina = Math.min(stats.stamina, this.stamina + P.STAMINA_REGEN * dt * (moving ? 0.6 : 1));
    this.sprinting = sprint;

    const speed = (sprint ? P.SPRINT : P.WALK) * m.speed * (1 - 0.05 * this.carry);
    const k = 1 - Math.exp(-(this.onGround ? m.accel : Math.min(m.accel, 2.5)) * dt);
    this.vx += (wx * speed - this.vx) * k; this.vz += (wz * speed - this.vz) * k;
    this.vx += m.pushX * dt; this.vz += m.pushZ * dt;

    if (this.onGround && this.canMove && inp.active && inp.hit('Space')) { this.vy = P.JUMP * m.jump; this.onGround = false; ev.push({ k: 'jump' }); }
    this.vy -= P.GRAV * m.grav * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      if (!this.onGround && this.vy < -3) ev.push({ k: 'land' });
      this.y = 0; this.vy = 0; this.onGround = true;
    }
    const maxY = WALL_H - 0.3 - P.EYE;
    if (this.y > maxY) { this.y = maxY; if (this.vy > 0) this.vy = 0; }

    const hit = moveCircle(L, this, (this.vx + m.driftX) * dt, (this.vz + m.driftZ) * dt, P.R, WHO.PLAYER, phase);
    if (hit & 1) this.vx = 0;
    if (hit & 2) this.vz = 0;
    if (wrapPos(L, this)) ev.push({ k: 'wrap' });
    unstick(L, this, P.R, WHO.PLAYER, phase);

    this.tunnelCd = Math.max(0, this.tunnelCd - dt);
    if (this.canMove && inp.active && inp.hit('KeyQ', 'Mouse2')) this.tryTunnel(L, phase, stats, ev);
    if (inp.active && inp.hit('KeyF')) { this.lightOn = !this.lightOn; ev.push({ k: 'light' }); }

    const sp = this.speed;
    if (this.onGround && sp > 0.6) {
      this.bob += dt * sp * 1.9;
      const st = Math.floor(this.bob / Math.PI);
      if (st !== this.lastStep) { this.lastStep = st; ev.push({ k: 'step' }); }
    }
    return ev;
  }

  // Quantum tunnelling: jump to the farthest free spot ahead, even if a wall is in between.
  tryTunnel(L, phase, stats, ev) {
    if (this.tunnelCd > 0) { ev.push({ k: 'tunnelFail' }); return false; }
    const dx = -Math.sin(this.yaw), dz = -Math.cos(this.yaw);
    for (let d = P.TUNNEL_DIST; d >= 1.2; d -= 0.2) {
      const x = this.x + dx * d, z = this.z + dz * d;
      if (circleHits(L, x, z, P.R, WHO.PLAYER, phase)) continue;
      const from = [this.x, this.z];
      this.x = x; this.z = z; this.tunnelCd = stats.tunnelCd;
      wrapPos(L, this);
      ev.push({ k: 'tunnel', from, to: [this.x, this.z] });
      return true;
    }
    ev.push({ k: 'tunnelFail' });
    return false;
  }

  applyToCamera(cam, bobScale = 1) {
    const sp = Math.min(1, this.speed / P.WALK);
    const by = this.onGround ? Math.sin(this.bob * 2) * 0.035 * sp * bobScale : 0;
    const bx = this.onGround ? Math.cos(this.bob) * 0.02 * sp * bobScale : 0;
    const cos = Math.cos(this.yaw), sin = Math.sin(this.yaw);
    cam.position.set(this.x + cos * bx, this.y + P.EYE + by, this.z - sin * bx);
    cam.rotation.set(this.pitch, this.yaw, 0);
  }
}
