// Office computer apps (everything except Design). Each app: (ctx, api, params) → element.
import { h } from './dom.js';
import { STAFF_ROLES, ACTS, ADS, MENU, GUESTS, CONFIG } from '../data/catalog.js';
import { fmt, fmt2, dayName, clockStr, fin, isWeekend } from '../state.js';

const page = (title, sub, ...kids) => h('div', null, h('h2', { class: 'app-h' }, title), sub ? h('p', { class: 'app-sub' }, sub) : null, ...kids);
const tile = (k, v, cls = '') => { const val = h('div', { class: 'v ' + cls }, v); return Object.assign(h('div', { class: 'tile' }, h('div', { class: 'k' }, k), val), { val }); };
const say = (box, r) => { box.hidden = false; box.className = 'msg' + (r.ok ? '' : ' bad'); box.textContent = r.msg; };
const msgBox = () => h('div', { class: 'msg', role: 'status', 'aria-live': 'polite', hidden: true });
const lab = (text, input, id) => h('div', null, h('label', { for: id }, text), input);
const bar = pct => h('div', { class: 'bar', role: 'img', 'aria-label': Math.round(pct) + ' percent' }, h('i', { style: { width: Math.max(0, Math.min(100, pct)) + '%' } }));

// ── 1. Dashboard ────────────────────────────────────────────────────────────
export function dashboard(ctx, api) {
  const { state: s, sim } = ctx, R = {};
  R.clock = tile('Clock', ''); R.cash = tile('Cash', ''); R.rev = tile("Tonight's revenue", ''); R.guests = tile('Guests', ''); R.rep = tile('Reputation', ''); R.hype = tile('Hype (ads)', '');
  const openBtn = h('button', { class: 'btn gold big', type: 'button', onclick: () => { if (s.open) sim.closeBar(); else { const ok = sim.openBar(); if (!ok) ctx.toast('The bar is already open.', true); else api.setStatus('Doors open. Close the computer (Esc) and walk the floor!'); } update(); } });
  const speed = h('div', { class: 'seg', role: 'group', 'aria-label': 'Game speed' }, [1, 2, 4].map(v => h('button', { class: 'btn', type: 'button', 'data-s': v, 'aria-pressed': String(s.speed === v), onclick: () => { s.speed = v; ctx.save(); update(); } }, v + '×')));
  const skip = h('button', { class: 'btn', type: 'button', onclick: () => { if (sim.skipDay()) { api.refresh(); } } }, 'Skip to next day');
  const tonight = h('div'), last = h('div');
  const update = () => {
    const n = sim.night, st = sim.stats();
    R.clock.val.textContent = n ? clockStr(n.min) + ' · OPEN' : `Day ${s.day} ${dayName(s.day)} · CLOSED`;
    R.cash.val.textContent = fmt(s.fin.cash); R.rev.val.textContent = fmt(st.revenue); R.guests.val.textContent = n ? `${st.inBar} in · ${st.guests} total` : '—';
    R.rep.val.textContent = s.rep.toFixed(0) + ' / 100'; R.hype.val.textContent = sim.hype().toFixed(0) + ' / 100';
    openBtn.textContent = n ? 'Close the bar (end the night)' : 'Open the bar for tonight'; skip.disabled = !!n;
    for (const b of speed.children) b.setAttribute('aria-pressed', String(s.speed === +b.dataset.s));
    const act = sim.actFor(s.day), ev = sim.eventOn(s.day), tips = [];
    if (!s.staff.bartender) tips.push('No bartender: service will be slow.'); if (!s.staff.security) tips.push('No security: you cannot invite guests to the VIP floor.');
    if (!act) tips.push('No act booked for today: book one in Bookings.');
    tonight.replaceChildren(h('h3', null, `Day ${s.day} · ${dayName(s.day)}${isWeekend(s.day) ? ' (weekend, busier)' : ''}`),
      h('p', null, act ? `Act: ${act.name} · ${act.style}` : 'Act: none', ev ? ` · Event: ${ev.sold}/${ev.cap} tickets at ${fmt(ev.price)}` : ''),
      h('p', null, `Expected walk-ins ≈ ${Math.round(sim.potential())} · seats: ${sim.seatCount(0)} ground, ${sim.seatCount(1)} VIP`),
      h('p', null, 'Staff: ', Object.entries(s.staff).filter(([, c]) => c).map(([r, c]) => h('span', { class: 'chip' }, `${STAFF_ROLES[r].name} ×${c}`)), Object.values(s.staff).every(c => !c) ? 'nobody hired yet' : ''),
      tips.length ? h('ul', { style: { paddingLeft: '18px', margin: '6px 0 0', fontSize: '12px', color: 'var(--gold)' } }, tips.map(t => h('li', null, t))) : h('p', { class: 'chip ok' }, 'All set for a good night'));
    const r = s.lastReport;
    last.replaceChildren(h('h3', null, 'Last night'), r ? h('p', null, `Day ${r.day}: revenue ${fmt(r.revenue)}, costs ${fmt(r.costs)}, net `, h('b', { style: { color: r.net >= 0 ? 'var(--ok)' : 'var(--bad)' } }, fmt(r.net)), `. ${r.guests} guests, satisfaction ${(r.avgSat * 100).toFixed(0)}%.`) : h('p', { class: 'muted' }, 'No night played yet.'));
  };
  api.live(update); update();
  return page('Dashboard', 'Run the bar from here. The night runs 20:00 → 02:00 (about 6 real minutes at 1×). Close this computer (Esc) to walk the floor while it runs.',
    h('div', { class: 'grid g3' }, R.clock, R.cash, R.rev, R.guests, R.rep, R.hype),
    h('div', { class: 'row', style: { margin: '16px 0' } }, openBtn, h('span', { class: 'muted' }, 'Speed'), speed, skip),
    h('div', { class: 'grid g2' }, h('div', { class: 'panel' }, tonight), h('div', { class: 'panel' }, last)));
}

