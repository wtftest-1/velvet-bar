// Grid A* navigation. Rebuilt whenever the layout changes, so guests walk around whatever you place.
import { INNER, DOOR } from './plan.js';

const CS = 0.5, X0 = -12, Z0 = -8, NX = 48, NZ = 44, INFL = 0.3;

export class Nav {
  constructor() { this.blocked = [new Uint8Array(NX * NZ), new Uint8Array(NX * NZ)]; }

  rebuild(rects) {
    for (let f = 0; f < 2; f++) {
      const b = this.blocked[f], I = INNER[f], list = f === 0 ? [...rects[0], DOOR.rect] : rects[1];
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const x = X0 + (i + 0.5) * CS, z = Z0 + (j + 0.5) * CS;
        let bl = 0;
        const inside = x > I.x0 && x < I.x1 && z > I.z0 && z < I.z1;
        if (!inside && !(f === 0 && z > 8.2)) bl = 1;
        if (!bl) for (const r of list) { const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); if (dx * dx + dz * dz < INFL * INFL) { bl = 1; break; } }
        b[j * NX + i] = bl;
      }
    }
  }

  cell(x, z) { return [Math.min(NX - 1, Math.max(0, Math.floor((x - X0) / CS))), Math.min(NZ - 1, Math.max(0, Math.floor((z - Z0) / CS)))]; }
  isBlocked(f, x, z) { const [i, j] = this.cell(x, z); return this.blocked[f][j * NX + i] === 1; }
  centre(i, j) { return { x: X0 + (i + 0.5) * CS, z: Z0 + (j + 0.5) * CS }; }

  nearestFree(f, i, j) {
    const b = this.blocked[f]; if (!b[j * NX + i]) return [i, j];
    for (let r = 1; r < 8; r++) {
      let best = null, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= NX || c >= NZ || b[c * NX + a]) continue;
        const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, c]; }
      }
      if (best) return best;
    }
    return null;
  }

  los(f, ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
    for (let s = 1; s < n; s++) { const t = s / n; if (this.isBlocked(f, ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }

  /** Returns [{x,z}...] from (after) start to target, or null when unreachable. */
  path(f, sx, sz, tx, tz) {
    const b = this.blocked[f];
    const s = this.nearestFree(f, ...this.cell(sx, sz)), g = this.nearestFree(f, ...this.cell(tx, tz));
    if (!s || !g) return null;
    const sIdx = s[1] * NX + s[0], gIdx = g[1] * NX + g[0];
    const gs = new Float32Array(NX * NZ).fill(1e9), from = new Int32Array(NX * NZ).fill(-1), closed = new Uint8Array(NX * NZ);
    const heap = []; // [f, idx]
    const push = (fv, idx) => { heap.push([fv, idx]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = idx => Math.hypot((idx % NX) - g[0], Math.floor(idx / NX) - g[1]);
    gs[sIdx] = 0; push(h(sIdx), sIdx);
    let found = false;
    while (heap.length) {
      const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
      if (cur === gIdx) { found = true; break; }
      const ci = cur % NX, cj = (cur / NX) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const a = ci + di, c = cj + dj; if (a < 0 || c < 0 || a >= NX || c >= NZ) continue;
        const ni = c * NX + a; if (b[ni] || closed[ni]) continue;
        if (di && dj && (b[cj * NX + a] || b[c * NX + ci])) continue; // no corner cutting
        const ng = gs[cur] + (di && dj ? 1.414 : 1);
        if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    if (!found) return null;
    const cells = []; for (let c = gIdx; c !== -1; c = from[c]) cells.push(this.centre(c % NX, (c / NX) | 0));
    cells.reverse();
    // string pulling
    const pts = [{ x: sx, z: sz }, ...cells], out = []; let anchor = 0;
    while (anchor < pts.length - 1) {
      let far = anchor + 1;
      for (let k = pts.length - 1; k > anchor + 1; k--) if (this.los(f, pts[anchor].x, pts[anchor].z, pts[k].x, pts[k].z)) { far = k; break; }
      out.push(pts[far]); anchor = far;
    }
    out.push({ x: tx, z: tz });
    return out;
  }
}
