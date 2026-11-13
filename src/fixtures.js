// Hand-built fixtures: bar, stage + instruments, secret bookshelf door, coat check, restrooms, office, cameras, neon.
import * as THREE from 'three';
import { BLD, DIMS, STAGE, DOOR, DESK, ENTRANCE, WINDOW, TERRACE2 } from './plan.js';
import { ARCH, ensureSpecial } from './materials.js';
import { box, cyl, sph, flat, vplane, group } from './gfx.js';
import { neonTexture, labelTexture, artworkPlaceholder, flipTex } from './textures.js';

const F1 = BLD.F1;
const std = (o) => new THREE.MeshStandardMaterial(o);
const rod = (parent, mat, r, len, axis, x, y, z, seg = 10) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.position.set(x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2; parent.add(m); return m;
};
function instanced(parent, geo, mat, list) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  list.forEach((o, i) => { q.setFromEuler(new THREE.Euler(0, o.ry || 0, 0)); m4.compose(new THREE.Vector3(...o.pos), q, new THREE.Vector3(...(o.scale || [1, 1, 1]))); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(o.color)); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; parent.add(im); return im;
}
const BOOKS = ['#6a1a22', '#1f3a4c', '#8a6a2a', '#3a4a2a', '#5a2a4a', '#a08050', '#2a2a3a'];
function sconce(world, x, y, z, ry) {
  ensureSpecial(); const g = group(world.root, x, y, z); g.rotation.y = ry;
  box(g, ARCH.brass, 0.1, 0.22, 0.03, 0, -0.11, 0); const s = cyl(g, new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa84a, emissiveIntensity: 1.8, side: THREE.DoubleSide }), 0.05, 0.09, 0.17, 0, -0.1, 0.08, 10); void s;
}

export function buildFixtures(world) {
  ensureSpecial();
  const R = world.root, fx = { anchors: {}, updaters: [] };
  const spin = [];
  buildBar(world, fx); buildStage(world, fx); buildSecretDoor(world, fx); buildFoyerRooms(world, fx); buildOffice(world, fx, spin); buildNeons(world, fx);
  for (const [x, y, z, ry] of [[-11.8, 2.3, 1.2, Math.PI / 2], [-11.8, 2.3, 3.0, Math.PI / 2], [-11.8, 5.0, -3.5, Math.PI / 2], [-11.8, 6.3, 5.5, Math.PI / 2], [-11.8, 6.3, 2.0, Math.PI / 2],
    [-7.35, 2.3, 7.8, Math.PI], [7.0, 2.3, 7.8, Math.PI], [11.8, 6.3, 4.0, -Math.PI / 2], [-8.3, 2.6, -7.8 - DIMS.hall, Math.PI], [8.3, 2.6, -7.8 - DIMS.hall, Math.PI], [-3.4, 6.3, 3.0, -Math.PI / 2], [1.4, 6.3, 3.0, -Math.PI / 2], [-11.8, 4.8, -2.5, Math.PI / 2]])
    sconce(world, x, y, z, ry);
  fx.update = (dt, t, ctx) => { for (const u of fx.updaters) u(dt, t, ctx); for (const s of spin) s.rotation.y += dt * (ctx.musicPlaying ? 2.0 : 0); };
  return fx;
}

