// Bootstrap: renderer, modes (menu / play / pause / desktop / pin / report), HUD, interactions, main loop.
import './style.css';
import './light.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BuildMode } from './build.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Nav } from './nav.js';
import * as plan from './plan.js';
import * as placement from './placement.js';
import { applyDims, DIMS } from './plan.js';
import { changeDims } from './placement.js';
import { Crowd, updateStagePos } from './npcs.js';
import { Sim } from './sim.js';
import { JazzAudio } from './audio.js';
import { Desktop } from './ui/desktop.js';
import { h } from './ui/dom.js';
import { loadState, newState, saveSoon, saveNow, resetSave, fmt, dayName, clockStr, SAVE_KEY } from './state.js';
import { GUESTS } from './data/catalog.js';

const $ = s => document.querySelector(s);
const canvas = $('#view');

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.body.innerHTML = '<p style="padding:2rem;font:16px Georgia;color:#f4e7c9">This game needs WebGL. Please enable hardware acceleration or try another browser.</p>'; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 90);
scene.add(camera);

// ── post-processing: soft bloom, tone mapping, gentle vignette ──
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.75, 0.82); composer.addPass(bloom);
const QUALITY = { high: { pr: 1.5, ms: 4, post: true }, balanced: { pr: 1, ms: 2, post: true }, fast: { pr: 0.85, ms: 0, post: false } };
let qLevel = 'high', usePost = true;
function applyQuality(l) {
  qLevel = l; const q = QUALITY[l]; usePost = q.post;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pr)); composer.setPixelRatio?.(Math.min(window.devicePixelRatio, q.pr));
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) { rt.samples = q.ms; rt.dispose(); }
  composer.setSize(innerWidth, innerHeight); renderer.setSize(innerWidth, innerHeight, false);
}
composer.addPass(new OutputPass());
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float d = distance(vUv, vec2(0.5)); c *= mix(1.0, smoothstep(0.95, 0.3, d), 0.32); c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.06); c = (c - 0.5) * 0.96 + 0.5 + 0.012; gl_FragColor = vec4(c, 1.0); }',
}));

// ── state & systems ─────────────────────────────────────────────────────────
const state = loadState() ?? newState(); state.quality ??= 'auto';
applyDims(state.dims.hall, state.dims.stage); updateStagePos(); // the building's size must be known before the world is built
const audio = new JazzAudio(state.music);
const world = new World(scene, renderer);
const nav = new Nav();
const crowd = new Crowd(world.mirror, world, nav);
const player = new Player(camera, canvas, world); player.yaw = 0;
state.prefs ??= { invX: false, invY: false }; player.invX = !!state.prefs.invX; player.invY = !!state.prefs.invY;
for (const [id, k] of [['inv-x', 'invX'], ['inv-y', 'invY']]) { const el = $('#' + id); el.checked = !!state.prefs[k]; el.addEventListener('change', () => { state.prefs[k] = el.checked; player[k] = el.checked; saveSoon(state); }); }
let resetting = false;

const toast = (msg, bad = false) => {
  const box = $('#toasts'), t = h('div', { class: 'toast' + (bad ? ' bad' : '') }, msg); box.append(t);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 4800);
};

