// Stylised low-poly people with walk / sit / play animations, plus staff & performers.
import * as THREE from 'three';
import { groundY, STAGE, STAIRS } from './plan.js';
import { blobMat } from './furniture.js';

const G = {};
function geos() {
  if (G.torso) return G;
  const top = (g, h) => { g.translate(0, -h / 2, 0); return g; };
  G.torso = new THREE.CapsuleGeometry(0.17, 0.3, 6, 16); G.torso.translate(0, 0.27, 0);
  G.head = new THREE.SphereGeometry(0.17, 24, 18);
  G.neck = new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10);
  G.thigh = top(new THREE.CapsuleGeometry(0.07, 0.28, 4, 10), 0.42);
  G.shin = top(new THREE.CapsuleGeometry(0.058, 0.3, 4, 10), 0.416);
  G.shoe = new THREE.SphereGeometry(1, 12, 10); G.shoe.scale(0.075, 0.055, 0.125); G.shoe.translate(0, -0.03, 0.05);
  G.upper = top(new THREE.CapsuleGeometry(0.05, 0.2, 4, 10), 0.3);
  G.fore = top(new THREE.CapsuleGeometry(0.044, 0.18, 4, 10), 0.27);
  G.hand = new THREE.SphereGeometry(0.056, 12, 10);
  G.hair = new THREE.SphereGeometry(0.185, 20, 14);
  G.skirt = new THREE.CylinderGeometry(0.17, 0.36, 0.44, 22, 1, true); G.skirt.translate(0, -0.14, 0);
  G.hatTop = new THREE.CylinderGeometry(0.11, 0.125, 0.11, 16); G.hatBrim = new THREE.CylinderGeometry(0.24, 0.24, 0.014, 20);
  G.shirt = new THREE.BoxGeometry(0.13, 0.42, 0.01); G.tie = new THREE.BoxGeometry(0.04, 0.3, 0.012); G.glasses = new THREE.BoxGeometry(0.26, 0.05, 0.03);
  G.marker = new THREE.OctahedronGeometry(0.1);
  G.prop = new THREE.CylinderGeometry(0.03, 0.06, 0.5, 10);
  G.eye = new THREE.SphereGeometry(0.03, 10, 8); G.cheek = new THREE.SphereGeometry(0.035, 10, 8); G.bow = new THREE.SphereGeometry(0.045, 10, 8);
  G.pony = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8);
  return G;
}
const mcache = new Map();
const M = (hex, rough = 0.7, extra = {}) => { const k = hex + rough + JSON.stringify(extra); let m = mcache.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, ...extra }); mcache.set(k, m); } return m; };
const pick = (a, r) => a[Math.floor(r() * a.length)];
const SKIN = ['#f1c9a5', '#e0ac85', '#c68863', '#8d5a3b', '#5c3a24'], HAIR = ['#1a1410', '#3a2a1c', '#6a4a2a', '#c9a050', '#8a8a8a', '#101010', '#7a2a1a'];
const JACKET = ['#2b2b33', '#4a1a26', '#1f3a4c', '#5a3a22', '#3a3a44', '#6a2a3a', '#2a4a3a', '#7a5a2a', '#d8d0c0', '#37283f'];
const DRESS = ['#c2284a', '#2a6ab0', '#1d1d24', '#e8a82c', '#8a4ac0', '#e8788a', '#1f8a6a', '#f0d8b8', '#5ab8c8', '#a58be0', '#f2b84b', '#e05a3a'];
const PANTS = ['#1a1a20', '#2a2a34', '#3a2f26', '#22303a', '#3a3a3a'];

