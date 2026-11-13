// Material factory (MeshStandardMaterial everywhere) + the warm environment map that makes brass and gold shine.
import * as THREE from 'three';
import { tex, neonTexture } from './textures.js';
import { MATERIALS } from './data/catalog.js';

const std = (o, tile) => { const m = new THREE.MeshStandardMaterial(o); const t = o.map; m.userData.tile = tile ?? t?.userData.tile; return m; };

export const ARCH = {};
export function initMaterials() {
  Object.assign(ARCH, {
    panel: std({ map: tex('panel'), roughness: 0.45, metalness: 0.05 }),
    damask: std({ map: tex('damask'), roughness: 0.85 }),
    damaskGreen: std({ map: tex('damaskGreen'), roughness: 0.85 }),
    tin: std({ map: tex('tin'), roughness: 0.8, metalness: 0.15, color: 0x9c8c70 }),
    parquet: std({ map: tex('parquet'), roughness: 0.38, metalness: 0.05 }),
    checker: std({ map: tex('checker'), roughness: 0.1, metalness: 0.1 }),
    carpet: std({ map: tex('carpet'), roughness: 1 }),
    marbleBlack: std({ map: tex('marbleBlack'), roughness: 0.12, metalness: 0.15 }),
    marbleWhite: std({ map: tex('marbleWhite'), roughness: 0.15 }),
    brass: std({ color: 0xc89a3e, roughness: 0.34, metalness: 1 }),
    gold: std({ color: 0xf0c85a, roughness: 0.2, metalness: 1 }),
    chrome: std({ color: 0xd4d8dc, roughness: 0.12, metalness: 1 }),
    plaster: std({ color: 0x3a2328, roughness: 0.9 }),
    black: std({ color: 0x0e0d10, roughness: 0.35, metalness: 0.3 }),
    ebony: std({ color: 0x241a16, roughness: 0.3, metalness: 0.1 }),
    velvet: std({ map: tex('velvet'), color: 0x7a1230, roughness: 0.95, bumpMap: tex('velvet'), bumpScale: 1 }),
    velvetGreen: std({ map: tex('velvet'), color: 0x1d6a4f, roughness: 0.95 }),
    leather: std({ map: tex('leather'), color: 0x3a1a12, roughness: 0.5 }),
    wood: std({ map: tex('wood'), color: 0x7a4a2a, roughness: 0.4 }),
    woodLight: std({ map: tex('wood'), color: 0xc08a50, roughness: 0.45 }),
    mirror: std({ color: 0xb4ae9c, roughness: 0.04, metalness: 1 }),
    darkGlass: std({ color: 0x06070a, roughness: 0.05, metalness: 0.9 }),
    glassIn: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false }),
    street: std({ color: 0x07080d, roughness: 0.4 }),
    planks: std({ map: tex('planks'), roughness: 0.4, metalness: 0.05 }),
    checkerGreen: std({ map: tex('checkerGreen'), roughness: 0.1, metalness: 0.1 }),
    damaskNavy: std({ map: tex('damaskNavy'), roughness: 0.85 }),
    stripes: std({ map: tex('stripes'), roughness: 0.85 }),
    brick: std({ map: tex('brick'), roughness: 0.95 }),
    facade: (() => { const f = std({ map: tex('facade'), roughness: 0.9 }); f.emissive = new THREE.Color(0xffffff); f.emissiveMap = tex('facade'); f.emissiveIntensity = 0.7; return f; })(),
    pavement: std({ color: 0x4a4a52, roughness: 0.95 }),
    asphalt: std({ color: 0x1b1c22, roughness: 0.9 }),
    skin: std({ color: 0xe0b090, roughness: 0.7 }),
  });
}