// ── BAR ────────────────────────────────────────────────────────────────────
function buildBar(world, fx) {
  const R = world.root, bar = group(R);
  box(bar, ARCH.panel, 0.8, 1.05, 7.5, 10.3, 0, 0.15);
  box(bar, ARCH.marbleBlack, 0.98, 0.06, 7.6, 10.28, 1.05, 0.15); box(bar, ARCH.brass, 0.99, 0.015, 7.62, 10.28, 1.115, 0.15);
  box(bar, ARCH.brass, 0.02, 0.6, 7.45, 9.89, 0.2, 0.15);
  rod(bar, ARCH.brass, 0.03, 7.4, 'z', 9.72, 0.25, 0.15);
  for (const z of [-3.2, -1.6, 0, 1.6, 3.2]) cyl(bar, ARCH.brass, 0.018, 0.018, 0.25, 9.72, 0, z);
  box(bar, ARCH.panel, 0.55, 1.0, 9.5, 11.575, 0, -0.85); box(bar, ARCH.marbleBlack, 0.6, 0.05, 9.5, 11.55, 1.0, -0.85);
  vplane(bar, ARCH.mirror, 9.0, 1.9, 11.84, 2.15, -0.85, -Math.PI / 2);
  for (const y of [1.18, 3.1]) box(bar, ARCH.gold, 0.05, 0.06, 9.1, 11.8, y, -0.85);
  for (const z of [-5.4, 3.7]) box(bar, ARCH.gold, 0.05, 1.98, 0.06, 11.8, 1.18, z);
  const bg = new THREE.CylinderGeometry(0.035, 0.04, 0.24, 10), cols = ['#8a4a14', '#1f6a3a', '#cfd8d0', '#6a1218', '#8a4a14', '#b89a40'];
  const list = [];
  for (const y of [1.55, 2.05, 2.55]) { box(bar, ARCH.brass, 0.28, 0.025, 8.8, 11.62, y, -0.85); for (let z = -5.2; z < 3.5; z += 0.34) list.push({ pos: [11.62, y + 0.145, z + ((y * 100) % 7) * 0.01], color: cols[Math.floor(((z + 6) * 7 + y * 10) % 6)] }); }
  instanced(bar, bg, std({ color: 0xffffff, roughness: 0.15, metalness: 0.2, emissive: 0x120804 }), list);
  // two taps + a till
  box(bar, ARCH.brass, 0.1, 0.35, 0.1, 10.4, 1.11, -1.0); box(bar, ARCH.brass, 0.1, 0.35, 0.1, 10.4, 1.11, -0.7); box(bar, ARCH.black, 0.35, 0.2, 0.3, 10.5, 1.11, 1.8);
  fx.anchors.bar = new THREE.Vector3(10.0, 1.3, 0);
}

