// Procedural canvas textures. Every texture carries userData.tile = metres covered by one repeat,
// and gfx.js scales UVs to world size, so patterns keep the same scale on every surface.
import * as THREE from 'three';

/** The world is mirrored on x (world.js), so text textures are pre-flipped to read correctly. */
export function flipTex(tx) { tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = -1; tx.offset.x = 1; return tx; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mk = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
function finish(c, tile, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; t.userData.tile = tile; t.needsUpdate = true; return t;
}
const wrap9 = (S, fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); };

function woodTex(base, seed, dark = 'rgba(30,15,5,', light = 'rgba(255,230,190,') {
  const [c, x] = mk(512), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 320; i++) {
    const y = r() * 512, w = 0.6 + r() * 2.6, a = 0.04 + r() * 0.16, k = 1 + Math.floor(r() * 3), ph = r() * 6.28, amp = 1 + r() * 4;
    x.strokeStyle = (r() < 0.6 ? dark : light) + a + ')'; x.lineWidth = w;
    for (const dy of [-512, 0, 512]) {
      x.beginPath();
      for (let xx = 0; xx <= 512; xx += 16) { const yy = y + dy + Math.sin(xx / 512 * 6.283 * k + ph) * amp; xx ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
  }
  for (let i = 0; i < 3; i++) { // knots
    const kx = r() * 512, ky = r() * 512;
    for (let q = 6; q > 0; q--) { x.strokeStyle = dark + (0.08 + q * 0.02) + ')'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(kx, ky, q * 7, q * 2.6, 0, 0, 6.28); x.stroke(); }
  }
  return finish(c, 1.2);
}

function panelTex() {
  const [c, x] = mk(512), r = rng(7);
  const src = woodTex('#4b2a17', 11).image; x.drawImage(src, 0, 0);
  x.lineJoin = 'round';
  const inset = 34;
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(inset, inset, 512 - inset * 2, 512 - inset * 2);
  x.strokeStyle = 'rgba(255,220,170,0.28)'; x.lineWidth = 3; x.strokeRect(inset, inset, 512 - inset * 2, 512 - inset * 2);
  x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 3; x.strokeRect(inset + 3, inset + 3, 512 - inset * 2 - 6, 512 - inset * 2 - 6);
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 6; x.strokeRect(0, 0, 512, 512);
  void r; return finish(c, 1.2);
}

function parquetTex() {
  const S = 1024, cs = 128, L = 4, [c, x] = mk(S), r = rng(21);
  x.fillStyle = '#2a1608'; x.fillRect(0, 0, S, S);
  const plank = (px, py, w, h, horiz) => {
    wrap9(S, (dx, dy) => {
      const X = px + dx, Y = py + dy; if (X > S || Y > S || X + w < 0 || Y + h < 0) return;
      x.save(); x.beginPath(); x.rect(X + 1.5, Y + 1.5, w - 3, h - 3); x.clip();
      x.fillStyle = plank.col; x.fillRect(X, Y, w, h);
      for (let i = 0; i < 9; i++) {
        x.strokeStyle = (r() < 0.5 ? 'rgba(20,8,0,' : 'rgba(255,210,150,') + (0.05 + r() * 0.12) + ')'; x.lineWidth = 1 + r() * 1.5;
        x.beginPath();
        if (horiz) { const yy = Y + r() * h; x.moveTo(X, yy); x.lineTo(X + w, yy + (r() - 0.5) * 6); } else { const xx = X + r() * w; x.moveTo(xx, Y); x.lineTo(xx + (r() - 0.5) * 6, Y + h); }
        x.stroke();
      }
      const g = x.createLinearGradient(X, Y, horiz ? X : X + w, horiz ? Y + h : Y); g.addColorStop(0, 'rgba(255,230,190,0.16)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
      x.fillStyle = g; x.fillRect(X, Y, w, h); x.restore();
    });
  };
  for (let m = -12; m < 12; m++) for (let n = -12; n < 12; n++) {
    const i = m + n * (L + 1), j = m + n * (1 - L);       // lattice of horizontal planks
    if (i < -8 || i > 16 || j < -8 || j > 16) continue;
    plank.col = `hsl(${24 + r() * 8},${42 + r() * 10}%,${22 + r() * 9}%)`; plank(i * cs, j * cs, L * cs, cs, true);
    plank.col = `hsl(${24 + r() * 8},${42 + r() * 10}%,${22 + r() * 9}%)`; plank((i + L) * cs, (j - L + 1) * cs, cs, L * cs, false);
  }
  return finish(c, 0.68);
}

function velvetTex() {
  const [c, x] = mk(256), r = rng(3);
  x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 140 + r() * 110; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(255,255,255,${r() * 0.07})`; x.lineWidth = 2 + r() * 6; const a = r() * 256, b = r() * 256; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 60, b + 40); x.stroke(); }
  return finish(c, 0.45);
}

function leatherTex() {
  const [c, x] = mk(256), r = rng(5);
  x.fillStyle = '#cfcfcf'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) { const px = r() * 256, py = r() * 256, rad = 1.2 + r() * 2.4; x.strokeStyle = `rgba(40,40,40,${0.12 + r() * 0.18})`; x.lineWidth = 1; wrap9(256, (dx, dy) => { x.beginPath(); x.arc(px + dx, py + dy, rad, 0, 6.28); x.stroke(); }); }
  for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1; x.beginPath(); const a = r() * 256, b = r() * 256; x.moveTo(a, b); x.quadraticCurveTo(a + 30, b + 20, a + 70, b - 10); x.stroke(); }
  return finish(c, 0.4);
}

function damaskTex(base, hi, line) {
  const [c, x] = mk(512), r = rng(9);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.09})`; x.fillRect(r() * 512, r() * 512, 2, 2); }
  const motif = (cx, cy, s) => {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    for (const m of [1, -1]) {
      x.save(); x.scale(m, 1);
      x.fillStyle = hi; x.strokeStyle = line; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(0, -78); x.bezierCurveTo(34, -52, 46, -8, 16, 18); x.bezierCurveTo(46, 38, 34, 70, 0, 84); x.bezierCurveTo(8, 56, 2, 40, 0, 22); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, -30); x.bezierCurveTo(22, -16, 24, 6, 8, 12); x.stroke();
      x.beginPath(); x.arc(30, -60, 6, 0, 6.28); x.stroke();
      x.restore();
    }
    x.beginPath(); x.arc(0, 0, 6, 0, 6.28); x.fillStyle = line; x.fill();
    x.restore();
  };
  motif(128, 128, 1); motif(384, 384, 1);
  const rose = (cx, cy) => { x.strokeStyle = line; x.lineWidth = 2; for (let k = 1; k < 5; k++) { x.beginPath(); x.arc(cx, cy, k * 9, 0, 6.28); x.stroke(); } x.fillStyle = hi; for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(cx + Math.cos(k * 0.785) * 48, cy + Math.sin(k * 0.785) * 48, 4, 0, 6.28); x.fill(); } };
  rose(384, 128); rose(128, 384);
  return finish(c, 0.62);
}