export const SPECIAL = {};
function initSpecial() {
  const emissive = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x2a1c08, emissive: c, emissiveIntensity: i, roughness: 0.5 });
  const nm = (text, color, w, h, font) => new THREE.MeshBasicMaterial({ map: neonTexture(text, color, w, h, font), transparent: true, toneMapped: false, depthWrite: false });
  Object.assign(SPECIAL, {
    '@glass': new THREE.MeshStandardMaterial({ color: 0xbfd8e0, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3, depthWrite: false }),
    '@mirror': ARCH.mirror,
    '@lampglow': emissive(0xffc070, 3),
    '@lampshade': new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa84a, emissiveIntensity: 1.6, roughness: 0.8, side: THREE.DoubleSide }),
    '@leaf': new THREE.MeshStandardMaterial({ color: 0x2c6a3a, roughness: 0.8, side: THREE.DoubleSide }),
    '@trunk': new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.9 }),
    '@bottle_amber': new THREE.MeshStandardMaterial({ color: 0x7a4310, emissive: 0x2a1204, roughness: 0.15, metalness: 0.2 }),
    '@bottle_green': new THREE.MeshStandardMaterial({ color: 0x1e5a34, emissive: 0x06180c, roughness: 0.15, metalness: 0.2 }),
    '@cigar': new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.8 }),
    '@black': ARCH.black,
    '@book_a': std({ color: 0x6a1a22, roughness: 0.7 }), '@book_b': std({ color: 0x1f3a4c, roughness: 0.7 }), '@book_c': std({ color: 0x8a6a2a, roughness: 0.7 }),
    '@painting': std({ map: tex('painting'), roughness: 0.6 }, 1),
    '@neon_pink': nm('JAZZ', '#ff4fa3', 512, 160, 'italic 700 130px "Brush Script MT", cursive'),
    '@screen': new THREE.MeshStandardMaterial({ color: 0x06140e, emissive: 0x28c080, emissiveIntensity: 0.8 }),
    '@marquee': new THREE.MeshStandardMaterial({ color: 0x1a0610, emissive: 0xff4fa3, emissiveIntensity: 1.1 }),
    '@neon_amber': new THREE.MeshBasicMaterial({ color: 0xffb04a, toneMapped: false }),
  });
}

const fcache = new Map();
const byId = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
/** Material for an item slot. color overrides the preset tint. */
export function furnMaterial(slotValue, presetId, color) {
  if (typeof slotValue === 'string' && slotValue.startsWith('@')) { if (!SPECIAL['@black']) initSpecial(); return SPECIAL[slotValue]; }
  const p = byId[presetId] ?? MATERIALS[0], key = p.id + '|' + (color || '');
  let m = fcache.get(key);
  if (!m) {
    const o = { color: color || p.color, roughness: p.rough, metalness: p.metal };
    if (p.tex) { o.map = tex(p.tex); if (p.tex === 'velvet' || p.tex === 'leather') { o.bumpMap = tex(p.tex); o.bumpScale = 0.8; } }
    m = std(o); fcache.set(key, m);
  }
  return m;
}
export const presetsByType = type => MATERIALS.filter(m => m.type === type);
export const presetById = id => byId[id];
export const ensureSpecial = () => { if (!SPECIAL['@black']) initSpecial(); };

/** A warm, dim "bar interior" environment: the gold & brass reflect these soft light panels. */
export function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 30), new THREE.MeshBasicMaterial({ color: 0x24140c, side: THREE.BackSide }));
  s.add(room);
  const panel = (c, w, h, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  const warm = new THREE.Color(7, 4.2, 1.8), pink = new THREE.Color(3.2, 0.8, 1.6), teal = new THREE.Color(0.8, 2.4, 2.8), white = new THREE.Color(4, 3.6, 3);
  panel(warm, 8, 3, 0, 5.9, -4, 0, Math.PI / 2); panel(warm, 6, 3, -8, 5.9, 6, 0, Math.PI / 2); panel(warm, 6, 3, 8, 5.9, 5, 0, Math.PI / 2);
  panel(white, 6, 2, 0, 6, 12, 0, Math.PI / 2);
  panel(pink, 4, 1.5, -14.9, 3, -3, Math.PI / 2); panel(teal, 3, 1.2, 14.9, 3.5, 4, -Math.PI / 2); panel(warm, 5, 2, 0, 3, -14.9);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.02).texture; pm.dispose(); return env;
}