// ── STAGE ──────────────────────────────────────────────────────────────────
function buildStage(world, fx) {
  const R = world.root, st = group(R, 0, 0, -DIMS.stage), H = STAGE.h, back = DIMS.hall - DIMS.stage; // back = extra platform depth up to the back wall
  box(st, ARCH.wood, 15, H, 3.5 + back, 0, 0, -6.25 - back / 2);
  box(st, ARCH.brass, 15.02, 0.05, 0.06, 0, H - 0.06, -4.5); box(st, ARCH.black, 15, 0.12, 0.04, 0, 0.06, -4.49);
  box(st, new THREE.MeshStandardMaterial({ color: 0x331a08, emissive: 0xffa040, emissiveIntensity: 1.4 }), 14.6, 0.025, 0.04, 0, 0.3, -4.47);
  // velvet curtains
  const cm = ARCH.velvet;
  for (let i = 0; i < 40; i++) box(st, cm, 0.39, 6.6, i % 2 ? 0.14 : 0.32, -7.4 + i * 0.38, H, -7.7 - back);
  box(st, cm, 15.1, 0.8, 0.5, 0, 6.3, -7.45 - back); box(st, ARCH.gold, 15.1, 0.05, 0.54, 0, 6.28, -7.45 - back); box(st, ARCH.gold, 15.1, 0.04, 0.54, 0, 7.0, -7.45 - back);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) box(st, cm, 0.34, 6.1, 0.3 + (i % 2) * 0.12, sx * 7.3, H, -4.8 - i * 0.62);
  // spotlight cans
  for (const x of [-3.5, 3.5]) { const c = cyl(st, ARCH.brass, 0.18, 0.12, 0.4, x, 6.55, -2.6); c.rotation.x = -0.6; }
  // grand piano (keys face +x)
  const sh = new THREE.Shape(); sh.moveTo(1.1, -0.68); sh.lineTo(-1.1, -0.68); sh.bezierCurveTo(-1.28, -0.1, -0.9, 0.7, -0.2, 0.7); sh.lineTo(1.1, 0.7); sh.closePath();
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: false }); pg.rotateX(-Math.PI / 2);
  const piano = group(st, -5.7, H, -6.2);
  const body = new THREE.Mesh(pg, std({ color: 0x0b0b0e, roughness: 0.12, metalness: 0.5 })); body.position.y = 0.62; piano.add(body);
  box(piano, std({ color: 0xf0e8d6, roughness: 0.4 }), 0.34, 0.05, 1.3, 1.25, 0.86, 0); box(piano, ARCH.black, 0.2, 0.3, 1.34, 1.2, 0.9, 0);
  for (const [x, z] of [[0.9, -0.55], [0.9, 0.55], [-0.95, 0.0]]) cyl(piano, ARCH.black, 0.05, 0.04, 0.62, x, 0, z);
  const lid = box(piano, ARCH.black, 2.2, 0.03, 0.04, 0, 1.0, 0.7); lid.rotation.x = 0;
  const lidP = box(piano, std({ color: 0x0b0b0e, roughness: 0.15, metalness: 0.5 }), 2.0, 0.03, 1.2, -0.1, 0, 0); lidP.position.set(-0.1, 1.35, 0.15); lidP.rotation.z = 0.0; lidP.rotation.x = -0.65;
  box(st, ARCH.ebony, 0.45, 0.5, 1.0, -4.0, H, -6.2); box(st, ARCH.velvet, 0.42, 0.06, 0.95, -4.0, H + 0.5, -6.2);
  // upright bass
  const bass = group(st, -1.65, H, -6.05), wood = std({ color: 0xa4531e, roughness: 0.25, metalness: 0.1 });
  sph(bass, wood, 1, 0, 0.55, 0, [0.27, 0.33, 0.12]); sph(bass, wood, 1, 0, 1.0, 0, [0.2, 0.26, 0.11]); sph(bass, wood, 1, 0, 0.8, 0, [0.14, 0.2, 0.1]);
  box(bass, ARCH.ebony, 0.045, 1.05, 0.03, 0, 0.9, 0.12); box(bass, wood, 0.06, 0.2, 0.04, 0, 1.9, 0.1); sph(bass, wood, 0.05, 0, 2.15, 0.1);
  cyl(bass, ARCH.brass, 0.008, 0.008, 0.25, 0, -0.1, 0); bass.rotation.x = -0.12;
  // drum kit
  const dk = group(st, 3.85, H, -6.3), shell = std({ color: 0x8a1d2b, roughness: 0.25, metalness: 0.3 }), skin = std({ color: 0xeee8dc, roughness: 0.6 });
  const dr = (r, h, x, y, z, rx = 0) => { const c = cyl(dk, shell, r, r, h, x, y, z, 24); c.rotation.x = rx; cyl(dk, skin, r * 0.97, r * 0.97, 0.01, x, y + h + 0.0, z, 24).rotation.x = rx; return c; };
  const kick = cyl(dk, shell, 0.33, 0.33, 0.45, 0, 0.0, 0.0, 24); kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.35, 0.1);
  dr(0.17, 0.14, -0.2, 0.9, 0.05); dr(0.15, 0.13, 0.18, 0.92, 0.05); dr(0.22, 0.45, 0.65, 0.3, 0.1); dr(0.18, 0.13, -0.55, 0.64, 0.45);
  cyl(dk, ARCH.chrome, 0.012, 0.012, 0.6, -0.55, 0, 0.45); cyl(dk, ARCH.chrome, 0.012, 0.012, 1.0, -0.85, 0, 0.35); cyl(dk, ARCH.brass, 0.14, 0.14, 0.01, -0.85, 0.98, 0.35); cyl(dk, ARCH.brass, 0.14, 0.14, 0.01, -0.85, 1.0, 0.35);
  for (const [x, y, z, r] of [[-0.55, 1.35, -0.2, 0.28], [0.4, 1.3, -0.15, 0.27], [1.0, 1.1, 0.3, 0.32]]) { cyl(dk, ARCH.chrome, 0.012, 0.012, y, x, 0, z); const c = cyl(dk, ARCH.brass, r, r, 0.012, x, y, z, 24); c.rotation.z = 0.12; }
  cyl(dk, ARCH.chrome, 0.015, 0.015, 0.5, 0, 0, 0.95); cyl(dk, ARCH.leatherDark ?? ARCH.black, 0.17, 0.17, 0.06, 0, 0.5, 0.95);
  // mic stand
  const mic = group(st, 0, H, -5.2); cyl(mic, ARCH.chrome, 0.15, 0.17, 0.02, 0, 0, 0); cyl(mic, ARCH.chrome, 0.012, 0.012, 1.5, 0, 0.02, 0); cyl(mic, ARCH.black, 0.03, 0.025, 0.17, 0, 1.5, 0); sph(mic, ARCH.chrome, 0.035, 0, 1.7, 0);
  // footlight spots (the two real SpotLights live in world.js)
}

