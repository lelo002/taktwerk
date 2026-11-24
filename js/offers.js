'use strict';
// ── Angebote: erstellen, als Link teilen, online unterschreiben, Projekt anlegen ──
const SETTINGS0 = {
  agency: { name: 'Deine Agentur', street: 'Straße 1', zip: '00000', city: 'Ort', email: '', phone: '', web: '', vatId: '', signer: '', logo: '', signature: '' },
  about: 'Wir sind eine Marketingagentur für Strategie, Gestaltung und Content. Wir arbeiten in kleinen Teams, mit festen Ansprechpersonen und klaren Terminen.',
  process: 'Kick-Off: Wir klären Ziele, Rollen und Zeitplan.\nStrategie und Umsetzung: Wir entwickeln das Konzept und setzen es um.\nPräsentation: Wir zeigen Ihnen das Ergebnis.\nFeedback: Ihre Anmerkungen arbeiten wir ein.\nGo Live: Nach Ihrer Freigabe geht alles online.',
  terms: '1. Leistungsumfang\nMaßgeblich sind die in diesem Angebot beschriebenen Leistungen. Zusätzliche Wünsche werden gesondert angeboten.\n\n2. Korrekturen\nZwei Korrekturschleifen sind enthalten. Weitere werden nach Aufwand berechnet.\n\n3. Mitwirkung\nDer Auftraggeber stellt benötigte Inhalte und Zugänge rechtzeitig bereit. Verzögerungen verschieben vereinbarte Termine entsprechend.\n\n4. Nutzungsrechte\nMit vollständiger Bezahlung gehen die vereinbarten Nutzungsrechte auf den Auftraggeber über.\n\n5. Zahlung\nRechnungen sind innerhalb von 14 Tagen ohne Abzug zahlbar.\n\n6. Vertraulichkeit\nBeide Seiten behandeln vertrauliche Informationen auch nach Projektende vertraulich.',
  vat: '19', days: 21,
  modules: [
    { title: 'Website', desc: 'Konzept, Gestaltung und technische Umsetzung', unit: 'Projekt', price: 4500 },
    { title: 'Videoproduktion', desc: 'Konzept, ein Drehtag, Schnitt und Farbkorrektur', unit: 'Film', price: 2800 },
    { title: 'Fotoproduktion', desc: 'Halber Shootingtag inklusive Bildbearbeitung', unit: 'Shooting', price: 900 },
    { title: 'Social-Media-Betreuung', desc: 'Redaktionsplan, Gestaltung und Veröffentlichung', unit: 'Monat', price: 1200 },
    { title: 'Anzeigenkampagne', desc: 'Aufbau, Betreuung und Reporting, zzgl. Werbebudget', unit: 'Monat', price: 800 },
    { title: 'Corporate Design', desc: 'Logo, Farben, Schriften und Grundausstattung', unit: 'Projekt', price: 3200 }],
};
const offerSettings = () => ({ ...SETTINGS0, ...(get('settings', 'offer') || {}) });
const VAT = { 19: '19 % USt', 7: '7 % USt', klein: 'Keine USt (§ 19 UStG)' };
const PAYS = { einmal: ['Einmalig', 'Gesamtbetrag nach Auftrag'], anzahlung: ['Anzahlung', 'Rest nach Abschluss'], raten: ['Raten', 'Monatliche Teilbeträge'], monatlich: ['Monatlich', 'Laufende Betreuung'] };
const money = c => (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const lineTotal = i => Math.round(num(i.qty) * num(i.price) * 100);
// Alle Beträge in Cent
function calc(o) {
  const sub = (o.items || []).reduce((a, i) => a + lineTotal(i), 0), disc = Math.round(sub * num(o.discount) / 100), net = sub - disc, rate = o.vat === 'klein' ? 0 : num(o.vat), vat = Math.round(net * rate / 100);
  return { sub, disc, net, vat, gross: net + vat };
}
function payPlan(o) {
  const g = calc(o).gross, p = o.pay || {};
  if (p.mode === 'raten') { const n = Math.min(36, Math.max(2, Math.round(num(p.n)) || 2)), b = Math.floor(g / n); return Array.from({ length: n }, (_, i) => [`${i + 1}. Rate, ${i ? plural(i, 'Monat', 'Monate') + ' nach Auftragserteilung' : 'bei Auftragserteilung'}`, i === n - 1 ? g - b * (n - 1) : b]); }
  if (p.mode === 'anzahlung') { const a = Math.round(g * Math.min(100, Math.max(0, num(p.pct))) / 100); return [[`Anzahlung (${num(p.pct)} %) bei Auftragserteilung`, a], ['Restbetrag nach Abschluss', g - a]]; }
  if (p.mode === 'monatlich') return [[`Pro Monat, Mindestlaufzeit ${plural(Math.max(1, Math.round(num(p.months)) || 1), 'Monat', 'Monate')}`, g]];
  return [['Gesamtbetrag nach Auftragserteilung', g]];
}
const payText = o => { const p = o.pay || {}, pl = payPlan(o); return p.mode === 'raten' ? `${pl.length} Raten, je ca. ${money(pl[0][1])}` : p.mode === 'anzahlung' ? `${money(pl[0][1])} Anzahlung, dann ${money(pl[1][1])}` : p.mode === 'monatlich' ? `${money(pl[0][1])} pro Monat, mind. ${num(p.months)} Monate` : 'Einmalig'; };
const ms = t => !t ? 0 : typeof t === 'number' ? t : t.toMillis ? t.toMillis() : 0;
const pubOf = o => o.token ? get('publicOffers', o.token) : null;
function oStatus(o) {
  const p = pubOf(o);
  if (o.status !== 'offen') return o.status || 'entwurf';
  if (p && p.status !== 'offen') return p.status;
  if (o.validUntil && o.validUntil < today()) return 'abgelaufen';
  return p?.viewedAt ? 'angesehen' : o.deliveredAt ? 'versendet' : 'bereit';
}
const OST = { entwurf: ['Entwurf', ''], bereit: ['Bereit zum Versand', 'warn'], versendet: ['Versendet', 'inf'], angesehen: ['Angesehen', 'inf'], unterschrieben: ['Unterschrieben', 'ok'], abgelehnt: ['Abgelehnt', 'bad'], abgelaufen: ['Abgelaufen', ''], 'zurückgezogen': ['Zurückgezogen', ''] };
const OOPEN = ['bereit', 'versendet', 'angesehen'];
const setSent = (o, on = true) => save('offers', o.id, { deliveredAt: on ? Date.now() : 0 }).then(() => on && toast('Als versendet markiert', { label: 'Rückgängig', run: () => setSent(o, false) }), () => {});
const OPill = ({ o }) => { const [n, k] = OST[oStatus(o)] || OST.entwurf; return html`<${Pill} k=${k}>${n}<//>`; };
const offerLink = o => location.href.split('#')[0] + '#/a/' + o.token;

// SHA-256 ohne Browser-Abhängigkeit (crypto.subtle fehlt bei Dateien ohne https)
function sha256(str) {
  const K = [], H = [], pr = []; for (let c = 2; pr.length < 64; c++) if (pr.every(p => c % p)) { pr.push(c); K.push((c ** (1 / 3) % 1) * 2 ** 32 | 0); if (H.length < 8) H.push((c ** .5 % 1) * 2 ** 32 | 0); }
  const m = new TextEncoder().encode(str), l = m.length, n = ((l + 8 >> 6) + 1) * 64, b = new Uint8Array(n), v = new DataView(b.buffer); b.set(m); b[l] = 128; v.setUint32(n - 8, Math.floor(l / 2 ** 29)); v.setUint32(n - 4, l << 3);
  const R = (x, k) => x >>> k | x << 32 - k;
  for (let o = 0; o < n; o += 64) {
    const w = []; for (let i = 0; i < 64; i++) w[i] = i < 16 ? v.getInt32(o + i * 4) : (R(w[i - 2], 17) ^ R(w[i - 2], 19) ^ w[i - 2] >>> 10) + w[i - 7] + (R(w[i - 15], 7) ^ R(w[i - 15], 18) ^ w[i - 15] >>> 3) + w[i - 16] | 0;
    let [a, B, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const t = h + (R(e, 6) ^ R(e, 11) ^ R(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i] | 0, u = (R(a, 2) ^ R(a, 13) ^ R(a, 22)) + (a & B ^ a & c ^ B & c) | 0; h = g; g = f; f = e; e = d + t | 0; d = c; c = B; B = a; a = t + u | 0; }
    [a, B, c, d, e, f, g, h].forEach((x, i) => { H[i] = H[i] + x | 0; });
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ── Übersicht ──
const OCOLS = [['entwurf', 'Entwurf'], ['bereit', 'Bereit zum Versand'], ['versendet', 'Versendet'], ['angesehen', 'Angesehen'], ['unterschrieben', 'Unterschrieben'], ['rest', 'Abgelehnt / abgelaufen']];
function OffersPage() {
  const [v, setV] = remember('view-offers', 'tabelle'), [f, setF] = useState(''), all = list('offers').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), col = o => { const s = oStatus(o); return ['abgelehnt', 'abgelaufen', 'zurückgezogen'].includes(s) ? 'rest' : s; };
  const n = k => all.filter(o => col(o) === k).length, os = all.filter(o => !f || col(o) === f), mon = o => o.pay?.mode === 'monatlich' ? ' / Monat' : '';
  return html`<${Head} title="Angebote" sub="Vom Angebot bis zur Unterschrift"><${Switch} v=${v} set=${setV} items=${[['tabelle', 'Tabelle'], ['board', 'Board']]}/><a class="btn ghost" href="#/angebotsvorlage"><${Icon} n="sliders"/>Vorlage & Konditionen</a><button class="btn" onClick=${() => go('#/angebot/' + newId())}><${Icon} n="plus"/>Neues Angebot</button><//>
    ${v === 'board' ? html`<div class="board">${OCOLS.map(([k, name]) => { const a = all.filter(o => col(o) === k); return html`<section class="col" key=${k}><h3>${name}<span>${a.length}</span></h3>${a.length > 0 && html`<small>${money(a.reduce((x, o) => x + calc(o).gross, 0))}</small>`}${a.map(o => html`<article class="kc oc" key=${o.id}><a href=${'#/angebot/' + o.id}><small>${o.c?.name || 'Ohne Kunde'}</small><strong>${o.projectName || 'Ohne Titel'}</strong></a><b>${money(calc(o).gross)}${mon(o)}</b><div class="kf"><${Avatar} id=${o.ownerId} sm/><span class="dl">${o.number}</span><span class="sp"></span>${k === 'rest' ? html`<${OPill} o=${o}/>` : html`<span class="dl">bis ${fmtD(o.validUntil)}</span>`}</div>${k === 'bereit' && html`<button class="tag" onClick=${() => setSent(o)}><${Icon} n="mail"/>Als versendet markieren</button>`}</article>`)}</section>`; })}</div>`
    : html`<${Tabs} v=${f} set=${setF} items=${[['', 'Alle', all.length], ['entwurf', 'Entwürfe', n('entwurf')], ...OCOLS.slice(1).map(([k, x]) => [k, x, n(k)])]}/>
    <section class="card flush">${os.length ? html`<div class="tw"><table><thead><tr><th>Angebot</th><th>Kunde</th><th>Betrag</th><th>Gültig bis</th><th>Zuständig</th><th>Status</th></tr></thead><tbody>${os.map(o => html`<tr key=${o.id} onClick=${() => go('#/angebot/' + o.id)}><td><a href=${'#/angebot/' + o.id}>${o.projectName || 'Ohne Titel'}</a><small>${o.number}</small></td><td>${o.c?.name || '–'}</td><td>${money(calc(o).gross)}${mon(o)}</td><td>${fmtD(o.validUntil)}</td><td><span class="who"><${Avatar} id=${o.ownerId} sm/>${get('users', o.ownerId)?.name || ''}</span></td><td><${OPill} o=${o}/></td></tr>`)}</tbody></table></div>` : html`<div style="padding:8px 18px"><${Empty}>Keine Angebote in dieser Auswahl.<//></div>`}</section>`}`;
}

// ── Editor ──
const CFIELDS = ['name', 'contactName', 'contactEmail', 'phone', 'street', 'zip', 'city', 'vatId', 'industry', 'website'];
const pickC = c => Object.fromEntries(CFIELDS.map(k => [k, c?.[k] || '']));
function newOffer(id) {
  const st = offerSettings(), y = today().slice(0, 4), max = Math.max(0, ...list('offers').map(o => o.number?.startsWith(`AN-${y}-`) ? +o.number.slice(8) || 0 : 0));
  return { id, number: `AN-${y}-${String(max + 1).padStart(3, '0')}`, status: 'entwurf', mode: 'neu', clientId: '', c: pickC(), projectName: '', intro: '', items: [], vat: st.vat, discount: 0, pay: { mode: 'einmal', n: 3, pct: 50, months: 12 }, startDate: '', deadline: '', validUntil: addDays(today(), num(st.days) || 21), ownerId: uid(), createdAt: Date.now() };
}
function missing(o) {
  const m = [], c = o.c || {};
  if (o.mode === 'bestand' && !o.clientId) m.push('Kunde auswählen');
  [['name', 'Firma'], ['contactName', 'Ansprechpartner'], ['contactEmail', 'E-Mail'], ['street', 'Straße'], ['zip', 'PLZ'], ['city', 'Ort']].forEach(([k, n]) => { if (!c[k]?.trim()) m.push(n); });
  if (c.contactEmail && !/^\S+@\S+\.\S+$/.test(c.contactEmail)) m.push('gültige E-Mail');
  if (!o.projectName?.trim()) m.push('Projektname');
  if (!(o.items || []).some(i => i.title?.trim() && lineTotal(i) > 0)) m.push('mindestens eine Leistung mit Preis');
  if (!o.validUntil || o.validUntil < today()) m.push('Gültigkeit in der Zukunft');
  if (S.mode === 'firebase' && !get('settings', 'offer')) m.push('Agenturdaten unter „Vorlage & Konditionen“');
  if (S.mode === 'firebase' && !offerSettings().agency.signature) m.push('eure Unterschrift unter „Vorlage & Konditionen“');
  return m;
}
const buildDoc = o => { const st = offerSettings(), u = get('users', o.ownerId); return { number: o.number, date: today(), validUntil: o.validUntil, agency: st.agency, about: st.about, process: st.process, terms: st.terms, mode: o.mode, clientId: o.mode === 'bestand' ? o.clientId : '', c: o.c, projectName: o.projectName.trim(), intro: o.intro || '', items: o.items.filter(i => i.title?.trim()).map(i => ({ title: i.title.trim(), desc: i.desc || '', qty: num(i.qty), unit: i.unit || '', price: num(i.price) })), vat: o.vat, discount: num(o.discount), pay: o.pay, startDate: o.startDate || '', deadline: o.deadline || '', owner: { name: u?.name || '', email: u?.email || '' } }; };
async function publishOffer(o) {
  const token = newId(), docJson = JSON.stringify(buildDoc(o));
  await save('publicOffers', token, { offerId: o.id, status: 'offen', docJson, hash: sha256(docJson), validTs: parseD(addDays(o.validUntil, 1)).getTime() - 1, createdAt: Date.now() });
  await save('offers', o.id, { ...o, status: 'offen', token, deliveredAt: 0, sentAt: Date.now(), updatedAt: Date.now() });
}
function OfferPage({ id }) {
  const saved = get('offers', id);
  if (saved && saved.status !== 'entwurf') return html`<${OfferView} o=${saved}/>`;
  return html`<${OfferEditor} key=${id} id=${id} saved=${saved}/>`;
}
function OfferEditor({ id, saved }) {
  const [o, setO] = useState(() => ({ ...newOffer(id), ...(saved || {}) })), [prev, setPrev] = useState(false), [state, setState] = useState(''), tm = useRef(), cur = useRef(o), busy = useRef(false);
  const flush = () => { clearTimeout(tm.current); if (tm.current && !busy.current) { tm.current = null; return save('offers', id, { ...cur.current, updatedAt: Date.now() }).then(() => setState(`Entwurf gespeichert um ${nowHM()}`), () => setState('Nicht gespeichert')); } };
  useEffect(() => () => { flush(); }, []);
  const up = patch => { const n = { ...cur.current, ...patch }; cur.current = n; setO(n); setState('…'); clearTimeout(tm.current); tm.current = setTimeout(flush, 700); };
  const upC = patch => up({ c: { ...cur.current.c, ...patch } }), upI = (i, patch) => up({ items: o.items.map((x, k) => k === i ? { ...x, ...patch } : x) }), upP = patch => up({ pay: { ...o.pay, ...patch } });
  // Beim Wechsel Neukunde / Bestandskunde bleiben beide Eingaben erhalten
  const setMode = mode => { if (mode === o.mode) return; const keep = { ...(o.keep || {}), [o.mode]: { c: o.c, clientId: o.clientId } }, k = keep[mode] || { c: pickC(), clientId: '' }; up({ mode, keep, c: k.c, clientId: k.clientId }); };
  const saveNow = () => { tm.current = tm.current || 1; setState('…'); flush()?.then(() => toast('Entwurf gespeichert')); };
  useEffect(() => { const h = () => flush(); addEventListener('pagehide', h); return () => removeEventListener('pagehide', h); }, []);
  const I = (label, v, set, x = {}) => html`<${F} label=${label} wide=${x.wide}><input type=${x.type || 'text'} min=${x.min} max=${x.max} step=${x.step} value=${v ?? ''} onInput=${e => set(e.target.value)}/><//>`;
  const st = offerSettings(), miss = missing(o), k = calc(o), clients = list('clients').sort((a, b) => a.name.localeCompare(b.name)), mon = o.pay.mode === 'monatlich' ? ' pro Monat' : '';
  const create = async () => { busy.current = true; clearTimeout(tm.current); tm.current = null; try { await publishOffer(cur.current); toast('Angebot erstellt. Der Link ist bereit.'); scrollTo(0, 0); } catch (e) { console.error(e); busy.current = false; } };
  const rm = () => { if (!confirm('Diesen Entwurf löschen?')) return; busy.current = true; clearTimeout(tm.current); tm.current = null; (saved ? del('offers', id) : Promise.resolve()).then(() => go('#/angebote'), () => { busy.current = false; }); };
  if (prev) return html`<div class="linkbar"><button class="btn ghost" onClick=${() => setPrev(false)}><${Icon} n="left"/>Weiter bearbeiten</button><span class="sp"></span><${PdfBtn} d=${buildDoc(o)}/><button class="btn" disabled=${miss.length > 0} onClick=${create}>Angebot erstellen</button></div><${OfferDoc} d=${buildDoc(o)}/>`;
  return html`<a class="back" href="#/angebote"><${Icon} n="left"/>Angebote</a><${Head} title=${o.projectName || 'Neues Angebot'} sub=${`${o.number} ${state && '· ' + state}`}><button class="btn ghost danger" onClick=${rm}><${Icon} n="trash"/>Löschen</button><button class="btn ghost" onClick=${saveNow}>Entwurf speichern</button><//>
    <div class="offer"><div class="stack">
      <section class="card"><div class="ch"><h3><${Icon} n="client"/>Kunde</h3></div><div class="choice"><button type="button" aria-pressed=${o.mode === 'neu'} class=${o.mode === 'neu' ? 'on' : ''} onClick=${() => setMode('neu')}><b>Neukunde</b><small>Daten neu eingeben</small></button><button type="button" aria-pressed=${o.mode === 'bestand'} class=${o.mode === 'bestand' ? 'on' : ''} onClick=${() => setMode('bestand')}><b>Bestandskunde</b><small>Aus der Kundenliste</small></button></div>
        <div class="grid">${o.mode === 'bestand' && html`<${F} label="Kunde auswählen" wide><select value=${o.clientId} onChange=${e => up({ clientId: e.target.value, c: pickC(get('clients', e.target.value)) })}><option value="">Bitte wählen</option>${clients.map(c => html`<option value=${c.id}>${c.name}</option>`)}</select><//>`}
        ${I('Firma', o.c.name, v => upC({ name: v }), { wide: true })}${I('Ansprechpartner', o.c.contactName, v => upC({ contactName: v }))}${I('E-Mail', o.c.contactEmail, v => upC({ contactEmail: v }), { type: 'email' })}${I('Straße und Nr.', o.c.street, v => upC({ street: v }))}<div class="row zip">${I('PLZ', o.c.zip, v => upC({ zip: v }))}${I('Ort', o.c.city, v => upC({ city: v }))}</div>${I('Telefon', o.c.phone, v => upC({ phone: v }))}${I('USt-IdNr.', o.c.vatId, v => upC({ vatId: v }))}</div></section>
      <section class="card"><div class="ch"><h3><${Icon} n="folder"/>Projekt und Leistungen</h3></div><div class="grid">${I('Projektname', o.projectName, v => up({ projectName: v }), { wide: true })}<${F} label="Ausgangslage und Ziel" wide><textarea rows="3" placeholder="Was soll für den Kunden erreicht werden?" value=${o.intro} onInput=${e => up({ intro: e.target.value })}></textarea><//>${I('Projektstart', o.startDate, v => up({ startDate: v }), { type: 'date' })}${I('Fertig bis', o.deadline, v => up({ deadline: v }), { type: 'date' })}</div>
        <h4>Leistungen</h4>${o.items.length > 0 && html`<div class="item ihead"><span>Leistung und Umfang</span><span>Menge</span><span>Einheit</span><span>Preis netto €</span><span></span></div>`}
        ${o.items.map((x, i) => html`<div class="item" key=${i}><input aria-label="Leistung" placeholder="Leistung" value=${x.title} onInput=${e => upI(i, { title: e.target.value })}/><input aria-label="Menge" type="number" min="0" step="0.5" value=${x.qty} onInput=${e => upI(i, { qty: e.target.value })}/><input aria-label="Einheit" value=${x.unit} onInput=${e => upI(i, { unit: e.target.value })}/><input aria-label="Preis" type="number" min="0" step="0.01" value=${x.price} onInput=${e => upI(i, { price: e.target.value })}/><button class="icon" aria-label="Leistung entfernen" onClick=${() => up({ items: o.items.filter((_, j) => j !== i) })}><${Icon} n="x"/></button><textarea aria-label="Umfang" rows="2" placeholder="Umfang, z. B. 3 Videos à 30 Sekunden" value=${x.desc} onInput=${e => upI(i, { desc: e.target.value })}></textarea></div>`)}
        <div class="chips mods">${st.modules.filter(m => m.title).map(m => html`<button type="button" class="pill" onClick=${() => up({ items: [...o.items, { ...m, qty: 1 }] })}>+ ${m.title}</button>`)}<button type="button" class="pill acc" onClick=${() => up({ items: [...o.items, { title: '', desc: '', qty: 1, unit: '', price: 0 }] })}>+ Freie Position</button></div></section>
      <section class="card"><div class="ch"><h3><${Icon} n="doc"/>Preis und Zahlung</h3></div><div class="choice four">${Object.entries(PAYS).map(([m, [n, d]]) => html`<button type="button" aria-pressed=${o.pay.mode === m} class=${o.pay.mode === m ? 'on' : ''} onClick=${() => upP({ mode: m })}><b>${n}</b><small>${d}</small></button>`)}</div>
        <div class="grid">${o.pay.mode === 'raten' && I('Anzahl Raten', o.pay.n, v => upP({ n: v }), { type: 'number', min: 2, max: 36 })}${o.pay.mode === 'anzahlung' && I('Anzahlung in %', o.pay.pct, v => upP({ pct: v }), { type: 'number', min: 0, max: 100 })}${o.pay.mode === 'monatlich' && I('Mindestlaufzeit in Monaten', o.pay.months, v => upP({ months: v }), { type: 'number', min: 1 })}${I('Rabatt in %', o.discount, v => up({ discount: Math.min(100, Math.max(0, num(v))) }), { type: 'number', min: 0, max: 100 })}<${F} label="Umsatzsteuer"><select value=${o.vat} onChange=${e => up({ vat: e.target.value })}>${Object.entries(VAT).sort((a, b) => num(b[0]) - num(a[0])).map(([v, n]) => html`<option value=${v}>${n}</option>`)}</select><//>${I('Angebot gültig bis', o.validUntil, v => up({ validUntil: v }), { type: 'date' })}<${F} label="Zuständig"><select value=${o.ownerId} onChange=${e => up({ ownerId: e.target.value })}><${UserOpts} v=${o.ownerId}/></select><//></div><${PayBox} d=${o}/></section></div>
    <div class="card sum"><div class="ch"><h3>Zusammenfassung</h3></div><dl><div><dt>Kunde (${o.mode === 'neu' ? 'neu' : 'Bestand'})</dt><dd>${o.c.name || '–'}</dd>${o.c.contactName && html`<small>${o.c.contactName}</small>`}</div><div><dt>Projekt</dt><dd>${o.projectName || '–'}</dd>${o.deadline && html`<small>Fertig bis ${fmtD(o.deadline)}</small>`}</div><div><dt>Leistungen</dt><dd>${o.items.filter(i => i.title).length ? o.items.filter(i => i.title).map(i => html`<div>${num(i.qty)}× ${i.title}</div>`) : '–'}</dd></div><div><dt>Gesamt${k.vat ? ' inkl. USt' : ''}${mon}</dt><dd class="total">${money(k.gross)}</dd><small>${money(k.net)} netto${k.disc ? `, ${num(o.discount)} % Rabatt` : ''}</small></div><div><dt>Zahlung</dt><dd>${payText(o)}</dd></div><div><dt>Gültig bis</dt><dd>${fmtD(o.validUntil)}</dd></div></dl>
      ${miss.length > 0 && html`<p class="miss">Es fehlt noch: ${miss.join(', ')}</p>`}<button class="btn" disabled=${miss.length > 0} onClick=${create}>Angebot erstellen</button><button class="btn ghost" onClick=${() => setPrev(true)}>Vorschau</button><button class="btn ghost" onClick=${saveNow}>Entwurf speichern</button></div></div>`;
}
// Gesamtpreis, darunter der Zahlungsplan
function PayBox({ d }) {
  const k = calc(d), mon = d.pay.mode === 'monatlich', n = Math.max(1, Math.round(num(d.pay.months)) || 1);
  return html`<table class="paybox"><tbody><tr><td>Nettobetrag${mon ? ' pro Monat' : ''}</td><td class="n">${money(k.net)}</td></tr>${d.vat !== 'klein' && html`<tr><td>Umsatzsteuer ${d.vat} %</td><td class="n">${money(k.vat)}</td></tr>`}<tr class="tot"><td>Gesamtpreis${mon ? ` über ${plural(n, 'Monat', 'Monate')}` : ''}</td><td class="n">${money(mon ? k.gross * n : k.gross)}</td></tr>${d.pay.mode !== 'einmal' && payPlan(d).map(([x, v]) => html`<tr class="rate"><td>${x}</td><td class="n">${money(v)}</td></tr>`)}</tbody></table>`;
}
const signOf = p => p?.sign && p.status === 'unterschrieben' ? p.sign : null;
function OfferView({ o }) {
  const p = pubOf(o), s = oStatus(o), open = OOPEN.includes(s), link = offerLink(o);
  let d = null; try { d = p && JSON.parse(p.docJson); } catch {}
  const copy = () => navigator.clipboard.writeText(link).then(() => toast('Link kopiert', s === 'bereit' ? { label: 'Als versendet markieren', run: () => setSent(o) } : undefined), () => toast('Bitte den Link von Hand kopieren'));
  const mail = `mailto:${encodeURIComponent(o.c.contactEmail)}?subject=${encodeURIComponent(`Angebot ${o.number}: ${o.projectName}`)}&body=${encodeURIComponent(`Guten Tag ${o.c.contactName},\n\nhier ist unser Angebot „${o.projectName}“. Sie können es online ansehen und direkt unterschreiben:\n\n${link}\n\nDas Angebot ist gültig bis ${fmtD(o.validUntil)}.\n\nViele Grüße\n${get('users', o.ownerId)?.name || ''}`)}`;
  const back = async () => {
    if (!confirm(open ? 'Angebot zurückziehen und als Entwurf bearbeiten? Der bisherige Link funktioniert dann nicht mehr.' : 'Als neuen Entwurf bearbeiten?')) return;
    try { if (p?.status === 'offen') await save('publicOffers', o.token, { status: 'zurückgezogen' }); await save('offers', o.id, { status: 'entwurf', token: '', deliveredAt: 0, validUntil: o.validUntil < today() ? addDays(today(), num(offerSettings().days) || 21) : o.validUntil, signedSeen: true }); } catch {}
  };
  return html`<a class="back" href="#/angebote"><${Icon} n="left"/>Angebote</a><${Head} title=${o.projectName} sub=${`${o.number} · ${o.c?.name}`}><${OPill} o=${o}/>${s !== 'unterschrieben' && html`<button class="btn ghost" onClick=${back}><${Icon} n="edit"/>${open ? 'Zurückziehen und bearbeiten' : 'Neu bearbeiten'}</button>`}${d && html`<${PdfBtn} d=${d} pub=${p}/>`}<//>
    ${open && html`<section class="card linkbar"><${Icon} n="link"/><input readonly aria-label="Kundenlink" value=${link} onFocus=${e => e.target.select()}/><button class="btn" onClick=${copy}><${Icon} n="copy"/>Link kopieren</button><a class="btn ghost" href=${mail} onClick=${() => s === 'bereit' && setSent(o)}><${Icon} n="mail"/>Per E-Mail</a><a class="btn ghost" href=${link} target="_blank" rel="noopener" onClick=${() => { try { localStorage.setItem('tw-preview', o.token); } catch {} }}>Kundenansicht</a>${s === 'bereit' && html`<button class="btn ghost" onClick=${() => setSent(o)}><${Icon} n="check"/>Als versendet markieren</button>`}${S.mode === 'demo' && html`<small>Im Demo-Modus funktioniert der Link nur in diesem Browser.</small>`}</section>`}
    ${s === 'unterschrieben' && html`<section class="card linkbar"><${Icon} n="check"/><b>Unterschrieben von ${p.sign?.name} am ${fmtStamp(ms(p.sign?.at) || Date.now())}</b>${o.projectId && get('projects', o.projectId) && html`<span class="sp"></span><a class="btn" href=${'#/projekt/' + o.projectId}>Zum Projekt</a>`}</section>`}
    ${s === 'abgelehnt' && html`<section class="card linkbar"><b class="bad">Vom Kunden abgelehnt</b>${p.decline?.reason && html`<span>„${p.decline.reason}“</span>`}</section>`}
    ${d ? html`<${OfferDoc} d=${d} pub=${p}/>` : html`<${Empty}>Das Dokument ist nicht verfügbar.<//>`}`;
}

// ── Das Dokument ──
function OfferDoc({ d, pub, slot }) {
  const dL = x => parseD(x).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), k = calc(d), a = d.agency, sg = signOf(pub), foot = html`<footer><span>${a.name} · ${a.street} · ${a.zip} ${a.city}</span><span>${d.number}</span></footer>`;
  const logo = /^data:image\/(png|jpeg|webp);base64,/.test(a.logo || '') ? html`<img src=${a.logo} alt=${a.name}/>` : html`<span class="ag">${a.name}</span>`;
  const disp = s => new Date(s).toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'medium' });
  return html`<div class="doc">
    <section class="pg cover"><div>${logo}</div><h1>${d.projectName}</h1><p class="to">Angebot für ${d.c.name}</p><dl><dt>Angebot</dt><dd>${d.number}</dd><dt>Datum</dt><dd>${dL(d.date)}</dd><dt>Gültig bis</dt><dd>${dL(d.validUntil)}</dd><dt>Für</dt><dd>${d.c.contactName}<br/>${d.c.name}<br/>${d.c.street}<br/>${d.c.zip} ${d.c.city}</dd><dt>Von</dt><dd>${d.owner.name}<br/>${a.email || d.owner.email}${a.phone && html`<br/>${a.phone}`}</dd></dl></section>
    <section class="pg"><h2>Worum es geht</h2>${d.intro && html`<p>${d.intro}</p>`}<h3>Über uns</h3><p>${d.about}</p><h3>So läuft das Projekt ab</h3><p>${d.process}</p>${(d.startDate || d.deadline) && html`<h3>Zeitplan</h3><p>${[d.startDate && `Start: ${dL(d.startDate)}`, d.deadline && `Fertigstellung: ${dL(d.deadline)}`].filter(Boolean).join('\n')}</p>`}${foot}</section>
    <section class="pg"><h2>Leistungen und Preis</h2><table><thead><tr><th>Leistung</th><th class="n">Menge</th><th class="n">Einzelpreis</th><th class="n">Gesamt</th></tr></thead><tbody>${d.items.map(i => html`<tr><td><b>${i.title}</b>${i.desc && html`<small>${i.desc}</small>`}</td><td class="n">${num(i.qty).toLocaleString('de-DE')} ${i.unit}</td><td class="n">${money(Math.round(num(i.price) * 100))}</td><td class="n">${money(lineTotal(i))}</td></tr>`)}
        ${k.disc > 0 && html`<tr><td colspan="3">Rabatt ${num(d.discount).toLocaleString('de-DE')} %</td><td class="n">−${money(k.disc)}</td></tr>`}<tr><td colspan="3">Nettobetrag</td><td class="n">${money(k.net)}</td></tr>${d.vat !== 'klein' && html`<tr><td colspan="3">Umsatzsteuer ${d.vat} %</td><td class="n">${money(k.vat)}</td></tr>`}<tr class="tot"><td colspan="3">Gesamtbetrag${d.pay.mode === 'monatlich' ? ' pro Monat' : ''}</td><td class="n">${money(k.gross)}</td></tr></tbody></table>${d.vat === 'klein' && html`<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>`}
      <h3>Zahlung</h3><table><tbody>${d.pay.mode !== 'einmal' && html`<tr class="tot"><td>Gesamtpreis${d.pay.mode === 'monatlich' ? ` über ${plural(Math.max(1, num(d.pay.months)), 'Monat', 'Monate')}` : ''}</td><td class="n">${money(d.pay.mode === 'monatlich' ? k.gross * Math.max(1, num(d.pay.months)) : k.gross)}</td></tr>`}${payPlan(d).map(([n, v]) => html`<tr><td>${n}</td><td class="n">${money(v)}</td></tr>`)}</tbody></table>${foot}</section>
    <section class="pg"><h2>Konditionen</h2><p>${d.terms}</p>${foot}</section>
    <section class="pg"><h2>Annahme des Angebots</h2><p>Mit der Unterschrift nimmt ${d.c.name} das Angebot ${d.number} „${d.projectName}“ über ${money(k.gross)}${d.pay.mode === 'monatlich' ? ' pro Monat' : ''} einschließlich der Konditionen verbindlich an.</p>
      <div class="sigs"><div><div class="sigbox">${/^data:image\/png;base64,/.test(a.signature || '') ? html`<img src=${a.signature} alt="Unterschrift der Agentur"/>` : html`<span class="cursive">${a.signer || d.owner.name}</span>`}</div><b>${a.signer || d.owner.name}</b><div>${a.name}</div><small>${dL(d.date)}${a.signature ? '' : ' · Beispielsignatur'}</small></div><div><div class="sigbox">${sg && /^data:image\/png;base64,/.test(sg.image) ? html`<img src=${sg.image} alt="Unterschrift"/>` : slot?.box}</div><b>${sg ? sg.name : slot?.name || d.c.contactName}</b><div>${d.c.name}</div>${sg && html`<small>${disp(ms(sg.at) || Date.now())}</small>`}</div></div>
      ${sg && html`<div class="proof"><b>Signaturprotokoll</b>Elektronisch unterschrieben von ${sg.name}<br/>E-Mail laut Angebot: ${sg.email}<br/>Zeitpunkt: ${disp(ms(sg.at) || Date.now())}<br/>Vorgang: ${pub.id}<br/>Prüfsumme (SHA-256): ${pub.hash}<br/>${sha256(pub.docJson) === pub.hash && sg.hash === pub.hash ? 'Dokument unverändert: geprüft' : 'Achtung: Dokument stimmt nicht mit der Prüfsumme überein'}</div>`}
      <footer><span>${[a.name, a.vatId && 'USt-IdNr. ' + a.vatId, a.web].filter(Boolean).join(' · ')}</span><span>${d.number}</span></footer></section></div>`;
}

// ── Vorlage und Konditionen ──
function OfferSettings() {
  const [s, setS] = useState(() => { const x = offerSettings(); return { ...x, modules: x.modules.map(m => ({ ...m })), agency: { ...SETTINGS0.agency, ...x.agency } }; }), up = p => setS(o => ({ ...o, ...p })), upA = p => setS(o => ({ ...o, agency: { ...o.agency, ...p } })), upM = (i, p) => up({ modules: s.modules.map((m, k) => k === i ? { ...m, ...p } : m) });
  const [redo, setRedo] = useState(!s.agency.signature);
  const A = (label, k) => html`<${F} label=${label}><input value=${s.agency[k]} onInput=${e => upA({ [k]: e.target.value })}/><//>`;
  const T = (label, k, rows) => html`<${F} label=${label} wide><textarea rows=${rows} value=${s[k]} onInput=${e => up({ [k]: e.target.value })}></textarea><//>`;
  const logo = e => { const f = e.target.files[0]; if (!f) return; if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 150000) return toast('Bitte PNG, JPG oder WebP bis 150 KB'); const r = new FileReader(); r.onload = () => upA({ logo: r.result }); r.readAsDataURL(f); };
  const { id, ...data } = s, send = () => save('settings', 'offer', { ...data, modules: s.modules.filter(m => m.title?.trim()).map(m => ({ title: m.title, desc: m.desc || '', unit: m.unit || '', price: num(m.price) })) }).then(() => toast('Vorlage gespeichert'), () => {});
  return html`<a class="back" href="#/angebote"><${Icon} n="left"/>Angebote</a><${Head} title="Vorlage & Konditionen" sub="Gilt für alle neuen Angebote"><button class="btn" onClick=${send}>Speichern</button><//>
    <div class="stack narrow"><section class="card"><div class="ch"><h3>Agentur</h3></div><div class="grid">${A('Name', 'name')}${A('Unterzeichnende Person', 'signer')}${A('Straße und Nr.', 'street')}<div class="row zip">${A('PLZ', 'zip')}${A('Ort', 'city')}</div>${A('E-Mail', 'email')}${A('Telefon', 'phone')}${A('Website', 'web')}${A('USt-IdNr.', 'vatId')}<${F} label="Logo (bis 150 KB)"><input type="file" accept="image/png,image/jpeg,image/webp" onChange=${logo}/><//>${s.agency.logo && html`<div class="f"><span>Aktuelles Logo</span><div class="row"><img src=${s.agency.logo} alt="Logo" style="max-height:42px"/><button class="tag" onClick=${() => upA({ logo: '' })}>Entfernen</button></div></div>`}</div></section>
      <section class="card"><div class="ch"><h3>Eure Unterschrift</h3></div><p class="hint">Steht auf jedem neuen Angebot links neben dem Feld des Kunden.</p>${s.agency.signature && !redo ? html`<div class="row" style="align-items:center"><img src=${s.agency.signature} alt="Gespeicherte Unterschrift" style="max-height:80px;background:#fff;border-radius:8px"/><button class="tag" onClick=${() => setRedo(true)}>Ändern</button></div>` : html`<${SignPad} name=${s.agency.signer} onChange=${x => x && upA({ signature: x })}/>`}</section>
      <section class="card"><div class="ch"><h3>Leistungen und Preise</h3></div><p class="hint">Die Preise sind Beispiele. Trage hier eure echten Nettopreise ein.</p>${s.modules.map((m, i) => html`<div class="mrow" key=${i}><input aria-label="Leistung" value=${m.title} onInput=${e => upM(i, { title: e.target.value })}/><input aria-label="Umfang" value=${m.desc} onInput=${e => upM(i, { desc: e.target.value })}/><input aria-label="Einheit" value=${m.unit} onInput=${e => upM(i, { unit: e.target.value })}/><input aria-label="Preis" type="number" min="0" step="0.01" value=${m.price} onInput=${e => upM(i, { price: e.target.value })}/><button class="icon" aria-label="Entfernen" onClick=${() => up({ modules: s.modules.filter((_, k) => k !== i) })}><${Icon} n="x"/></button></div>`)}<button class="tag" onClick=${() => up({ modules: [...s.modules, { title: '', desc: '', unit: '', price: 0 }] })}><${Icon} n="plus"/>Leistung</button></section>
      <section class="card"><div class="ch"><h3>Texte</h3></div><div class="grid">${T('Über uns', 'about', 4)}${T('Projektablauf', 'process', 6)}${T('Konditionen', 'terms', 14)}<p class="hint wide">Die Konditionen sind ein Mustertext. Bitte vor dem ersten echten Angebot rechtlich prüfen lassen.</p><${F} label="Umsatzsteuer"><select value=${s.vat} onChange=${e => up({ vat: e.target.value })}>${Object.entries(VAT).map(([v, n]) => html`<option value=${v}>${n}</option>`)}</select><//><${F} label="Gültigkeit in Tagen"><input type="number" min="1" value=${s.days} onInput=${e => up({ days: e.target.value })}/><//></div></section></div>`;
}

// ── Nach der Unterschrift: Kunde und Projekt anlegen ──
const handled = new Set();
function processSigned() {
  if (!S.ready || !S.me || PUBLIC) return;
  for (const p of list('publicOffers')) {
    const o = get('offers', p.offerId);
    if (!o || o.token !== p.id || o.status !== 'offen' || handled.has(p.id)) continue;
    if (p.status === 'abgelehnt') { handled.add(p.id); save('offers', o.id, { status: 'abgelehnt', signedSeen: false }).catch(() => handled.delete(p.id)); }
    if (p.status === 'unterschrieben') { handled.add(p.id); createFromOffer(o, p).catch(e => { console.error(e); handled.delete(p.id); }); }
  }
}
async function createFromOffer(o, p) {
  const d = JSON.parse(p.docJson), at = ms(p.sign?.at) || Date.now(), known = d.clientId && get('clients', d.clientId);
  // Feste IDs: auch bei mehreren offenen Apps entsteht nur ein Projekt
  const cid = known ? known.id : 'c' + o.id, pid = 'p' + o.id;
  if (known) { const fill = Object.fromEntries(CFIELDS.filter(k => !known[k] && d.c[k]).map(k => [k, d.c[k]])); if (Object.keys(fill).length) await save('clients', cid, fill); }
  else if (!get('clients', cid)) await save('clients', cid, { ...pickC(d.c), status: 'Onboarding', createdAt: Date.now() });
  if (!get('projects', pid)) {
    const ph = PHASES[0].id;
    await save('projects', pid, { name: d.projectName, clientId: cid, phase: ph, phaseSince: at, history: [{ phase: ph, at, by: o.ownerId }], ownerId: o.ownerId, memberIds: [], priority: 'normal', startDate: d.startDate || today(), deadline: d.deadline || '', description: [d.intro, 'Beauftragt:', ...d.items.map(i => `• ${num(i.qty)}× ${i.title}${i.desc ? ` (${i.desc})` : ''}`)].filter(Boolean).join('\n'), links: [], checks: { [ph + '_0']: true }, offerId: o.id, archived: false, createdAt: Date.now() });
    log(pid, `Angebot ${d.number} unterschrieben von ${p.sign?.name}, Projekt automatisch angelegt`).catch(() => {});
  }
  await save('offers', o.id, { status: 'unterschrieben', projectId: pid, clientId: cid, signedAt: at, signedSeen: false });
  toast(`Unterschrieben: ${d.projectName}. Projekt wurde angelegt.`);
}

// ── Kundenansicht (ohne Login) ──
const PUBLIC = (location.hash.match(/^#\/a\/([0-9a-v]{20})$/) || [])[1] || null;
async function bootPublic() {
  const isTeam = (() => { try { return !!localStorage.getItem('tw-team'); } catch { return false; } })();
  let preview = false; try { preview = localStorage.getItem('tw-preview') === PUBLIC; localStorage.removeItem('tw-preview'); } catch {}
  try {
    if (S.mode === 'demo') {
      const st = JSON.parse(localStorage.getItem(LS)); S.data = { ...S.data, ...(st?.data || {}) }; S.me = st?.me || null;
      const p = get('publicOffers', PUBLIC); if (p && !preview && !p.viewedAt && p.status === 'offen') save('publicOffers', PUBLIC, { viewedAt: Date.now() });
      addEventListener('storage', pullDemo); setInterval(pullDemo, 1500);
    } else {
      const [a, f] = await Promise.all([import(CDN('app')), import(CDN('firestore'))]);
      FB = { ...f, db: f.getFirestore(a.initializeApp(C.firebase)) };
      const ref = f.doc(FB.db, 'publicOffers', PUBLIC), sn = await f.getDoc(ref);
      if (sn.exists()) { S.data.publicOffers = { [PUBLIC]: { ...sn.data(), id: PUBLIC } }; if (!sn.data().viewedAt && sn.data().status === 'offen' && !isTeam && !preview) f.updateDoc(ref, { viewedAt: f.serverTimestamp() }).catch(() => {}); }
    }
  } catch (e) { console.error(e); S.error = 'Das Angebot konnte nicht geladen werden. Bitte später erneut versuchen.'; }
  S.ready = true; notify();
}
async function publicUpdate(key, patch, status) {
  if (S.mode === 'demo') { const cur = JSON.parse(localStorage.getItem(LS)).data.publicOffers[PUBLIC]; if (cur.status !== 'offen') { S.data.publicOffers[PUBLIC] = cur; notify(); throw new Error('closed'); } return save('publicOffers', PUBLIC, { status, [key]: { ...patch, at: Date.now() } }); }
  const ref = FB.doc(FB.db, 'publicOffers', PUBLIC);
  await FB.updateDoc(ref, { status, [key]: { ...patch, at: FB.serverTimestamp() } });
  const sn = await FB.getDoc(ref); S.data.publicOffers = { [PUBLIC]: { ...sn.data(), id: PUBLIC } }; notify();
}
function SignPad({ onChange, name }) {
  const [mode, setMode] = useState('draw'), ref = useRef(), drawing = useRef(false), used = useRef(false);
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); used.current = false; onChange(''); };
  useEffect(() => { clear(); }, [mode]);
  useEffect(() => { if (mode !== 'type') return; const c = ref.current, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); if (!name.trim()) return onChange(''); x.fillStyle = '#17324d'; let s = 84; do { x.font = `italic ${s}px "Snell Roundhand","Segoe Script",cursive`; s -= 4; } while (x.measureText(name).width > c.width - 60 && s > 20); x.textBaseline = 'middle'; x.fillText(name, 30, c.height / 2); onChange(c.toDataURL('image/png')); }, [mode, name]);
  const pt = e => { const c = ref.current, r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  const down = e => { if (mode !== 'draw') return; e.preventDefault(); ref.current.setPointerCapture?.(e.pointerId); drawing.current = true; const x = ref.current.getContext('2d'); x.lineWidth = 4; x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#17324d'; x.beginPath(); x.moveTo(...pt(e)); };
  const move = e => { if (!drawing.current) return; const x = ref.current.getContext('2d'); x.lineTo(...pt(e)); x.stroke(); used.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (used.current) onChange(ref.current.toDataURL('image/png')); };
  return html`<div class="f wide"><div class="ch"><span class="ql">Unterschrift</span><div class="seg">${[['draw', 'Zeichnen'], ['type', 'Tippen']].map(([k, n]) => html`<button type="button" aria-pressed=${mode === k} class=${mode === k ? 'on' : ''} onClick=${() => setMode(k)}>${n}</button>`)}</div>${mode === 'draw' && html`<button type="button" class="tag" onClick=${clear}>Löschen</button>`}</div><canvas ref=${ref} class="pad2" width="900" height="255" aria-label="Unterschriftsfeld" onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}></canvas></div>`;
}
function SignPage() {
  const p = get('publicOffers', PUBLIC), [name, setName] = useState(null), [img, setImg] = useState(''), [draft, setDraft] = useState(''), [pop, setPop] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [no, setNo] = useState(null);
  let d = null; try { d = p && JSON.parse(p.docJson); } catch {}
  useEffect(() => { if (d) document.title = `Angebot ${d.number}, ${d.agency.name}`; }, [!!d]);
  useEffect(() => { if (!pop) return; const f = e => e.key === 'Escape' && setPop(false); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, [pop]);
  if (!S.ready) return html`<main class="login">Angebot wird geladen …</main>`;
  if (S.error || !d || p.status === 'zurückgezogen') return html`<main class="login"><div class="card"><h1>${S.error ? 'Fehler' : 'Dieses Angebot ist nicht mehr verfügbar'}</h1><p>${S.error || 'Bitte wenden Sie sich an Ihre Ansprechperson.'}</p></div></main>`;
  const n = name ?? d.c.contactName, exp = Date.now() > p.validTs, can = p.status === 'offen' && !exp;
  const act = async f => { setBusy(true); setErr(''); try { await f(); scrollTo(0, 0); } catch (e) { console.error(e); setErr('Das hat nicht geklappt. Bitte laden Sie die Seite neu und versuchen Sie es noch einmal.'); } setBusy(false); };
  const sign = () => act(() => publicUpdate('sign', { name: n.trim(), email: d.c.contactEmail, image: img, hash: p.hash, ua: navigator.userAgent.slice(0, 400), consent: true }, 'unterschrieben'));
  const toField = () => document.querySelector('.sigs')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  const open = () => { setDraft(''); setPop(true); };
  const slot = can ? { name: img ? n : '', box: img ? html`<button class="sigset" title="Unterschrift ändern" onClick=${open}><img src=${img} alt="Ihre Unterschrift"/></button>` : html`<button class="sigtag" onClick=${open}><${Icon} n="edit"/>Hier unterschreiben</button>` } : null;
  return html`<main class="sign"><div class="sighead"><b>${d.agency.name}</b><span class="sp"></span><${PdfBtn} d=${d} pub=${p}/>${can && (img ? html`<button class="btn" disabled=${busy} onClick=${sign}>Verbindlich abschließen</button>` : html`<button class="btn" onClick=${toField}>Unterschreiben</button>`)}</div>
    ${p.status === 'unterschrieben' && html`<div class="okbar">Vielen Dank, das Angebot ist unterschrieben. Speichern Sie sich Ihr Exemplar als PDF.</div>`}${p.status === 'abgelehnt' && html`<div class="okbar no">Dieses Angebot wurde abgelehnt.</div>`}${p.status === 'offen' && exp && html`<div class="okbar no">Dieses Angebot ist am ${fmtD(d.validUntil)} abgelaufen.</div>`}
    <${OfferDoc} d=${d} pub=${p} slot=${slot}/>
    ${can && html`<div class="signend">${err && html`<p class="bad" role="alert">${err}</p>`}${img ? html`<button class="btn" disabled=${busy} onClick=${sign}>Verbindlich abschließen</button><p class="hint">Mit dem Klick nehme ich das Angebot mit den Konditionen für ${d.c.name} verbindlich an und bin dazu berechtigt. Gespeichert werden Name, E-Mail laut Angebot, Unterschrift, Zeitpunkt und Browserangaben als Nachweis.</p>` : null}
      ${no === null ? html`<button class="link" onClick=${() => setNo('')}>Angebot ablehnen</button>` : html`<div class="row"><input aria-label="Grund" placeholder="Grund (freiwillig)" maxlength="1000" value=${no} onInput=${e => setNo(e.target.value)}/><button class="btn ghost danger" disabled=${busy} onClick=${() => act(() => publicUpdate('decline', { reason: no.slice(0, 1000) }, 'abgelehnt'))}>Ablehnen</button><button class="tag" onClick=${() => setNo(null)}>Abbrechen</button></div>`}</div>`}
    ${pop && html`<div class="veil" onMouseDown=${e => e.target === e.currentTarget && setPop(false)}><div class="modal" role="dialog" aria-modal="true" aria-label="Unterschreiben"><button class="close" aria-label="Schließen" onClick=${() => setPop(false)}><${Icon} n="x"/></button><h2>Unterschreiben</h2><${F} label="Vollständiger Name"><input autocomplete="name" value=${n} onInput=${e => setName(e.target.value)}/><//><${SignPad} name=${n} onChange=${setDraft}/><footer><span class="sp"></span><button class="btn ghost" onClick=${() => setPop(false)}>Abbrechen</button><button class="btn" disabled=${n.trim().length < 2 || !draft} onClick=${() => { setImg(draft); setPop(false); setTimeout(toField, 60); }}>Unterschrift einfügen</button></footer></div></div>`}</main>`;
}