export function guestLook(r = Math.random) {
  const female = r() < 0.62;
  return { skin: pick(SKIN, r), hair: pick(HAIR, r), bow: female && r() < 0.4, hairStyle: female ? pick(['long', 'bob', 'pony', 'long'], r) : (r() < 0.15 ? 'bald' : 'short'), top: female ? pick(DRESS, r) : pick(JACKET, r), bottom: pick(PANTS, r), dress: female && r() < 0.92, female, shirt: '#efe8dc', tie: !female && r() < 0.45 ? pick(['#a02a3a', '#c79a2c', '#1f3a4c'], r) : null, hat: !female && r() < 0.15, shoe: '#1a1210', scale: 0.95 + r() * 0.08 };
}
const TUX = { top: '#121218', bottom: '#121218', shirt: '#f2efe8', tie: '#101010', shoe: '#0a0a0a' };
export const staffLooks = {
  bartender: { ...TUX, top: '#e8e4dc', bottom: '#15151a', tie: '#7a1230', vest: '#1a1a20' },
  waiter: { ...TUX, top: '#f2efe8', vest: '#1a1a22', bottom: '#15151a', tie: '#7a1230' }, doorman: { ...TUX, top: '#26283a', tie: '#c79a2c', hairStyle: 'short', hair: '#2a1a10' },
  security: { ...TUX, top: '#0d0d10', glasses: true }, coat: { top: '#c2284a', bottom: '#c2284a', dress: true, female: true, bow: true, hairStyle: 'bob', hair: '#3a2a1c', shirt: null, tie: null },
  cleaner: { top: '#5a6a72', bottom: '#3a4a52', shirt: '#cfd8dc', shoe: '#202020' }, pianist: { ...TUX },
  piano: TUX, bass: { ...TUX, top: '#2a1a2a' }, drums: { ...TUX, top: '#3a1a1a', tie: null }, sax: { ...TUX, top: '#1a2a3a' }, trumpet: { ...TUX, top: '#2a2a2a' },
  vocal: { top: '#e8a82c', dress: true, female: true, bow: true, hairStyle: 'long', hair: '#2a1a10', skin: '#d8a078', bottom: '#c79a2c', shoe: '#c79a2c' },
};

