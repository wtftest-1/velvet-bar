// Design app: top-down floor plan editor. Buy furniture, drag, rotate (R), delete (Del, 50% refund), recolour, read pins.
import { h } from './dom.js';
import { FURNITURE, MATERIALS, CONFIG, SURFACES, SURFACE_LABELS } from '../data/catalog.js';
import { RAIL, TERRACE2 } from '../plan.js';
import { snap, snapWall as snapWallP, validity as validityP, buyItem, sellItem } from '../placement.js';
import { materialEditor, thumbImg } from './widgets.js';
import { INNER, walls, fixtureCols, blockZones, ENTRANCE } from '../plan.js';
import { rectOf, isWallItem, seatsOf } from '../furniture.js';
import { presetsByType, presetById } from '../materials.js';
import { fin, fmt } from '../state.js';

const S = 36, PAD = 24, W = 24 * S + PAD * 2, H = 16 * S + PAD * 2;
const px = (x, z) => [PAD + (12 - x) * S, PAD + (z + 8) * S];   // x is mirrored: the bar is on the right when you look from the stage
const CATS = ['All', 'Seating', 'Tables', 'Service', 'Rooms', 'Vintage', 'Decor'];
const AREAS = [
  [0, -7.5, 7.5, -8, -4.5, 'STAGE', '#4a3320'], [0, -12, -10.1, -8, 0, 'SECRET STAIRS', '#35242f'], [0, -12, -7.5, 4, 8, 'COAT CHECK', '#2e2230'], [0, 7.5, 12, 4, 8, 'WC', '#2a2a30'],
  [0, 9.9, 11.85, -5.6, 3.9, 'BAR', '#4a3a22'], [0, -7.5, 7.5, 4, 8, 'FOYER', '#22181e'],
  [1, 6, 12, 0, 5.5, 'YOUR OFFICE', '#3a2a22'], [1, -12, -10.1, 0, 2.4, 'stairs', '#35242f'], [1, RAIL.x0, RAIL.x1, RAIL.z, 0, 'VIP TERRACE', '#4a3a2a'], [1, TERRACE2.x0, TERRACE2.x1, TERRACE2.z0, 0, 'MY TERRACE', '#4a3a2a'], [1, -12, -5.5, 0, 4.2, 'CIGAR ROOM', '#2a2230'], [1, -12, -5.5, 4.2, 8, 'DINING', '#2a2230'], [1, -5.5, 6, 0.1, 8, 'VIP LOUNGE', '#2a1a24'],
];