// ── 3. Pins ─────────────────────────────────────────────────────────────────
export function pinsApp(ctx, api) {
  const { state: s } = ctx;
  const rows = s.pins.map(p => h('tr', null,
    h('td', null, `#${p.id}`), h('td', null, p.f ? 'Upper' : 'Ground'), h('td', null, p.note), h('td', null, h('span', { class: 'chip ' + (p.done ? 'ok' : '') }, p.done ? 'Done' : 'To do')),
    h('td', null, h('div', { class: 'row', style: { margin: 0 } },
      h('button', { class: 'btn small', type: 'button', onclick: () => api.select('design', { pin: p.id }) }, 'Show on plan'),
      h('button', { class: 'btn small', type: 'button', onclick: () => { p.done = !p.done; ctx.pinsChanged(); api.refresh(); } }, p.done ? 'Reopen' : 'Mark done'),
      h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Delete pin ' + p.id, onclick: () => { s.pins = s.pins.filter(x => x !== p); ctx.pinsChanged(); api.refresh(); } }, 'Delete')))));
  return page('Pins', 'Notes you dropped while walking around (press P). They glow gold in the 3D room and appear on the floor plan in Design.',
    s.pins.length ? h('div', { class: 'panel scroll' }, h('table', null, h('thead', null, h('tr', null, ['ID', 'Floor', 'Note', 'Status', ''].map(t => h('th', null, t)))), h('tbody', null, rows)))
      : h('div', { class: 'panel' }, 'No pins yet. Close the computer, walk to a spot and press ', h('kbd', null, 'P'), '.'));
}

// ── 4. Staff ────────────────────────────────────────────────────────────────
export function staffApp(ctx, api) {
  const { state: s, sim } = ctx, total = h('b');
  const upd = () => { total.textContent = fmt(Object.entries(s.staff).reduce((t, [r, c]) => t + c * STAFF_ROLES[r].wage, 0)); };
  const rows = Object.entries(STAFF_ROLES).map(([id, r]) => {
    const cnt = h('span', { 'aria-live': 'polite' }, `${s.staff[id]} / ${r.max}`);
    const hire = h('button', { class: 'btn small gold', type: 'button', 'aria-label': 'Hire ' + r.name, onclick: () => { sim.hire(id); cnt.textContent = `${s.staff[id]} / ${r.max}`; hire.disabled = s.staff[id] >= r.max; fire.disabled = !s.staff[id]; upd(); } }, 'Hire');
    const fire = h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Fire ' + r.name, onclick: () => { sim.fire(id); cnt.textContent = `${s.staff[id]} / ${r.max}`; hire.disabled = s.staff[id] >= r.max; fire.disabled = !s.staff[id]; upd(); } }, 'Fire');
    hire.disabled = s.staff[id] >= r.max; fire.disabled = !s.staff[id];
    return h('tr', null, h('td', null, h('b', null, r.name)), h('td', { class: 'muted' }, r.blurb), h('td', { class: 'num' }, fmt(r.wage) + '/night'), h('td', { class: 'num' }, cnt), h('td', null, h('div', { class: 'row', style: { margin: 0 } }, hire, fire)));
  });
  upd();
  return page('Staff', 'Hired staff appear as NPCs at their posts. Wages are paid on every open night. Security is required before you can invite anyone up to the VIP floor.',
    h('div', { class: 'panel' }, h('table', null, h('thead', null, h('tr', null, ['Role', 'What they do', 'Wage', 'Hired', ''].map(t => h('th', null, t)))), h('tbody', null, rows))),
    h('p', null, 'Total wage bill per open night: ', total));
}

// ── 5. Bookings ─────────────────────────────────────────────────────────────
const dayField = (ctx, id, initial) => {
  const inp = h('input', { type: 'number', id, min: ctx.state.day, max: ctx.state.day + 60, value: initial, 'aria-describedby': id + '-n' }), nm = h('span', { id: id + '-n', class: 'muted' });
  const u = () => { nm.textContent = isNaN(+inp.value) ? '' : dayName(+inp.value) + (+inp.value === ctx.state.day ? ' (today)' : ''); }; inp.addEventListener('input', u); u();
  return { inp, nm, get v() { return Math.round(+inp.value); } };
};
export function bookingsApp(ctx, api) {
  const { state: s, sim } = ctx, d = dayField(ctx, 'bk-day', s.open ? s.day + 1 : s.day), out = msgBox();
  const pop = p => h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('span', { class: 'muted' }, 'Popularity'), h('div', { style: { flex: 1 } }, bar(p)), h('b', null, p));
  const cards = ACTS.map(a => h('div', { class: 'panel' }, h('h3', null, a.name), h('p', { class: 'muted', style: { margin: '0 0 6px' } }, a.style), pop(a.pop),
    h('p', null, a.members.map(m => h('span', { class: 'chip' }, m))), h('div', { class: 'row', style: { margin: 0 } }, h('b', null, 'Fee ' + fmt(a.fee)),
      h('button', { class: 'btn small gold', type: 'button', onclick: () => { const r = sim.bookAct(d.v, a.id); say(out, r); if (r.ok) api.refresh(); } }, 'Book'))));
  const list = s.bookings.slice().sort((a, b) => a.day - b.day).map(b => { const a = ACTS.find(x => x.id === b.act); return h('tr', null, h('td', null, `Day ${b.day} (${dayName(b.day)})`), h('td', null, a.name), h('td', { class: 'num' }, fmt(a.fee)), h('td', null, h('button', { class: 'btn small danger', type: 'button', onclick: () => { sim.cancelBooking(b.id); api.refresh(); } }, 'Cancel'))); });
  return page('Bookings', 'Book a fictional act for a specific day. They appear on stage and play that night; the fee is paid when the night closes. One act per day. A booking for a night you skip is voided.',
    h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('div', { class: 'row', style: { margin: 0 } }, h('label', { for: 'bk-day', style: { margin: 0 } }, 'Day number'), h('div', { style: { width: '110px' } }, d.inp), d.nm), out),
    list.length ? h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('h3', null, 'Upcoming bookings'), h('table', null, h('tbody', null, list))) : null,
    h('div', { class: 'grid gauto' }, cards));
}

// ── 6. Events & tickets ─────────────────────────────────────────────────────
export function eventsApp(ctx, api) {
  const { state: s, sim } = ctx, out = msgBox(), d = dayField(ctx, 'ev-day', s.day + (s.open ? 2 : 1));
  const act = h('select', { id: 'ev-act' }, ACTS.map(a => h('option', { value: a.id }, `${a.name} · fee ${fmt(a.fee)} · pop ${a.pop}`)));
  const price = h('input', { type: 'number', id: 'ev-price', min: 1, max: 200, value: 25 }), cap = h('input', { type: 'number', id: 'ev-cap', min: 10, max: 150, value: 60 });
  const form = h('div', { class: 'panel' }, h('h3', null, 'New event'), h('div', { class: 'grid g4' }, h('div', null, h('label', { for: 'ev-day' }, 'Date (day number)'), d.inp, d.nm), lab('Act', act, 'ev-act'), lab('Ticket price (€)', price, 'ev-price'), lab('Capacity', cap, 'ev-cap')),
    h('div', { class: 'row' }, h('button', { class: 'btn gold', type: 'button', onclick: () => { const r = sim.createEvent(d.v, act.value, +price.value, +cap.value); say(out, r); if (r.ok) api.refresh(); } }, 'Create event')), out);
  const evs = s.events.filter(e => !e.done).sort((a, b) => a.day - b.day).map(e => { const a = ACTS.find(x => x.id === e.act);
    return h('div', { class: 'panel' }, h('h3', null, `${a.name}: day ${e.day} (${dayName(e.day)})`), h('p', null, `${e.sold} / ${e.cap} tickets at ${fmt(e.price)}`), bar(e.sold / e.cap * 100),
      h('p', { class: 'muted' }, `Held as deferred revenue (liability): ${fmt(e.sold * e.price)}. Recognised as income on the night.`),
      h('button', { class: 'btn small danger', type: 'button', onclick: () => { sim.cancelEvent(e.id); api.refresh(); } }, 'Cancel & refund')); });
  return page('Events & Tickets', 'Tickets sell a little every day leading up to the event; better acts, ads and a fair price sell faster. Accounting: ticket cash is DEFERRED REVENUE until the show happens, then it becomes income. If you skip the night, tickets are refunded.',
    form, h('h3', { style: { color: 'var(--gold)', fontFamily: 'Georgia,serif', margin: '18px 0 8px' } }, 'Scheduled events'),
    evs.length ? h('div', { class: 'grid g2' }, evs) : h('div', { class: 'panel muted' }, 'No events scheduled.'),
    h('p', { class: 'muted' }, `Deferred revenue right now: ${fmt(s.fin.deferred)}`));
}

// ── 7. Advertising ──────────────────────────────────────────────────────────
export function adsApp(ctx, api) {
  const { state: s, sim } = ctx, out = msgBox();
  const cards = ADS.map(a => h('div', { class: 'panel' }, h('h3', null, a.name), h('p', null, `Hype +${a.boost} for ${a.days} days`), h('p', { class: 'muted' }, 'More walk-ins and faster ticket sales.'), h('div', { class: 'row', style: { margin: 0 } }, h('b', null, fmt(a.cost)),
    h('button', { class: 'btn small gold', type: 'button', onclick: () => { const r = sim.buyAd(a.id); say(out, r); if (r.ok) api.refresh(); } }, 'Buy'))));
  const act = s.ads.map(a => h('tr', null, h('td', null, a.name), h('td', null, `Day ${a.start} → ${a.start + a.days - 1}`), h('td', { class: 'num' }, '+' + a.boost), h('td', { class: 'num' }, Math.max(0, a.start + a.days - s.day) + ' days left')));
  return page('Advertising', 'Campaigns raise hype, which brings in more walk-ins and sells tickets faster. Hype has diminishing returns: stacking helps, but less each time.',
    h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, h('b', null, 'Hype now'), h('div', { style: { flex: 1 } }, bar(sim.hype())), h('b', null, sim.hype().toFixed(0) + '/100')), out),
    h('div', { class: 'grid gauto' }, cards), h('h3', { style: { color: 'var(--gold)', fontFamily: 'Georgia,serif', margin: '18px 0 8px' } }, 'Running campaigns'),
    act.length ? h('div', { class: 'panel' }, h('table', null, h('tbody', null, act))) : h('div', { class: 'panel muted' }, 'Nothing running.'));
}

