// Turns catalogue entries (data/catalog.js) into meshes, footprints, colliders and seats.
import * as THREE from 'three';
import { FURNITURE } from './data/catalog.js';
import { ARCH, furnMaterial, ensureSpecial } from './materials.js';
import { box } from './gfx.js';
import { BLD, ceilingY } from './plan.js';

export const isWallItem = d => d.wall !== undefined;
export const floorBase = f => (f === 1 ? BLD.F1 : 0);
/** length along the item's own x axis (resizable partitions can be 1–12 m, everything else is fixed) */
export const lenOf = (item, d = FURNITURE[item.k]) => (d.resize ? Math.max(d.resize[0], Math.min(d.resize[1], item.len ?? d.fp[0])) : d.fp[0]);
export const partsOf = (d, item) => (typeof d.parts === 'function' ? d.parts(lenOf(item, d)) : d.parts);

export function defaultMats(k) { const d = FURNITURE[k]; return Object.fromEntries(Object.keys(d.slots).map(s => [s, { id: d.defaults[s] }])); }

/** footprint rect (world AABB) for an item */
export function rectOf(item) {
  const d = FURNITURE[item.k], L = lenOf(item, d), odd = item.r % 2 !== 0, w = odd ? d.fp[1] : L, h = odd ? L : d.fp[1];
  return { x0: item.x - w / 2, x1: item.x + w / 2, z0: item.z - h / 2, z1: item.z + h / 2 };
}
/** rects that block walking */
export function colsOf(item) {
  const d = FURNITURE[item.k]; if (d.walk || d.hang || isWallItem(d)) return [];
  const r = rectOf(item); const s = 0.04; return [{ x0: r.x0 + s, x1: r.x1 - s, z0: r.z0 + s, z1: r.z1 - s }];
}
export function seatsOf(item) {
  const d = FURNITURE[item.k]; if (!d.seats) return [];
  const th = item.r * Math.PI / 2, c = Math.cos(th), s = Math.sin(th), base = floorBase(item.f);
  const tr = (lx, lz) => [item.x + lx * c + lz * s, item.z - lx * s + lz * c];
  return d.seats.map((st, i) => {
    const [x, z] = tr(...st.p), [ax, az] = tr(...st.a);
    return { key: item.id + '#' + i, item, f: item.f, x, z, y: base + st.h, yaw: st.f + th, ax, az, vip: item.f === 1, taken: false };
  });
}
export function hangBodyY(item) {
  const ceil = ceilingY(item.f, item.z);
  return item.f === 1 ? BLD.F1 + 2.6 : ceil < 3.5 ? ceil - 0.75 : 4.6;
}

let _blob = null;
/** soft round contact shadow texture (shared) */
export function blobTexture() {
  if (_blob) return _blob;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _blob = new THREE.CanvasTexture(c); _blob.colorSpace = THREE.SRGBColorSpace; return _blob;
}
export const blobMat = () => new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: true });

/** where an item's group sits: {x,y,z,ry} */
export function itemTransform(item) {
  const d = FURNITURE[item.k]; let y = floorBase(item.f);
  if (isWallItem(d)) y += d.wall;
  if (d.hang) y = hangBodyY(item);
  return { x: item.x, y, z: item.z, ry: item.r * Math.PI / 2 };
}

export function matSig(item) { return JSON.stringify([item.k, item.f, item.x, item.z, item.r, item.m, item.len]); }

/** Build the 3D group for an item. */
export function buildItem(item) {
  ensureSpecial();
  const d = FURNITURE[item.k], g = new THREE.Group();
  let chain = null;
  partsOf(d, item).forEach((p, idx) => {
    let mat;
    if (p.slot.startsWith('@')) mat = furnMaterial(p.slot);
    else { const ch = item.m?.[p.slot]; mat = d.slots[p.slot] ? furnMaterial(p.slot, ch?.id ?? d.defaults[p.slot], ch?.color) : ARCH.black; }
    let mesh;
    if (p.s === 'box') mesh = box(null, mat, p.size[0], p.size[1], p.size[2], 0, -p.size[1] / 2, 0);
    else if (p.s === 'cyl') mesh = new THREE.Mesh(new THREE.CylinderGeometry(p.size[0], p.size[1], p.size[2], p.size[3] || 14), mat);
    else { mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size[0], 14, 10), mat); if (p.sc) mesh.scale.set(...p.sc); }
    if (p.s === 'box') mesh.position.set(...p.p); else mesh.position.set(...p.p);
    mesh.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0, 'YXZ');
    g.add(mesh);
    if (d.hang && idx === 0) chain = mesh;
  });
  const T = itemTransform(item);
  if (d.hang) { const by = T.y, top = ceilingY(item.f, item.z) - 0.02, L = top - by - 0.2; chain.scale.y = L; chain.position.y = 0.2 + L / 2; }
  else if (!d.walk && !isWallItem(d)) { // soft contact shadow under floor-standing items
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(lenOf(item, d) * 1.35, d.fp[1] * 1.35), blobMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.userData.noPick = true; g.add(sh);
  }
  g.rotation.y = T.ry; g.position.set(T.x, T.y, T.z);
  g.userData.itemId = item.id;
  return g;
}
