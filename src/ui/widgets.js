// Small shared UI pieces for the Design app and the 3D build mode.
import { h } from './dom.js';
import { FURNITURE } from '../data/catalog.js';
import { presetsByType, presetById } from '../materials.js';
import { thumbFor } from '../thumbs.js';
import { DIMS, MAX_HALL, STAGE, RAIL, BLD } from '../plan.js';
import { lenOf } from '../furniture.js';
import { resizeItem } from '../placement.js';

/** Materials & colours panel for one placed item. onChange() is called after every edit. */
export function materialEditor(ctx, it, onChange) {
  const d = FURNITURE[it.k], slots = Object.entries(d.slots); if (!slots.length) return null;
  return h('div', { class: 'panel' }, h('h3', null, 'Materials & colours'), slots.map(([slot, type]) => {
    const cur = it.m?.[slot]?.id ?? d.defaults[slot], col = it.m?.[slot]?.color ?? presetById(cur).color;
    const set = v => { it.m = { ...it.m, [slot]: v }; ctx.layoutChanged(); onChange?.(); };
    const inp = h('input', { type: 'color', value: col.length === 7 ? col : '#888888', 'aria-label': `Tint for ${slot}`, oninput: e => { it.m = { ...it.m, [slot]: { id: cur, color: e.target.value } }; ctx.layoutChanged(); } });
    return h('div', { style: { marginBottom: '10px' } }, h('div', { class: 'muted' }, `${slot} · ${type}`),
      h('div', { class: 'swatches' }, presetsByType(type).map(m => h('button', { class: 'sw', type: 'button', style: { background: m.color }, title: m.label, 'aria-label': m.label, 'aria-pressed': String(cur === m.id && !it.m?.[slot]?.color), onclick: () => set({ id: m.id }) }))),
      h('div', { class: 'row', style: { margin: '6px 0 0' } }, inp, h('span', { class: 'muted' }, presetById(cur).label), it.m?.[slot]?.color ? h('button', { class: 'btn small', type: 'button', onclick: () => set({ id: cur }) }, 'Reset tint') : null));
  }));
}

const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const el = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); for (const k of kids) if (k) el.append(k); return el; };

/** Big − / value / + control. `down` is the red minus, `up` the green plus. */
export function stepper(label, valueText, { onDown, onUp, canDown = true, canUp = true, hint }) {
  return h('div', { class: 'stepper-row' },
    h('div', { class: 'stepper-label' }, label, hint ? h('small', null, hint) : null),
    h('div', { class: 'stepper' },
      h('button', { class: 'btn danger step', type: 'button', 'aria-label': `Decrease ${label}`, disabled: !canDown, onclick: onDown }, '−'),
      h('output', { class: 'step-val', 'aria-live': 'polite' }, valueText),
      h('button', { class: 'btn gold step', type: 'button', 'aria-label': `Increase ${label}`, disabled: !canUp, onclick: onUp }, '+')));
}

