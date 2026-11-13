// Architecture data shared by the 3D world, collisions, pathfinding and the 2D floor plan.
// Logic coordinates: x right (when entering), z towards the street (front wall z=+8, stage at z=-8), y up. Metres.
// NOTE: the rendered world is mirrored on x (see world.js) so the bar appears on the right when looking from the stage.

export const BLD = { X0: -12, X1: 12, Z0: -8, Z1: 8, H: 7.2, F1: 3.6, CEIL0: 3.3 };
export const INNER = [
  { x0: -11.85, x1: 11.85, z0: -7.85, z1: 7.85 },   // ground floor
  { x0: -11.85, x1: 11.85, z0: 0.12, z1: 7.85 },    // upper floor
];
export const STAGE = { x0: -7.5, x1: 7.5, z0: -8, z1: -4.5, h: 0.45 };
export const STAIRS = { x0: -11.85, x1: -10.3, zb: -5.7, zt: 0, h: 3.6 };
export const DOOR = { x: -10.2, z0: -6.9, z1: -5.9, rect: { x0: -10.35, x1: -10.05, z0: -6.9, z1: -5.9 } };
export const RAIL = { x0: -5.3, x1: 5.8, z: -1.2 };             // central VIP terrace (middle of the room)
export const TERRACE2 = { x0: 9.7, x1: 11.85, z0: -1.6 };       // small private terrace next to the office
export const WINDOW = { x: 8.0, y: 1.85, r: 1.5 };              // big round one-way window in the office
export const ENTRANCE = { x0: -1.3, x1: 1.3 };
export const DESK = { x: 8.0, z: 1.9 };       // office desk centre
export const OFFICE = { x0: 6, x1: 12, z0: 0, z1: 5.5 };

// ── walls ───────────────────────────────────────────────────────────────────
export const walls = [];
function add(f, x0, z0, x1, z1, t, style, o = {}) {
  const r = { x0: Math.min(x0, x1) - (x0 === x1 ? t / 2 : 0), x1: Math.max(x0, x1) + (x0 === x1 ? t / 2 : 0), z0: Math.min(z0, z1) - (z0 === z1 ? t / 2 : 0), z1: Math.max(z0, z1) + (z0 === z1 ? t / 2 : 0) };
  walls.push({ f, ...r, t, style, y0: 0, h: f === 1 ? 3.6 : BLD.CEIL0, collide: true, ...o });
}
function hWall(f, z, xa, xb, gaps, t, style, o = {}) {
  let cur = xa;
  for (const [g0, g1] of gaps) {
    if (g0 > cur) add(f, cur, z, g0, z, t, style, o);
    add(f, g0, z, g1, z, t, style, { ...o, y0: o.hdr ?? 2.3, h: (o.h ?? (f === 1 ? 3.6 : BLD.CEIL0)) - (o.hdr ?? 2.3), collide: false });
    cur = g1;
  }
  if (xb > cur) add(f, cur, z, xb, z, t, style, o);
}
function vWall(f, x, za, zb, gaps, t, style, o = {}) {
  let cur = za;
  for (const [g0, g1] of gaps) {
    if (g0 > cur) add(f, x, cur, x, g0, t, style, o);
    add(f, x, g0, x, g1, t, style, { ...o, y0: o.hdr ?? 2.3, h: (o.h ?? (f === 1 ? 3.6 : BLD.CEIL0)) - (o.hdr ?? 2.3), collide: false });
    cur = g1;
  }
  if (zb > cur) add(f, x, cur, x, zb, t, style, o);
}

// outer shell (both floors, full height)
hWall(-1, 8, -12, 12, [[ENTRANCE.x0, ENTRANCE.x1]], 0.3, 'damask', { h: BLD.H, hdr: 2.6 });
hWall(-1, -8, -12, 12, [], 0.3, 'damask', { h: BLD.H });
vWall(-1, -12, -8, 8, [], 0.3, 'damask', { h: BLD.H });
vWall(-1, 12, -8, 8, [], 0.3, 'damask', { h: BLD.H });
// ground: coat check (front-left) and restrooms (front-right)
hWall(0, 4, -12, -7.5, [], 0.15, 'damask');
vWall(0, -7.5, 4, 8, [[4.6, 7.2]], 0.15, 'damask');
hWall(0, 4, 7.5, 12, [], 0.15, 'marble');
hWall(0, 6, 7.5, 12, [], 0.12, 'marble');
vWall(0, 7.5, 4, 8, [[4.6, 5.6], [6.6, 7.6]], 0.15, 'marble');
// ground: private staircase enclosure (secret door gap); both floors, it also guards the stairs
vWall(-1, DOOR.x, -8, 0, [[DOOR.z0, DOOR.z1]], 0.2, 'panel', { h: BLD.H, hdr: 2.4 });

