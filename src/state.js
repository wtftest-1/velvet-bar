// Game state, localStorage autosave and double-entry-correct finance helpers.
import { DEFAULT_LAYOUT, FURNITURE, MENU, CONFIG, STAFF_ROLES } from './data/catalog.js';

const KEY = 'velvetnote.save.v1';
export const SAVE_KEY = KEY;

export function newState() {
  const items = DEFAULT_LAYOUT.map((d, i) => ({ id: i + 1, k: d.k, f: d.f, x: d.x, z: d.z, r: d.r || 0, m: {}, cost: FURNITURE[d.k].price }));
  const assetCost = items.reduce((s, i) => s + i.cost, 0);
  const s = {
    v: 1, name: 'The Velvet Note', day: 1, open: false, speed: 1, rep: CONFIG.startRep, cleanliness: 1,
    fin: { cash: CONFIG.startCash, deferred: 0, assetCost, accDep: 0, capital: CONFIG.startCash + assetCost, retained: 0 },
    ledger: [], lid: 0, items, nextId: items.length + 1, pins: [], nextPin: 1,
    staff: Object.fromEntries(Object.keys(STAFF_ROLES).map(k => [k, 0])), bookings: [], events: [], ads: [], invites: [], nid: 1,
    menu: Object.fromEntries(MENU.map(m => [m.id, m.price])), music: { mode: 'generated', vol: 0.7, muted: false },
    art: null, history: [], lastReport: null, surfaces: {}, dims: { hall: 0, stage: 0 }, prefs: { invX: false, invY: false },
  };
  post(s, { kind: 'equity', cat: 'capital', desc: 'Opening capital contributed in cash', amount: CONFIG.startCash, cash: CONFIG.startCash });
  post(s, { kind: 'equity', cat: 'capital', desc: 'Opening furniture contributed in kind', amount: assetCost, cash: 0 });
  return s;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return null;
    const s = JSON.parse(raw), base = newState();
    const merged = { ...base, ...s, fin: { ...base.fin, ...s.fin }, staff: { ...base.staff, ...s.staff }, menu: { ...base.menu, ...s.menu }, music: { ...base.music, ...s.music }, surfaces: { ...(s.surfaces || {}) }, dims: { ...base.dims, ...(s.dims || {}) }, prefs: { ...base.prefs, ...(s.prefs || {}) } };
    merged.open = false; // a night in progress is not saved
    merged.items = merged.items.filter(i => FURNITURE[i.k]);
    return merged;
  } catch { return null; }
}
let timer = 0;
export function saveSoon(state) { clearTimeout(timer); timer = setTimeout(() => saveNow(state), 400); }
export function saveNow(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function resetSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

// ── ledger / finance ────────────────────────────────────────────────────────
// kinds: rev (income), exp (expense), capex (asset purchase), deferral (ticket cash received / refunded),
//        disposal (asset sold), equity.  Balance: cash + assets(NBV) = deferred + capital + retained.
export function post(s, e) { e.id = ++s.lid; e.day = e.day ?? s.day; s.ledger.push(e); return e; }

export const fin = {
  /** income recognised and received in cash right now (aggregated lines are posted separately by sim) */
  addRevenue(s, amt) { s.fin.cash += amt; s.fin.retained += amt; },
  addExpense(s, amt, cash = true) { if (cash) s.fin.cash -= amt; s.fin.retained -= amt; },
  sale(s, cat, desc, amt) { this.addRevenue(s, amt); post(s, { kind: 'rev', cat, desc, amount: amt, cash: amt }); },
  expense(s, cat, desc, amt, cash = true) { this.addExpense(s, amt, cash); post(s, { kind: 'exp', cat, desc, amount: amt, cash: cash ? -amt : 0 }); },
  buyAsset(s, desc, cost) { s.fin.cash -= cost; s.fin.assetCost += cost; post(s, { kind: 'capex', cat: 'furniture', desc, amount: cost, cash: -cost }); },
  sellAsset(s, desc, cost, proceeds) {
    const f = s.fin, accShare = f.assetCost > 0 ? f.accDep * cost / f.assetCost : 0, nbv = cost - accShare, loss = nbv - proceeds;
    f.cash += proceeds; f.accDep -= accShare; f.assetCost -= cost; f.retained -= loss;
    post(s, { kind: 'disposal', cat: 'furniture', desc: desc + ` (book value ${nbv.toFixed(0)})`, amount: proceeds, cash: proceeds });
    if (Math.abs(loss) > 0.005) post(s, { kind: 'exp', cat: 'disposal', desc: 'Loss on disposal: ' + desc, amount: loss, cash: 0 });
  },
  depreciate(s) { const d = s.fin.assetCost / (CONFIG.depreciationYears * 365); s.fin.accDep += d; s.fin.retained -= d; post(s, { kind: 'exp', cat: 'depreciation', desc: 'Daily depreciation of furniture', amount: d, cash: 0 }); },
  ticketCash(s, desc, amt) { s.fin.cash += amt; s.fin.deferred += amt; post(s, { kind: 'deferral', cat: 'tickets', desc, amount: amt, cash: amt }); },
  ticketRecognise(s, desc, amt) { s.fin.deferred -= amt; s.fin.retained += amt; post(s, { kind: 'rev', cat: 'tickets', desc, amount: amt, cash: 0 }); },
  ticketRefund(s, desc, amt) { s.fin.cash -= amt; s.fin.deferred -= amt; post(s, { kind: 'deferral', cat: 'tickets', desc, amount: -amt, cash: -amt }); },
  check(s) { const f = s.fin; return (f.cash + f.assetCost - f.accDep) - (f.deferred + f.capital + f.retained); },
};

export const fmt = n => (n < 0 ? '-' : '') + '€' + Math.abs(Math.round(n)).toLocaleString('en-GB');
export const fmt2 = n => (n < 0 ? '-' : '') + '€' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const dayName = d => DAYS[(d - 1) % 7];
export const isWeekend = d => (d - 1) % 7 >= 4;
export const clockStr = min => { const m = Math.floor(20 * 60 + min) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