// ── SECRET BOOKSHELF DOOR ──────────────────────────────────────────────────
function buildSecretDoor(world, fx) {
  const R = world.root, hinge = group(R, DOOR.x, 0, DOOR.z0), leaf = group(hinge);
  box(leaf, ARCH.panel, 0.05, 2.4, 1.0, -0.05, 0, 0.5);
  box(leaf, ARCH.wood, 0.2, 2.4, 0.06, 0.05, 0, 0.03); box(leaf, ARCH.wood, 0.2, 2.4, 0.06, 0.05, 0, 0.97);
  box(leaf, ARCH.wood, 0.2, 0.06, 1.0, 0.05, 2.34, 0.5);
  const books = [];
  for (const y of [0.04, 0.5, 0.96, 1.42, 1.88]) {
    box(leaf, ARCH.wood, 0.2, 0.04, 0.94, 0.05, y - 0.04 + 0.04, 0.5);
    let z = 0.08; for (let i = 0; i < 12 && z < 0.9; i++) { const w = 0.045 + (i * 37 % 5) * 0.012, h = 0.28 + (i * 13 % 4) * 0.05; books.push({ pos: [0.06, y + h / 2 + 0.04, z + w / 2], scale: [0.16, h, w], color: BOOKS[(i + Math.floor(y * 10)) % BOOKS.length] }); z += w + 0.004; }
  }
  instanced(leaf, new THREE.BoxGeometry(1, 1, 1), std({ color: 0xffffff, roughness: 0.7 }), books);
  box(leaf, ARCH.brass, 0.03, 0.14, 0.03, 0.17, 1.1, 0.9);
  const door = { open: false, ang: 0, target: 0, pending: 0 };
  door.setOpen = v => { door.open = v; door.target = v ? -1.75 : 0; };
  fx.updaters.push(dt => { door.ang += (door.target - door.ang) * Math.min(1, dt * 4); leaf.rotation.y = door.ang; });
  fx.door = door; fx.anchors.door = new THREE.Vector3(-9.6, 1.2, -6.4);
}

