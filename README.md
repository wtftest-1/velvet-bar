# The Velvet Note — a first-person jazz bar tycoon

Design, staff and run your own 1980s American jazz bar: burgundy velvet, brass, dark walnut, black marble with gold veins,
amber light, subtle neon and a slow generated jazz ballad. Cartoon-styled, runs entirely in your browser (Three.js + Vite). No backend, no tracking, no network calls.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```
Click "Enter the bar". Audio starts after your first click. If pointer lock is blocked, click-and-drag to look.

## Controls
`WASD` move · mouse (or `←↑↓→`) look · `Shift` run · `E` interact · `P` drop a pin · `Esc` pause / close computer.
You can walk out the front door into the street; the music is muffled and fades with distance outside.

## Building mode (free-roam 3D editing)
At the office computer press **Walk & build in 3D** (top bar, or in Design). You fly through the whole building (`WASD`, `Q`/`E` down/up, `Shift` fast, hold the **right mouse button** to look) and can:
- click any furniture to select it, **drag** it, `R` rotate, `Del` sell (50% back), recolour it;
- **Furniture** tab: every item has a rendered 3D preview; press Place, move the ghost (green = OK, red = blocked), click to buy;
- **Paint** tab: pick a finish, then click a wall, floor or ceiling to repaint that area;
- **Rooms** category: partition walls, glass partitions and half walls to build your own rooms.
`Esc` steps back (deselect → exit) to the computer.

## The game
- **Only the office computer designs the bar** (upstairs, behind the secret bookshelf: press `E` on it; only you can open it).
  Apps: Dashboard, Design (floor plan: buy / drag / `R` rotate / `Del` sell at 50% / recolour / **walls, floors & ceiling finishes**),
  Pins, Staff, Bookings, Events & Tickets (deferred revenue), Advertising, Invitations, Finances (balanced books, P&L, ledger, chart), Menu, Music, Settings.
- Walk up to a guest during an open night and press `E` to **Invite to VIP** (needs security). They follow the path through the bookshelf door up the stairs.
  Special invited guests wait downstairs with a gold marker.
- Nights run 20:00–02:00 (~6 min at 1×). Reputation, ads, acts, staff, seating and menu prices drive the crowd and satisfaction.
- Everything autosaves to `localStorage` (layout, surfaces, pins, staff, bookings, events, ledger, artwork). Reset is in Settings with an in-game confirmation.

## Adding furniture (`src/data/catalog.js`)
Add an entry to `FURNITURE` (or `Object.assign(FURNITURE, {...})` at the bottom). Items are declarative parts:
```js
my_lamp: {
  name: 'Tiffany lamp', cat: 'Decor', price: 300, fp: [0.5, 0.5],       // footprint in metres (x, z)
  slots: { base: 'metal' }, defaults: { base: 'brass' },               // editable slots → material type / default preset
  parts: [ C('base', 0.1, 0.12, 0.05, 0, 0, 0), C('base', 0.015, 0.015, 0.4, 0, 0.05, 0), C('@lampshade', 0.12, 0.2, 0.2, 0, 0.4, 0) ],
  // optional: seats: [seat(x, z, facingRadians, approachX, approachZ)], wall: 1.4 (hangs on walls at that height), walk: true (no collision), hang: true (ceiling)
}
```
Helpers: `B(slot,w,h,d,x,y,z)` box, `C(slot,rTop,rBottom,h,x,y,z)` cylinder, `S(slot,r,x,y,z)` sphere (y = bottom for B/C). A slot starting with `@` is a fixed special material (`@glass`, `@mirror`, `@lampglow`, `@screen`, `@marquee`, `@leaf`…; see `src/materials.js`).
Categories appear automatically; add a new one to `CATS` in `src/ui/design.js`.

## Adding materials and surfaces
- **Furniture materials**: add a row to `MATERIALS` (`type` fabric/leather/wood/metal/stone, `color`, `rough`, `metal`, optional `tex`).
- **Textures**: add a canvas generator to `src/textures.js` (`factories`), then reference it by name. Textures use world-scale UVs (`tile` = metres per repeat).
- **Wall / floor finishes**: add the material to `ARCH` in `initMaterials()` (`src/materials.js`), then list its id in `SURFACES` and `SURFACE_LABELS` in the catalog.

## Layout of the code
`main.js` bootstrap & modes · `world.js` shell, lights, street, surfaces · `fixtures.js` bar, stage, office, cameras · `furniture.js` catalogue → meshes/seats/colliders ·
`plan.js` walls & collisions · `nav.js` A* · `npcs.js` characters · `sim.js` nights, guests, VIP, events · `audio.js` generative jazz · `state.js` save + double-entry finance · `ui/` office computer.

## Notes
The bar is on the right when you look from the stage. Upper floor: secret stairs arrive in the cigar room, the VIP lounge sits in the middle of the room with its own terrace over the stage, and your office has a big round one-way window plus a small private terrace. Graphics: bloom, vignette, soft contact shadows, ACES tone mapping, a warm environment map and ~13 lights (no real-time shadows). Quality is adaptive (Settings ▸ Graphics). Security-camera monitors render at low frequency, only while you are upstairs.