// ── 8. Invitations ──────────────────────────────────────────────────────────
export function invitesApp(ctx, api) {
  const { state: s, sim } = ctx, out = msgBox(), d = dayField(ctx, 'iv-day', s.open ? s.day + 1 : s.day);
  const cards = GUESTS.map(g => h('div', { class: 'panel' }, h('h3', null, g.name), h('p', { class: 'muted', style: { margin: '0 0 6px' } }, g.title), h('p', null, `Spends about ${fmt(g.spend)} · reputation +${g.rep}`),
    h('button', { class: 'btn small gold', type: 'button', onclick: () => { const r = sim.sendInvite(g.id, d.v); say(out, r); if (r.ok) api.refresh(); } }, 'Send invitation (€40)')));
  const list = s.invites.slice().reverse().slice(0, 14).map(i => { const g = GUESTS.find(x => x.id === i.guest); return h('tr', null, h('td', null, g.name), h('td', null, `Day ${i.day}`), h('td', null, h('span', { class: 'chip ' + (i.status === 'attended' ? 'ok' : i.status === 'missed' ? 'bad' : '') }, i.status))); });
  return page('Invitations', 'Special VIP guests (all fictional). They arrive on the chosen night with a gold marker above their head and wait downstairs near the entrance until YOU walk up to them and press E to invite them to the VIP floor. If you never do, they leave disappointed. Security staff are required.',
    h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('div', { class: 'row', style: { margin: 0 } }, h('label', { for: 'iv-day', style: { margin: 0 } }, 'Night (day number)'), h('div', { style: { width: '110px' } }, d.inp), d.nm), out),
    list.length ? h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('h3', null, 'Sent invitations'), h('table', null, h('tbody', null, list))) : null,
    h('div', { class: 'grid gauto' }, cards));
}

