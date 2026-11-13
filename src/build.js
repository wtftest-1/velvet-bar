// 3D build mode: fly around the whole building from the office computer and change anything.
// Select / drag / rotate / sell furniture, buy new pieces (with 3D previews), paint walls & floors, place partition walls.
import * as THREE from 'three';
import { h } from './ui/dom.js';
import { FURNITURE, SURFACES, SURFACE_LABELS } from './data/catalog.js';
import { itemTransform, buildItem, isWallItem } from './furniture.js';
import { snap, snapWall, validity, buyItem, sellItem } from './placement.js';
import { materialEditor, thumbImg } from './ui/widgets.js';
import { ARCH } from './materials.js';
import { fmt } from './state.js';

const CATS = ['All', 'Seating', 'Tables', 'Service', 'Rooms', 'Vintage', 'Decor'];
const prevCache = new Map();
function finishPreview(id) {
  if (prevCache.has(id)) return prevCache.get(id);
  const m = ARCH[id], cv = Object.assign(document.createElement('canvas'), { width: 56, height: 56 }), x = cv.getContext('2d');
  if (m?.map?.image) x.drawImage(m.map.image, 0, 0, 56, 56); else { x.fillStyle = '#' + (m?.color?.getHexString() ?? '444'); x.fillRect(0, 0, 56, 56); }
  const url = cv.toDataURL(); prevCache.set(id, url); return url;
}

