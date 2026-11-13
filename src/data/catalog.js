// ─────────────────────────────────────────────────────────────────────────────
// DATA: everything you may want to extend lives here.
//  • MATERIALS  – add a row to get a new fabric / leather / wood / metal / stone
//  • FURNITURE  – add an entry with declarative "parts" to get a new item
// See README.md ("Adding furniture / materials") for a walkthrough.
// ─────────────────────────────────────────────────────────────────────────────

export const MAT_TYPES = ['fabric', 'leather', 'wood', 'metal', 'stone'];

// tex: name of a procedural texture (see textures.js). color tints the (grey) texture.
export const MATERIALS = [
  // fabric (velvet & carpet)
  { id: 'velvet_burgundy', type: 'fabric', label: 'Burgundy velvet', color: '#9a2040', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'velvet_emerald',  type: 'fabric', label: 'Emerald velvet',  color: '#1f7a5c', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'velvet_navy',     type: 'fabric', label: 'Midnight velvet', color: '#2a3f86', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'velvet_plum',     type: 'fabric', label: 'Plum velvet',     color: '#7a2c7c', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'velvet_mustard',  type: 'fabric', label: 'Mustard velvet',  color: '#c79a2c', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'velvet_charcoal', type: 'fabric', label: 'Charcoal velvet', color: '#55555e', rough: 0.9, metal: 0, tex: 'velvet' },
  { id: 'carpet_deco',     type: 'fabric', label: 'Art deco carpet', color: '#ffffff', rough: 1, metal: 0, tex: 'carpet' },
  // leather
  { id: 'leather_cognac',  type: 'leather', label: 'Cognac',  color: '#b0612e', rough: 0.55, metal: 0, tex: 'leather' },
  { id: 'leather_black',   type: 'leather', label: 'Black',   color: '#3a3a3e', rough: 0.5,  metal: 0, tex: 'leather' },
  { id: 'leather_oxblood', type: 'leather', label: 'Oxblood', color: '#8a2030', rough: 0.55, metal: 0, tex: 'leather' },
  { id: 'leather_tan',     type: 'leather', label: 'Tan',     color: '#d09a60', rough: 0.6,  metal: 0, tex: 'leather' },
  { id: 'leather_forest',  type: 'leather', label: 'Forest',  color: '#3c7054', rough: 0.55, metal: 0, tex: 'leather' },
  // wood
  { id: 'walnut',   type: 'wood', label: 'Dark walnut', color: '#a4683a', rough: 0.45, metal: 0, tex: 'wood' },
  { id: 'mahogany', type: 'wood', label: 'Mahogany',    color: '#9a3a22', rough: 0.4,  metal: 0, tex: 'wood' },
  { id: 'oak',      type: 'wood', label: 'Honey oak',   color: '#d8a868', rough: 0.5,  metal: 0, tex: 'wood' },
  { id: 'ebony',    type: 'wood', label: 'Ebony',       color: '#3a2e28', rough: 0.35, metal: 0, tex: 'wood' },
  { id: 'cherry',   type: 'wood', label: 'Cherry',      color: '#b25a3a', rough: 0.42, metal: 0, tex: 'wood' },
  // metal
  { id: 'brass',    type: 'metal', label: 'Brass',      color: '#d9ad4e', rough: 0.28, metal: 1 },
  { id: 'gold',     type: 'metal', label: 'Gold',       color: '#f0c85a', rough: 0.2,  metal: 1 },
  { id: 'chrome',   type: 'metal', label: 'Chrome',     color: '#d4d8dc', rough: 0.12, metal: 1 },
  { id: 'iron',     type: 'metal', label: 'Black iron', color: '#2a2a2e', rough: 0.45, metal: 0.8 },
  { id: 'copper',   type: 'metal', label: 'Copper',     color: '#c47a4c', rough: 0.3,  metal: 1 },
  { id: 'enamel_red',  type: 'metal', label: 'Red enamel',  color: '#c0222c', rough: 0.3, metal: 0.4 },
  { id: 'enamel_teal', type: 'metal', label: 'Teal enamel', color: '#26909a', rough: 0.3, metal: 0.4 },
  { id: 'enamel_cream', type: 'metal', label: 'Cream enamel', color: '#e8dcb8', rough: 0.35, metal: 0.3 },
  // stone
  { id: 'marble_black', type: 'stone', label: 'Black marble, gold veins', color: '#ffffff', rough: 0.12, metal: 0.1, tex: 'marbleBlack' },
  { id: 'marble_white', type: 'stone', label: 'Carrara marble',           color: '#ffffff', rough: 0.15, metal: 0.05, tex: 'marbleWhite' },
];

// ── tiny helpers to describe parts. y is the BOTTOM of the part; x/z are centres. ──
// slot: name of an editable slot (see item.slots) or '@name' for a fixed special material.
const B = (slot, w, h, d, x = 0, y = 0, z = 0, ry = 0) => ({ s: 'box', slot, size: [w, h, d], p: [x, y + h / 2, z], ry });
const C = (slot, rt, rb, h, x = 0, y = 0, z = 0, seg = 14) => ({ s: 'cyl', slot, size: [rt, rb, h, seg], p: [x, y + h / 2, z] });
const S = (slot, r, x, y, z, sc = [1, 1, 1]) => ({ s: 'sph', slot, size: [r], p: [x, y, z], sc });
const rot = (parts, x, z, yaw) => parts.map(p => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { ...p, p: [p.p[0] * c + p.p[2] * s + x, p.p[1], -p.p[0] * s + p.p[2] * c + z], ry: (p.ry || 0) + yaw };
});
const chair = (x, z, yaw, seat = 'seat', frame = 'frame') => rot([
  B(seat, 0.46, 0.08, 0.46, 0, 0.38, 0), B(seat, 0.44, 0.52, 0.07, 0, 0.46, -0.2),
  C(frame, 0.025, 0.02, 0.38, -0.2, 0, -0.2), C(frame, 0.025, 0.02, 0.38, 0.2, 0, -0.2),
  C(frame, 0.025, 0.02, 0.38, -0.2, 0, 0.2), C(frame, 0.025, 0.02, 0.38, 0.2, 0, 0.2),
], x, z, yaw);
const bottles = (n, x0, dx, y, z) => Array.from({ length: n }, (_, i) =>
  [C(i % 3 ? '@bottle_amber' : '@bottle_green', 0.035, 0.035, 0.2, x0 + i * dx, y, z), C('@bottle_amber', 0.014, 0.014, 0.08, x0 + i * dx, y + 0.2, z)]).flat();