const ctx = {
  state, world, crowd, nav, audio, player, toast,
  uiFlags: { camsActive: false, musicPlaying: false },
  save: () => saveSoon(state),
  layoutChanged() { world.syncFurniture(state.items); nav.rebuild(world.rects); saveSoon(state); },
  staffChanged() { crowd.syncStaff(state.staff); crowd.syncPerformers(ctx.sim.night?.act ?? null); },
  pinsChanged() { world.syncPins(state.pins); saveSoon(state); },
  setName(n) { state.name = n || 'The Velvet Note'; world.fx.setName(state.name); $('#h-name').textContent = state.name; document.title = state.name + ' · Jazz Bar'; saveSoon(state); },
  setArt(src) { state.art = src; world.fx.setArt(src); saveSoon(state); },
  setSurface(key, id) { state.surfaces[key] = id; world.setSurface(key, id); saveSoon(state); },
  /** change hall length / stage distance; returns {ok} or {error} (an error changes nothing) */
  setDims(hall, stage) {
    const r = changeDims(ctx, hall, stage); if (r.error) { toast(r.error, true); return r; } if (r.same) return r;
    state.dims = { hall: DIMS.hall, stage: DIMS.stage };
    world.rebuildArchitecture(); nav.resize(); updateStagePos();
    world.syncFurniture(state.items); nav.rebuild(world.rects); world.applySurfaces(state.surfaces); world.fx.setName(state.name); world.fx.setArt(state.art);
    const staff = state.staff; crowd.syncStaff(Object.fromEntries(Object.keys(staff).map(k => [k, 0]))); crowd.syncStaff(staff); crowd.syncPerformers(sim.night?.act ?? null);
    saveSoon(state); return r;
  },
  setQuality(q) { state.quality = q; applyQuality(q === 'auto' ? 'high' : q); saveSoon(state); }, closeDesktop: () => closeDesktop(), enterBuild: () => enterBuild(), exitBuild: () => exitBuild(),
  setPref(k, v) { state.prefs[k] = v; player[k] = v; for (const [id, kk] of [['inv-x', 'invX'], ['inv-y', 'invY']]) if (kk === k) $('#' + id).checked = v; saveSoon(state); },
  exportSave: () => JSON.stringify(state),
  importSave(text) { const s = JSON.parse(text); if (!s || s.v !== 1 || !Array.isArray(s.items) || !s.fin) throw new Error('That is not a Velvet Note save file.'); resetting = true; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); location.reload(); },
  resetGame() { resetting = true; resetSave(); location.reload(); },
  onReport: rep => showReport(rep),
};
ctx.sim = new Sim(ctx); const sim = ctx.sim;
const desktop = new Desktop($('#desktop'), ctx);
const build = new BuildMode(ctx, camera, canvas);
audio.onChange = () => { state.music.mode = audio.mode; state.music.vol = audio.vol; state.music.muted = audio.muted; saveSoon(state); };

world.syncFurniture(state.items); nav.rebuild(world.rects);
world.syncPins(state.pins); world.applySurfaces(state.surfaces); crowd.spawnPedestrians(5); world.fx.setName(state.name); world.fx.setArt(state.art);
crowd.syncStaff(state.staff); $('#h-name').textContent = state.name; document.title = state.name + ' · Jazz Bar';

// ── modes ───────────────────────────────────────────────────────────────────
let mode = 'menu', reportReturn = 'play';
function setMode(m) {
  mode = m;
  $('#overlay').hidden = !(m === 'menu' || m === 'pause');
  $('#hud').hidden = m === 'menu' || m === 'build'; $('#pin-dialog').hidden = m !== 'pin'; $('#desktop').hidden = m !== 'desktop';
  $('#ov-title').textContent = m === 'pause' ? 'Paused' : state.name;
  $('#ov-btn').textContent = m === 'pause' ? 'Resume' : 'Enter the bar';
  $('#ov-sub').hidden = m === 'pause';
  player.enabled = m === 'play' || m === 'build'; if (m !== 'play' && m !== 'build') player.disable();
  if (m === 'menu' || m === 'pause') setTimeout(() => $('#ov-btn').focus(), 30);
}
function startPlay() { audio.start(); setMode('play'); player.lock(); canvas.focus(); }
$('#ov-btn').addEventListener('click', startPlay);
canvas.addEventListener('click', () => { if (mode === 'play' && !player.locked) player.lock(); });
player.onLockChange = locked => { if (!locked && mode === 'play') setMode('pause'); };
window.addEventListener('pointerdown', () => audio.start(), { once: false, passive: true });
window.addEventListener('keydown', () => audio.start(), { passive: true });

function openDesktop() { player.unlock(); setMode('desktop'); desktop.open(); }
function enterBuild() { desktop.close(); player.unlock(); setMode('build'); build.enter(); toast('Build mode: fly with WASD, drag empty space to look, click furniture to edit.'); }
function exitBuild() { build.exit(); setMode('desktop'); desktop.open('design'); }
function closeDesktop() { desktop.close(); setMode('play'); player.lock(); canvas.focus(); }

