// Night simulation, guests, VIP flow, events/tickets, advertising, staff, nightly report. No rendering in here.
import { ACTS, ADS, CONFIG, FURNITURE, GUESTS, MENU, STAFF_ROLES } from './data/catalog.js';
import { fin, post, isWeekend, clockStr, dayName } from './state.js';
import { Person, guestLook } from './npcs.js';
import { DOOR } from './plan.js';

const rand = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const actById = id => ACTS.find(a => a.id === id);
const MENU_BY = Object.fromEntries(MENU.map(m => [m.id, m]));
const DOOR_FRONT = { x: -9.25, z: -6.4 };
const STAIR_UP = [{ x: -10.6, z: -6.4 }, { x: -11.1, z: -6.2 }, { x: -11.1, z: -5.3 }, { x: -11.1, z: -0.4 }, { x: -11.1, z: 1.3 }];
const STAIR_DOWN = [{ x: -11.1, z: -0.4 }, { x: -11.1, z: -5.3 }, { x: -11.0, z: -6.4 }, DOOR_FRONT];
const WAIT_SPOTS = [[4.5, 5.0], [5.6, 5.0], [6.4, 5.8], [-4.5, 5.2], [-5.8, 5.2], [-3.2, 4.8]];

export class Sim {
  constructor(ctx) {
    this.ctx = ctx; this.s = ctx.state; this.night = null; this.guests = []; this.seatOcc = new Map(); this.gid = 1; this.layoutSeen = -1; this.vipEnRoute = 0; this.doorAuto = false; this.lastVip = 0; this.audioT = 0;
  }
  get world() { return this.ctx.world; } get crowd() { return this.ctx.crowd; } get nav() { return this.ctx.nav; }
  toast(m) { this.ctx.toast(m); }