const seat = (x, z, f, ax, az, h = 0.46) => ({ p: [x, z], f, a: [ax, az], h });

// Furniture catalogue. fp = footprint [w,d] (rot 0). seats are optional.
// slots: { slotName: materialType } – defaults: { slotName: materialId }
export const FURNITURE = {
  booth4: {
    name: 'Velvet booth', cat: 'Seating', price: 1450, fp: [2.0, 2.0],
    slots: { seat: 'fabric', frame: 'wood', trim: 'metal', table: 'wood' },
    defaults: { seat: 'velvet_burgundy', frame: 'walnut', trim: 'brass', table: 'walnut' },
    parts: [
      B('frame', 1.9, 0.3, 0.55, 0, 0, -0.62), B('frame', 1.9, 0.3, 0.55, 0, 0, 0.62),
      B('seat', 1.86, 0.14, 0.52, 0, 0.3, -0.62), B('seat', 1.86, 0.14, 0.52, 0, 0.3, 0.62),
      B('seat', 1.9, 0.8, 0.16, 0, 0.3, -0.9), B('seat', 1.9, 0.8, 0.16, 0, 0.3, 0.9),
      B('trim', 1.9, 0.03, 0.18, 0, 1.1, -0.9), B('trim', 1.9, 0.03, 0.18, 0, 1.1, 0.9),
      B('table', 0.95, 0.05, 0.55, 0, 0.72, 0), C('trim', 0.04, 0.06, 0.72, 0, 0, 0), C('trim', 0.2, 0.2, 0.03, 0, 0, 0),
    ],
    seats: [seat(-0.5, -0.62, 0, -1.4, -0.62), seat(0.5, -0.62, 0, 1.4, -0.62), seat(-0.5, 0.62, Math.PI, -1.4, 0.62), seat(0.5, 0.62, Math.PI, 1.4, 0.62)],
  },
  banquette: {
    name: 'Wall banquette', cat: 'Seating', price: 900, fp: [2.4, 0.75],
    slots: { seat: 'fabric', frame: 'wood', trim: 'metal' },
    defaults: { seat: 'velvet_emerald', frame: 'walnut', trim: 'brass' },
    parts: [B('frame', 2.4, 0.3, 0.7, 0, 0, 0), B('seat', 2.3, 0.14, 0.62, 0, 0.3, 0.03), B('seat', 2.4, 0.7, 0.14, 0, 0.3, -0.3), B('trim', 2.4, 0.03, 0.16, 0, 1.0, -0.3)],
    seats: [-0.75, 0, 0.75].map(x => seat(x, 0.05, 0, x, 0.95)),
  },
  club_chair: {
    name: 'Leather club chair', cat: 'Seating', price: 520, fp: [0.95, 0.95],
    slots: { seat: 'leather', frame: 'wood', trim: 'metal' },
    defaults: { seat: 'leather_cognac', frame: 'ebony', trim: 'brass' },
    parts: [B('seat', 0.8, 0.28, 0.8, 0, 0.2, 0), B('seat', 0.8, 0.7, 0.2, 0, 0.2, -0.38), B('seat', 0.16, 0.34, 0.7, -0.4, 0.4, 0), B('seat', 0.16, 0.34, 0.7, 0.4, 0.4, 0),
      C('frame', 0.04, 0.03, 0.2, -0.34, 0, -0.34), C('frame', 0.04, 0.03, 0.2, 0.34, 0, -0.34), C('frame', 0.04, 0.03, 0.2, -0.34, 0, 0.34), C('frame', 0.04, 0.03, 0.2, 0.34, 0, 0.34),
      S('trim', 0.02, -0.4, 0.74, 0.3, [1, 1, 1]), S('trim', 0.02, 0.4, 0.74, 0.3, [1, 1, 1])],
    seats: [seat(0, 0.05, 0, 0, 0.95)],
  },
  sofa: {
    name: 'Chesterfield sofa', cat: 'Seating', price: 1100, fp: [2.1, 0.95],
    slots: { seat: 'leather', frame: 'wood', trim: 'metal' },
    defaults: { seat: 'leather_oxblood', frame: 'ebony', trim: 'brass' },
    parts: [B('seat', 2.0, 0.3, 0.85, 0, 0.15, 0), B('seat', 2.0, 0.75, 0.22, 0, 0.3, -0.34), B('seat', 0.2, 0.55, 0.85, -0.95, 0.3, 0), B('seat', 0.2, 0.55, 0.85, 0.95, 0.3, 0),
      C('frame', 0.04, 0.03, 0.15, -0.9, 0, -0.38), C('frame', 0.04, 0.03, 0.15, 0.9, 0, -0.38), C('frame', 0.04, 0.03, 0.15, -0.9, 0, 0.38), C('frame', 0.04, 0.03, 0.15, 0.9, 0, 0.38)],
    seats: [-0.55, 0.55].map(x => seat(x, 0.05, 0, x, 1.0, 0.48)),
  },
  bar_stool: {
    name: 'Brass bar stool', cat: 'Seating', price: 190, fp: [0.45, 0.45],
    slots: { seat: 'leather', frame: 'metal' }, defaults: { seat: 'leather_oxblood', frame: 'brass' },
    parts: [C('seat', 0.19, 0.19, 0.09, 0, 0.66, 0), C('frame', 0.025, 0.025, 0.66, 0, 0, 0), C('frame', 0.17, 0.17, 0.025, 0, 0, 0), C('frame', 0.15, 0.15, 0.02, 0, 0.22, 0)],
    seats: [seat(0, 0, 0, 0, 0.75, 0.75)],
  },
  dining_chair: {
    name: 'Dining chair', cat: 'Seating', price: 160, fp: [0.55, 0.55],
    slots: { seat: 'fabric', frame: 'wood' }, defaults: { seat: 'velvet_burgundy', frame: 'walnut' },
    parts: chair(0, 0, 0), seats: [seat(0, 0.02, 0, 0, 0.9)],
  },
  round_table_set: {
    name: 'Round table + 4 chairs', cat: 'Tables', price: 780, fp: [1.9, 1.9],
    slots: { table: 'wood', trim: 'metal', seat: 'fabric', frame: 'wood' },
    defaults: { table: 'walnut', trim: 'brass', seat: 'velvet_plum', frame: 'walnut' },
    parts: [C('table', 0.55, 0.55, 0.05, 0, 0.72, 0), C('trim', 0.05, 0.05, 0.72, 0, 0, 0), C('trim', 0.25, 0.25, 0.03, 0, 0, 0),
      ...chair(0, -0.8, 0), ...chair(0, 0.8, Math.PI), ...chair(-0.8, 0, Math.PI / 2), ...chair(0.8, 0, -Math.PI / 2)],
    seats: [seat(0, -0.8, 0, 0, -1.5), seat(0, 0.8, Math.PI, 0, 1.5), seat(-0.8, 0, Math.PI / 2, -1.5, 0), seat(0.8, 0, -Math.PI / 2, 1.5, 0)],
  },
  bistro_set: {
    name: 'Bistro table + 2 chairs', cat: 'Tables', price: 420, fp: [1.3, 1.3],
    slots: { table: 'stone', trim: 'metal', seat: 'fabric', frame: 'metal' },
    defaults: { table: 'marble_white', trim: 'iron', seat: 'velvet_mustard', frame: 'iron' },
    parts: [C('table', 0.32, 0.32, 0.04, 0, 0.7, 0), C('trim', 0.03, 0.03, 0.7, 0, 0, 0), C('trim', 0.18, 0.18, 0.02, 0, 0, 0),
      ...chair(0, -0.5, 0), ...chair(0, 0.5, Math.PI)],
    seats: [seat(0, -0.5, 0, 0, -1.1), seat(0, 0.5, Math.PI, 0, 1.1)],
  },
  cocktail_table: {
    name: 'High cocktail table', cat: 'Tables', price: 240, fp: [0.7, 0.7],
    slots: { table: 'stone', trim: 'metal' }, defaults: { table: 'marble_black', trim: 'brass' },
    parts: [C('table', 0.3, 0.3, 0.04, 0, 1.04, 0), C('trim', 0.03, 0.03, 1.04, 0, 0, 0), C('trim', 0.2, 0.2, 0.03, 0, 0, 0)],
  },
  dining_table6: {
    name: 'Long dining table (6)', cat: 'Tables', price: 1900, fp: [2.8, 1.9],
    slots: { table: 'wood', trim: 'metal', seat: 'leather', frame: 'wood' },
    defaults: { table: 'mahogany', trim: 'brass', seat: 'leather_black', frame: 'mahogany' },
    parts: [B('table', 2.5, 0.07, 1.0, 0, 0.72, 0), B('trim', 2.5, 0.015, 1.02, 0, 0.79, 0), B('table', 0.12, 0.72, 0.8, -1.05, 0, 0), B('table', 0.12, 0.72, 0.8, 1.05, 0, 0),
      ...[-0.8, 0, 0.8].flatMap(x => [...chair(x, -0.78, 0), ...chair(x, 0.78, Math.PI)])],
    seats: [-0.8, 0, 0.8].flatMap(x => [seat(x, -0.78, 0, x, -1.5), seat(x, 0.78, Math.PI, x, 1.5)]),
  },
  coffee_table: {
    name: 'Low coffee table', cat: 'Tables', price: 260, fp: [1.0, 0.6],
    slots: { table: 'stone', trim: 'metal' }, defaults: { table: 'marble_black', trim: 'brass' },
    parts: [B('table', 1.0, 0.04, 0.6, 0, 0.4, 0), B('trim', 0.04, 0.4, 0.04, -0.44, 0, -0.24), B('trim', 0.04, 0.4, 0.04, 0.44, 0, -0.24), B('trim', 0.04, 0.4, 0.04, -0.44, 0, 0.24), B('trim', 0.04, 0.4, 0.04, 0.44, 0, 0.24)],
  },
  side_table: {
    name: 'Round side table', cat: 'Tables', price: 140, fp: [0.6, 0.6],
    slots: { table: 'wood', trim: 'metal' }, defaults: { table: 'walnut', trim: 'brass' },
    parts: [C('table', 0.25, 0.25, 0.04, 0, 0.55, 0), C('trim', 0.025, 0.025, 0.55, 0, 0, 0), C('trim', 0.15, 0.15, 0.02, 0, 0, 0), C('@lampglow', 0.03, 0.03, 0.04, 0.1, 0.59, 0.05)],
  },
  vip_bar: {
    name: 'Mini bar counter', cat: 'Service', price: 3200, fp: [2.6, 1.3],
    slots: { body: 'wood', top: 'stone', trim: 'metal' }, defaults: { body: 'walnut', top: 'marble_black', trim: 'brass' },
    parts: [B('body', 2.6, 1.05, 0.65, 0, 0, 0.3), B('top', 2.7, 0.05, 0.8, 0, 1.05, 0.3), B('trim', 2.6, 0.04, 0.04, 0, 0.18, 0.7), C('trim', 0.025, 0.025, 2.5, 0, 0.2, 0.8),
      B('body', 2.6, 1.0, 0.4, 0, 0, -0.5), B('body', 2.4, 0.04, 0.3, 0, 1.3, -0.5), B('body', 2.4, 0.04, 0.3, 0, 1.65, -0.5), B('@mirror', 2.4, 1.3, 0.03, 0, 1.0, -0.69),
      ...bottles(7, -1.0, 0.33, 1.34, -0.5), ...bottles(7, -1.0, 0.33, 1.69, -0.5)],
  },
  humidor: {
    name: 'Cigar humidor cabinet', cat: 'Service', price: 1500, fp: [0.95, 0.6],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'cherry', trim: 'brass' },
    parts: [B('body', 0.9, 1.4, 0.5, 0, 0, 0), B('@glass', 0.7, 0.9, 0.02, 0, 0.3, 0.26), B('trim', 0.74, 0.04, 0.04, 0, 1.22, 0.27), B('trim', 0.74, 0.04, 0.04, 0, 0.28, 0.27), B('trim', 0.03, 0.12, 0.03, 0.32, 0.7, 0.29),
      B('@cigar', 0.62, 0.05, 0.3, 0, 0.5, 0.05), B('@cigar', 0.62, 0.05, 0.3, 0, 0.8, 0.05)],
  },
  bottle_wall: {
    name: 'Rare-bottle wall', cat: 'Service', price: 2800, fp: [3.0, 0.45],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'ebony', trim: 'brass' },
    parts: [B('body', 3.0, 2.6, 0.1, 0, 0, -0.17), ...[0.5, 1.0, 1.5, 2.0].flatMap(y => [B('trim', 2.9, 0.03, 0.28, 0, y, 0), ...bottles(11, -1.35, 0.27, y + 0.03, 0)])],
  },
  drinks_trolley: {
    name: 'Brass drinks trolley', cat: 'Service', price: 480, fp: [0.95, 0.6],
    slots: { trim: 'metal', top: 'wood' }, defaults: { trim: 'brass', top: 'walnut' },
    parts: [B('top', 0.9, 0.03, 0.5, 0, 0.35, 0), B('top', 0.9, 0.03, 0.5, 0, 0.8, 0), C('trim', 0.015, 0.015, 0.85, -0.42, 0, -0.22), C('trim', 0.015, 0.015, 0.85, 0.42, 0, -0.22), C('trim', 0.015, 0.015, 0.85, -0.42, 0, 0.22), C('trim', 0.015, 0.015, 0.85, 0.42, 0, 0.22), ...bottles(4, -0.3, 0.18, 0.83, 0), ...bottles(3, -0.2, 0.22, 0.38, 0)],
  },
  bookcase: {
    name: 'Library bookcase', cat: 'Decor', price: 700, fp: [1.7, 0.45],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'walnut', trim: 'brass' },
    parts: [B('body', 1.7, 2.2, 0.08, 0, 0, -0.18), B('body', 0.06, 2.2, 0.4, -0.82, 0, 0), B('body', 0.06, 2.2, 0.4, 0.82, 0, 0), ...[0, 0.55, 1.1, 1.65, 2.14].map(y => B('body', 1.7, 0.04, 0.4, 0, y, 0)),
      ...[0.04, 0.59, 1.14, 1.69].flatMap(y => Array.from({ length: 12 }, (_, i) => B(['@book_a', '@book_b', '@book_c'][i % 3], 0.07, 0.34 + (i % 4) * 0.04, 0.24, -0.72 + i * 0.125, y, 0)))],
  },
  plant_palm: {
    name: 'Potted palm', cat: 'Decor', price: 180, fp: [0.9, 0.9],
    slots: { pot: 'metal' }, defaults: { pot: 'brass' },
    parts: [C('pot', 0.3, 0.22, 0.45, 0, 0, 0), C('@trunk', 0.04, 0.05, 1.1, 0, 0.4, 0), ...[0, 1, 2, 3, 4, 5].map(i => ({ s: 'box', slot: '@leaf', size: [0.1, 0.02, 0.9], p: [Math.sin(i * 1.05) * 0.38, 1.6 - (i % 2) * 0.15, Math.cos(i * 1.05) * 0.38], ry: i * 1.05, rx: 0.5 }))],
  },
  plant_fern: {
    name: 'Boston fern', cat: 'Decor', price: 90, fp: [0.7, 0.7],
    slots: { pot: 'metal' }, defaults: { pot: 'copper' },
    parts: [C('pot', 0.2, 0.15, 0.35, 0, 0, 0), S('@leaf', 0.34, 0, 0.62, 0, [1, 0.7, 1]), S('@leaf', 0.24, 0.1, 0.85, 0.05, [1, 0.8, 1])],
  },
  floor_lamp: {
    name: 'Brass floor lamp', cat: 'Decor', price: 220, fp: [0.5, 0.5],
    slots: { trim: 'metal' }, defaults: { trim: 'brass' },
    parts: [C('trim', 0.14, 0.16, 0.03, 0, 0, 0), C('trim', 0.015, 0.015, 1.5, 0, 0, 0), C('@lampshade', 0.17, 0.24, 0.3, 0, 1.42, 0, 12)],
  },
  sconce: {
    name: 'Wall sconce', cat: 'Decor', price: 120, fp: [0.3, 0.2], wall: 1.8,
    slots: { trim: 'metal' }, defaults: { trim: 'brass' },
    parts: [B('trim', 0.12, 0.2, 0.03, 0, 0, -0.08), B('trim', 0.03, 0.03, 0.12, 0, 0.08, -0.02), C('@lampshade', 0.05, 0.08, 0.16, 0, 0.1, 0.03, 10)],
  },
  painting: {
    name: 'Gilded painting', cat: 'Decor', price: 340, fp: [1.4, 0.14], wall: 1.2,
    slots: { frame: 'metal' }, defaults: { frame: 'gold' },
    parts: [B('frame', 1.4, 1.1, 0.06, 0, 0, 0), B('@painting', 1.22, 0.92, 0.02, 0, 0.09, 0.03)],
  },
  neon_sign: {
    name: 'Neon "JAZZ" sign', cat: 'Decor', price: 380, fp: [1.4, 0.12], wall: 1.9,
    slots: {}, defaults: {},
    parts: [B('@black', 1.4, 0.55, 0.03, 0, 0, 0), B('@neon_pink', 1.3, 0.45, 0.01, 0, 0.05, 0.02)],
  },
  velvet_curtain: {
    name: 'Velvet drape', cat: 'Decor', price: 260, fp: [1.8, 0.3], wall: 0,
    slots: { drape: 'fabric', trim: 'metal' }, defaults: { drape: 'velvet_burgundy', trim: 'gold' },
    parts: [{ s: 'cyl', slot: 'trim', size: [0.02, 0.02, 1.9, 8], p: [0, 3.0, 0], rz: Math.PI / 2 },
      ...Array.from({ length: 9 }, (_, i) => B('drape', 0.2, 2.9, i % 2 ? 0.1 : 0.2, -0.8 + i * 0.2, 0.1, 0))],
  },
  rug: {
    name: 'Art deco rug', cat: 'Decor', price: 450, fp: [3.2, 2.2], walk: true,
    slots: { cloth: 'fabric' }, defaults: { cloth: 'carpet_deco' },
    parts: [B('cloth', 3.2, 0.02, 2.2, 0, 0, 0)],
  },
  jukebox: {
    name: 'Neon jukebox', cat: 'Decor', price: 2200, fp: [0.95, 0.65],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'mahogany', trim: 'chrome' },
    parts: [B('body', 0.9, 1.0, 0.55, 0, 0, 0), { s: 'cyl', slot: 'body', size: [0.45, 0.45, 0.55, 20], p: [0, 1.0, 0], rx: Math.PI / 2 },
      B('@neon_amber', 0.7, 0.7, 0.02, 0, 0.55, 0.285), B('trim', 0.8, 0.04, 0.04, 0, 0.5, 0.29), B('@black', 0.6, 0.35, 0.02, 0, 0.1, 0.285)],
  },
  chandelier: {
    name: 'Crystal chandelier', cat: 'Decor', price: 1600, fp: [1.3, 1.3], hang: true, walk: true,
    slots: { trim: 'metal' }, defaults: { trim: 'brass' },
    parts: [C('trim', 0.012, 0.012, 1, 0, 0.2, 0, 6), C('trim', 0.05, 0.05, 0.3, 0, -0.1, 0), { s: 'cyl', slot: 'trim', size: [0.5, 0.5, 0.03, 20], p: [0, -0.05, 0] },
      ...Array.from({ length: 8 }, (_, i) => S('@lampglow', 0.055, Math.sin(i * 0.785) * 0.5, 0.0, Math.cos(i * 0.785) * 0.5)),
      ...Array.from({ length: 8 }, (_, i) => ({ s: 'cyl', slot: 'trim', size: [0.01, 0.01, 0.4, 5], p: [Math.sin(i * 0.785) * 0.25, -0.0, Math.cos(i * 0.785) * 0.25], rz: 1.2, ry: i * 0.785 })),
      C('@glass', 0.02, 0.1, 0.35, 0, -0.5, 0, 8)],
  },
};