// ── 9. Finances ─────────────────────────────────────────────────────────────
function chart(history) {
  const data = history.slice(-14), W = 620, H = 200, pad = 28, ns = 'http://www.w3.org/2000/svg', el = (t, a, ...k) => { const e = document.createElementNS(ns, t); for (const [x, v] of Object.entries(a)) e.setAttribute(x, v); k.forEach(c => e.append(c)); return e; };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', width: '100%', 'aria-label': data.length ? 'Net profit per night as bars and cash balance as a line, last ' + data.length + ' days: ' + data.map(d => `day ${d.day} net ${Math.round(d.net)}`).join(', ') : 'No data yet' });
  if (!data.length) { svg.append(el('text', { x: W / 2, y: H / 2, fill: '#b9a58a', 'text-anchor': 'middle', 'font-size': 13 }, 'Play a night to see the chart')); return svg; }
  const mx = Math.max(100, ...data.map(d => Math.abs(d.net))), mid = H / 2 + 4, bw = (W - pad * 2) / data.length;
  svg.append(el('line', { x1: pad, x2: W - pad, y1: mid, y2: mid, stroke: '#b8902f', 'stroke-opacity': 0.5 }));
  data.forEach((d, i) => { const hh = Math.abs(d.net) / mx * (H / 2 - 24), x = pad + i * bw + bw * 0.15; svg.append(el('rect', { x, y: d.net >= 0 ? mid - hh : mid, width: bw * 0.7, height: Math.max(1, hh), fill: d.net >= 0 ? '#7fd39a' : '#ff7a6b', rx: 2 }, el('title', {}, `Day ${d.day}: net ${fmt(d.net)}`)), el('text', { x: x + bw * 0.35, y: H - 6, fill: '#b9a58a', 'font-size': 10, 'text-anchor': 'middle' }, 'D' + d.day)); });
  const cmin = Math.min(...data.map(d => d.cash)), cmax = Math.max(...data.map(d => d.cash)), rg = Math.max(1, cmax - cmin);
  const pts = data.map((d, i) => `${pad + i * bw + bw * 0.5},${20 + (1 - (d.cash - cmin) / rg) * (H / 2 - 40)}`).join(' ');
  svg.append(el('polyline', { points: pts, fill: 'none', stroke: '#e0b84e', 'stroke-width': 2 }), el('text', { x: W - pad, y: 14, fill: '#e0b84e', 'font-size': 11, 'text-anchor': 'end' }, 'cash ' + fmt(data.at(-1).cash)), el('text', { x: pad, y: 14, fill: '#b9a58a', 'font-size': 11 }, 'bars = net per night'));
  return svg;
}
export function financeApp(ctx, api) {
  const { state: s } = ctx, f = s.fin, nbv = f.assetCost - f.accDep, equity = f.capital + f.retained, diff = fin.check(s);
  const cats = ['all', ...new Set(s.ledger.map(e => e.cat))], sel = h('select', { id: 'fl-cat', 'aria-label': 'Filter ledger by category' }, cats.map(c => h('option', { value: c }, c)));
  const body = h('tbody'), draw = () => {
    const c = sel.value, rows = s.ledger.filter(e => c === 'all' || e.cat === c).slice(-150).reverse();
    body.replaceChildren(...rows.map(e => h('tr', null, h('td', null, e.day), h('td', null, e.cat), h('td', null, e.desc),
      h('td', { class: 'num' }, e.kind === 'rev' ? fmt2(e.amount) : ''), h('td', { class: 'num' }, e.kind === 'exp' ? fmt2(e.amount) : e.kind === 'capex' ? '(' + fmt2(e.amount) + ' capex)' : ''), h('td', { class: 'num' }, e.cash ? fmt2(e.cash) : ''))));
  }; sel.addEventListener('change', draw); draw();
  const pl = s.history.slice(-10).reverse().map(d => h('tr', null, h('td', null, `Day ${d.day}`), h('td', { class: 'num' }, d.guests), h('td', { class: 'num' }, fmt(d.rev)), h('td', { class: 'num' }, fmt(d.cost)), h('td', { class: 'num', style: { color: d.net >= 0 ? 'var(--ok)' : 'var(--bad)' } }, fmt(d.net))));
  const bar2 = (k, v) => h('tr', null, h('td', null, k), h('td', { class: 'num' }, fmt(v)));
  return page('Finances', 'Double-entry bookkeeping behind the scenes: furniture is a fixed asset (depreciated daily over 5 years, sold at 50%), ticket money is deferred revenue until the show, stock is expensed as cost of goods sold when sold.',
    h('div', { class: 'grid g4' }, tile('Cash', fmt(f.cash)), tile('Deferred revenue', fmt(f.deferred)), tile('Fixed assets (NBV)', fmt(nbv)), tile('Reputation', s.rep.toFixed(0) + '/100')),
    h('div', { class: 'grid g2', style: { marginTop: '14px' } },
      h('div', { class: 'panel' }, h('h3', null, 'Balance sheet'), h('table', null, h('tbody', null, bar2('Cash', f.cash), bar2('Furniture at cost', f.assetCost), bar2('less accumulated depreciation', -f.accDep), h('tr', null, h('th', null, 'Total assets'), h('th', { class: 'num' }, fmt(f.cash + nbv))),
        bar2('Deferred revenue (liability)', f.deferred), bar2('Owner capital', f.capital), bar2('Retained earnings', f.retained), h('tr', null, h('th', null, 'Liabilities + equity'), h('th', { class: 'num' }, fmt(f.deferred + equity)))),),
        h('p', { class: Math.abs(diff) < 0.01 ? 'chip ok' : 'chip bad' }, Math.abs(diff) < 0.01 ? 'Books balance ✓' : 'Out of balance by ' + fmt2(diff))),
      h('div', { class: 'panel' }, h('h3', null, 'Profit & loss per night'), pl.length ? h('div', { class: 'scroll', style: { maxHeight: '230px' } }, h('table', null, h('thead', null, h('tr', null, ['Day', 'Guests', 'Revenue', 'Costs', 'Net'].map((t, i) => h('th', { class: i ? 'num' : '' }, t)))), h('tbody', null, pl))) : h('p', { class: 'muted' }, 'Nothing yet.'))),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Net per night & cash'), chart(s.history)),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('div', { class: 'row', style: { margin: '0 0 8px' } }, h('h3', { style: { margin: 0 } }, 'Ledger'), h('div', { style: { width: '170px' } }, sel)),
      h('div', { class: 'scroll' }, h('table', null, h('thead', null, h('tr', null, ['Day', 'Category', 'Description', 'Revenue', 'Expense', 'Cash'].map((t, i) => h('th', { class: i > 2 ? 'num' : '' }, t)))), body))));
}

