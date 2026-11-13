// Small shared UI pieces for the Design app and the 3D build mode.
import { h } from './dom.js';
import { FURNITURE } from '../data/catalog.js';
import { presetsByType, presetById } from '../materials.js';
import { thumbFor } from '../thumbs.js';

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

/** 3D preview image of a catalogue item */
export const thumbImg = (ctx, k) => h('img', { class: 'thumb', src: thumbFor(k, ctx.world), alt: `3D preview of ${FURNITURE[k].name}`, width: 88, height: 88 });