// ── Default starter layout (floor 0 = ground, 1 = upper). rot = quarter turns. ──
export const DEFAULT_LAYOUT = [
  // booths against the left wall + lounge tables
  { k: 'booth4', f: 0, x: -10.75, z: 2.0, r: 1 },
  { k: 'banquette', f: 0, x: -3.5, z: 7.4, r: 2 },
  { k: 'bistro_set', f: 0, x: -8.4, z: -1.0 }, { k: 'bistro_set', f: 0, x: -8.4, z: 2.2 },
  { k: 'round_table_set', f: 0, x: -5.0, z: 0.0 }, { k: 'round_table_set', f: 0, x: -1.5, z: 1.8 }, { k: 'round_table_set', f: 0, x: 1.7, z: -0.5 }, { k: 'round_table_set', f: 0, x: 5.2, z: 1.2 },
  { k: 'bistro_set', f: 0, x: 6.8, z: -2.8 }, { k: 'bistro_set', f: 0, x: -3.0, z: -2.6 },
  { k: 'cocktail_table', f: 0, x: 3.2, z: 3.2 },
  // bar stools along the counter
  ...[-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0].map(z => ({ k: 'bar_stool', f: 0, x: 9.35, z, r: 1 })),
  // decor
  { k: 'plant_palm', f: 0, x: -4.6, z: 7.2 }, { k: 'plant_palm', f: 0, x: 4.8, z: 7.2 }, { k: 'plant_fern', f: 0, x: 7.0, z: 3.4 },
  { k: 'floor_lamp', f: 0, x: -7.0, z: 3.4 }, { k: 'floor_lamp', f: 0, x: 7.0, z: -4.0 },
  { k: 'painting', f: 0, x: 0, z: -7.7 - 0.0, r: 0, hidden: true },
  { k: 'painting', f: 0, x: -2.2, z: 7.73, r: 2 }, { k: 'painting', f: 0, x: 2.2, z: 7.73, r: 2 },
  { k: 'jukebox', f: 0, x: -6.7, z: 7.45, r: 2 },
  { k: 'chandelier', f: 0, x: -1.5, z: 1.8 }, { k: 'chandelier', f: 0, x: 4.0, z: 1.0 }, { k: 'chandelier', f: 0, x: -5.0, z: 0.0 },
  { k: 'rug', f: 0, x: -5.0, z: 0.0 },
  // upper floor: central VIP lounge (its terrace is in the middle of the room), cigar room, private dining
  { k: 'sofa', f: 1, x: 0.3, z: 7.3, r: 2 }, { k: 'sofa', f: 1, x: -4.85, z: 4.3, r: 1 },
  { k: 'coffee_table', f: 1, x: 0.3, z: 5.0 }, { k: 'club_chair', f: 1, x: -1.9, z: 4.6, r: 1 }, { k: 'club_chair', f: 1, x: 2.5, z: 4.6, r: 3 },
  { k: 'club_chair', f: 1, x: -2.6, z: 1.6, r: 2 }, { k: 'club_chair', f: 1, x: 3.2, z: 1.6, r: 2 },
  { k: 'vip_bar', f: 1, x: 5.15, z: 2.9, r: 3 },
  { k: 'bar_stool', f: 1, x: 4.1, z: 2.0, r: 1 }, { k: 'bar_stool', f: 1, x: 4.1, z: 2.9, r: 1 }, { k: 'bar_stool', f: 1, x: 4.1, z: 3.8, r: 1 },
  { k: 'plant_palm', f: 1, x: -4.8, z: 7.2 }, { k: 'floor_lamp', f: 1, x: -4.8, z: 1.0 }, { k: 'floor_lamp', f: 1, x: 5.0, z: 7.3 },
  { k: 'chandelier', f: 1, x: 0.3, z: 5.0 }, { k: 'rug', f: 1, x: 0.3, z: 5.0 },
  // cigar & whisky room (the secret stairs arrive here)
  { k: 'club_chair', f: 1, x: -9.0, z: 2.8, r: 1 }, { k: 'club_chair', f: 1, x: -7.6, z: 1.35, r: 0 }, { k: 'club_chair', f: 1, x: -6.6, z: 2.0, r: 3 },
  { k: 'side_table', f: 1, x: -7.6, z: 2.8 }, { k: 'humidor', f: 1, x: -5.95, z: 3.6, r: 3 }, { k: 'bottle_wall', f: 1, x: -8.3, z: 0.4 },
  // private dining room
  { k: 'dining_table6', f: 1, x: -8.8, z: 6.1 }, { k: 'sconce', f: 1, x: -11.7, z: 6.1, r: 1 }, { k: 'painting', f: 1, x: -8.8, z: 4.35, r: 0 },
  { k: 'arcade', f: 0, x: 7.0, z: -0.2, r: 3 }, { k: 'pinball', f: 0, x: 7.0, z: 1.7, r: 3 },
].filter(i => !i.hidden);