// ── 10. Menu ────────────────────────────────────────────────────────────────
export function menuApp(ctx, api) {
  const { state: s, sim } = ctx, ratioEl = h('b');
  const upd = () => { ratioEl.textContent = (sim.priceRatio() * 100).toFixed(0) + '% of standard prices'; };
  const rows = MENU.map(m => {
    const inp = h('input', { type: 'number', min: 1, max: 200, step: 0.5, value: s.menu[m.id], 'aria-label': 'Price of ' + m.name, style: { width: '90px' } }), mg = h('td', { class: 'num' }), dem = h('td', { class: 'num' });
    const u = () => { const p = +inp.value; mg.textContent = p > 0 ? ((p - m.cost) / p * 100).toFixed(0) + '%' : '—'; dem.textContent = p > 0 ? (Math.pow(m.price / p, 0.8) * 100).toFixed(0) + '%' : '—'; };
    inp.addEventListener('input', () => { const p = Math.max(1, +inp.value || m.price); s.menu[m.id] = p; u(); upd(); ctx.save(); }); u();
    return h('tr', null, h('td', null, h('b', null, m.name)), h('td', null, m.type), h('td', { class: 'num' }, fmt2(m.cost)), h('td', null, inp), mg, dem);
  }); upd();
  return page('Menu', 'Edit prices of cocktails, drinks and bar bites. Each item has a cost of goods; a higher price earns more per order but guests order it (and order at all) slightly less often.',
    h('div', { class: 'panel' }, h('table', null, h('thead', null, h('tr', null, ['Item', 'Type', 'Cost of goods', 'Price (€)', 'Margin', 'Demand'].map((t, i) => h('th', { class: i > 1 ? 'num' : '' }, t)))), h('tbody', null, rows))),
    h('div', { class: 'row' }, h('span', null, 'Average price level: ', ratioEl), h('button', { class: 'btn small', type: 'button', onclick: () => { for (const m of MENU) s.menu[m.id] = m.price; ctx.save(); api.refresh(); } }, 'Reset to standard prices')));
}