export class BuildMode {
  constructor(ctx, camera, canvas) {
    this.ctx = ctx; this.camera = camera; this.canvas = canvas; this.rc = new THREE.Raycaster(); this.active = false;
    this.tool = 'select'; this.cat = 'All'; this.selId = null; this.placing = null; this.ghost = null; this.drag = null; this.paintId = 'planks'; this.looking = false; this.hint = '';
    this.hl = new THREE.Box3Helper(new THREE.Box3(), 0xffd166); this.hl.visible = false; ctx.world.scene.add(this.hl);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x7fd39a, transparent: true, opacity: 0.5, depthWrite: false });
    this.h = { down: e => this.onDown(e), move: e => this.onMove(e), up: () => this.onUp(), ctxm: e => e.preventDefault(), key: e => this.onKey(e) };
  }
  get s() { return this.ctx.state; }
  byId(id) { return this.s.items.find(i => i.id === id); }

  enter() {
    if (this.active) return; this.active = true; const p = this.ctx.player;
    this.saved = { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, floor: p.floor };
    p.fly = true; p.flyY = Math.max(p.y + 2.6, 2.8); p.enabled = true; p.pitch = Math.max(p.pitch, -0.2);
    this.tool = 'select'; this.selId = null; this.placing = null;
    this.root = h('div', { id: 'build' }); document.getElementById('app').append(this.root);
    const c = this.canvas; c.addEventListener('pointerdown', this.h.down); c.addEventListener('pointermove', this.h.move); window.addEventListener('pointerup', this.h.up); c.addEventListener('contextmenu', this.h.ctxm); window.addEventListener('keydown', this.h.key);
    this.render();
  }
  exit() {
    if (!this.active) return; this.active = false; const p = this.ctx.player, c = this.canvas;
    c.removeEventListener('pointerdown', this.h.down); c.removeEventListener('pointermove', this.h.move); window.removeEventListener('pointerup', this.h.up); c.removeEventListener('contextmenu', this.h.ctxm); window.removeEventListener('keydown', this.h.key);
    this.clearGhost(); this.hl.visible = false; this.root.remove(); p.fly = false; p.teleport(this.saved.x, this.saved.z, this.saved.yaw, this.saved.floor); p.pitch = this.saved.pitch; p.disable();
  }
  /** Esc: returns true when it consumed the key */
  escape() {
    if (this.placing) { this.placing = null; this.clearGhost(); this.say('Placement cancelled.'); this.render(); return true; }
    if (this.selId != null) { this.selId = null; this.render(); return true; }
    if (this.tool === 'paint') { this.tool = 'select'; this.render(); return true; }
    return false;
  }

  // ── ray helpers ───────────────────────────────────────────────────────────
  setRay(e) { const r = this.canvas.getBoundingClientRect(); this.rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera); }
  floorHit(e, needUp = true) { this.setRay(e); return this.ctx.world.castRay(this.rc, { needUp }); }
  pickItem(e) {
    this.setRay(e); const hits = this.rc.intersectObjects(this.ctx.world.furn.children, true);
    for (const hit of hits) { let o = hit.object; while (o && o.userData.itemId == null) o = o.parent; if (o) return this.byId(o.userData.itemId); }
    return null;
  }
  say(t) { this.hint = t; if (this.hintEl) this.hintEl.textContent = t; }

  // ── pointer ───────────────────────────────────────────────────────────────
  onDown(e) {
    if (e.button === 2) { this.looking = true; this.canvas.setPointerCapture?.(e.pointerId); return; }
    if (e.button !== 0) return;
    if (this.placing) { this.updateGhost(e); this.tryPlace(); return; }
    if (this.tool === 'paint') { this.paintAt(e); return; }
    const it = this.pickItem(e);
    if (it) {
      this.selId = it.id; const hit = this.floorHit(e), d = FURNITURE[it.k];
      this.drag = { id: it.id, orig: { x: it.x, z: it.z, r: it.r }, dx: hit && !isWallItem(d) ? it.x - hit.point.x : 0, dz: hit && !isWallItem(d) ? it.z - hit.point.z : 0, moved: false, bad: false };
      this.canvas.setPointerCapture?.(e.pointerId);
    } else this.selId = null;
    this.render();
  }
  onMove(e) {
    if (this.looking) { this.ctx.player.look(e.movementX, e.movementY); return; }
    if (this.placing) { this.updateGhost(e); return; }
    if (!this.drag) return;
    const it = this.byId(this.drag.id), d = FURNITURE[it.k]; if (!it) return;
    const hit = this.floorHit(e, !isWallItem(d)); if (!hit || (hit.point.y > 2.5) !== (it.f === 1)) return;
    if (isWallItem(d)) snapWall(it, hit.point.x, hit.point.z); else { it.x = snap(hit.point.x + this.drag.dx); it.z = snap(hit.point.z + this.drag.dz); }
    this.drag.moved = true; const v = validity(this.s, it, it.id); this.drag.bad = v !== true; this.say(v === true ? 'Release to drop.' : v); this.ctx.world.previewItem(it);
  }
  onUp() {
    this.looking = false; const dr = this.drag; if (!dr) return; this.drag = null; const it = this.byId(dr.id); if (!it) return;
    if (dr.moved && dr.bad) { Object.assign(it, dr.orig); if (isWallItem(FURNITURE[it.k])) it._wall = true; this.ctx.world.previewItem(it); this.ctx.toast('Blocked, so it snapped back.', true); }
    else if (dr.moved) { this.ctx.layoutChanged(); this.say('Moved.'); }
    this.render();
  }
  onKey(e) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.code === 'KeyR') { this.rotate(); e.preventDefault(); }
    else if (e.code === 'Delete' || e.code === 'Backspace') { this.sell(); e.preventDefault(); }
  }

  // ── actions ───────────────────────────────────────────────────────────────
  rotate() {
    if (this.placing) { this.placing.r = (this.placing.r + 1) % 4; return; }
    const it = this.byId(this.selId); if (!it) return; if (isWallItem(FURNITURE[it.k])) { this.say('Wall items face away from their wall. Drag them to another wall.'); return; }
    const old = it.r; it.r = (it.r + 1) % 4; const v = validity(this.s, it, it.id);
    if (v !== true) { it.r = old; this.say('Cannot rotate here: ' + v); } else { this.ctx.layoutChanged(); this.say('Rotated.'); }
  }
  sell() {
    const it = this.byId(this.selId); if (!it) return; const name = FURNITURE[it.k].name, refund = sellItem(this.ctx, it);
    this.selId = null; this.ctx.toast(`Sold ${name}: ${fmt(refund)} back (50%).`); this.render();
  }
  startPlacing(k) { this.placing = { k, r: 0 }; this.selId = null; this.say(isWallItem(FURNITURE[k]) ? 'Move to a wall and click. Esc cancels.' : 'Click to place. R rotates. Esc cancels.'); this.clearGhost(); this.render(); }
  clearGhost() { if (this.ghost) { this.ctx.world.mirror.remove(this.ghost.group); this.ghost.group.traverse(o => o.geometry?.dispose()); this.ghost = null; } }
  updateGhost(e) {
    const k = this.placing.k, d = FURNITURE[k], hit = this.floorHit(e, !isWallItem(d)); if (!hit) return;
    const it = { id: -1, k, f: hit.point.y > 2.5 ? 1 : 0, x: hit.point.x, z: hit.point.z, r: this.placing.r, m: {} };
    if (isWallItem(d)) snapWall(it, hit.point.x, hit.point.z); else { it.x = snap(hit.point.x); it.z = snap(hit.point.z); }
    if (!this.ghost || this.ghost.key !== k + it.r) { this.clearGhost(); const g = buildItem(it); g.traverse(o => { if (o.isMesh) o.material = this.ghostMat; }); this.ctx.world.mirror.add(g); this.ghost = { group: g, key: k + it.r }; }
    const T = itemTransform(it); this.ghost.group.position.set(T.x, T.y, T.z); this.ghost.group.rotation.y = T.ry; this.ghost.item = it;
    const v = validity(this.s, it); this.ghostMat.color.set(v === true ? 0x7fd39a : 0xff7a6b); this.ghost.ok = v === true; this.say(v === true ? `${d.name}: click to buy for ${fmt(d.price)}.` : v);
  }
  tryPlace() {
    if (!this.ghost?.item) return; const r = buyItem(this.ctx, this.ghost.item);
    if (r.error) { this.ctx.toast(r.error, true); return; }
    this.ctx.toast(`Placed ${FURNITURE[r.k].name} for ${fmt(r.cost)}.`); this.cashEl.textContent = fmt(this.s.fin.cash); this.clearGhost();
  }
  paintAt(e) {
    this.setRay(e); const hit = this.ctx.world.castRay(this.rc, {}), key = hit?.object.userData.surfKey;
    if (!key) { this.ctx.toast('That surface cannot be repainted. Try a wall, floor or ceiling.', true); return; }
    const def = SURFACES[key];
    if (!def.options.includes(this.paintId)) { this.ctx.toast(`${def.label} cannot use ${SURFACE_LABELS[this.paintId]}.`, true); return; }
    this.ctx.setSurface(key, this.paintId); this.ctx.toast(`${def.label}: ${SURFACE_LABELS[this.paintId]}.`);
  }

  update() {
    if (!this.active) return;
    const g = this.selId != null ? this.ctx.world.itemObjs.get(this.selId)?.group : null;
    if (g) { this.hl.box.setFromObject(g); this.hl.material.color.set(this.drag?.bad ? 0xff5a4a : 0xffd166); this.hl.visible = true; } else this.hl.visible = false;
  }

  // ── panel ─────────────────────────────────────────────────────────────────
  render() {
    const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Build tool' }, [['select', 'Select'], ['place', 'Furniture'], ['paint', 'Paint']].map(([t, l]) =>
      h('button', { class: 'btn', type: 'button', 'aria-pressed': String((t === 'place' ? this.tool === 'place' || !!this.placing : this.tool === t) && !(t !== 'place' && this.placing)), onclick: () => { this.tool = t; this.placing = null; this.clearGhost(); this.render(); } }, l)));
    this.cashEl = h('b', null, fmt(this.s.fin.cash)); this.hintEl = h('div', { class: 'legend', role: 'status', 'aria-live': 'polite' }, this.hint);
    const body = h('div', { class: 'bd-body' });
    if (this.tool === 'select' && !this.placing) body.append(...this.selectPanel());
    else if (this.tool === 'paint') body.append(...this.paintPanel());
    else body.append(...this.furniturePanel());
    this.root.replaceChildren(h('div', { class: 'bd-panel' },
      h('div', { class: 'row', style: { margin: 0, justifyContent: 'space-between' } }, h('h2', { class: 'app-h', style: { fontSize: '20px', margin: 0 } }, 'Build mode'), h('span', null, 'Cash ', this.cashEl)),
      tabs, body, this.hintEl,
      h('div', { class: 'legend' }, h('kbd', null, 'WASD'), ' fly · ', h('kbd', null, 'Q'), '/', h('kbd', null, 'E'), ' down/up · ', h('kbd', null, 'Shift'), ' fast · hold ', h('kbd', null, 'right mouse'), ' to look · ', h('kbd', null, 'R'), ' rotate · ', h('kbd', null, 'Del'), ' sell'),
      h('button', { class: 'btn gold', type: 'button', onclick: () => this.ctx.exitBuild() }, '← Back to the computer (Esc)')));
  }
  selectPanel() {
    const it = this.byId(this.selId);
    if (!it) return [h('div', { class: 'panel' }, h('h3', null, 'Select & move'), h('div', { class: 'legend' }, 'Click any piece of furniture to select it, then drag it to move. Recolour it here, rotate with R, sell with Del. Use the Furniture tab to buy more (with 3D previews), Paint to restyle walls and floors, and Rooms → partition walls to build new rooms.'))];
    const d = FURNITURE[it.k];
    return [h('div', { class: 'panel' }, h('div', { style: { display: 'flex', gap: '10px' } }, thumbImg(this.ctx, it.k), h('div', null, h('h3', null, d.name), h('div', { class: 'muted' }, `${it.f ? 'Upper' : 'Ground'} floor`, h('br'), `paid ${fmt(it.cost)}`))),
      h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { this.rotate(); this.render(); } }, 'Rotate (R)'), h('button', { class: 'btn small danger', type: 'button', onclick: () => this.sell() }, `Sell +${fmt(it.cost * 0.5)}`))),
      materialEditor(this.ctx, it, () => this.render())].filter(Boolean);
  }
  furniturePanel() {
    const rows = Object.entries(FURNITURE).filter(([, d]) => this.cat === 'All' || d.cat === this.cat).map(([k, d]) =>
      h('div', { class: 'thumbcard' + (this.placing?.k === k ? ' on' : '') }, thumbImg(this.ctx, k),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, d.name), h('div', { class: 'muted' }, `${d.fp[0]}×${d.fp[1]} m${d.seats ? ' · ' + d.seats.length + ' seats' : ''}`), h('div', { class: 'p' }, fmt(d.price))),
        h('button', { class: 'btn small gold', type: 'button', 'aria-label': `Place ${d.name}`, onclick: () => { this.tool = 'place'; this.startPlacing(k); } }, 'Place')));
    return [h('div', { class: 'seg', role: 'group', 'aria-label': 'Category', style: { flexWrap: 'wrap', marginBottom: '8px' } }, CATS.map(c => h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(this.cat === c), onclick: () => { this.cat = c; this.render(); } }, c))), ...rows];
  }
  paintPanel() {
    return [h('div', { class: 'legend', style: { marginBottom: '8px' } }, '1) Pick a finish. 2) Click a wall, floor or ceiling in the room. Each area (main hall, foyer, VIP floors, main walls, VIP walls, ceiling) is repainted as a whole.'),
      h('div', { class: 'finishes' }, Object.entries(SURFACE_LABELS).map(([id, label]) => h('button', { class: 'finish', type: 'button', 'aria-pressed': String(this.paintId === id), onclick: () => { this.paintId = id; this.render(); } }, h('img', { src: finishPreview(id), alt: '', width: 40, height: 40 }), h('span', null, label))))];
  }
}