// pins
let pendingPin = null;
function startPin() {
  const hit = world.pick(camera, 30), f = player.floor;
  let p;
  if (hit) p = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
  else { const d = new THREE.Vector3(); camera.getWorldDirection(d); d.x = -d.x; p = { x: player.x + d.x * 2, y: player.y + 0.8, z: player.z + d.z * 2 }; }
  p.f = p.y > 3 ? 1 : f === 1 && p.y > 2 ? 1 : 0; pendingPin = p;
  $('#pin-where').textContent = `${p.f ? 'Upper floor' : 'Ground floor'} · x ${p.x.toFixed(1)} m, z ${p.z.toFixed(1)} m`;
  $('#pin-note').value = ''; player.unlock(); setMode('pin'); setTimeout(() => $('#pin-note').focus(), 30);
}
function endPin(save) {
  if (save && pendingPin) {
    const note = $('#pin-note').value.trim() || '(no note)';
    state.pins.push({ id: state.nextPin++, ...pendingPin, note, done: false }); ctx.pinsChanged(); toast('📍 Pin dropped. See it on the office floor plan.');
  }
  pendingPin = null; setMode('play'); player.lock(); canvas.focus();
}
$('#pin-form').addEventListener('submit', e => { e.preventDefault(); endPin(true); });
$('#pin-cancel').addEventListener('click', () => endPin(false));

// nightly report
function showReport(rep) {
  const row = (k, v, cls = '') => h('tr', null, h('td', null, k), h('td', { class: 'num ' + cls }, v));
  const entries = o => Object.entries(o).map(([k, v]) => row(k[0].toUpperCase() + k.slice(1), fmt(v)));
  const box = $('#report'); reportReturn = mode === 'desktop' ? 'desktop' : 'play';
  if (mode === 'play') { player.unlock(); setMode('report'); }
  box.replaceChildren(h('div', { class: 'card', style: { width: 'min(560px,100%)', maxHeight: '92vh', overflow: 'auto' } },
    h('h2', { id: 'rep-title', style: { fontFamily: 'Georgia,serif', fontStyle: 'italic', color: 'var(--gold)', margin: '0 0 4px' } }, `Night report · Day ${rep.day} (${dayName(rep.day)})`),
    h('p', { class: 'muted' }, rep.act ? `Live: ${rep.act}` : 'No live act tonight'),
    h('div', { class: 'grid g3', style: { margin: '10px 0' } },
      h('div', { class: 'tile' }, h('div', { class: 'k' }, 'Revenue'), h('div', { class: 'v' }, fmt(rep.revenue))),
      h('div', { class: 'tile' }, h('div', { class: 'k' }, 'Costs'), h('div', { class: 'v' }, fmt(rep.costs))),
      h('div', { class: 'tile' }, h('div', { class: 'k' }, 'Net'), h('div', { class: 'v ' + (rep.net >= 0 ? 'pos' : 'neg') }, fmt(rep.net)))),
    h('table', null, h('tbody', null, entries(rep.rev), entries(rep.cost).map(r => r))),
    h('p', null, `${rep.guests} guests (${rep.turnedAway} turned away) · ${rep.served} orders rounds · satisfaction ${(rep.avgSat * 100).toFixed(0)}% · reputation ${rep.repDelta >= 0 ? '+' : ''}${rep.repDelta.toFixed(1)} → ${rep.rep.toFixed(0)}/100 · cash ${fmt(rep.cash)}`),
    rep.notes.length ? h('ul', { style: { paddingLeft: '18px', lineHeight: 1.5, fontSize: '12px' } }, rep.notes.map(n => h('li', null, n))) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn gold', id: 'rep-ok', type: 'button', onclick: closeReport }, 'Continue'))));
  box.hidden = false; setTimeout(() => $('#rep-ok')?.focus(), 30);
}
function closeReport() {
  $('#report').hidden = true;
  if (reportReturn === 'play') { setMode('play'); player.lock(); canvas.focus(); }
}

// ── keyboard ────────────────────────────────────────────────────────────────
const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
window.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (!$('#report').hidden) { closeReport(); return; }
    if (mode === 'build') { build.escape(); e.preventDefault(); return; }
    if (mode === 'desktop') { if (!desktop.escape()) closeDesktop(); e.preventDefault(); return; }
    if (mode === 'pin') { endPin(false); return; }
    if (mode === 'play' && !player.locked) setMode('pause');
    else if (mode === 'pause' && player.dragMode) startPlay();
    return;
  }
  if (typing(e) || e.repeat) return;
  if (mode === 'play') {
    if (e.code === 'KeyE') useInteract();
    else if (e.code === 'KeyP') { e.preventDefault(); startPin(); }
  }
});