function tinTex() {
  const [c, x] = mk(512), r = rng(13);
  x.fillStyle = '#9a8057'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,235,190'},${r() * 0.08})`; x.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
    const ox = qx * 256, oy = qy * 256;
    x.lineWidth = 6; x.strokeStyle = 'rgba(255,235,190,0.55)'; x.beginPath(); x.moveTo(ox + 4, oy + 252); x.lineTo(ox + 4, oy + 4); x.lineTo(ox + 252, oy + 4); x.stroke();
    x.strokeStyle = 'rgba(30,18,5,0.6)'; x.beginPath(); x.moveTo(ox + 252, oy + 4); x.lineTo(ox + 252, oy + 252); x.lineTo(ox + 4, oy + 252); x.stroke();
    for (const [rad, a] of [[96, 0.5], [78, 0.4], [58, 0.45], [36, 0.5]]) { x.lineWidth = 4; x.strokeStyle = `rgba(255,235,190,${a})`; x.beginPath(); x.arc(ox + 126, oy + 126, rad, 0.7, 3.8); x.stroke(); x.strokeStyle = `rgba(30,18,5,${a})`; x.beginPath(); x.arc(ox + 130, oy + 130, rad, 3.8, 6.9); x.stroke(); }
    for (let k = 0; k < 16; k++) { const a = k * 0.3927, px = ox + 126 + Math.cos(a) * 112, py = oy + 126 + Math.sin(a) * 112; x.fillStyle = 'rgba(255,235,190,0.6)'; x.beginPath(); x.arc(px, py, 3.5, 0, 6.28); x.fill(); x.fillStyle = 'rgba(30,18,5,0.5)'; x.beginPath(); x.arc(px + 2, py + 2, 3, 0, 6.28); x.fill(); }
  }
  return finish(c, 0.6);
}

