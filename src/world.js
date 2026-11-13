// The building shell, lighting, furniture sync and pin markers.
import * as THREE from 'three';
import { BLD, DIMS, STAIRS, RAIL, TERRACE2, WINDOW, walls, staticRects, INNER } from './plan.js';
import { ARCH, makeEnvironment, initMaterials } from './materials.js';
import { box, cyl, flat, vplane, group, retile, sph, mergeStatic } from './gfx.js';
import { SURFACES } from './data/catalog.js';
import { buildFixtures } from './fixtures.js';
import { buildItem, matSig, colsOf, seatsOf, itemTransform } from './furniture.js';

export class World {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    initMaterials();
    scene.environment = makeEnvironment(renderer); scene.environmentIntensity = 0.5;
    scene.fog = new THREE.FogExp2(0x1a0d08, 0.021); scene.background = new THREE.Color(0x0a0608);
    // The whole building lives in a mirrored group so the bar sits on the RIGHT when you look from the stage.
    // Logic coordinates (player, NPCs, plan) are unchanged; camera and text textures compensate.
    this.mirror = group(scene); this.mirror.scale.x = -1;
    this.root = group(this.mirror); this.furn = group(this.mirror); this.pinsG = group(this.mirror);
    this.itemObjs = new Map(); this.seats = []; this.dyn = [[], []]; this.rects = [staticRects(0), staticRects(1)];
    this.layoutVersion = 0; this.pinMarkers = []; this.surf = {}; this.lightsG = group(this.mirror);
    this.buildLights(); this.buildShell(); this.buildExterior();
    this.fx = buildFixtures(this); this.merge = location.search.includes('nomerge') ? null : mergeStatic(this.root); // ?nomerge in the URL turns the optimisation off (for comparing)
  }

  /** Rebuild shell, exterior, lights and fixtures after plan.applyDims() changed the hall length / stage distance. Furniture, pins and the door state are kept. */
  rebuildArchitecture() {
    const old = this.fx; old.disposers?.forEach(fn => fn());
    for (const g of [this.root, this.lightsG]) { g.traverse(o => o.geometry?.dispose()); g.clear(); }
    this.surf = {};
    this.buildLights(); this.buildShell(); this.buildExterior();
    const fx = buildFixtures(this); this.merge = location.search.includes('nomerge') ? null : mergeStatic(this.root); // ?nomerge in the URL turns the optimisation off (for comparing)
    for (const [k, v] of Object.entries(old.anchors)) if (fx.anchors[k]) v.copy(fx.anchors[k]); // keep the Vector3s main.js captured
    fx.anchors = old.anchors;
    Object.assign(fx.door, { open: old.door.open, target: old.door.target, ang: old.door.ang });
    this.fx = fx;
    this.rects = [[...staticRects(0), ...this.dyn[0]], [...staticRects(1), ...this.dyn[1]]]; this.layoutVersion++;
  }

  buildLights() {
    const add = l => { this.lightsG.add(l); return l; };
    add(new THREE.HemisphereLight(0xffd4aa, 0x3a1c18, 1.05));
    const pl = (x, y, z, c, i, d) => { const l = new THREE.PointLight(c, i, d, 2); l.position.set(x, y, z); add(l); return l; };
    pl(0, 2.4, 5.6, 0xffb870, 26, 13);        // foyer
    pl(9.0, 2.4, 0.5, 0xffa860, 30, 13);      // bar
    pl(-5, 2.4, 1.8, 0xffb070, 26, 13);       // lounge left
    pl(3.5, 2.4, 0.0, 0xffb070, 26, 13);      // lounge right
    pl(0, 5.2, -1.6, 0xffa860, 40, 15);       // hall fill (double height)
    pl(0, 5.5, 14, 0xffc890, 36, 26);         // street lamp glow on the facade
    pl(-11.05, 4.2, -3.0, 0xff9a50, 14, 8);   // secret stairs
    pl(0.3, 6.7, 4.5, 0xffa860, 28, 10);      // VIP lounge (centre)
    pl(-8.5, 6.6, 2.6, 0xff9a50, 24, 9);      // cigar room + dining
    pl(9.0, 6.5, 2.8, 0xffb878, 28, 9);       // office
    const spot = (x, tx) => { const l = new THREE.SpotLight(0xffd8a8, 180, 16, 0.6, 0.65, 2); l.position.set(x, 6.7, -2.6 - DIMS.stage); l.target.position.set(tx, 0.45, -6.2 - DIMS.stage); add(l); add(l.target); };
    spot(-3.5, -2.5); spot(3.5, 2.5);
    for (let z = -11; z > BLD.Z0 + 1.5; z -= 8) pl(0, 5.2, z, 0xffa860, 34, 14); // extra hall fill when the hall is longer
  }

  buildShell() {
    const R = this.root, H = BLD.H, F1 = BLD.F1, Z0 = BLD.Z0;
    for (const k of ['checker', 'carpet', 'marbleBlack', 'parquet']) { ARCH[k].polygonOffset = true; ARCH[k].polygonOffsetFactor = -2; ARCH[k].polygonOffsetUnits = -2; }
    const tag = (k, m) => { (this.surf[k] ??= []).push(m); m.userData.surfKey = k; return m; };
    // ground floor
    tag('floorMain', flat(R, ARCH.parquet, -12, 12, Z0, 8, 0));
    tag('floorFoyer', flat(R, ARCH.checker, -7.5, 7.5, 4, 8, 0.004));
    flat(R, ARCH.marbleBlack, 7.5, 12, 4, 8, 0.004); flat(R, ARCH.marbleBlack, -12, -7.5, 4, 8, 0.004);
    flat(R, ARCH.marbleBlack, 10.7, 11.85, -5.6, 3.9, 0.004);
    flat(R, ARCH.carpet, -1.4, 1.4, -4.5 - DIMS.stage, 4, 0.006);
    // ceilings, slab, beams
    tag('ceiling', flat(R, ARCH.tin, -12, 12, Z0, 8, H, false));
    tag('ceiling', box(R, ARCH.tin, 24, 0.3, 8, 0, BLD.CEIL0, 4));
    box(R, ARCH.brass, 24, 0.05, 0.05, 0, BLD.CEIL0, 0.02);
    for (const x of [-9, -4.5, 0, 4.5, 9]) box(R, ARCH.panel, 0.35, 0.4, -Z0, x, H - 0.4, Z0 / 2);
    for (let z = -2; z > Z0 + 1; z -= 4) box(R, ARCH.panel, 24, 0.3, 0.3, 0, H - 0.3, z);
    // upper floors
    const up = (m, x0, x1, z0, z1) => { const mm = flat(R, m, x0, x1, z0, z1, F1 + 0.003); if (m !== ARCH.marbleBlack) tag('floorVip', mm); return mm; };
    up(ARCH.carpet, -5.5, 6, 0, 8); up(ARCH.parquet, -12, -5.5, 0, 8);
    up(ARCH.marbleBlack, 6, 12, 5.5, 8); up(ARCH.carpet, 6, 12, 0, 5.5);
    // walls (wainscot + gold line on the damask ones)
    const styleMat = { damask: ARCH.damask, green: ARCH.damaskGreen, panel: ARCH.panel, marble: ARCH.marbleWhite, roundwin: ARCH.panel };
    for (const w of walls) {
      const base = w.f === 1 ? F1 : 0, W = w.x1 - w.x0, D = w.z1 - w.z0, cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;
      if (w.style === 'roundwin' && w.collide && W > 3) { // wall with a big circular hole
        const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, w.h); sh.lineTo(-W / 2, w.h); sh.closePath();
        const hole = new THREE.Path(); hole.absarc(WINDOW.x - cx, WINDOW.y, WINDOW.r, 0, Math.PI * 2, true); sh.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 48 }); g.translate(0, 0, -D / 2);
        const uv = g.attributes.uv, tl = ARCH.panel.userData.tile; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tl, uv.getY(i) / tl);
        const m = new THREE.Mesh(g, ARCH.panel); m.position.set(cx, base, cz); R.add(m); continue;
      }
      const wm = box(R, styleMat[w.style], W, w.h, D, cx, base + w.y0, cz); if (w.style === 'damask') tag('wallsMain', wm); else if (w.style === 'green') tag('wallsVip', wm);
      if ((w.style === 'damask' || w.style === 'green') && w.y0 === 0 && w.h > 1.3) {
        box(R, ARCH.panel, W + (D < W ? 0 : 0.05), 1.1, D + (W < D ? 0 : 0.05), cx, base, cz);
        box(R, ARCH.brass, W + (D < W ? 0 : 0.07), 0.04, D + (W < D ? 0 : 0.07), cx, base + 1.1, cz);
      }
    }
    // terraces: a central VIP terrace and a small private one next to the office
    const rail = (x0, z0, x1, z1) => {
      const g = group(R, 0, F1, 0), len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const seg = group(g, cx, 0, cz); seg.rotation.y = -ang;
      box(seg, ARCH.panel, len, 0.45, 0.1, 0, 0, 0);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), new THREE.MeshStandardMaterial({ color: 0xbfd8e0, transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); gl.position.y = 0.7; seg.add(gl);
      for (let t = 0; t <= len + 0.01; t += 0.7) cyl(seg, ARCH.brass, 0.025, 0.025, 1.0, -len / 2 + Math.min(t, len), 0, 0);
      const top = cyl(seg, ARCH.brass, 0.04, 0.04, len, 0, 0.98, 0); top.rotation.z = Math.PI / 2;
      const mid = cyl(seg, ARCH.brass, 0.018, 0.018, len, 0, 0.45, 0); mid.rotation.z = Math.PI / 2;
    };
    const slab = (x0, x1, z0, z1) => { box(R, ARCH.panel, x1 - x0, 0.3, z1 - z0, (x0 + x1) / 2, F1 - 0.3, (z0 + z1) / 2); flat(R, ARCH.planks, x0, x1, z0, z1, F1 + 0.004); box(R, ARCH.brass, x1 - x0, 0.05, 0.05, (x0 + x1) / 2, F1 - 0.05, z0); };
    slab(RAIL.x0 - 0.1, RAIL.x1 + 0.1, RAIL.z, 0.1); rail(RAIL.x0, RAIL.z, RAIL.x1, RAIL.z); rail(RAIL.x0, RAIL.z, RAIL.x0, 0); rail(RAIL.x1, RAIL.z, RAIL.x1, 0);
    slab(TERRACE2.x0 - 0.1, TERRACE2.x1 + 0.1, TERRACE2.z0, 0.1); rail(TERRACE2.x0, TERRACE2.z0, TERRACE2.x1, TERRACE2.z0); rail(TERRACE2.x0, TERRACE2.z0, TERRACE2.x0, 0); rail(TERRACE2.x1, TERRACE2.z0, TERRACE2.x1, 0);
    // stairs
    const n = 19, dz = (STAIRS.zt - STAIRS.zb) / n, sw = STAIRS.x1 - STAIRS.x0;
    for (let i = 0; i < n; i++) box(R, i % 2 ? ARCH.wood : ARCH.woodLight, sw, STAIRS.h * (i + 1) / n, dz, (STAIRS.x0 + STAIRS.x1) / 2, 0, STAIRS.zb + dz * (i + 0.5));
    const ang = Math.atan2(STAIRS.h, STAIRS.zt - STAIRS.zb), hl = Math.hypot(STAIRS.h, STAIRS.zt - STAIRS.zb);
    const hr = cyl(R, ARCH.brass, 0.025, 0.025, hl, STAIRS.x1 - 0.06, 0, (STAIRS.zb + STAIRS.zt) / 2); hr.rotation.x = Math.PI / 2 - ang; hr.position.y = STAIRS.h / 2 + 0.95;
  }

  // ── surfaces (swap wall / floor / ceiling textures at runtime) ────────────
  setSurface(key, id) {
    const mat = ARCH[id]; if (!mat || !this.surf[key]) return;
    for (const m of this.surf[key]) { m.material = mat; retile(m, mat.userData.tile); }
  }
  applySurfaces(map = {}) { for (const [k, d] of Object.entries(SURFACES)) this.setSurface(k, map[k] ?? d.def); }

  // ── exterior: facade, street, neighbours, cars, sky ───────────────────────
  buildExterior() {
    const R = this.root, H = BLD.H, brick = ARCH.brick;
    for (const k of ['parquet', 'planks', 'checker', 'checkerGreen', 'marbleBlack', 'marbleWhite', 'carpet']) { ARCH[k].polygonOffset = true; ARCH[k].polygonOffsetFactor = -2; ARCH[k].polygonOffsetUnits = -2; }
    // facade cladding (visual only), leaving the entrance open
    for (const s of [-1, 1]) {
      box(R, brick, 10.85, H, 0.14, s * 6.725, 0, 8.22); box(R, ARCH.marbleBlack, 10.9, 0.9, 0.3, s * 6.7, 0, 8.3);
      box(R, brick, 0.14, H, 16.4 + DIMS.hall, s * 12.22, 0, BLD.Z0 / 2);
    }
    box(R, brick, 2.6, H - 2.6, 0.14, 0, 2.6, 8.22); box(R, brick, 24.6, H, 0.14, 0, 0, BLD.Z0 - 0.22);
    box(R, ARCH.gold, 25, 0.3, 0.5, 0, H, 8.28); box(R, ARCH.brass, 25, 0.12, 0.6, 0, H + 0.3, 8.3);
    box(R, ARCH.plaster, 24.6, 0.25, 16.6 + DIMS.hall, 0, H, BLD.Z0 / 2);
    // glowing windows
    const glow = new THREE.MeshBasicMaterial({ color: 0xb27a34 }), glowP = new THREE.MeshBasicMaterial({ color: 0x8a4a62 });
    const win = (x, y, w, h, m) => { vplane(R, m, w, h, x, y, 8.3); for (const [dx, dy, ww, hh] of [[0, h / 2, w + 0.16, 0.08], [0, -h / 2, w + 0.16, 0.08], [-w / 2, 0, 0.08, h], [w / 2, 0, 0.08, h], [0, 0, 0.05, h]]) box(R, ARCH.brass, ww, hh, 0.1, x + dx, y + dy - hh / 2, 8.31); };
    for (const x of [-9.5, -5.0, 5.0, 9.5]) win(x, 2.2, 2.0, 1.8, glow);
    for (const x of [-9.5, -5.5, 5.5, 9.5]) win(x, 5.5, 1.5, 1.9, x < 0 ? glowP : glow);
    // awning over the door
    const aw = group(R, 0, 3.4, 9.0); aw.rotation.x = 0.0;
    const slope = box(aw, ARCH.velvet, 4.2, 0.1, 1.9, 0, -0.1, 0); slope.rotation.x = 0.32; box(aw, ARCH.gold, 4.2, 0.07, 0.07, 0, -0.45, 0.9).rotation.x = 0;
    for (const x of [-2, 2]) cyl(aw, ARCH.brass, 0.04, 0.04, 3.3, x, -3.4, 0.85);
    // sidewalk, road, kerb, markings
    flat(R, ARCH.pavement, -80, 80, 8.3, 12, 0.004); flat(R, ARCH.asphalt, -80, 80, 12.1, 31, 0.003); flat(R, ARCH.brass, -80, 80, 12.0, 12.1, 0.006);
    flat(R, ARCH.pavement, -80, 80, 31, 36, 0.004);
    const line = new THREE.MeshBasicMaterial({ color: 0xc9a030 }); for (let x = -40; x <= 40; x += 4) flat(R, line, x, x + 1.6, 21.9, 22.05, 0.007);
    // neighbours + opposite side
    const fm = ARCH.facade; this.nb = [];
    box(R, fm, 40, 11, 40, 32.5, 0, -12); box(R, fm, 40, 12, 40, -32.5, 0, -12); this.nb.push();
    [[-48, 9], [-30, 12], [-12, 8], [6, 13], [24, 10], [42, 11]].forEach(([x, hh]) => box(R, fm, 17, hh, 10, x, 0, 41));
    // street lamps
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffd08a }), halo = this._halo ?? (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d'), g = q.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,130,0.9)'); g.addColorStop(1, 'rgba(255,170,60,0)'); q.fillStyle = g; q.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (const x of [-26, -16, -8, 8, 16, 26]) { cyl(R, ARCH.black, 0.07, 0.1, 4.6, x, 0, 11.7); box(R, ARCH.black, 0.08, 0.08, 0.9, x, 4.55, 11.3); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lamp); hd.position.set(x, 4.5, 10.8); R.add(hd); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(2.6); sp.position.copy(hd.position); R.add(sp); }
    // vintage cars
    const car = (x, z, color) => {
      const c = group(R, x, 0, z), paint = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.1, metalness: 0.9 });
      box(c, paint, 4.4, 0.65, 1.8, 0, 0.3, 0); box(c, paint, 2.2, 0.62, 1.64, -0.2, 0.95, 0); box(c, dark, 2.25, 0.4, 1.66, -0.2, 1.0, 0); box(c, ARCH.chrome, 4.5, 0.08, 1.9, 0, 0.25, 0);
      const hl = new THREE.MeshBasicMaterial({ color: 0xfff0c0 }); for (const s of [-1, 1]) { box(c, hl, 0.08, 0.2, 0.3, 2.2, 0.62, s * 0.6); box(c, new THREE.MeshBasicMaterial({ color: 0xb01818 }), 0.08, 0.16, 0.3, -2.2, 0.62, s * 0.6); }
      for (const [wx, wz] of [[-1.4, 0.85], [1.4, 0.85], [-1.4, -0.85], [1.4, -0.85]]) { const wh = cyl(c, ARCH.black, 0.34, 0.34, 0.22, wx, 0, wz, 18); wh.rotation.x = Math.PI / 2; cyl(c, ARCH.chrome, 0.16, 0.16, 0.24, wx, 0.18, wz, 12).rotation.x = Math.PI / 2; }
      return c;
    };
    car(-17, 15, 0x1f6a8a); car(18, 15, 0xa8202e);
    // sky: stars + moon
    const sp = new Float32Array(900); for (let i = 0; i < 300; i++) { const a = Math.random() * 6.28, e = 0.25 + Math.random() * 1.1, r = 220; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    R.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf2efe0, fog: false })); moon.position.set(-70, 110, 150); R.add(moon);
    this.scene.background = new THREE.Color(0x0b1226); this.scene.fog.color.set(0x150d12); this.scene.fog.density = 0.018;
  }

  // ── furniture sync ────────────────────────────────────────────────────────
  syncFurniture(items) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.id);
      const sig = matSig(it), e = this.itemObjs.get(it.id);
      if (!e || e.sig !== sig) {
        if (e) this.disposeGroup(e.group);
        const g = buildItem(it); this.furn.add(g); this.itemObjs.set(it.id, { group: g, sig });
      }
    }
    for (const [id, e] of this.itemObjs) if (!seen.has(id)) { this.disposeGroup(e.group); this.itemObjs.delete(id); }
    this.dyn = [[], []]; this.seats = [];
    for (const it of items) { for (const r of colsOf(it)) this.dyn[it.f].push(r); this.seats.push(...seatsOf(it)); }
    this.rects = [[...staticRects(0), ...this.dyn[0]], [...staticRects(1), ...this.dyn[1]]];
    this.layoutVersion++;
  }
  /** move an existing item's mesh without rebuilding (used while dragging) */
  previewItem(it) { const e = this.itemObjs.get(it.id); if (!e) return; const T = itemTransform(it); e.group.position.set(T.x, T.y, T.z); e.group.rotation.y = T.ry; }
  disposeGroup(g) { this.furn.remove(g); g.traverse(o => o.geometry?.dispose()); }

  // ── pins ──────────────────────────────────────────────────────────────────
  syncPins(pins) {
    this.pinsG.clear(); this.pinMarkers = [];
    const geo = new THREE.SphereGeometry(0.07, 14, 10), stemGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6);
    if (!this._halo) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,214,110,0.95)'); g.addColorStop(0.35, 'rgba(255,190,70,0.35)'); g.addColorStop(1, 'rgba(255,170,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      this._halo = new THREE.CanvasTexture(c); this._halo.colorSpace = THREE.SRGBColorSpace;
    }
    for (const p of pins) {
      const done = p.done, col = done ? 0x6fcf97 : 0xffc648;
      const g = new THREE.Group(); g.position.set(p.x, p.y + 0.3, p.z);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: done ? 0.9 : 2.4, roughness: 0.3, metalness: 0.6 })); g.add(m);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 })); stem.position.y = -0.18; g.add(stem);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: done ? 0.4 : 0.9, fog: false })); sp.scale.setScalar(0.5); g.add(sp);
      g.userData = { base: p.y + 0.3, id: p.id }; this.pinsG.add(g); this.pinMarkers.push(g);
    }
  }

  /** Cast a ray from the camera; returns {point, normal} on solid geometry. */
  /** Cast a ray; returns {point, normal, object} in LOGIC coordinates (the render mirror is undone). */
  castRay(raycaster, { needUp = false, includeFurn = false } = {}) {
    const hits = raycaster.intersectObjects(includeFurn ? [this.root, this.furn] : [this.root], true);
    for (const h of hits) {
      const mt = h.object.material; if (!h.object.userData.surfKey && mt && (mt.transparent || mt.isMeshBasicMaterial || mt.isSpriteMaterial)) continue;
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      if (needUp && n.y < 0.5) continue;
      return { point: new THREE.Vector3(-h.point.x, h.point.y, h.point.z), normal: new THREE.Vector3(-n.x, n.y, n.z), object: h.object };
    }
    return null;
  }
  pick(camera, far = 25) {
    const rc = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0.05, far);
    camera.getWorldPosition(rc.ray.origin); camera.getWorldDirection(rc.ray.direction);
    const r = this.castRay(rc, { includeFurn: true }); return r;
  }

  update(dt, t, ctx) {
    for (const g of this.pinMarkers) g.position.y = g.userData.base + Math.sin(t * 2 + g.userData.id) * 0.03;
    this.fx.update(dt, t, ctx);
  }
}