// upper floor: left wing (cigar room + dining), central VIP lounge with its terrace, right wing (office + corridor)
hWall(1, 0, -10.2, -5.5, [], 0.2, 'panel');                       // cigar room front (the secret stairs arrive in its corner)
vWall(1, -5.5, 0, 8, [[1.4, 2.6], [5.6, 6.8]], 0.2, 'green');     // left wing | lounge (two doorways)
hWall(1, 4.2, -12, -5.5, [], 0.15, 'green');                      // cigar room | dining room
vWall(1, 6, 0, 5.5, [], 0.15, 'panel');                           // lounge | office
hWall(1, 0, 6, 12, [[10, 11]], 0.2, 'roundwin');                  // office front wall: round window + door to the private terrace
hWall(1, 5.5, 6, 12, [[8, 9]], 0.15, 'green');                    // office | corridor

// ── extra colliders (non-wall fixtures) ─────────────────────────────────────
export const fixtureCols = [[], []];
const R = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
fixtureCols[0].push(
  R(9.9, 10.7, -3.6, 3.9),        // bar counter
  R(11.3, 11.85, -5.6, 3.9),      // back bar
  R(-7.85, -7.3, 4.6, 7.2),       // coat counter
  R(2.5, 3.5, 6.1, 6.7),          // host stand
  R(-6.85, -4.55, -7.0, -5.4),    // grand piano
  R(2.9, 4.8, -7.2, -5.4),        // drums
  R(-2.0, -1.3, -6.4, -5.7),      // upright bass
  R(11.3, 11.85, 4.3, 7.8),       // restroom sinks / stalls
);
fixtureCols[1].push(
  R(RAIL.x0, RAIL.x1, RAIL.z - 0.1, RAIL.z + 0.1), R(RAIL.x0 - 0.1, RAIL.x0 + 0.05, RAIL.z - 0.1, 0.12), R(RAIL.x1 - 0.05, RAIL.x1 + 0.1, RAIL.z - 0.1, 0.12),   // central terrace rails
  R(TERRACE2.x0, TERRACE2.x1, TERRACE2.z0 - 0.1, TERRACE2.z0 + 0.1), R(TERRACE2.x0 - 0.1, TERRACE2.x0 + 0.05, TERRACE2.z0 - 0.1, 0.12), R(TERRACE2.x1 - 0.05, TERRACE2.x1 + 0.1, TERRACE2.z0 - 0.1, 0.12),
  R(6.9, 9.1, 1.4, 2.35),          // desk
  R(11.0, 11.9, 4.3, 5.4),         // safe
  R(11.4, 11.9, 1.4, 2.8),         // record console
  R(6.5, 7.4, 4.3, 5.0),           // bar cart
);
// outside: neighbouring buildings, street boundaries, parked cars
fixtureCols[0].push(R(12.3, 70, -60, 8.3), R(-70, -12.3, -60, 8.3), R(34, 70, 8.3, 60), R(-70, -34, 8.3, 60), R(-70, 70, 32, 60), R(-19.3, -14.7, 14.0, 16.0), R(15.7, 20.3, 14.0, 16.0));

// Zones where furniture may NOT be placed (besides walls).
export const blockZones = [[], []];
blockZones[0].push(
  R(-7.5, 7.5, -8, -4.5), R(9.8, 11.9, -5.7, 4), R(-12, -7.4, 3.9, 8), R(7.4, 12, 3.9, 8),
  R(-12, -10.1, -8, 0.2), R(2.3, 3.7, 5.9, 6.9), R(-1.5, 1.5, 6.2, 8), R(-0.4, 0.4, -4.5, 6.2), // entrance + central aisle
);
blockZones[1].push(R(6, 12, 0, 5.5), R(-12, -10.1, 0, 2.4), R(RAIL.x0, RAIL.x1, 0, 0.6), R(-5.9, -5.1, 1.2, 2.8), R(-5.9, -5.1, 5.4, 7.0), R(5.6, 6.4, 5.4, 7.6));

export const wallRects = f => walls.filter(w => w.collide && (w.f === f || w.f === -1));

/** All static collision rects for a floor (walls + fixtures). */
export function staticRects(f) { return [...wallRects(f), ...fixtureCols[f]]; }

/** Floor height at x,z for something that is currently on floor `fl`. */
export function groundY(x, z, fl) {
  const S = STAIRS;
  if (x > S.x0 - 0.05 && x < S.x1 + 0.05 && z > S.zb && z <= S.zt) return Math.min(1, (z - S.zb) / (S.zt - S.zb)) * S.h;
  if (fl === 1) return BLD.F1;
  if (x > STAGE.x0 && x < STAGE.x1 && z < STAGE.z1) return STAGE.h;
  return 0;
}

export const ceilingY = (f, z) => (f === 1 ? BLD.H : z > 0 ? BLD.CEIL0 : BLD.H);

export function rectsOverlap(a, b, pad = 0) {
  return a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.z0 < b.z1 + pad && a.z1 > b.z0 - pad;
}
