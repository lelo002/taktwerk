'use strict';
const NAV = [['Mein Bereich', [['', 'Dashboard', 'home', 1], ['aufgaben', 'Meine Aufgaben', 'check', 1, 'Aufgaben'], ['tag', 'BOD & EOD', 'day', 1]]], ['Vertrieb', [['angebote', 'Angebote', 'doc', 1]]], ['Agentur', [['kunden', 'Kunden', 'client', 1], ['projekte', 'Projekte', 'folder', 1]]], ['Team', [['team', 'Team', 'team', 1]]]];
function navHint(k) {
  const r = report(uid(), today()), ok = html`<em class="ok" title="Abgegeben">✓</em>`, due = x => html`<em class="due">${x}</em>`;
  if (k === 'tag') return !r?.bodAt ? due('BOD offen') : r?.eodAt ? ok : nowHM() >= C.eodReminder ? due('EOD offen') : null;
  const n = { aufgaben: () => myTasks(uid()).filter(t => !t.done).length, angebote: () => list('offers').filter(o => OOPEN.includes(oStatus(o))).length, kunden: () => list('clients').length, projekte: () => projects().length }[k]?.();
  return n ? html`<em>${n}</em>` : null;
}
const ROUTES = { '': () => html`<${Dashboard}/>`, tag: a => html`<${DayPage} tab=${a || 'bod'}/>`, angebote: () => html`<${OffersPage}/>`, angebot: a => html`<${OfferPage} key=${a} id=${a}/>`, angebotsvorlage: () => html`<${OfferSettings}/>`, aufgaben: () => html`<${TasksPage} key=${uid()}/>`, projekte: () => html`<${ProjectsPage}/>`, projekt: a => html`<${ProjectPage} key=${a} id=${a}/>`, kunden: () => html`<${ClientsPage}/>`, kunde: a => html`<${ClientPage} key=${a} id=${a}/>`, team: () => html`<${TeamPage}/>` };
ROUTES.board = ROUTES.projektegesamt = ROUTES.projekte; // alte Links
const ACTIVE = { projekt: 'projekte', kunde: 'kunden', board: 'projekte', projektegesamt: 'projekte', angebot: 'angebote', angebotsvorlage: 'angebote' };
let theme = null; try { theme = localStorage.getItem('theme-v2'); } catch {}
const setTheme = t => { theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem('theme-v2', t); } catch {} };
setTheme(theme || 'light'); // hell ist Standard

const Logo = () => html`<span class="brand"><i><b></b><b></b><b></b></i>${C.appName}</span>`;
function Login() {
  if (SB.on && !S.error) return html`<${SbLogin}/>`;
  return html`<main class="login"><div class="card"><${Logo}/>${S.error ? html`<p class="bad">${S.error}</p>` : html`<h1>Kunden, Projekte und Tagesplanung an einem Ort</h1>`}${S.me || SB.user ? html`<button class="btn ghost" onClick=${logout}>Abmelden</button>` : FB && html`<button class="btn" onClick=${googleLogin}>Mit Google anmelden</button>`}${SB.on ? null : html`<p class="hint">Bei der Anmeldung fragt Google nach der Freigabe für deinen Kalender.</p>`}</div></main>`;
}
function App() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick(n => n + 1), hash = () => { if (!!PUBLIC !== /^#\/a\//.test(location.hash) || PUBLIC) return location.reload(); S.modal = null; scrollTo(0, 0); f(); };
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal('search'); } };
    S.listeners.add(f); if (!PUBLIC) S.listeners.add(processSigned); addEventListener('hashchange', hash); addEventListener('keydown', key); boot();
    return () => S.listeners.delete(f);
  }, []);
  if (PUBLIC) return html`<${SignPage}/>`;
  if (S.error) return html`<${Login}/>`;
  if (!S.ready) return html`<main class="login"><${Logo}/></main>`;
  if (!S.me) return html`<${Login}/>`;
  const [r = '', a] = location.hash.replace(/^#\/?/, '').split('/'), cur = ACTIVE[r] || r, mineP = projects().filter(p => p.ownerId === uid() && !inCare(p)).slice(0, 5), unseen = myTasks(uid()).filter(t => t.seen === false && !t.done).length + list('offers').filter(o => o.ownerId === uid() && o.signedSeen === false).length;
  return html`<div class="shell"><aside><${Logo}/><nav>${NAV.map(([g, it]) => html`<div class="ng"><h5>${g}</h5>${it.map(([k, n, i, mob, short]) => html`<a href=${'#/' + k} aria-current=${cur === k ? 'page' : null} class=${(cur === k ? 'on' : '') + (mob ? '' : ' dsk')}><${Icon} n=${i}/><span class="nl">${n}</span><span class="ns">${short || n}</span>${navHint(k)}</a>`)}</div>`)}
      ${mineP.length > 0 && html`<div class="ng dsk"><h5>Meine Projekte</h5>${mineP.map(p => html`<a class=${'np' + (r === 'projekt' && a === p.id ? ' on' : '')} href=${'#/projekt/' + p.id}><span>${p.name}<small>${PHASES[phaseIdx(p.phase)].name}</small></span></a>`)}</div>`}</nav>
      <div class="foot">${S.mode === 'demo' && !SB.on ? html`<label class="demo"><span>Demo-Modus, angesehen als</span><select value=${uid()} onChange=${e => switchDemoUser(e.target.value)}><${UserOpts} v=${uid()}/></select><button class="link" onClick=${resetDemo}>Demo zurücksetzen</button></label>` : html`<div class="person"><${Avatar} id=${uid()} sm/><div><strong>${me()?.name}</strong>${SB.on && html`<small>Supabase verbunden</small>`}</div><button class="icon" aria-label="Abmelden" title="Abmelden" onClick=${logout}><${Icon} n="out"/></button></div>`}</div></aside>
    <main><div class="top"><button class="searchb" onClick=${() => openModal('search')}><${Icon} n="search"/>Suchen<kbd>⌘K</kbd></button><span class="sp"></span><button class="icon" aria-label="Hell / Dunkel" onClick=${() => setTheme(theme === 'dark' ? 'light' : 'dark')}><${Icon} n="moon"/></button><button class="icon bell" aria-label=${`Zugewiesen, ${unseen} neu`} onClick=${() => openModal('inbox')}><${Icon} n="bell"/>${unseen > 0 && html`<b>${unseen}</b>`}</button><button class="btn" onClick=${() => openModal('task')}><${Icon} n="plus"/>Aufgabe</button></div>
      <div class="page" key=${uid() + r}>${(ROUTES[r] || ROUTES[''])(a)}</div></main></div>
    ${S.modal && html`<${Modal}/>`}<div class="toasts" role="status" aria-live="polite">${S.toasts.map(t => html`<div key=${t.id}>${t.text}${t.action && html`<button onClick=${() => { t.action.run(); S.toasts = S.toasts.filter(x => x !== t); notify(); }}>${t.action.label}</button>`}</div>`)}</div>`;
}
render(html`<${App}/>`, document.getElementById('app'));