// ── Staff ───────────────────────────────────────────────────────────────────
export const STAFF_ROLES = {
  bartender: { name: 'Bartender',     wage: 140, max: 3, blurb: 'Pours drinks. Each handles ~14 guests; with none, service crawls.' },
  waiter:    { name: 'Waiter',        wage: 100, max: 4, blurb: 'Serves tables. Each handles ~10 guests.' },
  doorman:   { name: 'Host / doorman',       wage: 110, max: 1, blurb: 'Greets guests at the host stand: +8% walk-ins, a better first impression.' },
  security:  { name: 'Security',      wage: 150, max: 2, blurb: 'REQUIRED to invite anyone up to the VIP floor.' },
  coat:      { name: 'Coat check',    wage: 80,  max: 1, blurb: 'Small boost to comfort.' },
  cleaner:   { name: 'Cleaner',       wage: 70,  max: 2, blurb: 'Keeps the room spotless (hygiene boosts satisfaction).' },
  pianist:   { name: 'House pianist', wage: 260, max: 1, blurb: 'Plays when no booked act has a pianist. Draws a few extra guests.' },
};

// ── Acts (all fictional) ────────────────────────────────────────────────────
export const ACTS = [
  { id: 'bluemoon',  name: 'Blue Moon Duo',           style: 'Piano & upright bass',        fee: 700,  pop: 35, lead: 'none',  members: ['piano', 'bass'] },
  { id: 'smoke',     name: 'Silas "Smoke" Whitaker',  style: 'Tenor sax solo',              fee: 900,  pop: 42, lead: 'sax',   members: ['sax'] },
  { id: 'cornelius', name: 'Cornelius Vale Trio',     style: 'Classic piano trio',          fee: 1100, pop: 48, lead: 'none',  members: ['piano', 'bass', 'drums'] },
  { id: 'ruby',      name: 'Ruby Delacroix',          style: 'Torch-song chanteuse',        fee: 1400, pop: 55, lead: 'vocal', members: ['vocal', 'piano'] },
  { id: 'odette',    name: 'Odette Marchand Quartet', style: 'Smoky vocalist & trio',       fee: 1800, pop: 60, lead: 'vocal', members: ['vocal', 'piano', 'bass', 'drums'] },
  { id: 'quartet',   name: 'The Midnight Quartet',    style: 'Hard-bop quartet with sax',   fee: 2200, pop: 68, lead: 'sax',   members: ['sax', 'piano', 'bass', 'drums'] },
  { id: 'nina',      name: 'Nina Solveig & Co.',      style: 'Nordic-jazz vocalist',        fee: 2600, pop: 72, lead: 'vocal', members: ['vocal', 'piano', 'bass', 'drums'] },
  { id: 'lenox',     name: 'Lenox Avenue Big Five',   style: 'Swing band with trumpet',     fee: 3200, pop: 78, lead: 'sax',   members: ['trumpet', 'sax', 'piano', 'bass', 'drums'] },
  { id: 'delmar',    name: 'Marcus "Midnight" Delmar', style: 'Legendary headliner',        fee: 5200, pop: 92, lead: 'sax',   members: ['trumpet', 'piano', 'bass', 'drums'] },
];

