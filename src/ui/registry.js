// The list of office-computer apps (order = dock order). Each: { id, title, icon, render(ctx, api, params) → element | {el, dispose} }
import { dashboard, pinsApp, staffApp, bookingsApp, eventsApp, adsApp, invitesApp, financeApp, menuApp, musicApp, settingsApp } from './apps.js';
import { designApp } from './design.js';

export const APPS = [
  { id: 'dashboard', title: 'Dashboard', icon: '◈', render: dashboard },
  { id: 'design', title: 'Design', icon: '▦', render: designApp },
  { id: 'pins', title: 'Pins', icon: '◉', render: pinsApp },
  { id: 'staff', title: 'Staff', icon: '☺', render: staffApp },
  { id: 'bookings', title: 'Bookings', icon: '♪', render: bookingsApp },
  { id: 'events', title: 'Events & Tickets', icon: '✦', render: eventsApp },
  { id: 'ads', title: 'Advertising', icon: '☄', render: adsApp },
  { id: 'invites', title: 'Invitations', icon: '✉', render: invitesApp },
  { id: 'finance', title: 'Finances', icon: '€', render: financeApp },
  { id: 'menu', title: 'Menu', icon: '☕', render: menuApp },
  { id: 'music', title: 'Music', icon: '♫', render: musicApp },
  { id: 'settings', title: 'Settings', icon: '⚙', render: settingsApp },
];
