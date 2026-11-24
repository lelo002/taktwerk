'use strict';
const { html, render, useState, useEffect, useLayoutEffect, useRef } = htmPreact;
const C = window.CONFIG, PHASES = C.phases;
document.title = C.appName;

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const isWeekend = s => [0, 6].includes(parseD(s).getDay());
const nextWorkday = s => { do s = addDays(s, 1); while (isWeekend(s)); return s; };
const fmtD = s => s ? parseD(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–';
const fmtLong = s => parseD(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const relDay = s => { const n = daysBetween(today(), s); return n === 0 ? 'heute' : n === 1 ? 'morgen' : n === -1 ? 'gestern' : n < 0 ? `vor ${-n} Tagen` : n < 8 ? `in ${n} Tagen` : fmtD(s); };
// „Heute“, „Gestern“, „Morgen“ oder „Mi, 25.11.26“
const dayLabel = s => ({ 0: 'Heute', 1: 'Morgen', '-1': 'Gestern' })[daysBetween(today(), s)] || parseD(s).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtStamp = t => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const hm = t => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toHM = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Nur Zeichen a–v und 0–9: dadurch zugleich als Google-Event-ID gültig
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => '0123456789abcdefghijklmnopqrstuv'[b % 32]).join('');
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : u ? 'https://' + u.replace(/^[a-z]+:(\/\/)?/i, '') : '';
const phaseIdx = id => Math.max(0, PHASES.findIndex(p => p.id === id));
const PRIO = { hoch: 0, normal: 1, niedrig: 2 }, prioOf = t => PRIO[t.priority] ?? 1;
const byTime = (a, b) => (a.start || '99').localeCompare(b.start || '99') || prioOf(a) - prioOf(b) || (a.createdAt || 0) - (b.createdAt || 0);

// ── Zentraler Zustand ──
const S = {
  data: { users: {}, clients: {}, projects: {}, tasks: {}, reports: {}, activity: {}, prefs: {}, offers: {}, settings: {}, publicOffers: {} },
  me: null, mode: C.firebase ? 'firebase' : 'demo', ready: false, error: null,
  cal: { token: null, exp: 0, events: [], busy: false, error: null },
  modal: null, toasts: [], drag: null, listeners: new Set(),
};
let queued = false;
function notify() { if (queued) return; queued = true; queueMicrotask(() => { queued = false; S.listeners.forEach(f => f()); }); }
function toast(text, action) {
  const t = { id: newId(), text, action }; S.toasts = [t]; notify();
  setTimeout(() => { S.toasts = S.toasts.filter(x => x !== t); notify(); }, action ? 7000 : 3500);
}
const openModal = (type, props = {}) => {
  if (type === 'user' && SB.on) return toast('Mitarbeitende pflegst du in Supabase (Tabelle employees)');
  S.modal = { type, props, key: newId() }; notify(); };
const closeModal = () => { S.modal = null; notify(); };

const list = col => Object.values(S.data[col]);
const get = (col, id) => id ? S.data[col][id] : undefined;
const uid = () => S.me;
const me = () => get('users', S.me);
const users = () => list('users').filter(u => !u.inactive).sort((a, b) => a.name.localeCompare(b.name));
const projects = () => list('projects').filter(p => !p.archived);
const myProjects = u => projects().filter(p => p.ownerId === u || (p.memberIds || []).includes(u));
const sinceDays = p => p.phaseSince ? daysBetween(iso(new Date(p.phaseSince)), today()) : 0;
const inCare = p => p.phase === PHASES[PHASES.length - 1].id;
const isOverdue = p => !!p.deadline && p.deadline < today() && !inCare(p);
const isStuck = p => !inCare(p) && sinceDays(p) >= C.stuckDays;
const isUrgent = p => !inCare(p) && (p.priority === 'hoch' || (!!p.deadline && daysBetween(today(), p.deadline) <= 5));
const clientOf = t => get('clients', t.projectId ? get('projects', t.projectId)?.clientId : t.clientId);
const linkLabel = t => { const p = get('projects', t.projectId), c = clientOf(t); return [c?.name, p?.name].filter(Boolean).join(' · '); };
const CLIENT_STATUS = ['Onboarding', 'Aktiv', 'Nicht mehr aktiv'];
// Ältere Werte (aktiv, pausiert, ehemalig) weiter verstehen
const cStatus = c => CLIENT_STATUS.includes(c.status) ? c.status : !c.status || c.status === 'aktiv' ? 'Aktiv' : 'Nicht mehr aktiv';
const MOODS = ['', 'Sehr unzufrieden', 'Unzufrieden', 'Neutral', 'Zufrieden', 'Sehr zufrieden'];
const clientMood = id => { const m = projects().filter(p => p.clientId === id && p.mood).map(p => p.mood); return m.length ? Math.round(m.reduce((a, b) => a + b) / m.length) : 0; };
const delegated = u => list('tasks').filter(t => t.createdBy === u && t.assigneeId !== u && !isBlocker(t)).sort((a, b) => (a.date || '9').localeCompare(b.date || '9') || byTime(a, b));
const report = (u, d) => get('reports', u + '_' + d);
// Blocker (z. B. Mittagspause) belegen nur Zeit und werden nie abgehakt
const BLOCK_RE = /mittag|pause|lunch|blocker|geblockt|fokus|focus|urlaub|abwesend|feierabend/i;
const isBlocker = t => t.kind === 'blocker' || (!!t.external && !t.kindSet && BLOCK_RE.test(t.title || ''));
const isT = t => t.kind === 'termin';
const myAll = u => list('tasks').filter(t => t.assigneeId === u);
const myTasks = u => myAll(u).filter(t => !isBlocker(t));
// Name zur E-Mail, wenn Team oder Kunde bekannt sind
const personName = e => users().find(u => u.email === e)?.name || list('clients').find(c => (c.contactEmail || '').toLowerCase() === e)?.contactName || '';
// Was steht an einem Tag an? Heute zusätzlich Unerledigtes von früher.
const dayTasks = (u, d) => myTasks(u).filter(t => t.date === d || (d === today() && t.date && t.date < d && !t.done) || (t.done && t.doneOn === d && t.date && t.date < d)).sort(byTime);
const doneOn = (u, d) => myTasks(u).filter(t => t.done && t.doneOn === d).sort(byTime);
const openOn = (u, d) => myTasks(u).filter(t => !t.done && t.date && (d === today() ? t.date <= d : t.date === d)).sort(byTime);