// ── 11. Music ───────────────────────────────────────────────────────────────
export function musicApp(ctx, api) {
  const a = ctx.audio, file = h('input', { type: 'file', id: 'mp3', accept: 'audio/*,.mp3', multiple: true }), now = h('p', { 'aria-live': 'polite' }), list = h('ol', { style: { paddingLeft: '22px', lineHeight: 1.7 } });
  const draw = () => {
    now.textContent = a.mode === 'generated' ? '♪ Generated slow jazz: 66 BPM ballad, ii–V–I changes, Rhodes, walking bass, brushes.' : a.list.length ? (a.idx >= 0 ? '▶ ' + a.list[a.idx].name : 'Playlist ready: press Play.') : 'Load some MP3 files to build a playlist.';
    list.replaceChildren(...a.list.map((t, i) => h('li', null, h('button', { class: 'linkbtn', type: 'button', style: { margin: 0, color: i === a.idx ? 'var(--gold)' : 'var(--cream)' }, onclick: () => { a.setMode('playlist'); a.playIndex(i); } }, t.name))));
  };
  const prevCb = a.onChange; a.onChange = () => { prevCb?.(); draw(); }; draw();
  const modeBtn = (m, label) => h('button', { class: 'btn', type: 'button', 'aria-pressed': String(a.mode === m), onclick: () => { a.start(); a.setMode(m); api.refresh(); } }, label);
  const vol = h('input', { type: 'range', id: 'vol', min: 0, max: 1, step: 0.01, value: ctx.state.music.vol, 'aria-label': 'Volume', oninput: e => { a.start(); a.setVolume(+e.target.value); ctx.save(); } });
  file.addEventListener('change', () => { const n = a.loadFiles(file.files); if (n) { ctx.toast(`${n} track(s) added. Files stay on this device.`); a.setMode('playlist'); a.playIndex(a.idx < 0 ? 0 : a.idx); api.refresh(); } });
  const el = page('Music', 'Only slow jazz. Generated live in your browser (no recordings), or your own MP3s. Music is muffled slightly in the office and restrooms. Audio starts after your first click.',
    h('div', { class: 'grid g2' },
      h('div', { class: 'panel' }, h('h3', null, 'Source'), h('div', { class: 'seg', role: 'group', 'aria-label': 'Music source' }, modeBtn('generated', 'Generated jazz'), modeBtn('playlist', 'My MP3 playlist')), now,
        h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => a.prev() }, '⏮ Prev'), h('button', { class: 'btn small gold', type: 'button', onclick: () => { a.setMode('playlist'); a.togglePlay(); } }, 'Play / pause'), h('button', { class: 'btn small', type: 'button', onclick: () => a.next() }, 'Next ⏭'))),
      h('div', { class: 'panel' }, h('h3', null, 'Volume'), vol, h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', 'aria-pressed': String(a.muted), onclick: e => { a.start(); a.setMuted(!a.muted); e.target.setAttribute('aria-pressed', String(a.muted)); e.target.textContent = a.muted ? 'Unmute' : 'Mute'; } }, a.muted ? 'Unmute' : 'Mute')))),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Your playlist'), h('label', { for: 'mp3' }, 'Add MP3 / audio files (stay on this device, not saved between sessions)'), file, list));
  return { el, dispose: () => { a.onChange = prevCb; } };
}