// ── interactions ────────────────────────────────────────────────────────────
const A = world.fx.anchors, V = new THREE.Vector3(), fwd = new THREE.Vector3(), eye = new THREE.Vector3();
const fixed = [
  { pos: A.computer, r: 2.1, f: 1, dot: 0.35, label: () => 'Use the office computer', use: openDesktop },
  { pos: A.door, r: 2.6, f: 0, dot: 0.45, label: () => world.fx.door.open ? 'Close the secret bookshelf door' : 'Open the secret bookshelf door', use() { const d = world.fx.door; d.setOpen(!d.open); sim.doorAuto = false; toast(d.open ? 'The bookcase swings aside. A private staircase climbs into the dark.' : 'The bookcase clicks shut.'); } },
  { pos: A.safe, r: 1.6, f: 1, dot: 0.5, label: () => 'Open the safe', use: () => toast(`The safe hums. On the books: ${fmt(state.fin.cash)} cash · ${fmt(state.fin.deferred)} in ticket money held for events.`) },
  { pos: A.record, r: 1.8, f: 1, dot: 0.5, label: () => audio.muted ? 'Drop the needle (music on)' : 'Lift the needle (music off)', use: () => { audio.setMuted(!audio.muted); toast(audio.muted ? 'Needle lifted.' : '♪ Needle down.'); } },
  { pos: A.cart, r: 1.6, f: 1, dot: 0.5, label: () => 'Pour a private whisky', use: () => toast('You pour two fingers of something rare. The ice cracks softly.') },
  { pos: A.host, r: 2.0, f: 0, dot: 0.45, label: () => 'Check the reservation book', use: () => { const st = sim.stats(); toast(sim.night ? `Tonight: ${st.guests} guests so far, ${st.inBar} inside.` : 'The book is open for tonight. Open the bar from the office computer.'); } },
  { pos: A.coat, r: 2.0, f: 0, dot: 0.45, label: () => 'Talk to the coat check', use: () => toast(state.staff.coat ? '“Good evening! Your coat is in safe hands.”' : 'The coat check counter is empty. Hire an attendant at the office computer.') },
  { pos: A.bar, r: 2.6, f: 0, dot: 0.3, label: () => 'Check the till', use: () => { const st = sim.stats(); toast(sim.night ? `Till tonight: ${fmt(st.revenue)} from ${st.served} rounds of orders.` : 'The till is empty. The bar is closed.'); } },
];
let current = null;
function findInteract() {
  camera.getWorldPosition(eye); camera.getWorldDirection(fwd); eye.x = -eye.x; fwd.x = -fwd.x; // logic space (the world is mirrored)
  let best = null, bd = 1e9;
  for (const it of fixed) {
    if (it.f !== player.floor) continue; const d = eye.distanceTo(it.pos); if (d > it.r) continue;
    V.copy(it.pos).sub(eye).normalize(); if (V.dot(fwd) < it.dot) continue;
    const score = d - V.dot(fwd) * 0.5; if (score < bd) { bd = score; best = it; }
  }
  if (sim.night) for (const g of sim.guests) {
    if (!g.npc || g.vip || (g.state !== 'seated' && g.state !== 'standing') || g.npc.floor !== player.floor) continue;
    V.set(g.npc.x, g.npc.root.position.y + 1.0, g.npc.z).sub(eye); const d = V.length(); if (d > 3.4) continue; V.normalize(); const dt = V.dot(fwd); if (dt < 0.9) continue;
    const score = d - dt * 2; if (score < bd) { bd = score; best = { label: () => `Invite ${g.name ?? 'this guest'} to VIP`, use: () => { const r = sim.inviteVip(g); toast(r.msg, !r.ok); } }; }
  }
  return best;
}
function useInteract() { if (current) current.use(); }