export class Person {
  constructor(look = {}) {
    const g = geos(); this.look = look;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.body.position.y = 0.88; this.root.add(this.body);
    const jacket = M(look.top ?? '#333', 0.65), skin = M(look.skin ?? '#e0ac85', 0.7), pants = M(look.bottom ?? '#222', 0.7);
    const torso = new THREE.Mesh(g.torso, jacket); torso.scale.set(look.female ? 0.9 : 1.05, 1, 0.82); this.body.add(torso);
    if (look.vest) { const v = new THREE.Mesh(g.shirt, M(look.vest, 0.6)); v.scale.set(2.2, 0.9, 1); v.position.set(0, 0.28, 0.14); this.body.add(v); }
    else if (look.shirt && !look.dress) { const s2 = new THREE.Mesh(g.shirt, M(look.shirt, 0.6)); s2.position.set(0, 0.32, 0.141); this.body.add(s2); }
    if (look.tie) { const t = new THREE.Mesh(g.tie, M(look.tie, 0.5)); t.position.set(0, 0.3, 0.147); this.body.add(t); }
    const neck = new THREE.Mesh(g.neck, skin); neck.position.y = 0.58; this.body.add(neck);
    this.head = new THREE.Mesh(g.head, skin); this.head.position.y = 0.76; this.head.scale.set(1, 0.96, 0.98); this.body.add(this.head);
    const eyeM = M('#14101a', 0.15, { metalness: 0.2 }), shine = M('#ffffff', 0.2, { emissive: '#ffffff', emissiveIntensity: 0.6 });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(g.eye, eyeM); e.scale.set(0.9, 1.25, 0.6); e.position.set(sx * 0.07, 0.025, 0.152); this.head.add(e); const sp = new THREE.Mesh(g.eye, shine); sp.scale.set(0.3, 0.3, 0.3); sp.position.set(sx * 0.07 + 0.01, 0.04, 0.165); this.head.add(sp);
      const c = new THREE.Mesh(g.cheek, M(look.female ? '#f08a8a' : '#e0907a', 0.8)); c.scale.set(1.2, 0.7, 0.4); c.position.set(sx * 0.105, -0.045, 0.13); this.head.add(c); }
    const nose = new THREE.Mesh(g.cheek, skin); nose.scale.set(0.5, 0.5, 0.6); nose.position.set(0, -0.015, 0.17); this.head.add(nose);
    const mouth = new THREE.Mesh(g.eye, M(look.female ? '#c2284a' : '#7a2a2a', 0.5)); mouth.scale.set(1.3, 0.35, 0.4); mouth.position.set(0, -0.07, 0.15); this.head.add(mouth);
    if (look.hairStyle !== 'bald') {
      const hm = M(look.hair ?? '#222', 0.55), hr = new THREE.Mesh(g.hair, hm); hr.scale.set(1, look.hairStyle === 'long' || look.hairStyle === 'bob' ? 1.02 : 0.88, 1.04); hr.position.set(0, 0.8, -0.02); this.body.add(hr);
      if (look.hairStyle === 'long') { const l = new THREE.Mesh(g.pony, hm); l.scale.set(1.9, 1.2, 1); l.position.set(0, 0.55, -0.11); this.body.add(l); }
      if (look.hairStyle === 'bob') { const l = new THREE.Mesh(g.hair, hm); l.scale.set(1.02, 0.7, 0.98); l.position.set(0, 0.66, -0.03); this.body.add(l); }
      if (look.hairStyle === 'pony') { const l = new THREE.Mesh(g.pony, hm); l.position.set(0, 0.7, -0.22); l.rotation.x = -0.5; this.body.add(l); }
    }
    if (look.bow) { for (const sx of [-1, 1]) { const b = new THREE.Mesh(g.bow, M('#e8484a', 0.5)); b.scale.set(1.2, 0.8, 0.6); b.position.set(sx * 0.07, 0.96, 0.05); this.body.add(b); } }
    if (look.hat) { const hm = M('#1a1612', 0.6); const a2 = new THREE.Mesh(g.hatTop, hm); a2.position.y = 0.97; const b2 = new THREE.Mesh(g.hatBrim, hm); b2.position.y = 0.92; this.body.add(a2, b2); }
    if (look.glasses) { const gl = new THREE.Mesh(g.glasses, M('#050505', 0.2)); gl.position.set(0, 0.79, 0.155); this.body.add(gl); }
    // limbs
    const mkArm = s => { const p = new THREE.Group(); p.position.set(s * (look.female ? 0.22 : 0.25), 0.5, 0); const u = new THREE.Mesh(g.upper, look.dress && look.female ? skin : jacket); p.add(u); const f = new THREE.Group(); f.position.y = -0.3; const fm = new THREE.Mesh(g.fore, look.dress ? skin : jacket); f.add(fm); const hd = new THREE.Mesh(g.hand, skin); hd.position.y = -0.28; f.add(hd); p.add(f); this.body.add(p); return { p, f }; };
    const mkLeg = s => { const p = new THREE.Group(); p.position.set(s * 0.1, 0, 0); p.add(new THREE.Mesh(g.thigh, look.dress ? skin : pants)); const sh = new THREE.Group(); sh.position.y = -0.42; sh.add(new THREE.Mesh(g.shin, look.dress ? skin : pants)); const shoe = new THREE.Mesh(g.shoe, M(look.dress ? '#2a1218' : (look.shoe ?? '#1a1210'), 0.3)); shoe.position.y = -0.4; sh.add(shoe); p.add(sh); this.body.add(p); return { p, s: sh }; };
    this.aL = mkArm(-1); this.aR = mkArm(1); this.lL = mkLeg(-1); this.lR = mkLeg(1);
    if (look.dress) { const sk = new THREE.Mesh(g.skirt, M(look.top, 0.55, { side: THREE.DoubleSide })); sk.position.y = 0.06; this.body.add(sk); this.skirt = sk; }
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), blobMat()); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.014; this.root.add(this.shadow);
    this.root.scale.setScalar(look.scale ?? 1);
    // state
    this.x = 0; this.z = 0; this.y = 0; this.yaw = 0; this.targetYaw = 0; this.floor = 0;
    this.path = []; this.cb = null; this.speed = 1.3; this.phase = Math.random() * 6; this.walkW = 0;
    this.sitting = false; this.sitT = 0; this.seat = null; this.playing = null; this.t0 = Math.random() * 10; this.drink = 0;
    this.marker = null; this.moving = false;
  }
  addTray() {
    const t = new THREE.Group(), silver = M('#cfd4d8', 0.2, { metalness: 0.9 }), disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.014, 20), silver); t.add(disc);
    for (const [x, z, c] of [[-0.06, 0, '#c8802a'], [0.06, 0.03, '#d8e8e0'], [0, -0.07, '#a02a3a']]) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.1, 10), M(c, 0.1, { transparent: true, opacity: 0.85 })); gl.position.set(x, 0.057, z); t.add(gl); }
    t.position.set(0, -0.3, 0.1); this.aR.f.add(t); this.tray = t;
  }
  addMarker() { const m = new THREE.Mesh(geos().marker, new THREE.MeshStandardMaterial({ color: 0xffc648, emissive: 0xffb020, emissiveIntensity: 2.4, metalness: 0.8, roughness: 0.2 })); m.position.y = 2.25; m.scale.set(1, 1.5, 1); this.root.add(m); this.marker = m; }
  addProp(type) {
    const p = new THREE.Mesh(geos().prop, M('#d9ad4e', 0.25, { metalness: 1 })); p.rotation.x = type === 'sax' ? 0.5 : Math.PI / 2 + 0.1; p.position.set(0.0, type === 'sax' ? 0.2 : 0.42, 0.28);
    if (type === 'trumpet') p.scale.set(0.8, 0.6, 0.8); this.body.add(p); this.prop = p;
  }
  place(x, z, yaw = 0, floor = 0) { this.x = x; this.z = z; this.floor = floor; this.yaw = this.targetYaw = yaw; this.y = groundY(x, z, floor); this.sync(); }
  walk(points, cb, speed = 1.3) { this.path = points.slice(); this.cb = cb ?? null; this.speed = speed; if (this.sitting) this.standUp(); }
  faceTo(x, z) { this.targetYaw = Math.atan2(x - this.x, z - this.z); }
  sitDown(seat) { this.sitting = true; this.seat = seat; this.x = seat.x; this.z = seat.z; this.targetYaw = seat.yaw; this.yaw = seat.yaw; this.floor = seat.f; this.path = []; this.moving = false; }
  standUp() { this.sitting = false; this.seat = null; }
  get busy() { return this.path.length > 0; }

  update(dt, t) {
    if (this.path.length) {
      const p = this.path[0], dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), step = this.speed * dt;
      if (d <= step) { this.x = p.x; this.z = p.z; this.path.shift(); if (!this.path.length) { this.moving = false; const cb = this.cb; this.cb = null; cb?.(); } }
      else { this.x += dx / d * step; this.z += dz / d * step; this.targetYaw = Math.atan2(dx, dz); this.moving = true; this.phase += step * 4.6; }
    } else this.moving = false;
    // yaw smoothing
    let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 8);
    // height
    const ty = groundY(this.x, this.z, this.floor); this.y += (ty - this.y) * Math.min(1, dt * 12);
    if (this.y > 3.3) this.floor = 1; else if (this.y < 3.0 && this.x < STAIRS.x1 + 0.05 && this.x > STAIRS.x0 - 0.05 && this.z < STAIRS.zt) this.floor = 0;
    // animation
    this.walkW += ((this.moving ? 1 : 0) - this.walkW) * Math.min(1, dt * 10);
    this.sitT += ((this.sitting ? 1 : 0) - this.sitT) * Math.min(1, dt * 6);
    const w = this.walkW * (1 - this.sitT), sw = Math.sin(this.phase), T = (t ?? 0) + this.t0, st = this.sitT;
    this.lL.p.rotation.x = sw * 0.55 * w - 1.5 * st; this.lR.p.rotation.x = -sw * 0.55 * w - 1.5 * st;
    this.lL.s.rotation.x = (0.3 + sw * 0.3) * w * (sw > 0 ? 0.2 : 1) + 1.5 * st; this.lR.s.rotation.x = (0.3 - sw * 0.3) * w * (sw < 0 ? 0.2 : 1) + 1.5 * st;
    this.aL.p.rotation.x = -sw * 0.5 * w - 0.7 * st; this.aR.p.rotation.x = sw * 0.5 * w - 0.7 * st; this.aL.f.rotation.x = -0.4 * st - 0.1 * w; this.aR.f.rotation.x = -0.4 * st - 0.1 * w;
    this.aL.p.rotation.z = 0.05; this.aR.p.rotation.z = -0.05;
    this.body.position.y = 0.88 + Math.abs(sw) * 0.02 * w;
    if (this.skirt) this.skirt.rotation.x = 0;
    if (this.sitting && !this.playing && !this.moving) { // idle fidgets: sip a drink now and then
      const c = (T * 0.35) % 6; this.drink = c < 1 ? Math.sin(c * Math.PI) : 0; this.aR.p.rotation.x = -0.7 - this.drink * 0.9; this.aR.f.rotation.x = -0.4 - this.drink * 1.0; this.head.rotation.x = this.drink * -0.12;
      this.head.rotation.y = Math.sin(T * 0.4) * 0.35;
    } else if (!this.playing) { this.head.rotation.y = Math.sin(T * 0.3) * 0.15 * (1 - w); this.head.rotation.x = 0; }
    if (this.playing) this.playAnim(T);
    let base = this.y;
    if (this.sitT > 0.001 && this.seat) base = this.y + (this.seat.y - 0.83 - this.y) * this.sitT;
    this.root.position.set(this.x, base, this.z); this.root.rotation.y = this.yaw; this.shadow.visible = this.sitT < 0.5;
    if (this.marker) { this.marker.rotation.y += dt * 2; this.marker.position.y = 2.25 + Math.sin(T * 3) * 0.05; }
  }
  sync() { this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw; }
  playAnim(T) {
    const k = this.playing;
    if (k === 'piano') { this.aL.p.rotation.x = -1.2 + Math.sin(T * 5) * 0.12; this.aR.p.rotation.x = -1.2 + Math.cos(T * 4.3) * 0.12; this.aL.f.rotation.x = -0.5; this.aR.f.rotation.x = -0.5; this.head.rotation.x = 0.15 + Math.sin(T * 0.8) * 0.08; this.head.rotation.y = Math.sin(T * 0.5) * 0.25; this.body.rotation.z = Math.sin(T * 0.9) * 0.05; }
    else if (k === 'drums') { this.aL.p.rotation.x = -1.0 + Math.sin(T * 9) * 0.35; this.aR.p.rotation.x = -1.0 + Math.sin(T * 9 + 2.2) * 0.35; this.aL.f.rotation.x = -0.9; this.aR.f.rotation.x = -0.9; this.head.rotation.y = Math.sin(T * 0.6) * 0.3; }
    else if (k === 'bass') { this.aL.p.rotation.x = -2.4; this.aL.f.rotation.x = -0.2; this.aR.p.rotation.x = -0.9 + Math.sin(T * 3.6) * 0.15; this.aR.f.rotation.x = -0.9; this.body.rotation.z = Math.sin(T * 1.8) * 0.08; this.head.rotation.y = 0.3 * Math.sin(T * 0.5); }
    else if (k === 'sax' || k === 'trumpet') { this.aL.p.rotation.x = -1.2; this.aR.p.rotation.x = -1.2; this.aL.f.rotation.x = -1.0; this.aR.f.rotation.x = -1.0; this.body.rotation.z = Math.sin(T * 1.4) * 0.1; this.body.rotation.x = -0.05 + Math.sin(T * 1.4) * 0.05; this.head.rotation.x = -0.15; }
    else if (k === 'vocal') { this.aR.p.rotation.x = -0.5 + Math.sin(T * 1.1) * 0.5; this.aR.p.rotation.z = -0.3; this.aL.p.rotation.x = -1.3; this.aL.f.rotation.x = -1.6; this.body.rotation.z = Math.sin(T * 1.2) * 0.07; this.head.rotation.y = Math.sin(T * 0.7) * 0.2; this.head.rotation.x = -0.08 + Math.sin(T * 1.6) * 0.06; }
  }
}

