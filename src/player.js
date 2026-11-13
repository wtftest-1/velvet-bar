// First-person controller: pointer lock (click-and-drag fallback), WASD, collisions, stairs & stage step.
import * as THREE from 'three';
import { groundY, DOOR } from './plan.js';

const RADIUS = 0.28, EYE = 1.65;

export class Player {
  constructor(camera, dom, world) {
    this.camera = camera; this.dom = dom; this.world = world;
    this.x = 0; this.z = 6.2; this.y = 0; this.yaw = Math.PI; this.pitch = 0; this.floor = 0;
    this.fly = false; this.flyY = 4; this.keys = new Set(); this.enabled = false; this.dragMode = false; this.dragging = false; this.bob = 0; this.vx = 0; this.vz = 0;
    this.onLockChange = () => {}; this.onLockError = () => {};
    camera.rotation.order = 'YXZ';
    const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
    window.addEventListener('keydown', e => { if (typing(e)) return; this.keys.add(e.code); if (this.enabled && e.code.startsWith('Arrow')) e.preventDefault(); });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', e => { if (this.enabled && this.locked) this.look(e.movementX, e.movementY); else if (this.enabled && this.dragging) this.look(e.movementX, e.movementY); });
    dom.addEventListener('pointerdown', e => { if (this.enabled && !this.locked && this.dragMode) { this.dragging = true; dom.setPointerCapture?.(e.pointerId); } });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    document.addEventListener('pointerlockchange', () => this.onLockChange(this.locked));
    document.addEventListener('pointerlockerror', () => { this.dragMode = true; this.onLockError(); });
  }
  get locked() { return document.pointerLockElement === this.dom; }
  lock() {
    try { const r = this.dom.requestPointerLock?.(); if (r?.catch) r.catch(() => { this.dragMode = true; this.onLockError(); }); } catch { this.dragMode = true; this.onLockError(); }
    setTimeout(() => { if (this.enabled && !this.locked) { this.dragMode = true; } }, 700);
  }
  unlock() { if (this.locked) document.exitPointerLock(); }
  look(dx, dy) { this.yaw += dx * 0.0022;  // + because the world is mirrored (see world.js)
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * 0.0022)); }
  teleport(x, z, yaw, floor) { this.x = x; this.z = z; this.yaw = yaw ?? this.yaw; this.floor = floor ?? this.floor; this.y = groundY(x, z, this.floor); this.pitch = 0; }
  disable() { this.enabled = false; this.dragging = false; this.keys.clear(); this.vx = this.vz = 0; }

  rects() {
    const r = this.world.rects[this.floor];
    return this.floor === 0 && !this.world.fx.door.open ? [...r, DOOR.rect] : r;
  }

  setCamera(camY) { this.camera.position.set(-this.x, camY, this.z); this.camera.rotation.set(this.pitch, -this.yaw, 0); } // -x/-yaw: the world is mirrored (see world.js)

  update(dt) {
    if (this.fly) { this.updateFly(dt); return; }
    if (this.enabled) {
      const k = this.keys, turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0), pit = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
      if (turn) this.yaw -= turn * 1.9 * dt; if (pit) this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + pit * 1.4 * dt));
      const f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const run = k.has('ShiftLeft') || k.has('ShiftRight'), sp = run ? 4.4 : 2.4;
      let dx = -Math.sin(this.yaw) * f + Math.cos(this.yaw) * s, dz = -Math.cos(this.yaw) * f - Math.sin(this.yaw) * s;
      const l = Math.hypot(dx, dz); if (l > 0) { dx /= l; dz /= l; }
      const a = Math.min(1, dt * 12); this.vx += (dx * sp - this.vx) * a; this.vz += (dz * sp - this.vz) * a;
    } else { this.vx = this.vz = 0; }
    const sp2 = Math.hypot(this.vx, this.vz);
    if (sp2 > 0.01) {
      this.x += this.vx * dt; this.z += this.vz * dt;
      for (let it = 0; it < 3; it++) for (const r of this.rects()) {
        const cx = Math.max(r.x0, Math.min(this.x, r.x1)), cz = Math.max(r.z0, Math.min(this.z, r.z1)), ddx = this.x - cx, ddz = this.z - cz, d2 = ddx * ddx + ddz * ddz;
        if (d2 < RADIUS * RADIUS) {
          if (d2 > 1e-8) { const d = Math.sqrt(d2), push = RADIUS - d; this.x += ddx / d * push; this.z += ddz / d * push; }
          else { const l = this.x - r.x0, rr = r.x1 - this.x, t = this.z - r.z0, b = r.z1 - this.z, m = Math.min(l, rr, t, b); if (m === l) this.x = r.x0 - RADIUS; else if (m === rr) this.x = r.x1 + RADIUS; else if (m === t) this.z = r.z0 - RADIUS; else this.z = r.z1 + RADIUS; }
        }
      }
      this.x = Math.max(-33.5, Math.min(33.5, this.x)); this.z = Math.min(this.z, 31);
      this.bob += sp2 * dt * 2.6;
    }
    const ty = groundY(this.x, this.z, this.floor); this.y += (ty - this.y) * Math.min(1, dt * 14);
    this.floor = this.y > 2.5 ? 1 : 0;
    const bobY = Math.sin(this.bob) * 0.022 * Math.min(1, sp2 / 2);
    this.setCamera(this.y + EYE + bobY);
  }

  /** Free-roam camera for build mode: no collisions, Q/E down/up. */
  updateFly(dt) {
    const k = this.keys; let dx = 0, dz = 0, dy = 0;
    if (this.enabled) {
      const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0), pit = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
      if (turn) this.yaw -= turn * 1.9 * dt; if (pit) this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + pit * 1.4 * dt));
      const f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const sp = k.has('ShiftLeft') || k.has('ShiftRight') ? 11 : 4.5;
      dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) * sp; dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) * sp; dy = ((k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0)) * sp * 0.7;
    }
    this.x = Math.max(-33, Math.min(33, this.x + dx * dt)); this.z = Math.max(-30, Math.min(30, this.z + dz * dt)); this.flyY = Math.max(0.5, Math.min(14, this.flyY + dy * dt));
    this.floor = this.flyY > 3.2 ? 1 : 0; this.setCamera(this.flyY);
  }
}
