// Shared placement rules: used by the 2D floor plan (ui/design.js) and the 3D build mode (build.js).
import { FURNITURE } from './data/catalog.js';
import { INNER, walls, fixtureCols, blockZones, rectsOverlap } from './plan.js';
import { rectOf, isWallItem } from './furniture.js';
import { fin } from './state.js';
import { CONFIG } from './data/catalog.js';

export const snap = v => Math.round(v * 4) / 4;

/** Snap a wall item to the nearest wall face (sets x, z, r, _wall). */
export function snapWall(it, x, z) {
  const f = it.f, d = FURNITURE[it.k], depth = d.fp[1], faces = [];
  for (const w of walls) if (w.collide && (w.f === f || w.f === -1)) faces.push({ nx: 1, nz: 0, pos: w.x1, a0: w.z0, a1: w.z1 }, { nx: -1, nz: 0, pos: w.x0, a0: w.z0, a1: w.z1 }, { nx: 0, nz: 1, pos: w.z1, a0: w.x0, a1: w.x1 }, { nx: 0, nz: -1, pos: w.z0, a0: w.x0, a1: w.x1 });
  const I = INNER[f]; faces.push({ nx: 1, nz: 0, pos: I.x0, a0: I.z0, a1: I.z1 }, { nx: -1, nz: 0, pos: I.x1, a0: I.z0, a1: I.z1 }, { nx: 0, nz: 1, pos: I.z0, a0: I.x0, a1: I.x1 }, { nx: 0, nz: -1, pos: I.z1, a0: I.x0, a1: I.x1 });
  let best = null, bd = 1.3;
  for (const fc of faces) {
    const along = fc.nx ? z : x, dist = fc.nx ? (x - fc.pos) * fc.nx : (z - fc.pos) * fc.nz;
    if (dist < -0.05 || dist > bd || along < fc.a0 - 0.1 || along > fc.a1 + 0.1) continue; bd = dist; best = fc;
  }
  if (!best) { it.x = x; it.z = z; it._wall = false; return; }
  it._wall = true; it.r = best.nx === 1 ? 1 : best.nx === -1 ? 3 : best.nz === 1 ? 0 : 2;
  if (best.nx) { it.x = best.pos + best.nx * depth / 2; it.z = snap(z); } else { it.z = best.pos + best.nz * depth / 2; it.x = snap(x); }
}

/** true when the item may be there, else a human-readable reason. */
export function validity(s, it, ignoreId) {
  const d = FURNITURE[it.k], r = rectOf(it), I = INNER[it.f];
  if (isWallItem(d)) {
    if (!it._wall) return 'Hang this on a wall: drag it next to one.';
    for (const o of s.items) if (o.id !== ignoreId && o.f === it.f && isWallItem(FURNITURE[o.k]) && rectsOverlap(r, rectOf(o))) return 'Overlaps another wall item.';
    return true;
  }
  if (r.x0 < I.x0 - 1e-6 || r.x1 > I.x1 + 1e-6 || r.z0 < I.z0 - 1e-6 || r.z1 > I.z1 + 1e-6) return 'Outside the room.';
  if (d.walk || d.hang) return true;
  for (const w of walls) if (w.collide && (w.f === it.f || w.f === -1) && rectsOverlap(r, w)) return 'Blocked: that is inside a wall.';
  for (const z of [...fixtureCols[it.f], ...blockZones[it.f]]) if (rectsOverlap(r, z)) return 'Reserved space (stage, bar, stairs, office, doors, terrace rails).';
  for (const o of s.items) if (o.id !== ignoreId && o.f === it.f) { const od = FURNITURE[o.k]; if (!od.walk && !od.hang && !isWallItem(od) && rectsOverlap(r, rectOf(o))) return 'Overlaps another item.'; }
  return true;
}

/** Charge the player and add the item. Returns the item or {error}. */
export function buyItem(ctx, ghost) {
  const s = ctx.state, d = FURNITURE[ghost.k], v = validity(s, ghost);
  if (v !== true) return { error: v };
  if (s.fin.cash < d.price) return { error: 'Not enough cash for that.' };
  const item = { id: s.nextId++, k: ghost.k, f: ghost.f, x: ghost.x, z: ghost.z, r: ghost.r, m: {}, cost: d.price }; if (isWallItem(d)) item._wall = true;
  s.items.push(item); fin.buyAsset(s, d.name, d.price); ctx.layoutChanged(); return item;
}
/** Sell an item back at 50%. */
export function sellItem(ctx, it) {
  const s = ctx.state, d = FURNITURE[it.k], refund = it.cost * CONFIG.refundRate;
  fin.sellAsset(s, 'Sold ' + d.name, it.cost, refund); s.items = s.items.filter(i => i !== it); ctx.layoutChanged(); return refund;
}