export function designApp(ctx, api, params) {
  const { state: s, world } = ctx;
  let floor = 0, selId = null, selPin = null, placing = null, drag = null, cat = 'All', hover = null, msg = '';
  if (params?.pin) { const p = s.pins.find(x => x.id === params.pin); if (p) { floor = p.f; selPin = p.id; } }

  const cv = h('canvas', { id: 'plan', width: W, height: H, role: 'img', 'aria-label': 'Top-down floor plan. Use the catalogue to buy furniture, then click the plan to place it. Arrow keys nudge the selected item, R rotates it, Delete sells it.', tabindex: '0' });
  const g = cv.getContext('2d'), left = h('div'), right = h('div'), status = h('div', { class: 'legend', role: 'status', 'aria-live': 'polite' });
  const itemsOn = () => s.items.filter(i => i.f === floor), byId = id => s.items.find(i => i.id === id);
  const say = t => { msg = t; status.textContent = t; };

  // ── validity (shared rules: see placement.js)
  const snapWall = snapWallP, validity = (it, ig) => validityP(s, it, ig);

  // ── drawing ───────────────────────────────────────────────────────────────
  const colorOf = it => { const d = FURNITURE[it.k], sl = Object.keys(d.slots)[0]; if (!sl) return '#caa24a'; const ch = it.m?.[sl]; return ch?.color ?? presetById(ch?.id ?? d.defaults[sl])?.color ?? '#888'; };
  function rectPx(r) { const [x0, y0] = px(r.x1, r.z0), [x1, y1] = px(r.x0, r.z1); return [x0, y0, x1 - x0, y1 - y0]; }
  function draw() {
    g.clearRect(0, 0, W, H); g.fillStyle = '#10030a'; g.fillRect(0, 0, W, H);
    const I = INNER[floor];
    g.fillStyle = floor ? '#26151d' : '#2a1420'; g.fillRect(...rectPx({ x0: -12, x1: 12, z0: floor ? 0 : -8, z1: 8 }));
    if (floor === 1) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(...rectPx({ x0: -12, x1: 12, z0: -8, z1: 0 })); g.fillStyle = '#b9a58a'; g.font = '12px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText('open to the stage below (double height)', px(0, -4)[0], px(0, -4)[1]); }
    g.strokeStyle = 'rgba(224,184,78,.08)'; g.lineWidth = 1; for (let x = -12; x <= 12; x++) { const [a, b] = px(x, floor ? 0 : -8), [, c] = px(x, 8); g.beginPath(); g.moveTo(a, b); g.lineTo(a, c); g.stroke(); } for (let z = floor ? 0 : -8; z <= 8; z++) { const [a, b] = px(-12, z), [c] = px(12, z); g.beginPath(); g.moveTo(a, b); g.lineTo(c, b); g.stroke(); }
    for (const [f, x0, x1, z0, z1, label, fill] of AREAS) if (f === floor) { g.fillStyle = fill; g.fillRect(...rectPx({ x0, x1, z0, z1 })); g.fillStyle = 'rgba(244,231,201,.55)'; g.font = 'bold 11px ui-monospace,monospace'; g.textAlign = 'center'; const [cx, cy] = px((x0 + x1) / 2, (z0 + z1) / 2); g.fillText(label, cx, cy); }
    g.fillStyle = 'rgba(255,90,70,.07)'; for (const z of blockZones[floor]) g.fillRect(...rectPx(z));
    for (const f of fixtureCols[floor]) { g.fillStyle = 'rgba(224,184,78,.28)'; g.fillRect(...rectPx(f)); }
    g.fillStyle = '#d8b25a'; for (const w of walls) if (w.collide && (w.f === floor || w.f === -1)) g.fillRect(...rectPx(w));
    g.fillStyle = '#7fd39a'; g.font = '10px ui-monospace,monospace'; g.textAlign = 'center'; if (floor === 0) { const [a, b] = px(0, 8); g.fillText('▲ ENTRANCE', a, b + 18); }
    // items
    const list = itemsOn().slice().sort((a, b) => (FURNITURE[b.k].walk ? 1 : 0) - (FURNITURE[a.k].walk ? 1 : 0));
    for (const it of list) {
      const d = FURNITURE[it.k], r = rectOf(it), bad = drag?.id === it.id && drag.bad;
      g.globalAlpha = d.walk ? 0.55 : 1; g.fillStyle = bad ? '#d04030' : colorOf(it); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5;
      const rp = rectPx(r); if (d.hang) { g.beginPath(); g.arc(rp[0] + rp[2] / 2, rp[1] + rp[3] / 2, rp[2] * 0.36, 0, 6.28); g.setLineDash([4, 3]); g.strokeStyle = '#f1d072'; g.stroke(); g.setLineDash([]); g.globalAlpha = 1; continue; }
      g.fillRect(...rp); g.strokeRect(...rp); g.globalAlpha = 1;
      for (const st of seatsOf(it)) { const [a, b] = px(st.x, st.z); g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(a, b, 4, 0, 6.28); g.fill(); }
      if (rp[2] > 40) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '10px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText(d.name.split(' ')[0], rp[0] + rp[2] / 2, rp[1] + rp[3] / 2 + 3); }
    }
    if (selId != null) { const it = byId(selId); if (it && it.f === floor) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.setLineDash([6, 3]); const rp = rectPx(rectOf(it)); g.strokeRect(rp[0] - 3, rp[1] - 3, rp[2] + 6, rp[3] + 6); g.setLineDash([]); } }
    if (placing && hover) { const it = ghost(); const ok = validity(it) === true; g.fillStyle = ok ? 'rgba(127,211,154,.55)' : 'rgba(255,122,107,.55)'; g.strokeStyle = ok ? '#7fd39a' : '#ff7a6b'; g.lineWidth = 2; const rp = rectPx(rectOf(it)); g.fillRect(...rp); g.strokeRect(...rp); }
    // pins + player
    for (const p of s.pins) if (p.f === floor) { const [a, b] = px(p.x, p.z); g.beginPath(); g.arc(a, b, 8, 0, 6.28); g.fillStyle = p.done ? '#6fcf97' : '#ffc648'; g.shadowColor = '#ffc648'; g.shadowBlur = p.done ? 0 : 10; g.fill(); g.shadowBlur = 0; g.strokeStyle = p.id === selPin ? '#fff' : '#3a2200'; g.lineWidth = p.id === selPin ? 3 : 1.5; g.stroke(); g.fillStyle = '#2a0711'; g.font = 'bold 9px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText(p.id, a, b + 3); }
    const pl = ctx.player; if (pl.floor === floor) { const [a, b] = px(pl.x, pl.z); g.save(); g.translate(a, b); g.rotate(pl.yaw); g.fillStyle = '#4fe8d0'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore(); }
  }
  const ghost = () => { const it = { id: -1, k: placing.k, f: floor, x: hover[0], z: hover[1], r: placing.r, m: {} }; const d = FURNITURE[it.k]; if (isWallItem(d)) snapWall(it, hover[0], hover[1]); else { it.x = snap(hover[0]); it.z = snap(hover[1]); } return it; };

  // ── interaction ───────────────────────────────────────────────────────────
  const world2 = e => { const b = cv.getBoundingClientRect(), k = W / b.width, X = (e.clientX - b.left) * k, Z = (e.clientY - b.top) * k; return [12 - (X - PAD) / S, (Z - PAD) / S - 8]; };
  function hit(x, z) {
    for (const p of s.pins) if (p.f === floor && Math.hypot(p.x - x, p.z - z) < 0.35) return { pin: p };
    const list = itemsOn().slice().reverse();
    for (const pass of [0, 1]) for (const it of list) { const w = !!FURNITURE[it.k].walk; if ((pass === 0) === w) continue; const r = rectOf(it), t = 0.06; if (x >= r.x0 - t && x <= r.x1 + t && z >= r.z0 - t && z <= r.z1 + t) return { item: it }; }
    return null;
  }
  cv.addEventListener('pointerdown', e => {
    cv.focus(); const [x, z] = world2(e);
    if (placing) { hover = [x, z]; tryPlace(); return; }
    const h2 = hit(x, z);
    if (h2?.pin) { selPin = h2.pin.id; selId = null; drawAll(); return; }
    selPin = null;
    if (h2?.item) { selId = h2.item.id; const it = h2.item; drag = { id: it.id, dx: it.x - x, dz: it.z - z, orig: { x: it.x, z: it.z, r: it.r }, moved: false, bad: false }; cv.setPointerCapture(e.pointerId); } else selId = null;
    drawAll();
  });
  cv.addEventListener('pointermove', e => {
    const [x, z] = world2(e); hover = [x, z];
    if (drag) {
      const it = byId(drag.id); drag.moved = true; const d = FURNITURE[it.k];
      if (isWallItem(d)) snapWall(it, x + drag.dx, z + drag.dz); else { it.x = snap(x + drag.dx); it.z = snap(z + drag.dz); }
      const v = validity(it, it.id); drag.bad = v !== true; say(v === true ? '' : v); draw();
    } else if (placing) draw();
  });
  const endDrag = () => {
    if (!drag) return; const it = byId(drag.id);
    if (drag.moved && drag.bad) { Object.assign(it, drag.orig); say('Blocked, so it snapped back.'); if (FURNITURE[it.k].wall !== undefined) it._wall = true; } else if (drag.moved) { ctx.layoutChanged(); say('Moved.'); }
    drag = null; drawAll();
  };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { if (!drag) { hover = null; if (placing) draw(); } });

  function tryPlace() {
    const it = ghost(), r = buyItem(ctx, it);
    if (r.error) { say(r.error); return; }
    selId = r.id; say(`Placed ${FURNITURE[r.k].name} for ${fmt(r.cost)}. Click again to place another, Esc to stop.`); drawAll();
  }
  function rotateSel() {
    if (placing) { placing.r = (placing.r + 1) % 4; draw(); return; }
    const it = byId(selId); if (!it) return; if (isWallItem(FURNITURE[it.k])) { say('Wall items face away from their wall automatically. Drag them to another wall.'); return; }
    const old = it.r; it.r = (it.r + 1) % 4; const v = validity(it, it.id);
    if (v !== true) { it.r = old; say('Cannot rotate here: ' + v); } else { ctx.layoutChanged(); say('Rotated.'); } drawAll();
  }
  function deleteSel() {
    const it = byId(selId); if (!it) { if (selPin != null) { s.pins = s.pins.filter(p => p.id !== selPin); selPin = null; ctx.pinsChanged(); drawAll(); } return; }
    const name = FURNITURE[it.k].name, refund = sellItem(ctx, it); selId = null; say(`Sold ${name}: refunded ${fmt(refund)} (50%).`); drawAll();
  }
  function nudge(dx, dz) {
    const it = byId(selId); if (!it) return; const d = FURNITURE[it.k]; if (isWallItem(d)) return;
    const ox = it.x, oz = it.z; it.x += dx; it.z += dz; const v = validity(it, it.id);
    if (v !== true) { it.x = ox; it.z = oz; say(v); } else ctx.layoutChanged(); drawAll();
  }
  function cycle(dir) { const list = itemsOn(); if (!list.length) return; const i = list.findIndex(x => x.id === selId); selId = list[(i + dir + list.length * 2) % list.length].id; selPin = null; drawAll(); }
  const onKey = e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    const k = e.code;
    if (k === 'KeyR') { rotateSel(); e.preventDefault(); }
    else if (k === 'Delete' || k === 'Backspace') { deleteSel(); e.preventDefault(); }
    else if (k === 'ArrowLeft') { nudge(-0.25, 0); e.preventDefault(); } else if (k === 'ArrowRight') { nudge(0.25, 0); e.preventDefault(); }
    else if (k === 'ArrowUp') { nudge(0, -0.25); e.preventDefault(); } else if (k === 'ArrowDown') { nudge(0, 0.25); e.preventDefault(); }
    else if (k === 'BracketRight') cycle(1); else if (k === 'BracketLeft') cycle(-1);
  };
  window.addEventListener('keydown', onKey);
  api.onEscape(() => { if (placing) { placing = null; say('Placement cancelled.'); drawAll(); return true; } if (selId != null || selPin != null) { selId = null; selPin = null; drawAll(); return true; } return false; });

  // ── side panels ───────────────────────────────────────────────────────────
  function drawLeft() {
    const rows = Object.entries(FURNITURE).filter(([, d]) => cat === 'All' || d.cat === cat).map(([k, d]) => h('div', { class: 'cat-item' }, thumbImg(ctx, k),
      h('div', { class: 'n' }, h('b', null, d.name), h('div', { class: 'muted' }, `${d.fp[0]}×${d.fp[1]} m${d.seats ? ' · ' + d.seats.length + ' seats' : ''}`)), h('div', { class: 'p' }, fmt(d.price)),
      h('button', { class: 'btn small gold', type: 'button', 'aria-label': `Buy and place ${d.name} for ${fmt(d.price)}`, onclick: () => { placing = { k, r: 0 }; selId = null; selPin = null; say(isWallItem(d) ? `Placing ${d.name}: move next to a wall and click.` : `Placing ${d.name}: click on the plan. R rotates, Esc cancels.`); drawAll(); cv.focus(); } }, 'Buy')));
    left.replaceChildren(
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Floor' }, ['Ground floor', 'Upper floor'].map((t, i) => h('button', { class: 'btn', type: 'button', 'aria-pressed': String(floor === i), onclick: () => { floor = i; selId = null; selPin = null; placing = null; drawAll(); } }, t))),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Catalogue category', style: { flexWrap: 'wrap' } }, CATS.map(c => h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(cat === c), onclick: () => { cat = c; drawLeft(); } }, c))),
      h('div', { class: 'cat-list', role: 'list', 'aria-label': 'Furniture catalogue' }, rows));
  }
  function drawRight() {
    const it = selId != null ? byId(selId) : null, pin = selPin != null ? s.pins.find(p => p.id === selPin) : null, kids = [];
    if (it) {
      const d = FURNITURE[it.k];
      kids.push(h('div', { class: 'panel' }, h('h3', null, d.name), h('p', { class: 'muted', style: { margin: '0 0 8px' } }, `${it.f ? 'Upper' : 'Ground'} floor · x ${it.x.toFixed(2)}, z ${it.z.toFixed(2)} · paid ${fmt(it.cost)}`),
        h('div', { class: 'row', style: { margin: 0 } }, h('button', { class: 'btn small', type: 'button', onclick: rotateSel }, 'Rotate (R)'), h('button', { class: 'btn small danger', type: 'button', onclick: deleteSel }, `Sell (Del) +${fmt(it.cost * CONFIG.refundRate)}`))));
      const me = materialEditor(ctx, it, () => { drawAll(); }); if (me) kids.push(me);
    } else if (pin) {
      kids.push(h('div', { class: 'panel' }, h('h3', null, `Pin #${pin.id}`), h('p', null, pin.note), h('p', { class: 'muted' }, `${pin.f ? 'Upper' : 'Ground'} floor · x ${pin.x.toFixed(1)}, z ${pin.z.toFixed(1)}`),
        h('div', { class: 'row', style: { margin: 0 } }, h('button', { class: 'btn small', type: 'button', onclick: () => { pin.done = !pin.done; ctx.pinsChanged(); drawAll(); } }, pin.done ? 'Reopen' : 'Mark done'), h('button', { class: 'btn small danger', type: 'button', onclick: () => { s.pins = s.pins.filter(p => p !== pin); selPin = null; ctx.pinsChanged(); drawAll(); } }, 'Delete'))));
    } else {
      const seats = s.items.reduce((t, i) => t + (FURNITURE[i.k].seats?.length || 0), 0);
      kids.push(h('div', { class: 'panel' }, h('h3', null, 'Walls, floors & ceiling'), h('div', { class: 'legend' }, 'Pick a finish; the 3D room updates instantly.'),
        Object.entries(SURFACES).map(([key, def]) => { const id = 'sf-' + key, sel = h('select', { id, onchange: e => { ctx.setSurface(key, e.target.value); say(`${def.label}: ${SURFACE_LABELS[e.target.value]}.`); } }, def.options.map(o => h('option', { value: o, selected: (s.surfaces[key] ?? def.def) === o }, SURFACE_LABELS[o]))); return h('div', null, h('label', { for: id }, def.label), sel); })));
      kids.push(h('div', { class: 'panel' }, h('h3', null, 'How it works'), h('div', { class: 'legend' },
        'Buy from the catalogue, then click the plan to place. Drag items to move. ', h('kbd', null, 'R'), ' rotate · ', h('kbd', null, 'Del'), ' sell (50% back) · ', h('kbd', null, '←↑↓→'), ' nudge · ', h('kbd', null, '[ ]'), ' cycle items · ', h('kbd', null, 'Esc'), ' deselect.',
        h('br'), 'Red shading = reserved space. Gold dots = pins. Cyan arrow = you. Small dark dots = seats.')), h('div', { class: 'panel' }, h('h3', null, 'Your room'), h('div', { class: 'legend' }, `${s.items.length} items · ${seats} seats in total · ${s.pins.filter(p => !p.done).length} open pins`)));
    }
    right.replaceChildren(...kids);
  }
  const drawAll = () => { drawLeft(); drawRight(); draw(); status.textContent = msg; };
  drawAll();
  api.live(() => draw());

  const el = h('div', { class: 'design' }, left, h('div', null, h('div', { class: 'row', style: { margin: 0, justifyContent: 'space-between' } }, h('h2', { class: 'app-h', style: { margin: 0 } }, 'Design'), h('button', { class: 'btn gold', type: 'button', onclick: () => ctx.enterBuild() }, 'Walk & build in 3D ▸')), cv, status), right);
  return { el, dispose: () => window.removeEventListener('keydown', onKey) };
}
void MATERIALS; void ENTRANCE; void snap;
