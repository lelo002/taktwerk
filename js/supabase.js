'use strict';
// ═════ Supabase: Mitarbeitende, Kunden und Projekte ═════
// Alles andere (Aufgaben, Angebote, Berichte) bleibt vorerst in diesem Browser.
const SB = { on: false, cli: null, user: null, loading: false, busy: 0, cols: { users: 'employees', clients: 'clients', projects: 'projects' } };
const sbUrl = String(C.supabase?.url || '').trim().replace(/\/(rest|auth)\/v1.*$/, '').replace(/\/+$/, ''), sbKey = String(C.supabase?.key || '').trim();
SB.on = !!sbUrl && !!sbKey;
// Schutz: geheime Schlüssel gehören niemals in eine Web-App
const sbSecret = /^sb_secret_/.test(sbKey) || (() => { try { return JSON.parse(atob(sbKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch { return false; } })();
const sbCol = col => SB.on && SB.cols[col];
const nz = v => v === '' || v === undefined ? null : v;

// Felder der App ↔ Spalten der Datenbank. Was keine eigene Spalte hat, steht in „extra“ (jsonb).
const MAP = {
  clients: { name: 'name', industry: 'industry', contactName: 'contact_name', contactEmail: 'contact_email', status: 'status', phone: 'phone', street: 'street', zip: 'zip', city: 'city', country: 'country' },
  projects: { name: 'name', clientId: 'client_id', ownerId: 'owner_id', phase: 'phase', priority: 'priority', startDate: 'start_date', deadline: 'deadline' },
  users: { name: 'name', role: 'role', email: 'email', phone: 'phone' },
};
function fromRow(col, r) {
  const x = { ...(r.extra || {}) }; for (const [a, b] of Object.entries(MAP[col])) x[a] = r[b] ?? '';
  x.id = r.id; x.createdAt = r.created_at ? Date.parse(r.created_at) : 0;
  if (col === 'users') x.email = x.email.toLowerCase();
  if (col === 'projects') {
    const h = x.history || [], last = h[h.length - 1];
    if (!last || last.phase !== x.phase) { const at = h.length ? Date.now() : x.createdAt || Date.now(); x.history = [...h, { phase: x.phase, at, by: x.ownerId }]; x.phaseSince = at; }
    else x.phaseSince = last.at;
    x.memberIds ||= []; x.checks ||= {}; x.links ||= [];
  }
  return x;
}
function toRow(col, full, patch) {
  const row = {}; for (const [a, b] of Object.entries(MAP[col])) if (a in patch) row[b] = nz(patch[a]);
  const known = new Set([...Object.keys(MAP[col]), 'id', 'createdAt', 'phaseSince']);
  if (Object.keys(patch).some(k => !known.has(k))) row.extra = Object.fromEntries(Object.entries(full).filter(([k, v]) => !known.has(k) && v !== undefined));
  return row;
}
const sbText = e => e?.code === '23503' ? 'Nicht möglich: Der Eintrag ist noch mit anderen verknüpft oder der verknüpfte Eintrag fehlt' : e?.code === '23505' ? 'Diese Nummer gibt es schon, bitte erneut versuchen' : e?.code === '42501' ? 'Keine Berechtigung (RLS)' : e?.code === '23514' || e?.code === '23502' ? 'Die Datenbank hat die Eingabe abgelehnt: ' + e.message : /column|schema cache/i.test(e?.message || '') ? 'Spalte fehlt in Supabase: ' + e.message : 'Supabase: ' + (e?.message || 'Verbindung fehlgeschlagen');

async function sbSave(col, id, patch, full, isNew) {
  if (col === 'users') throw Object.assign(new Error('Mitarbeitende werden in Supabase gepflegt'), {});
  const row = toRow(col, full, patch); SB.busy++;
  // Leere Felder beim Anlegen weglassen, damit die Standardwerte der Datenbank greifen
  if (isNew) for (const k of Object.keys(row)) if (row[k] === null) delete row[k];
  try {
    const t = SB.cli.from(SB.cols[col]), { data, error } = isNew ? await t.insert({ id, ...row }).select('id') : await t.update(row).eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw { code: '42501' };
  } finally { SB.busy--; }
}
async function sbDel(col, id) {
  SB.busy++;
  try { const { data, error } = await SB.cli.from(SB.cols[col]).delete().eq('id', id).select('id'); if (error) throw error; if (!data?.length) throw { code: '42501' }; } finally { SB.busy--; }
}
// Nach einem Fehler den echten Stand zeigen
function sbFail(e) { console.error(e); toast(sbText(e)); sbLoad(true); }

async function sbAll(table) {
  const out = [];
  for (let from = 0; ; from += 1000) { const { data, error } = await SB.cli.from(table).select('*').order('id').range(from, from + 999); if (error) throw Object.assign(error, { table }); out.push(...data); if (data.length < 1000) return out; }
}
async function sbLoad(force) {
  if (!SB.user || (SB.loading && !force) || (SB.busy && !force)) return;
  SB.loading = true;
  try {
    const [u, c, p] = await Promise.all(['employees', 'clients', 'projects'].map(sbAll));
    if (SB.busy) return;
    const put = (col, rows) => { S.data[col] = Object.fromEntries(rows.map(r => [r.id, fromRow(col, r)])); };
    put('users', u); put('clients', c); put('projects', p);
    const my = u.find(x => (x.email || '').toLowerCase() === SB.user.email.toLowerCase());
    if (!my) S.error = `Die Anmeldung hat geklappt, aber ${SB.user.email} hat keinen Zugriff. Prüfe in Supabase die E-Mail in „employees“ und die Zugriffsregeln.`;
    else { S.me = my.id; S.error = null; S.ready = true; }
  } catch (e) { console.error(e); if (!S.ready) S.error = (e.table ? `Tabelle „${e.table}“: ` : '') + sbText(e); else toast(sbText(e)); }
  finally { SB.loading = false; }
  notify();
}
async function sbBoot() {
  if (sbSecret) { S.error = 'In config.js steht ein geheimer Schlüssel. Bitte sofort entfernen, in Supabase erneuern und stattdessen den Publishable Key verwenden.'; return notify(); }
  // Aufgaben, Angebote usw. bleiben lokal
  let st = null; try { st = JSON.parse(localStorage.getItem(LS)); } catch {}
  S.data = { ...S.data, ...(st?.data || {}), users: {}, clients: {}, projects: {} };
  try { SB.cli = supabase.createClient(sbUrl, sbKey); } catch (e) { console.error(e); S.error = 'Die Project URL in config.js ist ungültig.'; return notify(); }
  const { data } = await SB.cli.auth.getSession();
  SB.user = data.session?.user || null;
  SB.cli.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT') { SB.user = null; S.me = null; S.ready = true; notify(); } else if (s) SB.user = s.user; });
  if (SB.user) await sbLoad(); else { S.ready = true; notify(); }
  addEventListener('focus', () => sbLoad()); setInterval(() => { if (!document.hidden) sbLoad(); }, 30000);
}
async function sbLogin(email, password) {
  const { data, error } = await SB.cli.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return /invalid login/i.test(error.message) ? 'E-Mail oder Passwort stimmt nicht.' : /not confirmed/i.test(error.message) ? 'Die E-Mail ist noch nicht bestätigt (in Supabase unter Authentication prüfen).' : 'Anmeldung fehlgeschlagen: ' + error.message;
  SB.user = data.user; S.ready = false; notify(); await sbLoad(true); return '';
}
async function sbLogout() { await SB.cli.auth.signOut({ scope: 'local' }); SB.user = null; S.me = null; S.error = null; S.data = { ...S.data, users: {}, clients: {}, projects: {} }; S.ready = true; notify(); }
// Fortlaufende Nummern wie K031 oder P037
const newCode = (col, prefix) => SB.on ? prefix + String(Math.max(0, ...list(col).map(x => +(x.id.match(new RegExp(`^${prefix}(\\d+)$`)) || [])[1] || 0)) + 1).padStart(3, '0') : newId();
function SbLogin() {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go1 = async e => { const x = fd(e); setBusy(true); setErr(''); let m; try { m = await sbLogin(x.email, x.password); } catch (er) { m = 'Keine Verbindung zu Supabase. URL in config.js und Internet prüfen.'; } setErr(m); setBusy(false); };
  return html`<main class="login"><form class="card" onSubmit=${go1}><${Logo}/><h1>Anmelden</h1><${F} label="E-Mail"><input type="email" name="email" autocomplete="username" required/><//><${F} label="Passwort"><input type="password" name="password" autocomplete="current-password" required/><//>${err && html`<p class="bad" role="alert">${err}</p>`}<button class="btn" disabled=${busy}>${busy ? 'Einen Moment …' : 'Anmelden'}</button></form></main>`;
}