/** Top-down sketch of the hall: shows the stage, the VIP terrace above it and the gap between them. */
function hallSketch() {
  const K = 8, W = 24 * K, H = (16 + DIMS.hall) * K, y = z => (z - BLD.Z0) * K, x = v => (v + 12) * K;
  const s = svg('svg', { viewBox: `-4 -4 ${W + 8} ${H + 8}`, class: 'hall-sketch', role: 'img', 'aria-label': `Building plan: ${16 + DIMS.hall} metres long, stage ${(RAIL.z - STAGE.z1).toFixed(1)} metres from the VIP terrace` });
  s.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff', stroke: '#7a1f2b', 'stroke-width': 3, rx: 3 }));
  s.append(svg('rect', { x: x(STAGE.x0), y: y(STAGE.z0), width: (STAGE.x1 - STAGE.x0) * K, height: (STAGE.z1 - STAGE.z0) * K, fill: '#c9a36b' }));
  const t = (txt, px, py, fill = '#1d1a17', size = 11) => { const e = svg('text', { x: px, y: py, 'text-anchor': 'middle', 'font-size': size, 'font-family': 'system-ui,sans-serif', fill, 'font-weight': 700 }); e.textContent = txt; return e; };
  s.append(t('STAGE', x(0), y((STAGE.z0 + STAGE.z1) / 2) + 4));
  s.append(svg('rect', { x: x(-12), y: y(4), width: 24 * K, height: 4 * K, fill: '#efe7d8' })); s.append(t('FOYER / ENTRANCE', x(0), y(6) + 4, '#6b6258', 10));
  s.append(svg('line', { x1: x(RAIL.x0), x2: x(RAIL.x1), y1: y(RAIL.z), y2: y(RAIL.z), stroke: '#16803f', 'stroke-width': 4, 'stroke-dasharray': '6 3' })); s.append(t('VIP terrace (upstairs)', x(0.3), y(RAIL.z) - 5, '#16803f', 10));
  s.append(svg('line', { x1: x(0), x2: x(0), y1: y(STAGE.z1), y2: y(RAIL.z), stroke: '#c62828', 'stroke-width': 2 }));
  s.append(t(`${(RAIL.z - STAGE.z1).toFixed(1)} m`, x(0) + 26, (y(STAGE.z1) + y(RAIL.z)) / 2 + 4, '#c62828', 12));
  return s;
}

/** Hall length + stage distance controls with a live sketch. onChange() is called after a successful change. */
export function dimsPanel(ctx, onChange) {
  const apply = (hall, stage) => { const r = ctx.setDims(hall, stage); if (!r?.error) onChange?.(); };
  const { hall, stage } = DIMS;
  return h('div', { class: 'panel dims' }, h('h3', null, 'Building size'),
    h('div', { class: 'legend', style: { marginBottom: '8px' } }, 'Make the hall longer, or push the stage further away from the VIP terrace. Furniture stays where it is. Free. The bar must be closed.'),
    hallSketch(),
    stepper('Hall length', `${16 + hall} m`, { hint: hall ? `+${hall} m added at the back` : 'original size', canDown: hall > 0, canUp: hall < MAX_HALL, onDown: () => apply(hall - 1, Math.min(stage, hall - 1)), onUp: () => apply(hall + 1, stage) }),
    stepper('Stage ↔ terrace', `${(RAIL.z - STAGE.z1).toFixed(1)} m`, { hint: stage ? `stage pushed back ${stage} m` : 'original distance', canDown: stage > 0, canUp: stage < hall, onDown: () => apply(hall, stage - 1), onUp: () => apply(hall, stage + 1) }),
    stage >= hall && hall < MAX_HALL ? h('div', { class: 'legend' }, 'The stage is already at the back wall: make the hall longer first.') : null,
    h('div', { class: 'legend' }, 'Width stays 24 m. Build extra rooms with partition walls (Rooms category); you can change their length after placing them.'));
}

/** Length control for resizable partitions (Rooms). */
export function resizePanel(ctx, it, onChange) {
  const d = FURNITURE[it.k]; if (!d.resize) return null;
  const len = lenOf(it, d), unit = d.price / d.fp[0], go = nl => { const r = resizeItem(ctx, it, nl); if (r.error) ctx.toast(r.error, true); onChange?.(); };
  return h('div', { class: 'panel' }, h('h3', null, 'Room size'),
    stepper('Length', `${len} m`, { hint: `+0.5 m costs ${Math.round(unit / 2)}, −0.5 m refunds half`, canDown: len > d.resize[0], canUp: len < d.resize[1], onDown: () => go(len - 0.5), onUp: () => go(len + 0.5) }));
}

/** 3D preview image of a catalogue item */
export const thumbImg = (ctx, k) => h('img', { class: 'thumb', src: thumbFor(k, ctx.world), alt: `3D preview of ${FURNITURE[k].name}`, width: 88, height: 88 });