// ── Advertising ─────────────────────────────────────────────────────────────
export const ADS = [
  { id: 'flyers',    name: 'Street flyers',     cost: 120,  boost: 8,  days: 5 },
  { id: 'social',    name: 'Social media push', cost: 300,  boost: 14, days: 7 },
  { id: 'newspaper', name: 'Newspaper ad',      cost: 650,  boost: 22, days: 7 },
  { id: 'radio',     name: 'Radio spots',       cost: 1100, boost: 32, days: 10 },
  { id: 'billboard', name: 'City billboard',    cost: 2400, boost: 48, days: 14 },
];

// ── Menu ────────────────────────────────────────────────────────────────────
export const MENU = [
  { id: 'oldfash', name: 'Old Fashioned',       type: 'cocktail', price: 14, cost: 3.2, pop: 1.2 },
  { id: 'negroni', name: 'Negroni',             type: 'cocktail', price: 13, cost: 2.9, pop: 1.0 },
  { id: 'martini', name: 'Dry Martini',         type: 'cocktail', price: 14, cost: 3.0, pop: 1.0 },
  { id: 'manhattan', name: 'Manhattan',         type: 'cocktail', price: 15, cost: 3.4, pop: 0.9 },
  { id: 'velvet',  name: 'The Velvet Note',     type: 'cocktail', price: 16, cost: 3.8, pop: 1.1 },
  { id: 'whisky',  name: 'Single malt, neat',   type: 'drink', price: 16, cost: 4.5, pop: 0.8 },
  { id: 'wine',    name: 'Glass of red wine',   type: 'drink', price: 9,  cost: 2.6, pop: 1.2 },
  { id: 'champ',   name: 'Champagne flute',     type: 'drink', price: 15, cost: 5.0, pop: 0.7 },
  { id: 'beer',    name: 'Draft beer',          type: 'drink', price: 7,  cost: 1.6, pop: 1.0 },
  { id: 'water',   name: 'Sparkling water',     type: 'drink', price: 4,  cost: 0.5, pop: 0.6 },
  { id: 'cheese',  name: 'Cheese plate',        type: 'bite', price: 14, cost: 4.8, pop: 1.0 },
  { id: 'olives',  name: 'Olives & nuts',       type: 'bite', price: 7,  cost: 1.5, pop: 1.2 },
  { id: 'oysters', name: 'Oysters (6)',         type: 'bite', price: 24, cost: 9.5, pop: 0.5 },
  { id: 'charc',   name: 'Charcuterie board',   type: 'bite', price: 16, cost: 5.5, pop: 0.8 },
  { id: 'fries',   name: 'Truffle fries',       type: 'bite', price: 9,  cost: 2.2, pop: 1.0 },
];