// ── FOYER: host stand, entrance doors, coat check, restrooms ───────────────
function buildFoyerRooms(world, fx) {
  const R = world.root;
  // host stand
  box(R, ARCH.panel, 1.0, 1.05, 0.55, 3.0, 0, 6.4); box(R, ARCH.marbleBlack, 1.1, 0.04, 0.65, 3.0, 1.05, 6.4); box(R, ARCH.brass, 1.12, 0.015, 0.67, 3.0, 1.09, 6.4);
  box(R, ARCH.velvet, 0.5, 0.03, 0.35, 3.15, 1.1, 6.4); cyl(R, ARCH.brass, 0.02, 0.02, 0.3, 2.65, 1.1, 6.4);
  cyl(R, new THREE.MeshStandardMaterial({ color: 0x1f6a3a, emissive: 0x2a8a4a, emissiveIntensity: 0.9 }), 0.09, 0.12, 0.1, 2.65, 1.4, 6.4);
  fx.anchors.host = new THREE.Vector3(3.0, 1.2, 6.4);
  for (const [x, z] of [[1.9, 5.3], [1.9, 7.0]]) { cyl(R, ARCH.brass, 0.03, 0.04, 0.95, x, 0, z); sph(R, ARCH.brass, 0.05, x, 0.98, z); cyl(R, ARCH.brass, 0.04, 0.04, 0.03, x, 0, z); }
  rod(R, new THREE.MeshStandardMaterial({ color: 0x8a1428, roughness: 0.8 }), 0.015, 1.7, 'z', 1.9, 0.82, 6.15);
  // entrance doors, swung open to the street
  for (const s of [-1, 1]) {
    const h = group(R, s * ENTRANCE.x1, 0, 7.95), leaf = group(h); h.rotation.y = -s * 1.35;
    for (const [w, hh, x, y] of [[0.06, 2.5, 0, 0], [0.06, 2.5, s * -1.3, 0]]) box(leaf, ARCH.brass, w, hh, 0.06, x, y, 0);
    box(leaf, ARCH.brass, 1.3, 0.06, 0.06, s * -0.65, 0, 0); box(leaf, ARCH.brass, 1.3, 0.06, 0.06, s * -0.65, 2.44, 0); box(leaf, ARCH.brass, 1.3, 0.2, 0.06, s * -0.65, 1.0, 0);
    vplane(leaf, new THREE.MeshStandardMaterial({ color: 0xbfd8e0, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 1.2, 2.3, s * -0.65, 1.2, 0);
    cyl(leaf, ARCH.brass, 0.02, 0.02, 0.5, s * -1.15, 0.8, 0.07);
  }
  // coat check (counter, racks, coats, plaque)
  box(R, ARCH.panel, 0.55, 1.05, 2.6, -7.55, 0, 5.9); box(R, ARCH.marbleBlack, 0.7, 0.05, 2.7, -7.6, 1.05, 5.9); box(R, ARCH.brass, 0.72, 0.015, 2.72, -7.6, 1.1, 5.9);
  box(R, ARCH.black, 0.14, 0.12, 0.25, -7.65, 1.1, 5.2); box(R, ARCH.brass, 0.1, 0.08, 0.1, -7.6, 1.1, 6.5);
  const coats = [];
  for (const x of [-11.5, -10.0]) { rod(R, ARCH.brass, 0.015, 3.2, 'z', x, 1.85, 6.0); for (let z = 4.55; z < 7.5; z += 0.25) coats.push({ pos: [x, 1.35, z], scale: [0.12, 0.95, 0.2], color: ['#2a2a30', '#4a1a22', '#2a3a2a', '#5a4a3a', '#1a2038', '#6a5a4a'][Math.floor((z * 13 + x * 7) % 6 + 6) % 6] }); }
  instanced(R, new THREE.BoxGeometry(1, 1, 1), std({ color: 0xffffff, roughness: 0.9 }), coats);
  vplane(R, new THREE.MeshBasicMaterial({ map: labelTexture('COAT CHECK', { w: 512, h: 128 }), toneMapped: false }), 1.6, 0.4, -7.42, 2.8, 5.9, Math.PI / 2);
  fx.anchors.coat = new THREE.Vector3(-7.4, 1.3, 5.9);
  // restrooms
  const plaque = (txt, z) => vplane(R, new THREE.MeshBasicMaterial({ map: labelTexture(txt, { w: 512, h: 128, font: '700 46px Georgia, serif' }), toneMapped: false }), 1.0, 0.25, 7.42, 2.78, z, -Math.PI / 2);
  plaque('GENTLEMEN', 5.1); plaque('LADIES', 7.1);
  for (const zc of [5.0, 7.0]) {
    box(R, ARCH.marbleWhite, 0.5, 0.9, 1.5, 11.55, 0, zc); for (const dz of [-0.4, 0.4]) cyl(R, ARCH.chrome, 0.015, 0.015, 0.2, 11.4, 0.9, zc + dz);
    vplane(R, ARCH.mirror, 1.4, 0.9, 11.82, 1.75, zc, -Math.PI / 2);
    box(R, ARCH.marbleWhite, 0.4, 0.42, 0.5, 8.3, 0, zc + 0.4); box(R, ARCH.panel, 0.06, 1.9, 0.9, 9.2, 0, zc + 0.35);
  }
  fx.anchors.ladies = new THREE.Vector3(9.5, 1.3, 7.0); fx.anchors.gents = new THREE.Vector3(9.5, 1.3, 5.0);
}

// ── OFFICE ─────────────────────────────────────────────────────────────────
function buildOffice(world, fx, spin) {
  const R = world.root, y0 = F1;
  // big round one-way window: dark mirror from below (faces -z), faint glass from inside (faces +z)
  const wy = y0 + WINDOW.y, disc = new THREE.CircleGeometry(WINDOW.r, 64);
  const out = new THREE.Mesh(disc, ARCH.darkGlass); out.position.set(WINDOW.x, wy, -0.108); out.rotation.y = Math.PI; R.add(out);
  const inn = new THREE.Mesh(disc, ARCH.glassIn); inn.position.set(WINDOW.x, wy, 0.108); R.add(inn);
  for (const [rad, tube] of [[WINDOW.r, 0.07], [WINDOW.r * 0.5, 0.03]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 14, 72), ARCH.brass); ring.position.set(WINDOW.x, wy, 0); R.add(ring); }
  box(R, ARCH.brass, WINDOW.r * 2, 0.04, 0.06, WINDOW.x, wy - 0.02, 0); box(R, ARCH.brass, 0.04, WINDOW.r * 2, 0.06, WINDOW.x - 0.02, wy - WINDOW.r, 0);
  // door frame to the private terrace
  for (const x of [10, 11]) box(R, ARCH.brass, 0.08, 2.3, 0.24, x, y0, 0);
  box(R, ARCH.brass, 1.08, 0.08, 0.24, 10.5, y0 + 2.3, 0);
  // desk
  const dx = DESK.x, dz = DESK.z;
  box(R, ARCH.panel, 0.6, 0.72, 0.9, dx - 0.8, y0, dz); box(R, ARCH.panel, 0.6, 0.72, 0.9, dx + 0.8, y0, dz); box(R, ARCH.panel, 2.2, 0.06, 0.95, dx, y0 + 0.72, dz);
  box(R, std({ color: 0x1d1210, roughness: 0.5 }), 1.5, 0.006, 0.6, dx, y0 + 0.78, dz + 0.05);
  for (const s of [-1, 1]) for (const yy of [0.15, 0.4]) box(R, ARCH.brass, 0.12, 0.025, 0.02, dx + s * 0.8, y0 + yy, dz + 0.46);
  // 80s computer
  const pc = group(R, dx, y0 + 0.78, dz - 0.05), beige = std({ color: 0x2c2723, roughness: 0.6 });
  box(pc, beige, 0.62, 0.5, 0.5, 0, 0.0, 0); box(pc, beige, 0.5, 0.4, 0.2, 0, 0.05, -0.3);
  const scrC = document.createElement('canvas'); scrC.width = 256; scrC.height = 192; const sx = scrC.getContext('2d');
  sx.fillStyle = '#12040a'; sx.fillRect(0, 0, 256, 192); sx.fillStyle = '#e8c872'; sx.font = 'bold 22px Georgia'; sx.textAlign = 'center'; sx.fillText('VELVET OS', 128, 70); sx.font = '13px monospace'; sx.fillText('press E to log in', 128, 100); sx.strokeStyle = '#e8c872'; sx.strokeRect(12, 12, 232, 168);
  const scrT = flipTex(new THREE.CanvasTexture(scrC)); scrT.colorSpace = THREE.SRGBColorSpace;
  vplane(pc, new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false }), 0.46, 0.34, 0, 0.27, 0.252);
  box(R, beige, 0.5, 0.03, 0.17, dx, y0 + 0.78, dz + 0.32); box(R, ARCH.brass, 0.06, 0.02, 0.02, dx + 0.5, y0 + 0.78, dz + 0.3);
  const lampG = group(R, dx - 0.8, y0 + 0.78, dz - 0.1); cyl(lampG, ARCH.brass, 0.1, 0.12, 0.03, 0, 0, 0); cyl(lampG, ARCH.brass, 0.015, 0.015, 0.3, 0, 0.03, 0);
  const sh = cyl(lampG, new THREE.MeshStandardMaterial({ color: 0x1f6a3a, emissive: 0x3aa860, emissiveIntensity: 1.0, side: THREE.DoubleSide }), 0.05, 0.16, 0.14, 0, 0.3, 0.05, 12); sh.rotation.x = 0.35;
  // chair
  const ch = group(R, dx, y0, dz + 0.95); ch.rotation.y = Math.PI;
  box(ch, ARCH.leather, 0.55, 0.09, 0.55, 0, 0.46, 0); box(ch, ARCH.leather, 0.5, 0.6, 0.1, 0, 0.55, -0.26); cyl(ch, ARCH.chrome, 0.03, 0.03, 0.4, 0, 0.06, 0); cyl(ch, ARCH.chrome, 0.28, 0.28, 0.03, 0, 0.0, 0);
  // safe
  box(R, std({ color: 0x1a1c20, roughness: 0.4, metalness: 0.8 }), 0.7, 0.95, 0.9, 11.5, y0, 4.85); box(R, ARCH.brass, 0.04, 0.55, 0.7, 11.13, y0 + 0.2, 4.85);
  const dial = cyl(R, ARCH.brass, 0.1, 0.1, 0.04, 11.1, y0 + 0.55, 4.85, 20); dial.rotation.z = Math.PI / 2; box(R, ARCH.brass, 0.03, 0.03, 0.3, 11.09, y0 + 0.3, 4.85);
  fx.anchors.safe = new THREE.Vector3(11.1, y0 + 0.6, 4.85);
  // record player on console
  box(R, ARCH.panel, 0.5, 0.75, 1.4, 11.65, y0, 2.1); const tt = group(R, 11.65, y0 + 0.75, 2.1);
  box(tt, ARCH.black, 0.44, 0.07, 0.5, 0, 0, 0); const plat = cyl(tt, ARCH.black, 0.2, 0.2, 0.02, 0, 0.07, 0.0, 24); spin.push(plat);
  cyl(plat, ARCH.brass, 0.008, 0.008, 0.04, 0, 0.02, 0); box(plat, std({ color: 0xaa2a3a }), 0.12, 0.003, 0.12, 0, 0.02, 0);
  box(tt, ARCH.brass, 0.01, 0.01, 0.28, 0.17, 0.1, 0.12); box(R, ARCH.panel, 0.34, 0.8, 0.34, 11.6, y0, 0.95); box(R, ARCH.panel, 0.34, 0.8, 0.34, 11.6, y0, 3.25);
  fx.anchors.record = new THREE.Vector3(11.2, y0 + 1.0, 2.1);
  // bar cart
  const cart = group(R, 7.0, y0, 4.7);
  for (const yy of [0.35, 0.8]) box(cart, ARCH.wood, 0.9, 0.03, 0.5, 0, yy, 0);
  for (const [x, z] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]]) cyl(cart, ARCH.brass, 0.015, 0.015, 0.85, x, 0, z);
  const bl = []; for (let i = 0; i < 5; i++) bl.push({ pos: [-0.3 + i * 0.15, 0.95, 0], color: ['#8a4a14', '#1f6a3a', '#cfd8d0', '#6a1218', '#8a4a14'][i] });
  instanced(cart, new THREE.CylinderGeometry(0.035, 0.04, 0.24, 10), std({ color: 0xffffff, roughness: 0.15, metalness: 0.2 }), bl);
  cyl(cart, ARCH.chrome, 0.07, 0.05, 0.12, 0, 0.38, 0); fx.anchors.cart = new THREE.Vector3(7.0, y0 + 1.0, 4.7);
  // framed artwork on the z=5.5 wall
  const frame = group(R, 10.0, y0 + 1.9, 5.4); frame.rotation.y = Math.PI;
  box(frame, ARCH.gold, 1.95, 1.45, 0.08, 0, -0.725, 0);
  let artMat = new THREE.MeshStandardMaterial({ map: artworkPlaceholder(), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.35 }); artMat.emissiveMap = artMat.map;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.25), artMat); art.position.set(0, 0, 0.045); frame.add(art);
  fx.setArt = (src) => {
    const apply = (tex, aspect) => {
      artMat.map?.dispose(); artMat.map = tex; artMat.emissiveMap = tex; artMat.needsUpdate = true;
      const bw = 1.75, bh = 1.25, a = aspect, w = a > bw / bh ? bw : bh * a, h = a > bw / bh ? bw / a : bh; art.scale.set(w / bw, h / bh, 1);
    };
    if (!src) { apply(artworkPlaceholder(), 640 / 440); return; }
    const img = new Image(); img.onload = () => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; flipTex(t); apply(t, img.width / img.height); }; img.src = src;
  };
  // security monitors with live camera render targets
  const shelf = box(R, ARCH.panel, 0.4, 0.05, 2.0, 6.3, y0 + 1.3, 3.0); void shelf;
  const feeds = [];
  [['CAM 1 · ENTRANCE', 2.45, new THREE.Vector3(-3.4, 3.05, 3.2), new THREE.Vector3(0, 1.3, 7.8)], ['CAM 2 · VIP STAIRS', 3.55, new THREE.Vector3(-11.1, 6.7, -0.4), new THREE.Vector3(-11.1, 0.4, -6.2)]].forEach(([label, z, pos, look]) => {
    const rt = new THREE.WebGLRenderTarget(256, 144); rt.texture.colorSpace = THREE.SRGBColorSpace; flipTex(rt.texture);
    const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 40); cam.position.set(-pos.x, pos.y, pos.z); cam.lookAt(-look.x, look.y, look.z);
    const g = group(R, 6.3, y0 + 1.33, z); g.rotation.y = Math.PI / 2;
    box(g, std({ color: 0x1d1a18, roughness: 0.6 }), 0.5, 0.4, 0.34, 0, 0, 0);
    const scr = vplane(g, new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false, color: 0xc8ffd8 }), 0.44, 0.25, 0, 0.22, 0.172);
    vplane(g, new THREE.MeshBasicMaterial({ map: labelTexture(label, { w: 256, h: 40, font: '700 20px monospace', bg: '#0a0a0a', fg: '#7fe8a0', border: false }), toneMapped: false }), 0.44, 0.07, 0, 0.05, 0.172);
    feeds.push({ rt, cam, group: g, scr });
  });
  (fx.disposers ??= []).push(() => feeds.forEach(f => f.rt.dispose()));
  let ti = 0, acc = 0;
  fx.updaters.push((dt, t, ctx) => {
    acc += dt; if (acc < 0.7 || !ctx.camsActive) return; acc = 0;
    const f = feeds[ti = (ti + 1) % feeds.length], r = world.renderer, prev = r.getRenderTarget();
    for (const o of feeds) o.group.visible = false;
    world.pinsG.visible = false; r.setRenderTarget(f.rt); r.render(world.scene, f.cam); r.setRenderTarget(prev);
    world.pinsG.visible = true; for (const o of feeds) o.group.visible = true;
  });
  fx.anchors.computer = new THREE.Vector3(dx, y0 + 1.1, dz);
}

