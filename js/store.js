'use strict';
const LS = C.supabase?.url ? 'taktwerk-sb-' + C.supabase.url.replace(/\W/g, '') : 'taktwerk-supabase-demo-v2';
// Kunden, Projekte und Mitarbeitende liegen bei Supabase und werden nicht im Browser gespeichert
const localData = d => { if (!SB.on) return d; const { users, clients, projects, ...rest } = d; return rest; };
let FB = null; // Firebase-Funktionen, sobald geladen
const V = '11.6.0', CDN = f => `https://www.gstatic.com/firebasejs/${V}/firebase-${f}.js`;
const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let lastRaw = null;
// Demo: Änderungen aus anderen Tabs übernehmen (Safari meldet sie bei lokalen Dateien nicht)
function pullDemo() { try { const raw = localStorage.getItem(LS); if (!raw || raw === lastRaw) return; lastRaw = raw; S.data = { ...S.data, ...localData(JSON.parse(raw).data) }; notify(); } catch {} }
function persist() { try { lastRaw = JSON.stringify({ data: localData(S.data), me: S.me }); localStorage.setItem(LS, lastRaw); } catch { toast('Speichern im Browser nicht möglich'); } }
// Speichert nur die übergebenen Felder; alle anderen bleiben erhalten.
async function save(col, id, patch) {
  const isNew = !S.data[col][id];
  S.data[col] = { ...S.data[col], [id]: { ...(S.data[col][id] || {}), ...patch, id } };
  notify();
  if (sbCol(col)) { try { await sbSave(col, id, patch, S.data[col][id], isNew); } catch (e) { sbFail(e); throw e; } return; }
  if (S.mode === 'demo') return persist();
  try { await FB.setDoc(FB.doc(FB.db, col, id), { ...patch, id }, { merge: true }); } catch (e) { dbError(e); throw e; }
}
async function del(col, id) {
  const { [id]: _, ...rest } = S.data[col]; S.data[col] = rest; notify();
  if (sbCol(col)) { try { await sbDel(col, id); } catch (e) { sbFail(e); throw e; } return; }
  if (S.mode === 'demo') return persist();
  try { await FB.deleteDoc(FB.doc(FB.db, col, id)); } catch (e) { dbError(e); throw e; }
}
function dbError(e) { console.error(e); toast(e.code === 'permission-denied' ? 'Keine Berechtigung für diese Änderung' : 'Speichern fehlgeschlagen, bitte Verbindung prüfen'); }

const log = (projectId, text, type = 'info') => { const id = newId(); return save('activity', id, { projectId, userId: uid(), text, type, at: Date.now() }); };

// ── Start ──
async function boot() {
  if (PUBLIC) return bootPublic();
  if (SB.on) return sbBoot();
  if (S.mode === 'demo') {
    let st = null; try { st = JSON.parse(localStorage.getItem(LS)); } catch {}
    S.data = { ...S.data, ...(st?.data || demoData()) }; S.me = st?.me || 'M001'; S.ready = true; if (!st) persist(); notify();
    addEventListener('storage', pullDemo); addEventListener('focus', pullDemo); setInterval(pullDemo, 1500);
    return;
  }
  try {
    const [a, au, f] = await Promise.all([import(CDN('app')), import(CDN('auth')), import(CDN('firestore'))]);
    const app = a.initializeApp(C.firebase);
    FB = { ...au, ...f, auth: au.getAuth(app), db: f.initializeFirestore(app, { ignoreUndefinedProperties: true }) };
    let stops = [];
    au.onAuthStateChanged(FB.auth, u => {
      stops.forEach(s => s()); stops = [];
      S.error = null; S.ready = false;
      if (!u) { S.me = null; S.ready = true; return notify(); }
      S.me = u.email.toLowerCase(); loadToken(); try { localStorage.setItem('tw-team', '1'); } catch {}
      stops = listen(u);
    });
  } catch (e) { console.error(e); S.error = 'Die Verbindung zu Firebase ist fehlgeschlagen. Bitte Internet und config.js prüfen.'; notify(); }
}
function listen(u) {
  const { collection, query, where, orderBy, limit, onSnapshot, doc, db } = FB, from = addDays(today(), -45);
  const need = new Set(['users', 'clients', 'projects', 'tOpen', 'tDone', 'reports', 'activity', 'prefs', 'offers', 'settings', 'publicOffers']), parts = {};
  const fail = e => { console.error(e); S.error = e.code === 'permission-denied' ? `Die Adresse ${u.email} ist für diese App nicht freigeschaltet (siehe firestore.rules).` : 'Datenbankfehler: ' + e.message; notify(); };
  const got = k => {
    if (!need.delete(k) || need.size) return;
    S.ready = true;
    if (!S.data.users[S.me]) save('users', S.me, { name: u.displayName || u.email.split('@')[0], email: S.me, role: '' }).catch(() => {});
    refreshCal();
  };
  const sub = (key, q, apply) => onSnapshot(q, sn => { const m = {}; sn.forEach(x => { m[x.id] = { ...x.data(), id: x.id }; }); apply(m); got(key); notify(); }, fail);
  const simple = (col, q) => sub(col, q, m => { S.data[col] = m; });
  const tasks = k => m => { parts[k] = m; S.data.tasks = { ...parts.tOpen, ...parts.tDone }; };
  return [
    simple('users', collection(db, 'users')), simple('clients', collection(db, 'clients')), simple('projects', collection(db, 'projects')),
    sub('tOpen', query(collection(db, 'tasks'), where('done', '==', false)), tasks('tOpen')),
    sub('tDone', query(collection(db, 'tasks'), where('doneOn', '>=', from)), tasks('tDone')),
    simple('offers', collection(db, 'offers')), simple('settings', collection(db, 'settings')),
    sub('publicOffers', collection(db, 'publicOffers'), m => { S.data.publicOffers = m; }),
    simple('reports', query(collection(db, 'reports'), where('date', '>=', from))),
    simple('activity', query(collection(db, 'activity'), orderBy('at', 'desc'), limit(200))),
    onSnapshot(doc(db, 'prefs', S.me), d => { S.data.prefs = d.exists() ? { [S.me]: { ...d.data(), id: S.me } } : {}; got('prefs'); notify(); }, fail),
  ];
}
// Anmeldung und Kalenderfreigabe in einem Schritt
async function googleLogin() {
  const p = new FB.GoogleAuthProvider(); p.addScope(CAL_SCOPE);
  if (S.me) p.setCustomParameters({ login_hint: S.me });
  try {
    const before = S.me, r = await FB.signInWithPopup(FB.auth, p), token = FB.GoogleAuthProvider.credentialFromResult(r)?.accessToken;
    const email = r.user.email.toLowerCase();
    if (before && before !== email) { logout(); return; }
    if (token) {
      S.cal = { ...S.cal, token, exp: Date.now() + 55 * 6e4, error: null };
      sessionStorage.setItem('gcal', JSON.stringify({ token, exp: S.cal.exp, me: email }));
      if (S.me && S.ready) refreshCal();
    }
  } catch (e) { if (!/popup-closed|cancelled-popup/.test(e.code || '')) { console.error(e); toast(e.code === 'auth/unauthorized-domain' ? 'Diese Web-Adresse ist in Firebase noch nicht freigegeben' : 'Google-Anmeldung fehlgeschlagen'); } }
  notify();
}
function loadToken() {
  try { const t = JSON.parse(sessionStorage.getItem('gcal')); if (t?.me === S.me && t.exp > Date.now()) S.cal = { ...S.cal, token: t.token, exp: t.exp }; } catch {}
}
async function logout() {
  if (SB.on) return sbLogout();
  sessionStorage.removeItem('gcal');
  S.cal = { token: null, exp: 0, events: [], busy: false, error: null };
  await FB.signOut(FB.auth); location.reload();
}
function switchDemoUser(id) { S.me = id; persist(); notify(); }
function resetDemo() { if (confirm('Alle Demo-Daten auf den Anfangszustand zurücksetzen?')) { S.data = { ...S.data, ...demoData() }; S.me = 'M001'; persist(); notify(); } }