// ── Special VIP guests (fictional) ──────────────────────────────────────────
export const GUESTS = [
  { id: 'colette',  name: 'Madame Colette Duval',   title: 'Jazz critic',            spend: 380, rep: 2.5 },
  { id: 'alistair', name: 'Sir Alistair Penhallow', title: 'Whisky collector',       spend: 720, rep: 1.5 },
  { id: 'imogen',   name: 'Dr. Imogen Hartley',     title: 'Theatre patron',         spend: 420, rep: 1.5 },
  { id: 'lorenzo',  name: 'Count Lorenzo Baldi',    title: 'Wine importer',          spend: 650, rep: 1.5 },
  { id: 'rosalind', name: 'Rosalind Ashby',         title: 'Society columnist',      spend: 300, rep: 3.0 },
  { id: 'theo',     name: 'Theo Marchetti',         title: 'Record producer',        spend: 560, rep: 2.0 },
  { id: 'vivienne', name: 'Vivienne Okafor',        title: 'Gallery owner',          spend: 480, rep: 2.0 },
  { id: 'hal',      name: 'Harold "Hal" Brennan',   title: 'Retired bandleader',     spend: 260, rep: 2.5 },
  { id: 'isabelle', name: 'Isabelle Fontaine',      title: 'Film actress',           spend: 600, rep: 3.0 },
  { id: 'bartholomew', name: 'Bartholomew Crane',   title: 'Banker & cigar buff',    spend: 900, rep: 1.0 },
];