// ── NEON SIGNS ─────────────────────────────────────────────────────────────
function buildNeons(world, fx) {
  const R = world.root;
  const mk = (text, color, w, h, x, y, z, ry, tw = 512, th = 128, font) => {
    const mat = new THREE.MeshBasicMaterial({ map: neonTexture(text, color, tw, th, font), transparent: true, toneMapped: false, depthWrite: false });
    const g = group(R, x, y, z); g.rotation.y = ry;
    box(g, ARCH.black, w + 0.2, h + 0.15, 0.05, 0, -(h + 0.15) / 2, -0.03);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.y = 0; g.add(m); m.position.set(0, -(h + 0.15) / 2, 0.0);
    return { g, m, mat };
  };
  // bar name (updatable)
  const sign = mk('The Velvet Note', '#ff6b4a', 4.4, 1.1, 11.8, 4.55, -2.3, -Math.PI / 2, 1024, 256);
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128; const gx = glowC.getContext('2d'), gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,107,74,0.5)'); gr.addColorStop(1, 'rgba(255,107,74,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 }));
  gm.position.set(11.78, 3.9, -2.3); gm.rotation.y = -Math.PI / 2; R.add(gm);
  const ext = group(R, 0, 4.7, 8.38); box(ext, ARCH.black, 4.6, 1.25, 0.08, 0, 0, 0); const em = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), sign.mat); em.position.set(0, 0.625, 0.045); ext.add(em);
  const eg = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), gm.material); eg.position.set(0, 0.62, 0.07); ext.add(eg);
  fx.setName = name => { sign.mat.map.dispose(); sign.mat.map = neonTexture(name || 'The Velvet Note', '#ff6b4a', 1024, 256); sign.mat.needsUpdate = true; };
  mk('Jazz', '#ff4fa3', 1.8, 0.6, -11.75, 3.2, 2.2, Math.PI / 2, 512, 170, 'italic 700 130px "Brush Script MT", cursive');
  mk('Open', '#4fe8d0', 1.1, 0.5, -3.6, 2.9, 7.8, Math.PI, 512, 220, 'italic 700 150px "Brush Script MT", cursive');
  mk('Live Music', '#ffb347', 2.4, 0.6, -9.2, 5.8, -7.82 - DIMS.hall, 0, 1024, 256, 'italic 700 150px "Brush Script MT", cursive');
}