function marbleTex(base, vein, glow, seed, tile = 2.0, size = 512) {
  const [c, x] = mk(size), r = rng(seed), k = size / 512;
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(r() * size, r() * size, 0, r() * size, r() * size, 90 * k); g.addColorStop(0, `rgba(255,255,255,${0.025 + r() * 0.04})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, size, size); }
  const veinPath = (px, py, ang, len, w, a) => {
    wrap9(size, (dx, dy) => {
      x.beginPath(); let X = px, Y = py, A = ang; x.moveTo(X + dx, Y + dy);
      for (let s = 0; s < len; s++) { A += (Math.sin(s * 0.3 + px) * 0.35); X += Math.cos(A) * 9 * k; Y += Math.sin(A) * 9 * k; x.lineTo(X + dx, Y + dy); }
      x.strokeStyle = vein.replace('A', a); x.lineWidth = w; x.shadowColor = glow; x.shadowBlur = 3; x.stroke(); x.shadowBlur = 0;
    });
  };
  for (let i = 0; i < 9; i++) { const px = r() * size, py = r() * size, a = r() * 6.28; veinPath(px, py, a, 40, (0.9 + r() * 1.9) * k, 0.8); veinPath(px, py, a + 0.7, 18, 0.6 * k, 0.6); veinPath(px, py, a - 0.9, 16, 0.5 * k, 0.5); }
  return finish(c, tile);
}

function checkerTex() {
  const [c, x] = mk(512), r = rng(31);
  for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
    const dark = (qx + qy) % 2 === 0;
    x.fillStyle = dark ? '#0c0c0f' : '#e9e3d6'; x.fillRect(qx * 256, qy * 256, 256, 256);
    for (let i = 0; i < 8; i++) { x.strokeStyle = dark ? `rgba(200,160,80,${0.15 + r() * 0.35})` : `rgba(110,110,120,${0.1 + r() * 0.25})`; x.lineWidth = 0.6 + r() * 1.4; x.beginPath(); let X = qx * 256 + r() * 256, Y = qy * 256 + r() * 256; x.moveTo(X, Y); for (let s = 0; s < 8; s++) { X += (r() - 0.5) * 50; Y += (r() - 0.5) * 50; x.lineTo(Math.min(qx * 256 + 256, Math.max(qx * 256, X)), Math.min(qy * 256 + 256, Math.max(qy * 256, Y))); } x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.strokeRect(qx * 256, qy * 256, 256, 256);
  }
  return finish(c, 1.2);
}

function carpetTex() {
  const [c, x] = mk(512), r = rng(41);
  x.fillStyle = '#3a0a18'; x.fillRect(0, 0, 512, 512);
  const fan = (cx, cy) => {
    const cols = ['#9a7a38', '#14040b', '#9a7a38', '#6e1630', '#9a7a38'];
    for (let k = 0; k < 5; k++) { x.fillStyle = cols[k]; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, 64 - k * 12, Math.PI, 0); x.closePath(); x.fill(); }
  };
  for (let row = 0; row < 9; row++) for (let col = -1; col < 5; col++) fan(col * 128 + (row % 2 ? 64 : 0) + 64, row * 32 + 32);
  x.strokeStyle = 'rgba(154,122,56,0.45)'; x.lineWidth = 2; for (let row = 0; row < 9; row++) { x.beginPath(); x.moveTo(0, row * 32 + 32); x.lineTo(512, row * 32 + 32); x.stroke(); }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.12})`; x.fillRect(r() * 512, r() * 512, 2, 1); }
  return finish(c, 1.4);
}