export const CONFIG = {
  startCash: 60000, rentPerDay: 260, utilitiesPerNight: 60, depreciationYears: 15,
  nightMinutes: 360, startRep: 25, refundRate: 0.5, maxVisualGuests: 48,
};

// ── Swappable room surfaces (Design ▸ Walls & floors). ids map to materials in materials.js (ARCH) ──
export const SURFACE_LABELS = { parquet: 'Herringbone parquet', planks: 'Wide oak planks', checker: 'Black & white marble check', checkerGreen: 'Green & cream marble check', marbleBlack: 'Black marble, gold veins', marbleWhite: 'Carrara marble', carpet: 'Art deco carpet',
  damask: 'Burgundy damask', damaskNavy: 'Midnight damask', damaskGreen: 'Emerald damask', stripes: 'Burgundy stripes & gold', panel: 'Walnut panelling', brick: 'Dark brick', tin: 'Pressed tin', plaster: 'Dark plaster' };
const FLOORS = ['parquet', 'planks', 'checker', 'checkerGreen', 'marbleBlack', 'marbleWhite', 'carpet'], WALLS = ['damask', 'damaskNavy', 'damaskGreen', 'stripes', 'panel', 'brick', 'marbleWhite'];
export const SURFACES = {
  floorMain: { label: 'Main hall floor', def: 'parquet', options: FLOORS }, floorFoyer: { label: 'Foyer floor', def: 'checker', options: FLOORS },
  floorVip: { label: 'VIP floors', def: 'carpet', options: FLOORS }, wallsMain: { label: 'Main walls', def: 'damask', options: WALLS },
  wallsVip: { label: 'VIP walls', def: 'damaskGreen', options: WALLS }, ceiling: { label: 'Ceiling', def: 'tin', options: ['tin', 'panel', 'plaster', 'marbleWhite', 'damask'] },
};