/** Staff posts and stage positions */
const H = STAGE.h;
export const STAGE_POS = {
  piano: { x: -4.0, z: -6.2, y: H + 0.5, yaw: -Math.PI / 2, sit: true },
  drums: { x: 3.85, z: -5.35, y: H + 0.5, yaw: Math.PI, sit: true },
  bass: { x: -1.45, z: -5.35, yaw: 0 }, sax: { x: 1.1, z: -5.2, yaw: 0 }, vocal: { x: 0, z: -4.95, yaw: 0 }, trumpet: { x: 2.1, z: -5.3, yaw: 0 },
};

export class Crowd {
  constructor(scene, world, nav) { this.scene = scene; this.world = world; this.nav = nav; this.staff = []; this.performers = []; this.people = new Set(); }
  spawnPedestrians(n = 5) {
    this.peds = [];
    for (let i = 0; i < n; i++) { const p = this.add(new Person(guestLook())); p.place(-28 + Math.random() * 56, 9.4 + Math.random() * 1.6, 0, 0); p.speed = 1.0 + Math.random() * 0.5; this.peds.push(p); }
  }
  add(p) { this.scene.add(p.root); this.people.add(p); return p; }
  remove(p) { this.scene.remove(p.root); this.people.delete(p); }

  postFor(role, i) {
    switch (role) {
      case 'bartender': return { x: 11.0, z: -2.4 + i * 2.2, yaw: -Math.PI / 2, f: 0 };
      case 'doorman': return { x: 3.0, z: 7.3, look: [3, 0], f: 0 };
      case 'security': return i === 0 ? { x: -9.3, z: -4.9, look: [-10.2, -6.4], f: 0 } : { x: -3.6, z: 3.8, look: [0, 0.5], f: 1 };
      case 'coat': return { x: -9.0, z: 5.9, yaw: Math.PI / 2, f: 0 };
      case 'pianist': return { ...STAGE_POS.piano, f: 0, seated: true };
      default: return { x: 0, z: 2, f: 0 };
    }
  }
  /** Make staff NPCs match the hired counts. */
  syncStaff(counts) {
    const want = [];
    for (const [role, n] of Object.entries(counts)) for (let i = 0; i < n; i++) want.push([role, i]);
    for (const s of [...this.staff]) if (!want.some(([r, i]) => r === s.role && i === s.i)) { this.remove(s.p); this.staff.splice(this.staff.indexOf(s), 1); }
    for (const [role, i] of want) {
      if (this.staff.some(s => s.role === role && s.i === i)) continue;
      const look = { ...guestLook(), ...staffLooks[role] }; if (role === 'cleaner' || role === 'waiter') look.scale = 0.97 + Math.random() * 0.06;
      if (role === 'waiter' && i % 2 === 1) Object.assign(look, { top: '#1a1a22', dress: true, female: true, vest: null, tie: null, bow: true, hairStyle: 'pony', hair: '#3a2a1c', skin: '#f1c9a5', shoe: '#1a1210' });
      const p = this.add(new Person(look)), post = this.postFor(role, i), s = { role, i, p, post, timer: 2 + Math.random() * 5 };
      if (role === 'waiter') p.addTray();
      if (post.seated) { p.place(post.x, post.z, post.yaw, 0); p.sitDown({ x: post.x, z: post.z, y: post.y, yaw: post.yaw, f: 0 }); p.playing = 'piano'; s.fixed = true; }
      else if (post.look) { p.place(post.x, post.z, 0, post.f); p.faceTo(...post.look); p.yaw = p.targetYaw; if (post.f === 1) p.y = 3.6; }
      else p.place(post.x, post.z, post.yaw ?? 0, post.f);
      this.staff.push(s);
    }
  }
  /** Performers on stage for tonight's act (null → none). Keeps the house pianist out of the way when the act has a piano. */
  syncPerformers(act) {
    for (const p of this.performers) this.remove(p); this.performers = [];
    const pi = this.staff.find(s => s.role === 'pianist');
    if (pi) pi.p.root.visible = !(act && act.members.includes('piano'));
    if (!act) return;
    for (const m of act.members) {
      const pos = STAGE_POS[m], look = { ...guestLook(), ...staffLooks[m] }; const p = this.add(new Person(look));
      p.place(pos.x, pos.z, pos.yaw, 0);
      if (pos.sit) p.sitDown({ x: pos.x, z: pos.z, y: pos.y, yaw: pos.yaw, f: 0 });
      if (m === 'sax' || m === 'trumpet') p.addProp(m);
      p.playing = m; this.performers.push(p);
    }
  }
  update(dt, t, active = true) {
    for (const s of this.staff) {
      if (active && (s.role === 'waiter' || s.role === 'cleaner')) {
        s.timer -= dt;
        if (s.timer <= 0 && !s.p.busy) {
          s.timer = 4 + Math.random() * 8;
          const seats = this.world.seats.filter(q => q.f === 0);
          let tx, tz;
          if (s.role === 'waiter' && seats.length) { const q = seats[Math.floor(Math.random() * seats.length)]; tx = q.ax; tz = q.az; } else { tx = -6 + Math.random() * 14; tz = -3 + Math.random() * 8; }
          const path = this.nav.path(0, s.p.x, s.p.z, tx, tz); if (path) s.p.walk(path, null, s.role === 'cleaner' ? 0.8 : 1.2);
        }
      }
    }
    for (const p of this.peds ?? []) if (!p.busy) p.walk([{ x: p.x > 0 ? -30 : 30, z: 9.4 + Math.random() * 1.6 }], null, 1.0 + Math.random() * 0.5);
    for (const p of this.people) p.update(dt, t);
  }
}