function paintingTex() {
  const [c, x] = mk(320, 240), r = rng(77);
  const g = x.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, '#13204a'); g.addColorStop(1, '#4a1030'); x.fillStyle = g; x.fillRect(0, 0, 320, 240);
  x.save(); x.translate(160, 240);
  for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(240,190,90,${i % 2 ? 0.14 : 0.06})`; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 330, -Math.PI + i * 0.175, -Math.PI + (i + 1) * 0.175); x.closePath(); x.fill(); }
  x.restore();
  x.fillStyle = '#ffb347'; x.beginPath(); x.arc(160, 120, 46, 0, 6.28); x.fill(); x.fillStyle = '#ff6b4a'; x.beginPath(); x.arc(160, 120, 30, 0, 6.28); x.fill();
  for (let i = 0; i < 14; i++) { const w = 14 + r() * 18, h = 40 + r() * 90; x.fillStyle = `rgb(${10 + r() * 15},${8 + r() * 12},${24 + r() * 20})`; x.fillRect(i * 24 - 6, 240 - h, w, h); x.fillStyle = 'rgba(255,200,100,0.7)'; for (let q = 0; q < 6; q++) if (r() < 0.5) x.fillRect(i * 24 - 2 + (q % 2) * 7, 240 - h + 8 + Math.floor(q / 2) * 14, 3, 5); }
  return finish(c, 1);
}

export function neonTexture(text, color = '#ff6b4a', w = 1024, h = 256, font = 'italic 700 150px "Brush Script MT", "Snell Roundhand", cursive') {
  const [c, x] = mk(w, h);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font;
  let fs = parseInt(font.match(/(\d+)px/)[1]);
  while (x.measureText(text).width > w * 0.9 && fs > 20) { fs -= 6; x.font = font.replace(/\d+px/, fs + 'px'); }
  for (const [blur, a] of [[40, 0.5], [22, 0.6], [10, 0.9]]) { x.shadowColor = color; x.shadowBlur = blur; x.fillStyle = color; x.globalAlpha = a; x.fillText(text, w / 2, h / 2); }
  x.globalAlpha = 1; x.shadowBlur = 6; x.shadowColor = color; x.fillStyle = '#fff4e6'; x.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return flipTex(t);
}

export function labelTexture(lines, { w = 512, h = 128, bg = '#1d1018', fg = '#e8c872', font = '700 52px Georgia, serif', border = true } = {}) {
  const [c, x] = mk(w, h);
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font;
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((l, i) => x.fillText(l, w / 2, h / (arr.length + 1) * (i + 1)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return flipTex(t);
}

export function artworkPlaceholder() {
  const [c, x] = mk(640, 440);
  const g = x.createLinearGradient(0, 0, 640, 440); g.addColorStop(0, '#2a0b18'); g.addColorStop(1, '#0d0710'); x.fillStyle = g; x.fillRect(0, 0, 640, 440);
  x.strokeStyle = '#c9a24a'; x.lineWidth = 3; x.strokeRect(24, 24, 592, 392); x.strokeRect(34, 34, 572, 372);
  x.fillStyle = '#c9a24a'; x.textAlign = 'center'; x.font = 'italic 44px Georgia, serif'; x.fillText('Your artwork here', 320, 210);
  x.font = '22px ui-monospace, monospace'; x.fillStyle = '#b89ca8'; x.fillText('Computer ▸ Settings ▸ Upload image', 320, 262);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return flipTex(t);
}

function brickTex() {
  const [c, x] = mk(512), r = rng(55); x.fillStyle = '#2a1812'; x.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let col = -1; col < 8; col++) {
    const bx = col * 64 + (row % 2 ? 32 : 0), by = row * 32; x.fillStyle = `hsl(${8 + r() * 10},${45 + r() * 15}%,${24 + r() * 12}%)`; x.fillRect(bx + 2, by + 2, 60, 28);
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.15})`; x.fillRect(bx + 2 + r() * 56, by + 2 + r() * 24, 3, 2); }
  }
  return finish(c, 1.6);
}
function stripesTex() {
  const [c, x] = mk(256, 256), r = rng(2); x.fillStyle = '#5a1424'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#3f0c19' : '#6e1a2e'; x.fillRect(i * 32, 0, 32, 256); x.fillStyle = 'rgba(214,170,80,0.7)'; x.fillRect(i * 32 + 30, 0, 2, 256); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.08})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  return finish(c, 0.5);
}
function planksTex() {
  const [c, x] = mk(512), r = rng(66); x.fillStyle = '#3a2210'; x.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 8; p++) { x.fillStyle = `hsl(${26 + r() * 8},${40 + r() * 12}%,${26 + r() * 10}%)`; x.fillRect(0, p * 64 + 2, 512, 60);
    for (let i = 0; i < 18; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? '20,8,0' : '255,210,150'},${0.06 + r() * 0.12})`; x.lineWidth = 1 + r() * 2; x.beginPath(); const yy = p * 64 + 4 + r() * 56; x.moveTo(0, yy); x.lineTo(512, yy + (r() - 0.5) * 6); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect((p * 173) % 512, p * 64, 2, 64); }
  return finish(c, 1.0);
}
function checkerColor(dark, light, seed) {
  const [c, x] = mk(512), r = rng(seed);
  for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) { const d = (qx + qy) % 2 === 0; x.fillStyle = d ? dark : light; x.fillRect(qx * 256, qy * 256, 256, 256);
    for (let i = 0; i < 6; i++) { x.strokeStyle = d ? 'rgba(220,190,110,0.25)' : 'rgba(80,80,90,0.2)'; x.lineWidth = 1; x.beginPath(); let X = qx * 256 + r() * 256, Y = qy * 256 + r() * 256; x.moveTo(X, Y); for (let k = 0; k < 6; k++) { X += (r() - 0.5) * 50; Y += (r() - 0.5) * 50; x.lineTo(Math.min(qx * 256 + 256, Math.max(qx * 256, X)), Math.min(qy * 256 + 256, Math.max(qy * 256, Y))); } x.stroke(); } }
  return finish(c, 1.2);
}
function facadeTex(seed) {
  const [c, x] = mk(512), r = rng(seed); x.fillStyle = '#14131c'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.03})`; x.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) { const lit = r() < 0.38; x.fillStyle = lit ? `hsl(${34 + r() * 14},85%,${55 + r() * 15}%)` : '#0a0b12'; x.fillRect(gx * 64 + 14, gy * 64 + 12, 36, 40); x.strokeStyle = '#2a2a38'; x.lineWidth = 3; x.strokeRect(gx * 64 + 14, gy * 64 + 12, 36, 40); }
  return finish(c, 6);
}
const factories = {
  wood: () => woodTex('#b4b4b4', 1, 'rgba(60,60,60,', 'rgba(255,255,255,'),
  panel: panelTex, parquet: parquetTex, velvet: velvetTex, leather: leatherTex,
  damask: () => damaskTex('#4a0e1c', '#6a1428', 'rgba(214,170,80,0.75)'),
  damaskGreen: () => damaskTex('#0f2c24', '#17433a', 'rgba(214,170,80,0.7)'),
  tin: tinTex,
  marbleBlack: () => marbleTex('#0b0b0e', 'rgba(222,178,90,A)', '#e0b050', 1),
  marbleWhite: () => marbleTex('#e8e4dc', 'rgba(110,112,120,A)', '#99a', 2),
  facade: () => facadeTex(5), checker: checkerTex, brick: brickTex, stripes: stripesTex, planks: planksTex, checkerGreen: () => checkerColor('#0f3a2c', '#e6dcc0', 77),
  damaskNavy: () => damaskTex('#10183a', '#1a2656', 'rgba(214,170,80,0.7)'), carpet: carpetTex, painting: () => flipTex(paintingTex()),
};
const cache = {};
export const tex = name => cache[name] ?? (cache[name] = factories[name]());