  // ── derived values ────────────────────────────────────────────────────────
  hype() { const sum = this.s.ads.filter(a => this.s.day >= a.start && this.s.day < a.start + a.days).reduce((t, a) => t + a.boost, 0); return 100 * (1 - Math.exp(-sum / 55)); }
  staffN(r) { return this.s.staff[r] || 0; }
  eventOn(day) { return this.s.events.find(e => e.day === day && !e.done); }
  actFor(day) { const e = this.eventOn(day); if (e) return actById(e.act); const b = this.s.bookings.find(x => x.day === day); return b ? actById(b.act) : null; }
  decorCount() { return this.s.items.filter(i => (FURNITURE[i.k].cat === 'Decor' || FURNITURE[i.k].cat === 'Vintage')).length; }
  seatCount(f) { return this.world.seats.filter(q => q.f === f).length; }
  priceRatio() { let w = 0, t = 0; for (const m of MENU) { w += m.pop; t += m.pop * this.s.menu[m.id] / m.price; } return t / w; }
  inBar() { return this.guests.filter(g => g.state === 'seated' || g.state === 'standing' || g.state === 'new' || g.state === 'vipwalk').length; }
  serviceFactor() {
    const load = this.guests.filter(g => g.state === 'seated' || g.state === 'standing').length;
    const cap = 14 * this.staffN('bartender') + 10 * this.staffN('waiter');
    return cap === 0 ? 0.25 : Math.min(1, cap / Math.max(load, 6));
  }
  potential() {
    const day = this.s.day, act = this.actFor(day);
    let p = 12 + this.s.rep * 0.5 + this.hype() * 0.4 + (act ? act.pop * 0.3 : 0) + (this.staffN('pianist') && !act ? 3 : 0);
    if (isWeekend(day)) p *= 1.25; if (this.staffN('doorman')) p *= 1.08;
    return p;
  }
  stats() {
    const n = this.night; if (!n) return { guests: 0, revenue: 0, inBar: 0 };
    return { guests: n.arrived, revenue: n.tally.drinks.amt + n.tally.food.amt, inBar: this.inBar(), served: n.served };
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  openBar() {
    if (this.s.open || this.night) return false;
    const day = this.s.day, act = this.actFor(day), ev = this.eventOn(day);
    const tally = { drinks: { amt: 0, cogs: 0, n: 0 }, food: { amt: 0, cogs: 0, n: 0 } };
    const n = this.night = { min: 0, arrivals: [], tally, arrived: 0, served: 0, satSum: 0, satN: 0, vipServed: 0, turnedAway: 0, specialsMissed: 0, repBonus: 0, act, ev, events: [], notes: [], guestsLeft: 0 };
    const count = Math.round(this.potential() * (0.85 + rand() * 0.3));
    for (let i = 0; i < count; i++) n.arrivals.push({ t: 3 + ((rand() + rand()) / 2) * 290, type: 'walkin' });
    if (ev) { const att = Math.min(ev.sold, ev.cap); for (let i = 0; i < att; i++) n.arrivals.push({ t: 3 + rand() * 150, type: 'ticket' }); n.ticketGuests = att; }
    for (const inv of this.s.invites.filter(i => i.day === day && i.status === 'sent')) { const g = GUESTS.find(x => x.id === inv.guest); n.arrivals.push({ t: 12 + rand() * 45, type: 'special', spec: g, inv }); }
    n.arrivals.sort((a, b) => a.t - b.t);
    this.s.open = true; this.crowd.syncPerformers(act);
    this.ctx.audio?.setLead(act?.lead ?? null);
    this.toast(act ? `Doors open! Tonight: ${act.name}.` : 'Doors open! No act tonight: the house plays.');
    return true;
  }
  closeBar() { if (this.night) this.endNight(true); }

  update(dt) { // dt in real seconds; game minutes pass at `speed` per second
    const n = this.night; if (!n) return;
    const dm = dt * this.s.speed; n.min += dm;
    if (this.layoutSeen !== this.world.layoutVersion) this.onLayout();
    while (n.arrivals.length && n.arrivals[0].t <= n.min) this.spawn(n.arrivals.shift());
    for (const g of [...this.guests]) this.tickGuest(g);
    // door management
    const d = this.world.fx.door;
    if (this.doorAuto && d.open && this.vipEnRoute <= 0 && n.min > this.lastVip + 2) { d.setOpen(false); this.doorAuto = false; }
    this.audioT -= dt; if (this.audioT <= 0) { this.audioT = 2; this.ctx.audio?.setCrowd(this.inBar()); }
    if (n.min >= CONFIG.nightMinutes) this.endNight(false);
  }

  onLayout() {
    this.layoutSeen = this.world.layoutVersion; const keys = new Set(this.world.seats.map(q => q.key)), fresh = new Map(this.world.seats.map(q => [q.key, q]));
    this.seatOcc.clear();
    for (const g of this.guests) {
      if (!g.seat) continue;
      if (!keys.has(g.seat.key)) { g.seat = null; if (g.state === 'seated') { g.npc?.standUp(); this.leave(g); } else if (g.state === 'new') this.leave(g); continue; }
      g.seat = fresh.get(g.seat.key); this.seatOcc.set(g.seat.key, g);
    }
  }

  // ── guests ────────────────────────────────────────────────────────────────
  freeSeat(f, near) {
    const free = this.world.seats.filter(q => q.f === f && !this.seatOcc.has(q.key));
    if (!free.length) return null;
    if (near) free.sort((a, b) => Math.hypot(a.x - near[0], a.z - near[1]) - Math.hypot(b.x - near[0], b.z - near[1]));
    return near ? free[Math.floor(rand() * Math.min(5, free.length))] : free[Math.floor(rand() * free.length)];
  }
  visual() { return this.guests.filter(g => g.npc).length < CONFIG.maxVisualGuests; }

  spawn(a) {
    const n = this.night, g = { id: this.gid++, type: a.type, name: a.spec?.name, title: a.spec?.title, spec: a.spec, inv: a.inv, npc: null, state: 'new', seat: null, vip: false, orders: 0, sfSum: 0, sfN: 0, waitedLong: false, nextOrder: n.min + 6 + rand() * 12, leaveAt: n.min + (a.type === 'ticket' ? 150 + rand() * 100 : 55 + rand() * 90) };
    let seat = null;
    if (a.type === 'special') { g.leaveAt = n.min + 150; g.waitUntil = n.min + 140; }
    else { seat = this.freeSeat(0, a.type === 'ticket' ? [0, -3] : null); if (!seat && a.type === 'walkin') { n.turnedAway++; return; } }
    if (seat) { g.seat = seat; this.seatOcc.set(seat.key, g); }
    n.arrived++; this.guests.push(g);
    if (!this.visual()) { g.state = seat || a.type === 'special' ? 'seated' : 'standing'; if (a.type === 'special') { g.state = 'standing'; g.virtualSpecial = true; } return; }
    const npc = g.npc = this.crowd.add(new Person(guestLook())); if (a.type === 'special') npc.addMarker();
    npc.place(-0.8 + rand() * 1.6, 10.8, Math.PI, 0);
    let target, final;
    if (seat) { target = [seat.ax, seat.az]; final = { x: seat.x, z: seat.z }; }
    else if (a.type === 'special') { const sp = WAIT_SPOTS.find(([x, z]) => !this.nav.isBlocked(0, x, z) && !this.guests.some(o => o.spot === x + ',' + z)) ?? [0, 5]; g.spot = sp[0] + ',' + sp[1]; target = sp; }
    else { target = [-6 + rand() * 12, -3.9 + rand() * 1.3]; }
    const path = this.nav.path(0, npc.x, npc.z, ...target);
    if (!path) { this.dropGuest(g); n.turnedAway++; return; }
    if (final) path.push(final);
    npc.walk(path, () => { if (seat) { npc.sitDown(seat); g.state = 'seated'; } else { g.state = 'standing'; npc.faceTo(0, -6); } }, 1.3);
  }

  dropGuest(g) {
    if (g.seat) this.seatOcc.delete(g.seat.key);
    if (g.npc) this.crowd.remove(g.npc);
    this.guests.splice(this.guests.indexOf(g), 1);
  }

  tickGuest(g) {
    const n = this.night;
    if (g.state === 'seated' || g.state === 'standing') {
      if (g.type === 'special' && !g.vip && n.min >= g.waitUntil) { n.specialsMissed++; g.inv.status = 'missed'; n.notes.push(`${g.name} waited downstairs and left disappointed. Invite them up next time!`); this.leave(g, true); return; }
      if (n.min >= g.nextOrder && (g.type !== 'special' || g.vip)) this.order(g);
      if (n.min >= g.leaveAt) this.leave(g);
    }
  }

  order(g) {
    const n = this.night, sf = this.serviceFactor(), vip = g.vip;
    g.sfSum += sf; g.sfN++;
    const gap = (g.type === 'special' ? 28 : 24 + rand() * 12);
    g.nextOrder = n.min + gap / (0.5 + sf * 0.5) * (this.s.rep > 60 ? 0.9 : 1); g.orders++;
    if (sf < 0.5) { g.waitedLong = true; g.leaveAt -= 4; }
    if (g.type === 'special') { // bottle service
      const amt = g.spec.spend / 3, d = amt * 0.7, f = amt * 0.3;
      this.book('drinks', d, d * 0.26, 1); this.book('food', f, f * 0.3, 1); n.served++; return;
    }
    const pSkip = clamp((this.priceRatio() - 1) * 0.4, 0, 0.6); if (rand() < pSkip) return;
    const mult = vip ? 2.4 : 1, pm = vip ? 1.5 : 1;
    const pickOf = types => { const list = MENU.filter(m => types.includes(m.type)); const w = list.map(m => m.pop * Math.pow(m.price / this.s.menu[m.id], 0.8)); let r = rand() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[0]; };
    const nd = 1 + (rand() < 0.4 ? 1 : 0);
    for (let i = 0; i < nd; i++) { const m = pickOf(['cocktail', 'drink']); this.book('drinks', this.s.menu[m.id] * mult * pm, m.cost * mult, 1); }
    if (rand() < 0.35) { const m = pickOf(['bite']); this.book('food', this.s.menu[m.id] * mult * pm, m.cost * mult, 1); }
    n.served++;
  }
  book(cat, amt, cogs, cnt) { const t = this.night.tally[cat]; t.amt += amt; t.cogs += cogs; t.n += cnt; fin.addRevenue(this.s, amt); fin.addExpense(this.s, cogs); }

  satisfaction(g) {
    const act = this.night.act, d = this.s;
    const music = act ? 0.08 + act.pop / 100 * 0.14 : this.staffN('pianist') ? 0.08 : 0;
    const sf = g.sfN ? g.sfSum / g.sfN : this.serviceFactor();
    let v = 0.45 + music + sf * 0.2 + Math.min(1, this.decorCount() / 10) * 0.08 + d.cleanliness * 0.07 + (this.staffN('doorman') ? 0.02 : 0) + (this.staffN('coat') ? 0.03 : 0) + (g.vip ? 0.08 : 0) - (g.waitedLong ? 0.08 : 0) - (this.priceRatio() > 1.2 ? 0.05 : 0);
    return clamp(v, 0, 1);
  }

  leave(g, unhappy = false) {
    const n = this.night; if (g.state === 'leaving') return;
    n.satSum += unhappy ? 0.15 : this.satisfaction(g); n.satN++;
    if (g.type === 'special' && g.vip) { n.repBonus += g.spec.rep; g.inv.status = 'attended'; n.notes.push(`${g.name} (${g.title}) enjoyed the VIP floor and spent ${Math.round(g.spec.spend)}.`); }
    if (g.vip && g.type !== 'special') n.vipServed++;
    if (g.seat) { this.seatOcc.delete(g.seat.key); }
    g.state = 'leaving'; const npc = g.npc;
    const done = () => { if (npc) this.crowd.remove(npc); const i = this.guests.indexOf(g); if (i >= 0) this.guests.splice(i, 1); };
    if (!npc) { done(); return; }
    npc.standUp();
    let pts = [];
    if (npc.floor === 1) {
      const up = this.nav.path(1, npc.x, npc.z, -11.1, 1.3) ?? [{ x: -11.1, z: 1.3 }];
      pts = [...up, ...STAIR_DOWN]; this.world.fx.door.setOpen(true); this.doorAuto = true; this.vipEnRoute++; this.lastVip = n.min;
      const out = this.nav.path(0, DOOR_FRONT.x, DOOR_FRONT.z, 0, 9.0) ?? [{ x: 0, z: 9 }];
      pts = [...pts, ...out, { x: 0.3, z: 11.2 }]; npc.walk(pts, () => { this.vipEnRoute--; done(); }, 1.5); return;
    }
    const path = this.nav.path(0, npc.x, npc.z, 0, 9.0);
    pts = path ? [...path, { x: 0.3, z: 11.2 }] : [{ x: 0.3, z: 11.2 }];
    npc.walk(pts, done, 1.4);
  }

  /** Owner invites a guest upstairs. Returns {ok,msg}. */
  inviteVip(g) {
    const n = this.night;
    if (!n || (g.state !== 'seated' && g.state !== 'standing') || g.vip) return { ok: false, msg: 'They are not available right now.' };
    if (!this.staffN('security')) return { ok: false, msg: 'VIP nights require security. Hire a guard at the office computer (Staff).' };
    const seat = this.freeSeat(1);
    if (!seat) return { ok: false, msg: 'No free VIP seat upstairs.' };
    if (g.seat) this.seatOcc.delete(g.seat.key);
    g.seat = seat; this.seatOcc.set(seat.key, g); g.vip = true; g.state = 'vipwalk'; g.nextOrder = n.min + 4; g.leaveAt = Math.max(g.leaveAt, n.min + (g.type === 'special' ? 100 : 70)); this.lastVip = n.min;
    const d = this.world.fx.door; d.setOpen(true); this.doorAuto = true;
    const arrive = () => { g.npc?.sitDown(seat); g.state = 'seated'; this.vipEnRoute--; };
    this.vipEnRoute++;
    if (!g.npc) { setTimeout(arrive, 0); return { ok: true, msg: `${g.name ?? 'Guest'} follows you to the VIP floor.` }; }
    const npc = g.npc; npc.standUp();
    const a = this.nav.path(0, npc.x, npc.z, DOOR_FRONT.x, DOOR_FRONT.z) ?? [DOOR_FRONT];
    const b = this.nav.path(1, -11.1, 1.3, seat.ax, seat.az) ?? [{ x: seat.ax, z: seat.az }];
    npc.walk([...a, ...STAIR_UP, ...b, { x: seat.x, z: seat.z }], arrive, 1.5);
    return { ok: true, msg: `${g.name ?? 'The guest'} is following the path to the VIP stairs.` };
  }

  // ── end of night ──────────────────────────────────────────────────────────
  endNight(early) {
    const n = this.night, s = this.s; if (!n) return;
    for (const g of [...this.guests]) { if (g.npc) this.crowd.remove(g.npc); }
    n.guestsLeft = this.guests.length; this.guests = []; this.seatOcc.clear(); this.vipEnRoute = 0;
    this.world.fx.door.setOpen(false); this.doorAuto = false;
    // sales lines (fin already applied live)
    for (const [cat, t] of Object.entries(n.tally)) {
      if (t.amt > 0) post(s, { kind: 'rev', cat, desc: `${cat === 'drinks' ? 'Drinks' : 'Food'} sales, ${t.n} orders`, amount: t.amt, cash: t.amt });
      if (t.cogs > 0) post(s, { kind: 'exp', cat: 'cogs', desc: `Cost of goods sold (${cat})`, amount: t.cogs, cash: -t.cogs });
    }
    // tickets recognised on the night
    if (n.ev) { const amt = n.ev.sold * n.ev.price; if (amt > 0) fin.ticketRecognise(s, `Tickets recognised: ${actById(n.ev.act).name}, ${n.ev.sold} sold`, amt); n.ev.done = true; if (n.ev.sold >= n.ev.cap * 0.5) n.repBonus += 1.5; }
    // wages, utilities, act fee
    let wages = 0; for (const [r, c] of Object.entries(s.staff)) wages += c * STAFF_ROLES[r].wage;
    if (wages) fin.expense(s, 'wages', 'Staff wages', wages);
    fin.expense(s, 'utilities', 'Electricity, water, heating', CONFIG.utilitiesPerNight);
    if (n.act) fin.expense(s, 'bookings', `Performance fee: ${n.act.name}`, n.act.fee);
    this.settleDay(true);
    // reputation
    const avgSat = n.satN ? n.satSum / n.satN : 0.3;
    let delta = (avgSat - 0.62) * 14 + n.vipServed * 0.15 + n.repBonus - n.specialsMissed * 1.5 - Math.min(2, n.turnedAway * 0.12);
    if (!n.satN) delta = -2; delta = clamp(delta, -6, 8);
    const oldRep = s.rep; s.rep = clamp(s.rep + delta, 0, 100);
    // notes
    if (!this.staffN('bartender')) n.notes.push('No bartender: service was slow and guests were less satisfied.');
    if (n.turnedAway > 2) n.notes.push(`${n.turnedAway} guests were turned away: there were no free seats. Add furniture.`);
    if (!n.act) n.notes.push('No live act tonight. Book one in Bookings for a bigger crowd.');
    if (this.priceRatio() > 1.2) n.notes.push('Prices are well above the standard menu, so guests order less often.');
    const rep = this.buildReport(n, avgSat, s.rep - oldRep);
    s.history.push({ day: s.day, rev: rep.revenue, cost: rep.costs, net: rep.net, guests: n.arrived, cash: s.fin.cash }); if (s.history.length > 60) s.history.shift();
    s.lastReport = rep; s.cleanliness = clamp(s.cleanliness - 0.3 * n.arrived / 60, 0.1, 1);
    s.open = false; this.night = null; this.crowd.syncPerformers(null); this.ctx.audio?.setLead(null); this.ctx.audio?.setCrowd(0);
    this.advanceDay(); this.ctx.save(); this.ctx.onReport(rep);
  }

  settleDay(hadNight = false) {
    fin.expense(this.s, 'rent', 'Daily rent', CONFIG.rentPerDay); fin.depreciate(this.s);
    if (!hadNight) this.s.history.push((() => { const e = this.dayEntries(this.s.day), rv = e.filter(x => x.kind === 'rev').reduce((a, x) => a + x.amount, 0), co = e.filter(x => x.kind === 'exp').reduce((a, x) => a + x.amount, 0); return { day: this.s.day, rev: rv, cost: co, net: rv - co, guests: 0, cash: this.s.fin.cash }; })());
  }
  dayEntries(day) { return this.s.ledger.filter(e => e.day === day && (e.kind === 'rev' || e.kind === 'exp')); }
  buildReport(n, avgSat, repDelta) {
    const e = this.dayEntries(this.s.day), by = k => { const o = {}; for (const x of e.filter(y => y.kind === k)) o[x.cat] = (o[x.cat] || 0) + x.amount; return o; };
    const revenue = e.filter(x => x.kind === 'rev').reduce((a, x) => a + x.amount, 0), costs = e.filter(x => x.kind === 'exp').reduce((a, x) => a + x.amount, 0);
    return { day: this.s.day, rev: by('rev'), cost: by('exp'), revenue, costs, net: revenue - costs, guests: n.arrived, served: n.served, vip: n.vipServed,turnedAway: n.turnedAway, avgSat, repDelta, rep: this.s.rep, act: n.act?.name ?? null, notes: n.notes, cash: this.s.fin.cash, ticketGuests: n.ticketGuests ?? 0 };
  }

  skipDay() {
    if (this.s.open) return false;
    this.settleDay(false); this.advanceDay(); this.ctx.save(); this.toast(`Day ${this.s.day} (${dayName(this.s.day)}) begins.`); return true;
  }

  advanceDay() {
    const s = this.s; s.day++;
    s.ads = s.ads.filter(a => s.day < a.start + a.days);
    // ticket sales for upcoming events; refunds for events whose night was skipped
    for (const ev of [...s.events]) {
      if (ev.done) { if (ev.day < s.day - 2) s.events.splice(s.events.indexOf(ev), 1); continue; }
      const act = actById(ev.act);
      if (ev.day < s.day) { const amt = ev.sold * ev.price; if (amt > 0) fin.ticketRefund(s, `Refund: ${act.name} night did not open (${ev.sold} tickets)`, amt); this.toast(`The ${act.name} event was missed. Tickets refunded.`); s.events.splice(s.events.indexOf(ev), 1); continue; }
      const dem = ev.cap * 0.07 * (0.6 + this.hype() / 60 + act.pop / 80) * Math.pow(25 / ev.price, 1.1) * (0.7 + rand() * 0.6) * (isWeekend(ev.day) ? 1.2 : 1);
      const add = Math.min(ev.cap - ev.sold, Math.max(0, Math.round(dem)));
      if (add > 0) { ev.sold += add; fin.ticketCash(s, `Tickets: ${act.name}, ${add} sold for day ${ev.day}`, add * ev.price); }
    }
    s.bookings = s.bookings.filter(b => b.day >= s.day);
    for (const i of s.invites) if (i.day < s.day && i.status === 'sent') i.status = 'missed';
    s.cleanliness = clamp(s.cleanliness + 0.45 * this.staffN('cleaner') + 0.05, 0.05, 1);
  }

  // ── player actions (used by the desktop apps) ─────────────────────────────
  canPlanDay(day) { return day > this.s.day || (day === this.s.day && !this.s.open); }
}

// player actions (called from the office computer apps)
Sim.prototype.bookAct = function (day, actId) {
  const s = this.s, act = actById(actId);
  if (!act) return { ok: false, msg: 'Unknown act.' };
  if (!this.canPlanDay(day)) return { ok: false, msg: 'Pick tonight (if closed) or a future day.' };
  if (this.actFor(day)) return { ok: false, msg: `Day ${day} already has an act.` };
  s.bookings.push({ id: s.nid++, day, act: actId });
  this.ctx.save(); return { ok: true, msg: `${act.name} booked for day ${day}. Fee ${act.fee} is paid on the night.` };
};
Sim.prototype.cancelBooking = function (id) { const s = this.s; s.bookings = s.bookings.filter(b => b.id !== id); this.ctx.save(); };
Sim.prototype.createEvent = function (day, actId, price, cap) {
  const s = this.s, act = actById(actId);
  if (!act) return { ok: false, msg: 'Choose an act.' };
  if (!this.canPlanDay(day)) return { ok: false, msg: 'Pick tonight (if closed) or a future day.' };
  if (this.actFor(day)) return { ok: false, msg: `Day ${day} already has an act or event.` };
  if (!(price >= 1 && price <= 200)) return { ok: false, msg: 'Ticket price must be €1–200.' };
  if (!(cap >= 10 && cap <= 150)) return { ok: false, msg: 'Capacity must be 10–150.' };
  s.events.push({ id: s.nid++, day, act: actId, price: Math.round(price), cap: Math.round(cap), sold: 0, done: false });
  this.ctx.save(); return { ok: true, msg: `Event created. ${act.name} will be paid on the night.` };
};
Sim.prototype.cancelEvent = function (id) {
  const s = this.s, ev = s.events.find(e => e.id === id); if (!ev || ev.done) return;
  if (ev.sold > 0) fin.ticketRefund(s, `Event cancelled: ${ev.sold} tickets refunded`, ev.sold * ev.price);
  s.events = s.events.filter(e => e.id !== id); this.ctx.save();
};
Sim.prototype.buyAd = function (id) {
  const a = ADS.find(x => x.id === id), s = this.s; if (!a) return { ok: false, msg: '?' };
  if (s.fin.cash < a.cost) return { ok: false, msg: 'Not enough cash.' };
  fin.expense(s, 'ads', a.name, a.cost); s.ads.push({ id: s.nid++, type: a.id, name: a.name, start: s.day, days: a.days, boost: a.boost });
  this.ctx.save(); return { ok: true, msg: `${a.name} is running for ${a.days} days.` };
};
Sim.prototype.sendInvite = function (guestId, day) {
  const s = this.s, g = GUESTS.find(x => x.id === guestId); if (!g) return { ok: false, msg: 'Pick a guest.' };
  if (!this.canPlanDay(day)) return { ok: false, msg: 'Pick tonight (if closed) or a future day.' };
  if (s.invites.some(i => i.guest === guestId && i.day === day && i.status === 'sent')) return { ok: false, msg: 'Already invited for that night.' };
  if (s.fin.cash < 40) return { ok: false, msg: 'Not enough cash for the courier (€40).' };
  fin.expense(s, 'ads', `Engraved invitation + courier: ${g.name}`, 40); s.invites.push({ id: s.nid++, guest: guestId, day, status: 'sent' });
  this.ctx.save(); return { ok: true, msg: `Invitation sent to ${g.name}.` };
};
Sim.prototype.hire = function (role) { const r = STAFF_ROLES[role], s = this.s; if (s.staff[role] >= r.max) return false; s.staff[role]++; this.ctx.staffChanged(); this.ctx.save(); return true; };
Sim.prototype.fire = function (role) { const s = this.s; if (s.staff[role] <= 0) return false; s.staff[role]--; this.ctx.staffChanged(); this.ctx.save(); return true; };
Sim.DOOR = DOOR; Sim.clockStr = clockStr;
