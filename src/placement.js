// Shared placement rules: used by the 2D floor plan (ui/design.js) and the 3D build mode (build.js).
import { FURNITURE } from './data/catalog.js';
import { INNER, walls, fixtureCols, blockZones, rectsOverlap, DIMS, applyDims, MAX_HALL } from './plan.js';
import { rectOf, isWallItem, lenOf } from './furniture.js';
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

/** price of an item at its current length (resizable partitions are priced per 3 m) */
export const priceOf = item => { const d = FURNITURE[item.k]; return d.resize ? Math.round(d.price * lenOf(item, d) / d.fp[0]) : d.price; };

/** Charge the player and add the item. Returns the item or {error}. */
export function buyItem(ctx, ghost) {
  const s = ctx.state, d = FURNITURE[ghost.k], v = validity(s, ghost), price = priceOf(ghost);
  if (v !== true) return { error: v };
  if (s.fin.cash < price) return { error: 'Not enough cash for that.' };
  const item = { id: s.nextId++, k: ghost.k, f: ghost.f, x: ghost.x, z: ghost.z, r: ghost.r, m: {}, cost: price }; if (isWallItem(d)) item._wall = true; if (d.resize) item.len = lenOf(ghost, d);
  s.items.push(item); fin.buyAsset(s, d.name, price); ctx.layoutChanged(); return item;
}

/** Change the length of a placed partition. Longer costs the price difference; shorter refunds half of it (same 50% rule as selling). Returns {ok} or {error}. */
export function resizeItem(ctx, it, newLen) {
  const s = ctx.state, d = FURNITURE[it.k]; if (!d.resize) return { error: 'This item cannot be resized.' };
  newLen = Math.round(Math.max(d.resize[0], Math.min(d.resize[1], newLen)) * 2) / 2;
  const oldLen = lenOf(it, d); if (newLen === oldLen) return { ok: true };
  const delta = d.price * (newLen - oldLen) / d.fp[0];
  if (delta > 0 && s.fin.cash < delta) return { error: `Not enough cash to make it longer (needs ${Math.round(delta)}).` };
  it.len = newLen; const v = validity(s, it, it.id);
  if (v !== true) { it.len = oldLen; return { error: v }; }
  if (delta > 0) fin.buyAsset(s, `Extended ${d.name} to ${newLen} m`, delta); else fin.sellAsset(s, `Shortened ${d.name} to ${newLen} m`, -delta, -delta * CONFIG.refundRate);
  it.cost = (it.cost ?? d.price) + delta; ctx.layoutChanged(); return { ok: true };
}

/** Set the hall length (0…MAX_HALL extra metres at the back) and stage distance (0…hall). Free. Refuses (and changes nothing) if furniture would end up in a wall or on the stage. */
export function changeDims(ctx, hall, stage) {
  const s = ctx.state;
  if (ctx.sim.night) return { error: 'Close the bar first: you cannot rebuild while guests are inside.' };
  hall = Math.max(0, Math.min(MAX_HALL, Math.round(hall))); stage = Math.max(0, Math.min(hall, Math.round(stage)));
  const old = { ...DIMS }; if (hall === old.hall && stage === old.stage) return { ok: true, same: true };
  const oldZ0 = INNER[0].z0, wasBad = new Set(s.items.filter(it => validity(s, it, it.id) !== true).map(it => it.id)); // the starter layout already has a few "invalid" pieces: only block on new problems
  applyDims(hall, stage);
  const dz = INNER[0].z0 - oldZ0, moved = [];
  for (const it of s.items) if (it.f === 0 && it._wall && it.r === 0 && it.z < oldZ0 + 1) { moved.push([it, it.z]); it.z += dz; } // things hung on the back wall follow it
  const bad = s.items.filter(it => !wasBad.has(it.id) && validity(s, it, it.id) !== true);
  if (bad.length) {
    applyDims(old.hall, old.stage); for (const [it, z] of moved) it.z = z;
    return { error: `${bad.length} piece${bad.length > 1 ? 's' : ''} of furniture would end up outside the room or on the stage. Move or sell ${bad.length > 1 ? 'them' : 'it'} first.` };
  }
  return { ok: true };
}
/** Sell an item back at 50%. */
export function sellItem(ctx, it) {
  const s = ctx.state, d = FURNITURE[it.k], refund = it.cost * CONFIG.refundRate;
  fin.sellAsset(s, 'Sold ' + d.name, it.cost, refund); s.items = s.items.filter(i => i !== it); ctx.layoutChanged(); return refund;
}