// ── HUD ─────────────────────────────────────────────────────────────────────
let hudT = 0;
function hud() {
  const n = sim.night;
  $('#h-day').textContent = `Day ${state.day} · ${dayName(state.day)}`;
  $('#h-time').textContent = n ? clockStr(n.min) : '—:—';
  const st = $('#h-state'); st.textContent = n ? 'OPEN' : 'CLOSED'; st.className = 'pill ' + (n ? 'open' : 'closed');
  $('#h-cash').textContent = 'Cash ' + fmt(state.fin.cash);
  $('#h-guests').textContent = n ? `Guests ${sim.stats().inBar}` : `Rep ${state.rep.toFixed(0)}/100`;
}

// ── loop ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock(); let T = 0, ema = 0.016, slowT = 0, fastT = 0, warmT = 0, lastDrop = -999, drops = 0;
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
addEventListener('beforeunload', () => { if (!resetting) saveNow(state); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !resetting) saveNow(state); });

function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta(), dt = Math.min(raw, 0.1); T += dt;
  // auto quality: step down one level only after ~5 s of genuinely slow frames, and step back up after a long smooth stretch.
  // Hitches (alt-tab, a long frame), hidden tabs, the menu and the first seconds of play are not measurements, so quality never drops by accident.
  if (raw > 0.25 || document.hidden || mode === 'menu') { slowT = 0; fastT = 0; }
  else if (state.quality === 'auto') {
    warmT += raw; ema += (raw - ema) * 0.05;
    if (warmT > 8) {
      slowT = ema > 0.045 ? slowT + raw : 0; fastT = ema < 0.02 ? fastT + raw : 0;
      if (slowT > 5 && qLevel !== 'fast') { applyQuality(qLevel === 'high' ? 'balanced' : 'fast'); drops++; lastDrop = T; slowT = fastT = 0; ema = 0.016; toast('Graphics eased a little to keep things smooth (Settings ▸ Graphics).'); }
      else if (fastT > 40 && qLevel !== 'high' && drops < 3 && T - lastDrop > 60) { applyQuality(qLevel === 'fast' ? 'balanced' : 'high'); slowT = fastT = 0; ema = 0.016; }
    }
  }
  const sdt = sim.night ? dt * state.speed : dt;
  sim.update(dt); crowd.update(sdt, T, !!sim.night);
  player.update(dt);
  const f = ctx.uiFlags;
  f.camsActive = player.floor === 1 && player.x > 3 && player.z < 5.6; f.musicPlaying = audio.running;
  world.update(dt, T, f);
  const outside = player.floor === 0 && player.z > 8.6;
  if (outside) { const dd = Math.hypot(Math.max(0, Math.abs(player.x) - 1.3), player.z - 8); audio.setMuffled(true, 380); audio.setOutGain(Math.max(0.1, Math.min(0.75, 0.85 * Math.exp(-(dd - 1) / 15)))); }
  else { audio.setOutGain(1); audio.setMuffled((player.floor === 1 && player.x > 6 && player.z < 5.5) || (player.floor === 0 && player.x > 7.5 && player.z > 4)); }
  if (mode === 'play') {
    current = findInteract(); const p = $('#prompt');
    if (current) { p.innerHTML = ''; p.append(h('kbd', null, 'E'), current.label()); p.classList.add('on'); } else p.classList.remove('on');
  } else $('#prompt').classList.remove('on');
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; hud(); }
  build.update();
  if (mode !== 'desktop') { if (usePost) composer.render(); else renderer.render(scene, camera); }
}
applyQuality(state.quality === 'auto' ? 'high' : state.quality);
setMode('menu'); frame();

// debugging / test handle
window.__vn = { plan, placement, applyQuality, build, composer, state, sim, world, player, crowd, nav, audio, ctx, desktop, THREE, setMode: m => setMode(m), openDesktop, renderer, camera, get mode() { return mode; } };
void GUESTS;