// ── Bar counters & vintage machines ─────────────────────────────────────────
Object.assign(FURNITURE, {
  bar_counter: {
    name: 'Bar counter (3 m)', cat: 'Service', price: 1900, fp: [3.0, 1.0],
    slots: { body: 'wood', top: 'stone', trim: 'metal' }, defaults: { body: 'walnut', top: 'marble_black', trim: 'brass' },
    parts: [B('body', 3.0, 1.05, 0.7, 0, 0, -0.1), B('top', 3.1, 0.06, 0.95, 0, 1.05, 0.02), B('trim', 3.12, 0.02, 0.97, 0, 1.11, 0.02), B('trim', 3.0, 0.03, 0.05, 0, 0.12, 0.28),
      { s: 'cyl', slot: 'trim', size: [0.028, 0.028, 2.9, 10], p: [0, 0.27, 0.42], rz: Math.PI / 2 }, ...[-1.2, 0, 1.2].map(x => C('trim', 0.02, 0.02, 0.27, x, 0, 0.42)), B('body', 2.9, 0.04, 0.4, 0, 0.7, -0.52)],
  },
  back_bar: {
    name: 'Back bar & mirror', cat: 'Service', price: 1700, fp: [3.0, 0.6],
    slots: { body: 'wood', top: 'stone', trim: 'metal' }, defaults: { body: 'walnut', top: 'marble_black', trim: 'brass' },
    parts: [B('body', 3.0, 0.95, 0.5, 0, 0, 0), B('top', 3.05, 0.05, 0.55, 0, 0.95, 0), B('@mirror', 2.9, 1.5, 0.03, 0, 1.2, -0.24), B('trim', 2.95, 0.05, 0.06, 0, 2.7, -0.22), B('trim', 2.95, 0.05, 0.06, 0, 1.17, -0.22),
      ...[1.45, 1.9].flatMap(y => [B('trim', 2.8, 0.025, 0.2, 0, y, -0.12), ...bottles(10, -1.25, 0.28, y + 0.025, -0.12)])],
  },
  arcade: {
    name: 'Arcade cabinet', cat: 'Vintage', price: 1800, fp: [0.9, 0.9],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'ebony', trim: 'chrome' },
    parts: [B('body', 0.72, 1.0, 0.8, 0, 0, 0), B('body', 0.72, 0.85, 0.55, 0, 1.0, -0.12), B('trim', 0.74, 0.07, 0.42, 0, 0.98, 0.3), B('@screen', 0.54, 0.42, 0.02, 0, 1.12, 0.16), B('@marquee', 0.68, 0.2, 0.02, 0, 1.68, 0.16),
      C('@black', 0.015, 0.015, 0.14, -0.14, 1.05, 0.32), S('@book_a', 0.035, -0.14, 1.22, 0.32), ...[0.05, 0.16, 0.27].map(x => C('@lampglow', 0.03, 0.03, 0.02, x, 1.05, 0.34)), B('trim', 0.7, 0.03, 0.03, 0, 0.3, 0.41)],
  },
  pinball: {
    name: 'Pinball machine', cat: 'Vintage', price: 2400, fp: [0.8, 1.5],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'mahogany', trim: 'chrome' },
    parts: [...[[-0.3, -0.65], [0.3, -0.65], [-0.3, 0.65], [0.3, 0.65]].map(([x, z]) => C('trim', 0.03, 0.03, 0.78, x, 0, z)), B('body', 0.7, 0.18, 1.45, 0, 0.78, 0), B('@screen', 0.58, 0.01, 1.2, 0, 0.97, 0.06), B('@glass', 0.62, 0.02, 1.25, 0, 0.99, 0.06),
      B('body', 0.7, 0.75, 0.2, 0, 0.96, -0.68), B('@marquee', 0.6, 0.45, 0.02, 0, 1.15, -0.57), B('trim', 0.72, 0.04, 0.03, 0, 0.96, 0.7), S('trim', 0.03, 0.18, 1.02, 0.4), S('trim', 0.03, -0.1, 1.02, 0.1)],
  },
  slot_machine: {
    name: 'One-armed bandit', cat: 'Vintage', price: 2600, fp: [0.75, 0.7],
    slots: { body: 'metal', trim: 'metal' }, defaults: { body: 'enamel_red', trim: 'gold' },
    parts: [B('body', 0.6, 1.45, 0.5, 0, 0, 0), B('trim', 0.64, 0.06, 0.54, 0, 1.45, 0), B('@marquee', 0.5, 0.2, 0.02, 0, 1.18, 0.26), B('@screen', 0.5, 0.3, 0.02, 0, 0.8, 0.26), B('@black', 0.4, 0.12, 0.02, 0, 0.55, 0.26), B('trim', 0.64, 0.04, 0.2, 0, 0.45, 0.28),
      C('trim', 0.015, 0.015, 0.6, 0.34, 0.6, 0), S('@book_a', 0.055, 0.34, 1.22, 0), B('trim', 0.6, 0.03, 0.03, 0, 0.1, 0.26)],
  },
  soda_machine: {
    name: 'Vintage soda machine', cat: 'Vintage', price: 1400, fp: [0.85, 0.7],
    slots: { body: 'metal', trim: 'metal' }, defaults: { body: 'enamel_red', trim: 'chrome' },
    parts: [B('body', 0.75, 1.7, 0.6, 0, 0, 0), B('@lampglow', 0.55, 0.95, 0.02, -0.05, 0.65, 0.31), B('@glass', 0.57, 0.97, 0.02, -0.05, 0.64, 0.32), ...[0.75, 1.05, 1.35].flatMap(y => Array.from({ length: 4 }, (_, i) => C('@bottle_green', 0.035, 0.035, 0.2, -0.24 + i * 0.13, y, 0.3))),
      B('trim', 0.12, 0.45, 0.03, 0.29, 0.75, 0.31), B('@black', 0.5, 0.2, 0.02, -0.05, 0.16, 0.31), B('trim', 0.77, 0.05, 0.62, 0, 1.7, 0)],
  },
  gramophone: {
    name: 'Vintage gramophone', cat: 'Vintage', price: 650, fp: [0.75, 0.75],
    slots: { body: 'wood', trim: 'metal' }, defaults: { body: 'cherry', trim: 'brass' },
    parts: [B('body', 0.55, 0.72, 0.55, 0, 0, 0), C('@black', 0.22, 0.22, 0.025, 0, 0.72, 0, 24), C('trim', 0.012, 0.012, 0.1, 0, 0.745, 0), { s: 'cyl', slot: 'trim', size: [0.34, 0.05, 0.55, 20], p: [0, 1.1, -0.05], rx: -0.5 }, B('trim', 0.015, 0.015, 0.3, 0.12, 0.76, 0.1)],
  },
  payphone: {
    name: 'Brass payphone', cat: 'Vintage', price: 260, fp: [0.45, 0.28], wall: 1.2,
    slots: { body: 'metal', trim: 'metal' }, defaults: { body: 'enamel_cream', trim: 'brass' },
    parts: [B('body', 0.3, 0.5, 0.14, 0, 0, -0.06), B('trim', 0.24, 0.07, 0.03, 0, 0.35, 0.03), C('@black', 0.02, 0.02, 0.22, -0.13, 0.15, 0.04).s ? { s: 'cyl', slot: '@black', size: [0.022, 0.022, 0.26, 8], p: [-0.16, 0.25, 0.05] } : null, B('trim', 0.08, 0.12, 0.03, 0.06, 0.1, 0.03)].filter(Boolean),
  },
  pool_table: {
    name: 'Billiard table', cat: 'Vintage', price: 4200, fp: [2.9, 1.7],
    slots: { body: 'wood', cloth: 'fabric', trim: 'metal' }, defaults: { body: 'mahogany', cloth: 'velvet_emerald', trim: 'brass' },
    parts: [...[[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]].map(([x, z]) => B('body', 0.18, 0.78, 0.18, x, 0, z)), B('body', 2.8, 0.16, 1.6, 0, 0.7, 0), B('cloth', 2.4, 0.03, 1.2, 0, 0.86, 0),
      B('body', 2.8, 0.1, 0.2, 0, 0.86, -0.7), B('body', 2.8, 0.1, 0.2, 0, 0.86, 0.7), B('body', 0.2, 0.1, 1.2, -1.3, 0.86, 0), B('body', 0.2, 0.1, 1.2, 1.3, 0.86, 0),
      ...[[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6], [0, -0.62], [0, 0.62]].map(([x, z]) => S('@black', 0.07, x, 0.9, z, [1, 0.4, 1])), B('trim', 2.8, 0.02, 0.03, 0, 0.96, -0.8),
      ...[['@book_a', -0.4, 0.1], ['@book_b', -0.3, -0.05], ['@book_c', 0.6, 0.0], ['@lampglow', -0.5, 0.2]].map(([m, x, z]) => S(m, 0.035, x, 0.9, z))],
  },
});

// ── Rooms: partition walls so you can build your own rooms ────────────────
Object.assign(FURNITURE, {
  // `resize: [min, max]` metres → the length can be changed after placing (price is per 3 m). `parts` may be a function of the length.
  partition: {
    name: 'Partition wall', cat: 'Rooms', price: 900, fp: [3.0, 0.16], resize: [1, 12],
    slots: { wall: 'wood', trim: 'metal' }, defaults: { wall: 'walnut', trim: 'brass' },
    parts: L => [B('wall', L, 3.2, 0.12, 0, 0, 0), B('trim', L + 0.06, 0.07, 0.16, 0, 3.2, 0), B('trim', L + 0.06, 0.12, 0.16, 0, 0, 0)],
  },
  partition_glass: {
    name: 'Glass partition', cat: 'Rooms', price: 1300, fp: [3.0, 0.16], resize: [1, 12],
    slots: { trim: 'metal' }, defaults: { trim: 'brass' },
    parts: L => { const n = Math.max(1, Math.round(L / 1.5)); return [B('@glass', L - 0.1, 2.6, 0.03, 0, 0.35, 0), B('trim', L, 0.08, 0.1, 0, 2.95, 0), B('trim', L, 0.35, 0.1, 0, 0, 0), ...Array.from({ length: n + 1 }, (_, i) => -L / 2 + i * L / n).map(x => B('trim', 0.07, 3.0, 0.1, x, 0, 0))]; },
  },
  half_wall: {
    name: 'Half wall with marble top', cat: 'Rooms', price: 650, fp: [3.0, 0.3], resize: [1, 12],
    slots: { wall: 'wood', top: 'stone', trim: 'metal' }, defaults: { wall: 'mahogany', top: 'marble_black', trim: 'brass' },
    parts: L => [B('wall', L, 1.05, 0.22, 0, 0, 0), B('top', L + 0.06, 0.05, 0.3, 0, 1.05, 0), B('trim', L, 0.03, 0.04, 0, 0.12, 0.12)],
  },
});