// ── 12. Settings ────────────────────────────────────────────────────────────
function resizeImage(file, max = 1200) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.86)); }; img.onerror = () => rej(new Error('That file is not an image.')); img.src = url; });
}
export function settingsApp(ctx, api) {
  const { state: s } = ctx, name = h('input', { type: 'text', id: 'bar-name', maxlength: 28, value: s.name }), out = msgBox();
  const art = h('input', { type: 'file', id: 'art-file', accept: 'image/*' }), prev = h('img', { alt: s.art ? 'Preview of your uploaded artwork' : 'No artwork uploaded yet', style: { maxWidth: '100%', maxHeight: '180px', border: '1px solid var(--gold2)', borderRadius: '4px', display: s.art ? 'block' : 'none', marginTop: '10px' } });
  if (s.art) prev.src = s.art;
  art.addEventListener('change', async () => { const f = art.files[0]; if (!f) return; try { const src = await resizeImage(f); ctx.setArt(src); prev.src = src; prev.alt = 'Preview of your uploaded artwork'; prev.style.display = 'block'; say(out, { ok: true, msg: 'Artwork placed in the frame in your office.' }); } catch (e) { say(out, { ok: false, msg: e.message }); } });
  const confirmBox = h('div', { class: 'panel', hidden: true, style: { borderColor: 'var(--bad)', marginTop: '10px' }, role: 'alertdialog', 'aria-labelledby': 'rs-t' },
    h('h3', { id: 'rs-t', style: { color: 'var(--bad)' } }, 'Erase everything?'), h('p', null, 'This deletes your layout, pins, staff, bookings, events, ledger and artwork from this device and starts a brand new bar. It cannot be undone.'),
    h('div', { class: 'row', style: { margin: 0 } }, h('button', { class: 'btn danger', type: 'button', onclick: () => ctx.resetGame() }, 'Yes, erase and restart'), h('button', { class: 'btn', type: 'button', onclick: () => { confirmBox.hidden = true; } }, 'Cancel')));
  return page('Settings', 'Everything is stored only in this browser (localStorage). No accounts, no tracking, no network calls.',
    h('div', { class: 'grid g2' },
      h('div', { class: 'panel' }, h('h3', null, 'Bar name'), h('label', { for: 'bar-name' }, 'Shown on the HUD and the neon sign'), name, h('div', { class: 'row' }, h('button', { class: 'btn gold', type: 'button', onclick: () => { ctx.setName(name.value.trim()); say(out, { ok: true, msg: 'Renamed. Look at the neon sign behind the bar.' }); } }, 'Save name'))),
      h('div', { class: 'panel' }, h('h3', null, 'Office frame artwork'), h('label', { for: 'art-file' }, 'Upload image (hangs in the big frame in your office)'), art, prev,
        s.art ? h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { ctx.setArt(null); api.refresh(); } }, 'Remove artwork')) : null)),
    out,
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Mouse look'), h('div', { class: 'row', style: { margin: 0 } },
      [['invX', 'Invert left / right'], ['invY', 'Invert up / down']].map(([k, l]) => h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', margin: 0, color: 'var(--cream)' } }, h('input', { type: 'checkbox', checked: !!s.prefs?.[k], style: { width: '16px', height: '16px' }, onchange: e => ctx.setPref(k, e.target.checked) }), l)))),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Save file'), h('p', { class: 'muted' }, 'Your progress is stored in this browser only. Export it to a file to move it to another computer or keep a backup, then import it there. The file stays on your device.'),
      h('div', { class: 'row', style: { margin: 0 } }, h('button', { class: 'btn', type: 'button', onclick: () => { const url = URL.createObjectURL(new Blob([ctx.exportSave()], { type: 'application/json' })); const a2 = h('a', { href: url, download: 'velvet-note-save.json' }); document.body.append(a2); a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); say(out, { ok: true, msg: 'Save file downloaded.' }); } }, 'Export save'),
        h('label', { class: 'btn', for: 'imp', style: { margin: 0, cursor: 'pointer' } }, 'Import save…'), h('input', { type: 'file', id: 'imp', accept: '.json,application/json', style: { display: 'none' }, onchange: async e => { try { ctx.importSave(await e.target.files[0].text()); } catch (er) { say(out, { ok: false, msg: er.message }); } } }))),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Graphics'), h('label', { for: 'gfx' }, 'Quality (bloom, soft shading, resolution). Auto lowers it if your computer struggles.'),
      h('select', { id: 'gfx', onchange: e => { ctx.setQuality(e.target.value); say(out, { ok: true, msg: 'Graphics: ' + e.target.value }); } }, [['auto', 'Auto'], ['high', 'High (bloom + soft shading)'], ['balanced', 'Balanced'], ['fast', 'Fast (no bloom)']].map(([v, l]) => h('option', { value: v, selected: (s.quality ?? 'auto') === v }, l)))),
    h('div', { class: 'panel', style: { marginTop: '14px' } }, h('h3', null, 'Reset save'), h('p', { class: 'muted' }, 'Start over from scratch with a fresh bar and €60,000.'), h('button', { class: 'btn danger', type: 'button', onclick: () => { confirmBox.hidden = false; } }, 'Reset save…'), confirmBox));
}
