// Mesh helpers. All textured surfaces get world-scale UVs (material.userData.tile = metres per repeat).
import * as THREE from 'three';

function scaleBoxUV(geo, w, h, d, tile) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true;
}

/** Box; (x,z) = centre, y = BOTTOM. Returns the mesh (added to parent when given). */
export function box(parent, mat, w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d), base = g.attributes.uv.array.slice();
  if (mat.userData.tile) scaleBoxUV(g, w, h, d, mat.userData.tile);
  const m = new THREE.Mesh(g, mat); m.userData.uvInfo = { base, dims: [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], perFace: true }; m.position.set(x, y + h / 2, z); parent?.add(m); return m;
}
/** Cylinder; y = BOTTOM. */
export function cyl(parent, mat, rt, rb, h, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z); parent?.add(m); return m;
}
export function sph(parent, mat, r, x, y, z, sc) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.position.set(x, y, z); if (sc) m.scale.set(...sc); parent?.add(m); return m;
}
/** Horizontal plane on [x0,x1]×[z0,z1] at height y, facing up (or down when up=false). */
export function flat(parent, mat, x0, x1, z0, z1, y, up = true) {
  const w = x1 - x0, d = z1 - z0, g = new THREE.PlaneGeometry(w, d), t = mat.userData.tile, base = g.attributes.uv.array.slice();
  if (t) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / t, uv.getY(i) * d / t); }
  const m = new THREE.Mesh(g, mat); m.userData.uvInfo = { base, dims: [[w, d]], perFace: false }; m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); parent?.add(m); return m;
}
/** Vertical plane facing +z when ry=0 (centre based). */
export function vplane(parent, mat, w, h, x, y, z, ry = 0) {
  const g = new THREE.PlaneGeometry(w, h), t = mat.userData.tile;
  if (t) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / t, uv.getY(i) * h / t); }
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; parent?.add(m); return m;
}
export const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; };

/** Re-scale a mesh's UVs for a new material tile size (used when swapping wall/floor textures). */
export function retile(m, tile) {
  const info = m.userData.uvInfo; if (!info || !tile) return; const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const [du, dv] = info.dims[info.perFace ? i >> 2 : 0]; uv.setXY(i, info.base[2 * i] * du / tile, info.base[2 * i + 1] * dv / tile); }
  uv.needsUpdate = true;
}