// ── Fachliche Aktionen ──
async function saveTask(id, patch, { sync = true } = {}) {
  const prev = id ? get('tasks', id) : null;
  id = id || newId();
  const x = { ...patch, updatedAt: Date.now() };
  if (!prev) Object.assign(x, { kind: 'todo', date: '', start: '', end: '', projectId: '', clientId: '', done: false, assigneeId: uid(), ...patch, createdBy: uid(), createdAt: Date.now() });
  if (x.assigneeId && x.assigneeId !== prev?.assigneeId) x.seen = x.assigneeId === uid();
  if (x.projectId) x.clientId = '';
  if (x.start && (!x.end || toMin(x.end) <= toMin(x.start))) x.end = toHM(Math.min(toMin(x.start) + 60, 1439));
  if (x.date === '' || x.start === '') { x.start = ''; x.end = ''; }
  try { await save('tasks', id, x); } catch { return null; }
  const calRelevant = !prev || ['title', 'date', 'start', 'end', 'assigneeId', 'done', 'notes', 'projectId', 'clientId', 'guests', 'kind'].some(k => k in x && x[k] !== prev[k]);
  if (sync && calRelevant) { const ch = k => !prev || (k in x && JSON.stringify(x[k]) !== JSON.stringify(prev[k])); syncTask(id, { notify: ['title', 'date', 'start', 'end', 'assigneeId', 'guests'].some(ch), doneOnly: !!prev && ch('done') && !['title', 'date', 'start', 'end', 'assigneeId', 'guests', 'notes', 'projectId', 'clientId', 'kind'].some(ch) }); }
  return id;
}
async function toggleTask(t) {
  const done = !t.done;
  await saveTask(t.id, { done, doneOn: done ? today() : '', doneAt: done ? Date.now() : 0 });
  if (done) toast('Erledigt: ' + t.title, { label: 'Rückgängig', run: () => { const c = get('tasks', t.id); if (c?.done) toggleTask(c); } });
  if (done && t.projectId) log(t.projectId, `„${t.title}" erledigt`, 'task').catch(() => {});
}
async function deleteTask(t) {
  if (t.guests?.length && !t.external && t.start && !confirm('Die Teilnehmenden erhalten eine Absage. Wirklich löschen?')) return;
  try { await del('tasks', t.id); } catch { return; }
  const copy = { ...t };
  removeEvent(t);
  toast('Gelöscht', { label: 'Rückgängig', run: () => { const { id, gcalId, gcalBy, ...rest } = copy; const keep = copy.external ? { gcalId, gcalBy } : {}; save('tasks', id, { ...rest, ...keep }).then(() => syncTask(id)).catch(() => {}); } });
}
function movePhase(p, phase) {
  if (p.phase === phase) return;
  save('projects', p.id, { phase, phaseSince: Date.now(), history: [...(p.history || []), { phase, at: Date.now(), by: uid() }] }).catch(() => {});
  log(p.id, `Phase geändert zu „${PHASES[phaseIdx(phase)].name}"`, 'phase').catch(() => {});
}
