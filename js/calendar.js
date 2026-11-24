'use strict';
// ── Google Kalender ──  (Demo-Modus: simulierte Termine, kein Netzwerkzugriff)
const GAPI = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const calOn = () => S.mode === 'demo' || (!!S.cal.token && S.cal.exp > Date.now());
const inflight = new Map(), retried = new Map();
let calDate = null, calReq = 0;

async function gapi(method, path = '', body) {
  const r = await fetch(GAPI + path, { method, headers: { Authorization: 'Bearer ' + S.cal.token, ...(body && { 'Content-Type': 'application/json' }) }, body: body && JSON.stringify(body) });
  if (r.status === 401) { S.cal = { ...S.cal, token: null }; sessionStorage.removeItem('gcal'); notify(); }
  if (!r.ok) throw Object.assign(new Error('Google ' + r.status), { status: r.status });
  return r.status === 204 ? null : r.json();
}
function eventBody(t) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone, org = t.gcalBy || uid(), email = u => get('users', u)?.email || u;
  // Bei fremder Zuweisung erhält die Person eine Einladung; der eigene Kalender bleibt frei (abgelehnt).
  const guests = (t.guests || []).filter(g => g !== email(org) && g !== email(t.assigneeId));
  let attendees = t.assigneeId === org ? [] : [{ email: email(t.assigneeId), ...(t.assigneeId === uid() && { responseStatus: 'accepted' }) }, { email: email(org), responseStatus: 'declined' }];
  if (guests.length) attendees = [...(attendees.length ? attendees : [{ email: email(org), responseStatus: 'accepted' }]), ...guests.map(g => ({ email: g }))];
  return {
    // Sind Gäste dabei, bleiben interne Notizen und der Erledigt-Haken privat
    summary: (t.done && !guests.length ? '✅ ' : '') + t.title,
    description: guests.length ? '' : [linkLabel(t), t.notes, `Erstellt mit ${C.appName}`].filter(Boolean).join('\n\n'),
    start: { dateTime: `${t.date}T${t.start}:00`, timeZone: tz }, end: { dateTime: `${t.date}T${t.end}:00`, timeZone: tz },
    attendees, guestsCanModify: !guests.length, colorId: t.done ? '8' : null,
    extendedProperties: { shared: { taskId: t.id } },
  };
}
// Reihenfolge je Aufgabe wahren, damit schnelle Änderungen sich nicht überholen
function queue(id, fn) {
  const p = (inflight.get(id) || Promise.resolve()).then(fn).catch(e => {
    console.error(e); toast('Google Kalender nicht aktualisiert – wird später erneut versucht');
    if (get('tasks', id)) return save('tasks', id, { gcalDirty: true }).catch(() => {});
  }).finally(() => { if (inflight.get(id) === p) inflight.delete(id); });
  inflight.set(id, p);
  return p;
}
function syncTask(id, { notify: tell = true, doneOnly = false } = {}) {
  if (S.mode === 'demo') return;
  const t0 = get('tasks', id); if (!t0) return;
  if (!calOn()) { if (t0.start || t0.gcalId) save('tasks', id, { gcalDirty: true }).catch(() => {}); return; }
  queue(id, async () => {
    const t = get('tasks', id); if (!t) return;
    if (t.external) { // übernommene Fremdtermine: nur die eigene Farbe ändern, nie Titel oder Zeit
      if (t.assigneeId === uid()) { await gapi('PATCH', `/${encodeURIComponent(t.gcalId)}?sendUpdates=none`, { colorId: t.done ? '8' : null }); if (t.gcalDirty) await save('tasks', id, { gcalDirty: false }); }
      return;
    }
    if (!t.date || !t.start) {
      if (t.gcalId) { await gapi('DELETE', `/${t.gcalId}?sendUpdates=all`).catch(e => { if (![404, 410].includes(e.status)) throw e; }); await save('tasks', id, { gcalId: '', gcalBy: '', gcalDirty: false }); }
      return;
    }
    if (t.gcalId) {
      try {
        if (doneOnly && t.guests?.length && !t.gcalDirty) { await gapi('PATCH', `/${t.gcalId}?sendUpdates=none`, { colorId: t.done ? '8' : null }); return; }
        const b = eventBody(t);
        if (b.attendees.length) { const old = (await gapi('GET', '/' + t.gcalId)).attendees || []; b.attendees = b.attendees.map(a => { const o = old.find(x => x.email?.toLowerCase() === a.email); return o ? { email: a.email, responseStatus: o.responseStatus, ...a } : a; }); }
        await gapi('PATCH', `/${t.gcalId}?sendUpdates=${t.gcalDirty || tell ? 'all' : 'none'}`, b); if (t.gcalDirty) await save('tasks', id, { gcalDirty: false }); return; }
      catch (e) { if (![404, 410].includes(e.status)) throw e; }
      // Wer das Ereignis nicht in seinem Kalender hat, darf es nicht doppelt anlegen
      if (t.gcalBy !== uid() && t.assigneeId !== uid()) return save('tasks', id, { gcalDirty: true });
    }
    const gcalId = newId(), org = uid(), b = eventBody({ ...t, gcalBy: org });
    await gapi('POST', '?sendUpdates=all', { ...b, id: gcalId, colorId: b.colorId || undefined });
    await save('tasks', id, { gcalId, gcalBy: org, gcalDirty: false });
  }).then(() => refreshCal());
}
function removeEvent(t) {
  if (S.mode === 'demo' || !t.gcalId || t.external) return;
  if (!calOn()) return toast('Google Kalender nicht verbunden: Eintrag dort bitte selbst löschen');
  (inflight.get(t.id) || Promise.resolve()).then(() => gapi('DELETE', `/${t.gcalId}?sendUpdates=all`)).then(() => refreshCal())
    .catch(e => { if (![404, 410].includes(e.status)) toast('Eintrag im Google Kalender konnte nicht gelöscht werden'); });
}
function showCal(date) { if (calDate !== date) { calDate = date; refreshCal(); } }
async function refreshCal() {
  if (S.mode === 'demo' || !S.ready || !calOn()) return;
  const base = calDate || today(), req = ++calReq;
  try {
    const q = new URLSearchParams({ timeMin: parseD(addDays(base, -7)).toISOString(), timeMax: parseD(addDays(base, 8)).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '500' });
    const r = await gapi('GET', '?' + q);
    if (req !== calReq) return;
    S.cal = { ...S.cal, error: null, events: (r.items || []).filter(e => e.status !== 'cancelled' && !e.attendees?.some(a => a.self && a.responseStatus === 'declined')).map(mapEvent) };
    pullChanges(); notify();
    // Nachholen: Zeiten, die ohne Kalenderverbindung gesetzt wurden
    myAll(uid()).filter(t => !inflight.has(t.id) && Date.now() - t.updatedAt > 6e4 && retried.get(t.id) !== t.updatedAt && (t.gcalDirty || (t.start && !t.gcalId && !t.done && t.date >= today())))
      .forEach(t => { retried.set(t.id, t.updatedAt); syncTask(t.id); });
  } catch (e) { console.error(e); S.cal = { ...S.cal, error: 'Kalender konnte nicht geladen werden' }; notify(); }
}
const guestsOf = e => (e.attendees || []).filter(a => !a.self && !a.resource && a.email).map(a => a.email.toLowerCase());
function mapEvent(e) {
  if (e.start.date) return { id: e.id, title: e.summary || '(Ohne Titel)', allDay: true, date: e.start.date, endDate: addDays(e.end.date, -1), taskId: e.extendedProperties?.shared?.taskId };
  const a = new Date(e.start.dateTime), b = new Date(e.end.dateTime), same = iso(a) === iso(b);
  return { id: e.id, title: e.summary || '(Ohne Titel)', date: iso(a), start: toHM(a.getHours() * 60 + a.getMinutes()), end: same ? toHM(b.getHours() * 60 + b.getMinutes()) : '23:59', updated: Date.parse(e.updated), guests: guestsOf(e), type: e.eventType, taskId: e.extendedProperties?.shared?.taskId, link: e.htmlLink };
}
// In Google verschobene Einträge in die App übernehmen
function pullChanges() {
  for (const e of S.cal.events) {
    if (e.allDay) continue;
    const t = list('tasks').find(x => x.gcalId === e.id);
    if (!t || t.gcalDirty || inflight.has(t.id) || e.updated <= t.updatedAt) continue;
    const own = [t.assigneeId, t.gcalBy].map(u => get('users', u)?.email || u), guests = (e.guests || []).filter(g => !own.includes(g));
    if (t.date !== e.date || t.start !== e.start || t.end !== e.end || guests.join() !== (t.guests || []).join()) saveTask(t.id, { date: e.date, start: e.start, end: e.end, guests }, { sync: false });
  }
}
const eventsOn = d => {
  const own = new Set(list('tasks').map(t => t.gcalId).filter(Boolean));
  return (S.mode === 'demo' ? demoEvents(d) : S.cal.events.filter(e => e.allDay ? e.date <= d && e.endDate >= d : e.date === d)).filter(e => !own.has(e.id) && !(e.taskId && get('tasks', e.taskId)));
};
const evBlocker = e => ['focusTime', 'outOfOffice', 'workingLocation'].includes(e.type) || (BLOCK_RE.test(e.title) && !e.guests?.length);
const importable = d => eventsOn(d).filter(e => !e.allDay && !evBlocker(e));
const importEvent = e => saveTask(null, { title: e.title, kind: 'termin', kindSet: true, guests: e.guests || [], date: e.date, start: e.start, end: e.end, gcalId: e.id, gcalBy: uid(), external: true }, { sync: false });

// Nächste freie Lücke in der Arbeitszeit
function freeSlot(date, len = 60, skipId) {
  const busy = [...eventsOn(date).filter(e => !e.allDay), ...myAll(uid()).filter(t => t.date === date && t.start && t.id !== skipId)]
    .map(x => [toMin(x.start), toMin(x.end)]).sort((a, b) => a[0] - b[0]);
  let s = toMin(C.workStart);
  if (date === today()) s = Math.max(s, Math.ceil(toMin(nowHM()) / 15) * 15);
  for (const [a, b] of busy) { if (a - s >= len) break; s = Math.max(s, Math.ceil(b / 15) * 15); }
  return s + len <= toMin(C.workEnd) ? { start: toHM(s), end: toHM(s + len) } : null;
}
setInterval(() => { if (!document.hidden) { refreshCal(); notify(); } }, 60000);
addEventListener('focus', () => refreshCal());
