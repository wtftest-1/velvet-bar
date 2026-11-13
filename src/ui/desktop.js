// Full-screen "fancy 80s computer" shell. Apps live in apps.js and design.js.
import { APPS } from './registry.js';
import { fmt, dayName, clockStr } from '../state.js';

import { h } from './dom.js';
export { h };

export class Desktop {
  constructor(root, ctx) { this.root = root; this.ctx = ctx; this.liveFns = []; this.current = null; this.last = 'dashboard'; this.isOpen = false; this.timer = 0; this.escHook = null; }

  open(appId) {
    this.isOpen = true; this.root.hidden = false;
    const s = this.ctx.state;
    this.info = { day: h('span'), clock: h('span'), cash: h('span') };
    this.dock = h('nav', { class: 'dt-dock', role: 'tablist', 'aria-label': 'Applications', 'aria-orientation': 'vertical' },
      APPS.map(a => h('button', { class: 'dock-btn', role: 'tab', id: 'tab-' + a.id, 'aria-selected': 'false', 'aria-controls': 'dt-main', type: 'button', title: a.title, onclick: () => this.select(a.id) },
        h('span', { class: 'dock-ic', 'aria-hidden': 'true' }, a.icon), a.title)));
    this.main = h('main', { class: 'dt-main', id: 'dt-main', role: 'tabpanel', tabindex: '-1' });
    this.status = h('span');
    this.root.replaceChildren(h('div', { class: 'dt-frame' },
      h('header', { class: 'dt-top' }, h('span', { class: 'dt-logo' }, 'VELVET OS 8.6'), h('span', { class: 'muted' }, s.name + ' · Office terminal'),
        h('span', { class: 'dt-info' }, this.info.day, this.info.clock, this.info.cash),
        h('button', { class: 'btn gold', type: 'button', onclick: () => this.ctx.enterBuild() }, 'Walk & build in 3D ▸'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => this.ctx.closeDesktop(), 'aria-label': 'Close computer (Escape)' }, '✕ Close computer')),
      this.dock, this.main,
      h('footer', { class: 'dt-status' }, this.status, h('span', null, 'Autosaved on this device · nothing leaves your browser'))));
    this.select(appId || this.last);
    this.timer = setInterval(() => this.tick(), 500); this.tick();
  }

  close() { this.isOpen = false; this.root.hidden = true; clearInterval(this.timer); this.liveFns = []; this.current?.dispose?.(); this.current = null; this.root.replaceChildren(); }

  select(id, params) {
    const app = APPS.find(a => a.id === id) ?? APPS[0]; this.last = app.id;
    this.current?.dispose?.(); this.liveFns = []; this.escHook = null;
    for (const b of this.dock.children) b.setAttribute('aria-selected', String(b.id === 'tab-' + app.id));
    this.main.setAttribute('aria-labelledby', 'tab-' + app.id);
    const api = { refresh: () => this.select(app.id, params), live: fn => this.liveFns.push(fn), select: (i, p) => this.select(i, p), onEscape: fn => { this.escHook = fn; }, setStatus: t => { this.status.textContent = t; } };
    this.status.textContent = '';
    const view = app.render(this.ctx, api, params || {});
    this.current = { app, dispose: view.dispose };
    this.main.replaceChildren(view.el ?? view); this.main.scrollTop = 0;
  }

  tick() {
    const s = this.ctx.state, n = this.ctx.sim.night;
    this.info.day.textContent = `Day ${s.day} · ${dayName(s.day)}`;
    this.info.clock.textContent = n ? clockStr(n.min) + ' OPEN' : 'CLOSED';
    this.info.cash.textContent = 'Cash ' + fmt(s.fin.cash);
    for (const f of this.liveFns) f();
  }

  /** returns true if Escape was consumed by the app */
  escape() { if (this.escHook?.()) return true; return false; }
}
