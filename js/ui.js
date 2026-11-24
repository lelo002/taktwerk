'use strict';
const ICONS = {
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5', day: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8', board: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z',
  folder: 'M3 6h6l2 2h10v11H3z', client: 'M4 21V5l8-2v18M12 9h8v12M4 21h17M7.5 8v0M7.5 12v0M7.5 16v0', team: 'M9 11a4 4 0 100-8 4 4 0 000 8M2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 010 7M18 15.5c2.500.8 4 2.700 4 5.500',
  doc: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5', mail: 'M3 6h18v12H3zM3 7l9 7 9-7', print: 'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z',
  plus: 'M12 5v14M5 12h14', search: 'M11 4a7 7 0 100 14 7 7 0 000-14M16 16l5 5', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5L20 7', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 7v5l3 2', flag: 'M5 21V4h12l-2 4 2 4H5', link: 'M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z', edit: 'M4 20l1-5L16 4l4 4L9 19z', copy: 'M8 8h12v12H8zM4 16V4h12', cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4', out: 'M10 4H4v16h6M9 12h12M17 8l4 4-4 4', sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.500v5M8 14.500v5', spark: 'M13 2L4 14h7l-1 8 9-12h-7z',
};
const Icon = ({ n }) => html`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d=${ICONS[n]} /></svg>`;
const initials = n => (n || '?').split(/[\s.]+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const hueOf = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997; return (h * 47) % 360; };
const Avatar = ({ id, sm }) => { const u = get('users', id); return html`<span class=${'av' + (sm ? ' sm' : '')} style=${`--h:${hueOf(id)}`} title=${u?.name || 'Nicht zugewiesen'}>${u ? initials(u.name) : '?'}</span>`; };
const Pill = ({ k = '', children }) => html`<span class=${'pill ' + k}>${children}</span>`;
const Empty = ({ children }) => html`<p class="empty">${children}</p>`;
const Head = ({ title, sub, children }) => html`<header class="head"><div><h1>${title}</h1>${sub && html`<p>${sub}</p>`}</div><div class="acts">${children}</div></header>`;
const PhasePill = ({ id }) => html`<span class="phase"><i style=${`--p:${(phaseIdx(id) + 1) / PHASES.length}`}></i>${PHASES[phaseIdx(id)].name}</span>`;
const StatusPill = ({ c }) => html`<${Pill} k=${{ Aktiv: 'ok', Onboarding: 'inf' }[cStatus(c)] || ''}>${cStatus(c)}<//>`;
// Breite Phasenanzeige: Name, Nummer und ein Segment pro Phase
const PhaseBar = ({ id }) => { const k = phaseIdx(id); return html`<div class="pbar"><div><b>${PHASES[k].name}</b><span>${k + 1} von ${PHASES.length}</span></div><i>${PHASES.map((_, i) => html`<s class=${i < k ? 'past' : i === k ? 'cur' : ''}></s>`)}</i></div>`; };
function Stars({ value = 0, max, onChange, label }) {
  if (!onChange) return value ? html`<span class="stars ro" role="img" aria-label=${`${label}: ${value} von ${max}`} title=${`${label}: ${value} von ${max}`}>${Array.from({ length: max }, (_, i) => html`<span class=${i < value ? 'on' : ''}>★</span>`)}</span>` : html`<small>–</small>`;
  return html`<div class="stars" role="radiogroup" aria-label=${label}>${Array.from({ length: max }, (_, i) => html`<button type="button" role="radio" aria-checked=${value === i + 1} aria-label=${`${i + 1} von ${max}`} class=${i < value ? 'on' : ''} onClick=${() => onChange(value === i + 1 ? 0 : i + 1)}>★</button>`)}</div>`;
}
const DateNav = ({ date, set, max }) => html`${date !== today() && html`<button class="btn ghost" onClick=${() => set(today())}>Zu heute</button>`}<div class="nav"><button aria-label="Vorheriger Tag" onClick=${() => set(addDays(date, -1))}><${Icon} n="left"/></button><${MoveBtn} nav from=${date} max=${max} label=${dayLabel(date)} onPick=${set}/><button aria-label="Nächster Tag" disabled=${max && date >= max} onClick=${() => set(addDays(date, 1))}><${Icon} n="right"/></button></div>`;
const Tabs = ({ v, set, items }) => html`<div class="tabs" role="tablist">${items.map(([k, n, c]) => html`<button role="tab" aria-selected=${v === k} class=${v === k ? 'on' : ''} onClick=${() => set(k)}>${n}${c != null && html`<span>${c}</span>`}</button>`)}</div>`;
const Fold = ({ label, children }) => { const [o, set] = useState(false); return html`<button class="tag" aria-expanded=${o} onClick=${() => set(!o)}>${o ? 'Erledigte ausblenden' : label}</button>${o && children}`; };
const Deadline = ({ p }) => p.deadline ? html`<span class=${'dl ' + (isOverdue(p) ? 'bad' : !inCare(p) && daysBetween(today(), p.deadline) <= 5 ? 'warn' : '')}><${Icon} n="flag"/>${relDay(p.deadline)}</span>` : null;
const go = h => { location.hash = h; };

const UserOpts = ({ v, none }) => html`${none && html`<option value="">${none}</option>`}${users().map(u => html`<option value=${u.id} selected=${u.id === v}>${u.name}${u.id === uid() ? ' (ich)' : ''}</option>`)}`;
// Ein Feld für „Kunde oder Projekt"
const LinkOpts = ({ t }) => html`<option value="">Kein Kunde / Projekt</option>
  ${list('clients').sort((a, b) => a.name.localeCompare(b.name)).map(c => html`<optgroup label=${c.name}><option value=${'c:' + c.id} selected=${!t.projectId && t.clientId === c.id}>${c.name} (nur Kunde)</option>
  ${projects().filter(p => p.clientId === c.id).map(p => html`<option value=${'p:' + p.id} selected=${t.projectId === p.id}>${p.name}</option>`)}</optgroup>`)}`;
const linkPatch = v => ({ projectId: v?.startsWith('p:') ? v.slice(2) : '', clientId: v?.startsWith('c:') ? v.slice(2) : '' });

const Guests = ({ g }) => g?.length ? html`<em class="guests" title=${g.join(', ')}>mit ${g.slice(0, 3).map(e => personName(e) ? `${personName(e)} (${e})` : e).join(', ')}${g.length > 3 ? ` +${g.length - 3}` : ''}</em>` : null;
// Kleiner Monatskalender zum Verschieben
function MoveBtn({ onPick, label = 'Verschieben', from, nav, max }) {
  const [open, setOpen] = useState(false), [m, setM] = useState(today().slice(0, 7)), ref = useRef();
  useEffect(() => { if (!open) return; const f = e => { if (e.key === 'Escape' || (e.type === 'mousedown' && !ref.current?.contains(e.target))) setOpen(false); }; addEventListener('mousedown', f); addEventListener('keydown', f); return () => { removeEventListener('mousedown', f); removeEventListener('keydown', f); }; }, [open]);
  const first = m + '-01', start = addDays(first, -((parseD(first).getDay() + 6) % 7)), shift = n => { const d = parseD(first); d.setMonth(d.getMonth() + n); setM(iso(d).slice(0, 7)); };
  return html`<span class="mv" ref=${ref}><button class=${nav ? 'navl' : 'tag'} title=${nav ? 'Datum wählen' : null} aria-expanded=${open} onClick=${() => { if (!open) setM((from && (nav || from > today()) ? from : today()).slice(0, 7)); setOpen(!open); }}>${nav ? null : html`<${Icon} n="cal"/>`}${label}${nav && html`<${Icon} n="cal"/>`}</button>${open && html`<div class="mcal" role="dialog" aria-label="Neues Datum wählen"><div class="mh"><button class="icon" aria-label="Voriger Monat" onClick=${() => shift(-1)}><${Icon} n="left"/></button><b>${parseD(first).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</b><button class="icon" aria-label="Nächster Monat" onClick=${() => shift(1)}><${Icon} n="right"/></button></div><div class="mg">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(x => html`<small>${x}</small>`)}${Array.from({ length: 42 }, (_, i) => addDays(start, i)).map(d => html`<button key=${d} aria-label=${fmtLong(d)} disabled=${nav ? max && d > max : d < today()} class=${(d.slice(0, 7) !== m ? 'off ' : '') + (d === today() ? 'td ' : '') + (d === from ? 'sel' : '')} onClick=${() => { setOpen(false); onPick(d); }}>${+d.slice(8)}</button>`)}</div></div>`}</span>`;
}
function moveTask(t, date) {
  if (t.date === date) return;
  if (t.guests?.length && t.start && !confirm('Die Teilnehmenden werden über das neue Datum informiert. Verschieben?')) return;
  // Termine behalten ihre Uhrzeit, To-dos werden am neuen Tag neu eingeplant
  saveTask(t.id, isT(t) ? { date } : { date, start: '', end: '' }); toast(`${t.title}: ${dayLabel(date)}`);
}
function TaskRow({ t, showWho, actions, urgent, draggable = true }) {
  const l = linkLabel(t), late = !t.done && t.date && t.date < today();
  return html`<div class=${'task' + (t.done ? ' done' : '') + (urgent ? ' late' : '')} draggable=${draggable && !t.done && !t.external}
    onDragStart=${e => { S.drag = { task: t.id }; e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd=${() => { S.drag = null; }}>
    <button class=${'chk' + (t.done ? ' on' : '')} role="checkbox" aria-checked=${t.done} aria-label=${'Erledigt: ' + t.title} onClick=${() => toggleTask(t)}><${Icon} n="check"/></button>
    <button class="tbody" onClick=${() => openModal('task', { id: t.id })}>
      <span class="tt">${t.title}${urgent && html` <${Pill} k="bad">Überfällig<//>`}${t.priority === 'hoch' && html` <${Pill} k="bad">Hoch<//>`}${t.priority === 'niedrig' && html` <${Pill}>Niedrig<//>`}</span>
      <span class="tm">${t.start && html`<b><${Icon} n="clock"/>${t.start}–${t.end}</b>`}${late && html`<em class="bad">seit ${fmtD(t.date)}</em>`}${l && html`<em>${l}</em>`}<${Guests} g=${t.guests}/>${t.createdBy !== t.assigneeId && html`<em>von ${get('users', t.createdBy)?.name || 'Team'}</em>`}</span>
    </button>
    ${actions}
    ${showWho && html`<${Avatar} id=${t.assigneeId} sm/>`}
  </div>`;
}

// Schnelleingabe mit @Person, #Projekt und „13-14 Uhr"
function QuickAdd({ kind = 'todo', date, preset = {}, placeholder, solo, pickKind }) {
  const [kd, setKd] = useState(kind);
  const [txt, setTxt] = useState(''), [x, setX] = useState({}), [sel, setSel] = useState(0), ref = useRef();
  const m = txt.match(/(?:^|\s)([@#])([^@#]*)$/), q = m?.[2].toLowerCase();
  const opts = !m ? [] : (m[1] === '@' ? (solo ? [] : users()).filter(u => u.name.toLowerCase().includes(q)).map(u => ({ label: u.name, sub: u.role, patch: { assigneeId: u.id } }))
    : [...projects().map(p => ({ label: p.name, sub: get('clients', p.clientId)?.name, patch: { projectId: p.id, clientId: '' } })), ...list('clients').map(c => ({ label: c.name, sub: 'Kunde', patch: { clientId: c.id, projectId: '' } }))].filter(o => (o.label + ' ' + o.sub).toLowerCase().includes(q))).slice(0, 6);
  const pick = o => { setX({ ...x, ...o.patch }); setTxt(txt.slice(0, m.index).trimEnd() + ' '); setSel(0); ref.current.focus(); };
  const submit = () => {
    let title = txt.trim(), time = {};
    const r = solo ? null : title.match(/\s*(?:von\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(?:[-–]|bis)\s*(\d{1,2})(?::(\d{2}))?(\s*uhr\b)?/i);
    if (r && (r[5] || r[2] || r[4]) && +r[1] < 24 && +r[3] < 24 && (r[2] || 0) < 60 && (r[4] || 0) < 60) { time = { start: pad(+r[1]) + ':' + (r[2] || '00'), end: pad(+r[3]) + ':' + (r[4] || '00') }; title = title.replace(r[0], ' ').trim(); }
    else if (!solo) { const o = title.match(/\s*\bum\s+(\d{1,2})(?::(\d{2}))?\s*uhr\b/i); if (o && +o[1] < 24) { time = { start: pad(+o[1]) + ':' + (o[2] || '00') }; title = title.replace(o[0], ' ').trim(); } }
    if (!title) return;
    saveTask(null, { title, kind: kd, date: date || '', ...(date ? time : {}), ...preset, ...x });
    if (x.assigneeId && x.assigneeId !== uid()) toast(`An ${get('users', x.assigneeId).name} zugewiesen`);
    setTxt(''); setX({});
  };
  const key = e => {
    if (opts.length && ['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setSel((sel + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length); }
    else if (opts.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pick(opts[sel] || opts[0]); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };
  const l = linkLabel(x), y = { ...preset, ...x };
  return html`<div class="qa"><div class="qai"><${Icon} n="plus"/><input ref=${ref} value=${txt} aria-label=${placeholder} placeholder=${placeholder} onInput=${e => { setTxt(e.target.value); setSel(0); }} onKeyDown=${key}/>
    ${pickKind && html`<select class="mini" aria-label="Art" value=${kd} onChange=${e => setKd(e.target.value)}><option value="todo">To-do</option><option value="termin">Termin</option></select>`}
    <select class="mini" aria-label="Kunde oder Projekt" title="Kunde oder Projekt" value=${y.projectId ? 'p:' + y.projectId : y.clientId ? 'c:' + y.clientId : ''} onChange=${e => setX({ ...x, ...linkPatch(e.target.value) })}><${LinkOpts} t=${y}/></select>
    ${!solo && html`<select class="mini" aria-label="Zuständig" title="Zuständig" value=${x.assigneeId || preset.assigneeId || uid()} onChange=${e => setX({ ...x, assigneeId: e.target.value })}><${UserOpts} v=${x.assigneeId || preset.assigneeId || uid()}/></select>`}
    <button class="btn sm" disabled=${!txt.trim()} onClick=${submit}>Hinzufügen</button></div>
    ${(l || x.assigneeId) && html`<div class="chips">${x.assigneeId && html`<button class="pill acc" onClick=${() => setX({ ...x, assigneeId: undefined })}>@${get('users', x.assigneeId)?.name} ×</button>`}${l && html`<button class="pill acc" onClick=${() => setX({ ...x, projectId: '', clientId: '' })}># ${l} ×</button>`}</div>`}
    ${opts.length > 0 && html`<div class="pop" role="listbox">${opts.map((o, i) => html`<button role="option" aria-selected=${i === sel} class=${i === sel ? 'on' : ''} onMouseDown=${e => { e.preventDefault(); pick(o); }}>${o.label}<small>${o.sub}</small></button>`)}</div>`}
  </div>`;
}

// ── Dialoge ──
const fd = e => { e.preventDefault(); return Object.fromEntries(new FormData(e.target)); };
const F = ({ label, children, wide }) => html`<label class=${'f' + (wide ? ' wide' : '')}><span>${label}</span>${children}</label>`;
const Foot = ({ onDelete, isNew }) => html`<footer>${onDelete && html`<button type="button" class="btn ghost danger" onClick=${onDelete}><${Icon} n="trash"/>Löschen</button>`}<span class="sp"></span><button type="button" class="btn ghost" onClick=${closeModal}>Abbrechen</button><button class="btn">${isNew ? 'Anlegen' : 'Speichern'}</button></footer>`;

function TaskForm({ id, preset = {} }) {
  const t = (id && get('tasks', id)) || { kind: 'todo', date: today(), assigneeId: uid(), ...preset };
  const form = useRef(), [assignee, setAssignee] = useState(t.assigneeId), [kind, setKind] = useState(isBlocker(t) ? 'blocker' : t.kind), [cid, setCid] = useState(clientOf(t)?.id || ''), [pid, setPid] = useState(t.projectId || ''), [guests, setGuests] = useState(t.guests || []), [gtxt, setGtxt] = useState(''), [w, setW] = useState({ date: t.date || '', start: t.start || '', end: t.end || '' });
  const len = w.start && w.end ? Math.max(15, toMin(w.end) - toMin(w.start)) : 60, ends = s => toHM(Math.min(toMin(s) + len, 1439)), pick = s => setW({ date: w.date || today(), start: s, end: ends(s) });
  useEffect(() => { if (id && t.assigneeId === uid() && t.seen === false) save('tasks', id, { seen: true }).catch(() => {}); }, []);
  const addGuests = v => { const ok = v.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(s => /^\S+@\S+\.\S+$/.test(s)); const n = [...new Set([...guests, ...ok])]; if (ok.length) { setGuests(n); setGtxt(''); } return n; };
  const known = [...users().filter(u => u.id !== assignee && u.email).map(u => [u.email, u.name]), ...list('clients').filter(c => c.contactEmail).map(c => [c.contactEmail.toLowerCase(), `${c.contactName || c.name}, ${c.name}`])];
  const submit = e => {
    const { gmail, ...x } = fd(e);
    if (kind === 'termin' && gtxt.trim() && !/^\S+@\S+\.\S+$/.test(gtxt.trim().split(/[\s,;]+/)[0])) return toast('Bitte eine gültige E-Mail-Adresse eingeben');
    if (!t.external) { x.guests = kind === 'termin' ? addGuests(gtxt) : []; if (!id && !x.guests.length) delete x.guests; } x.title = x.title.trim(); if (!x.title) return;
    if (x.start && !x.date) x.date = today();
    x.kindSet = true;
    const gone = (t.guests || []).length && !t.external && t.start && kind !== 'termin';
    if (gone && !confirm('Die Teilnehmenden werden ausgeladen. Fortfahren?')) return;
    saveTask(id, { ...x, kind, projectId: pid, clientId: pid ? '' : cid });
    if (x.assigneeId !== uid() && x.assigneeId !== t.assigneeId) toast(`An ${get('users', x.assigneeId).name} zugewiesen`);
    closeModal();
  };
  const slot = () => { const d = w.date || today(), s = freeSlot(d, 60, id); if (!s) return toast('An diesem Tag ist keine Stunde mehr frei'); setW({ date: d, ...s }); };
  return html`<form ref=${form} onSubmit=${submit}><h2>${id ? 'Bearbeiten' : 'Neue Aufgabe'}</h2><div class="tf"><div>
    <div class="seg">${[['todo', 'To-do'], ['termin', 'Termin'], ['blocker', 'Blocker']].map(([k, n]) => html`<button type="button" class=${kind === k ? 'on' : ''} onClick=${() => setKind(k)}>${n}</button>`)}</div>
    <div class="grid">
      <${F} label="Titel" wide><input name="title" required autofocus defaultValue=${t.title}/><//>
      <${F} label="Datum"><input type="date" name="date" value=${w.date} onInput=${e => setW({ ...w, date: e.target.value })} disabled=${t.external}/><//>
      <div class="f"><span>Uhrzeit</span><div class="row"><input type="time" name="start" aria-label="Beginn" value=${w.start} onInput=${e => setW({ ...w, start: e.target.value, end: e.target.value ? ends(e.target.value) : '' })} disabled=${t.external}/><input type="time" name="end" aria-label="Ende" value=${w.end} onInput=${e => setW({ ...w, end: e.target.value })} disabled=${t.external}/></div></div>
      <${F} label="Zuständig"><select name="assigneeId" disabled=${t.external} value=${assignee} onChange=${e => setAssignee(e.target.value)}><${UserOpts} v=${assignee}/></select><//>
      <${F} label="Kunde"><select value=${cid} onChange=${e => { setCid(e.target.value); if (pid && get('projects', pid)?.clientId !== e.target.value) setPid(''); }}><option value="">Kein Kunde</option>${list('clients').sort((a, b) => a.name.localeCompare(b.name)).map(c => html`<option value=${c.id}>${c.name}</option>`)}</select><//>
      <${F} label="Projekt"><select value=${pid} onChange=${e => { setPid(e.target.value); if (e.target.value) setCid(get('projects', e.target.value).clientId); }}><option value="">Projektunabhängig</option>${list('projects').filter(p => (!p.archived || p.id === pid) && (!cid || p.clientId === cid)).map(p => html`<option value=${p.id}>${p.name}</option>`)}</select><//>
      <${F} label="Priorität"><select name="priority">${['normal', 'hoch', 'niedrig'].map(p => html`<option value=${p} selected=${(t.priority || 'normal') === p}>${p}</option>`)}</select><//>
      ${!t.external && assignee === uid() && html`<div class="f"><span>Zeit finden</span><button type="button" class="btn ghost" onClick=${slot}><${Icon} n="spark"/>Nächste freie Stunde</button></div>`}
      ${kind === 'termin' && html`<div class="f wide"><span>Mit wem? (E-Mail-Adressen)</span>${guests.length > 0 && html`<div class="chips">${guests.map(g => t.external ? html`<span class="pill">${personName(g) ? `${personName(g)} · ` : ''}${g}</span>` : html`<button type="button" class="pill acc" aria-label=${g + ' entfernen'} onClick=${() => setGuests(guests.filter(x => x !== g))}>${personName(g) ? `${personName(g)} · ` : ''}${g} ×</button>`)}</div>`}${!t.external && html`<div class="row"><input name="gmail" type="text" inputmode="email" list="known" aria-label="E-Mail hinzufügen" placeholder="name@firma.de" value=${gtxt} onInput=${e => setGtxt(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && gtxt.trim()) { e.preventDefault(); addGuests(gtxt); } }}/><button type="button" class="btn ghost" onClick=${() => addGuests(gtxt)}>Hinzufügen</button></div><datalist id="known">${known.map(([e, n]) => html`<option value=${e}>${n}</option>`)}</datalist>`}</div>`}
      <${F} label="Notizen" wide><textarea name="notes" rows="3" defaultValue=${t.notes}></textarea><//>
    </div>
    </div>${!t.external && html`<${Calendar} mini date=${w.date || today()} who=${assignee} skipId=${id} pick=${pick} draft=${w.start && w.end && toMin(w.end) > toMin(w.start) ? w : null}/>`}</div>
    <p class="hint">${kind === 'blocker' ? 'Ein Blocker belegt nur Zeit im Kalender und muss nicht abgehakt werden.' : kind === 'termin' && guests.length && !t.external ? 'Mit Uhrzeit erhalten die Teilnehmenden eine Google-Einladung. Deine Notizen sehen sie nicht.' : t.external ? 'Aus Google übernommen. Datum und Uhrzeit änderst du direkt im Google Kalender.' : assignee !== uid() ? `Mit Uhrzeit bekommt ${get('users', assignee)?.name} eine Einladung in den Google Kalender.` : 'Mit Uhrzeit erscheint der Eintrag automatisch im Google Kalender.'}</p>
    <${Foot} isNew=${!id} onDelete=${id && (() => { closeModal(); deleteTask(t); })}/></form>`;
}
function ClientForm({ id }) {
  const c = (id && get('clients', id)) || { status: 'Onboarding' };
  const submit = e => { const x = fd(e); save('clients', id || newCode('clients', 'K'), { ...x, ...(!id && { createdAt: Date.now() }) }).then(closeModal, () => {}); };
  const rm = () => { if (list('projects').some(p => p.clientId === id)) return toast('Zuerst die Projekte dieses Kunden löschen, oder den Status auf „Nicht mehr aktiv“ setzen'); if (confirm(`Kunde „${c.name}" löschen?`)) { del('clients', id).catch(() => {}); closeModal(); go('#/kunden'); } };
  const I = (label, name, type = 'text') => html`<${F} label=${label}><input type=${type} name=${name} defaultValue=${c[name]}/><//>`;
  return html`<form onSubmit=${submit}><h2>${id ? 'Kunde bearbeiten' : 'Neuer Kunde'}</h2><div class="grid">
    <${F} label="Name" wide><input name="name" required autofocus defaultValue=${c.name}/><//>
    ${I('Branche', 'industry')}<${F} label="Status"><select name="status">${CLIENT_STATUS.map(s => html`<option value=${s} selected=${cStatus(c) === s}>${s}</option>`)}</select><//>
    ${I('Ansprechpartner', 'contactName')}${I('E-Mail', 'contactEmail', 'email')}${I('Telefon', 'phone', 'tel')}${I('Website', 'website')}
    ${I('Straße und Nr.', 'street')}<div class="row zip">${I('PLZ', 'zip')}${I('Ort', 'city')}</div>${I('Land', 'country')}${I('USt-IdNr.', 'vatId')}
    <${F} label="Notizen" wide><textarea name="notes" rows="3" defaultValue=${c.notes}></textarea><//></div><${Foot} isNew=${!id} onDelete=${id && rm}/></form>`;
}
function ProjectForm({ id, preset = {} }) {
  const p = (id && get('projects', id)) || { phase: PHASES[0].id, ownerId: uid(), priority: 'normal', startDate: today(), memberIds: [], ...preset };
  const [mem, setMem] = useState(p.memberIds || []);
  const submit = e => {
    const { phase, links, ...x } = fd(e);
    x.memberIds = mem; x.links = links.split('\n').map(s => s.trim()).filter(Boolean);
    const nid = id || newCode('projects', 'P');
    if (!id) Object.assign(x, { phase, phaseSince: Date.now(), history: [{ phase, at: Date.now(), by: uid() }], checks: {}, createdAt: Date.now(), archived: false });
    save('projects', nid, x).then(() => { if (id) movePhase(get('projects', id), phase); else { log(nid, 'Projekt angelegt').catch(() => {}); go('#/projekt/' + nid); } closeModal(); }, () => {});
  };
  const rm = () => { if (confirm(`Projekt „${p.name}" endgültig löschen? Aufgaben bleiben ohne Projekt erhalten.`)) { list('tasks').filter(t => t.projectId === id).forEach(t => saveTask(t.id, { projectId: '', clientId: p.clientId || '' })); del('projects', id).catch(() => {}); closeModal(); go('#/projekte'); } };
  const cl = list('clients').sort((a, b) => a.name.localeCompare(b.name));
  if (!cl.length) return html`<div class="pad"><h2>Zuerst einen Kunden anlegen</h2><p class="hint">Jedes Projekt gehört zu einem Kunden.</p><button class="btn" onClick=${() => openModal('client')}>Kunde anlegen</button></div>`;
  return html`<form onSubmit=${submit}><h2>${id ? 'Projekt bearbeiten' : 'Neues Projekt'}</h2><div class="grid">
    <${F} label="Projektname" wide><input name="name" required autofocus defaultValue=${p.name}/><//>
    <${F} label="Kunde"><select name="clientId" required>${cl.map(c => html`<option value=${c.id} selected=${c.id === p.clientId}>${c.name}</option>`)}</select><//>
    <${F} label="Zuständig"><select name="ownerId"><${UserOpts} v=${p.ownerId} none="Noch offen"/></select><//>
    <${F} label="Phase"><select name="phase">${PHASES.map(x => html`<option value=${x.id} selected=${x.id === p.phase}>${x.name}</option>`)}</select><//>
    <${F} label="Priorität"><select name="priority">${['normal', 'hoch', 'niedrig'].map(x => html`<option value=${x} selected=${x === (p.priority || 'normal')}>${x}</option>`)}</select><//>
    <${F} label="Start"><input type="date" name="startDate" defaultValue=${p.startDate}/><//><${F} label="Deadline"><input type="date" name="deadline" defaultValue=${p.deadline}/><//>
    <div class="f wide"><span>Team</span><div class="chips">${users().map(u => html`<button type="button" aria-pressed=${mem.includes(u.id)} class=${'pill' + (mem.includes(u.id) ? ' acc' : '')} onClick=${() => setMem(mem.includes(u.id) ? mem.filter(m => m !== u.id) : [...mem, u.id])}>${u.name}</button>`)}</div></div>
    <${F} label="Beschreibung" wide><textarea name="description" rows="3" defaultValue=${p.description}></textarea><//>
    <${F} label="Links, einer pro Zeile (Drive, Figma …)" wide><textarea name="links" rows="2" defaultValue=${(p.links || []).join('\n')}></textarea><//></div>
    <${Foot} isNew=${!id} onDelete=${id && rm}/></form>`;
}
function UserForm({ id }) {
  const u = (id && get('users', id)) || {};
  const submit = e => { const x = fd(e), email = (x.email || u.email || '').toLowerCase().trim(); save('users', id || email, { name: x.name, role: x.role, email, inactive: !!x.inactive }).then(closeModal, () => {}); };
  return html`<form onSubmit=${submit}><h2>${id ? 'Profil bearbeiten' : 'Teammitglied hinzufügen'}</h2><div class="grid"><${F} label="Name"><input name="name" required autofocus defaultValue=${u.name}/><//><${F} label="Rolle"><input name="role" defaultValue=${u.role}/><//>
    <${F} label="Google-E-Mail" wide><input type="email" name="email" required disabled=${!!id} defaultValue=${u.email}/><//>${id && id !== uid() && html`<label class="cb wide"><input type="checkbox" name="inactive" defaultChecked=${u.inactive}/> Nicht mehr im Team</label>`}</div>
    ${S.mode === 'firebase' && !id && html`<p class="hint">Damit die Person sich anmelden kann, muss ihre Adresse zusätzlich in firestore.rules erlaubt sein.</p>`}<${Foot} isNew=${!id}/></form>`;
}
function Search() {
  const [q, setQ] = useState(''), s = q.trim().toLowerCase(), hit = x => x.toLowerCase().includes(s);
  const r = !s ? [] : [...projects().filter(p => hit(p.name + ' ' + (get('clients', p.clientId)?.name || ''))).map(p => ({ n: p.name, s: 'Projekt · ' + (get('clients', p.clientId)?.name || ''), f: () => go('#/projekt/' + p.id) })),
    ...list('clients').filter(c => hit(c.name + ' ' + (c.contactName || ''))).map(c => ({ n: c.name, s: 'Kunde', f: () => go('#/kunde/' + c.id) })),
    ...list('tasks').filter(t => hit(t.title)).map(t => ({ n: t.title, s: 'Aufgabe · ' + (get('users', t.assigneeId)?.name || ''), f: () => openModal('task', { id: t.id }) }))].slice(0, 9);
  const run = x => { closeModal(); x.f(); };
  return html`<div class="pad"><input class="big" autofocus aria-label="Suche" placeholder="Projekt, Kunde oder Aufgabe suchen" value=${q} onInput=${e => setQ(e.target.value)} onKeyDown=${e => e.key === 'Enter' && r[0] && run(r[0])}/>
    <div class="res">${r.map(x => html`<button onClick=${() => run(x)}>${x.n}<small>${x.s}</small></button>`)}${s && !r.length && html`<${Empty}>Nichts gefunden<//>`}</div></div>`;
}
function Inbox() {
  const ts = myTasks(uid()).filter(t => t.createdBy !== uid() && !t.done).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  const of = list('offers').filter(o => o.ownerId === uid() && o.signedSeen === false);
  useEffect(() => () => of.forEach(o => save('offers', o.id, { signedSeen: true }).catch(() => {})), []);
  useEffect(() => () => myTasks(uid()).filter(t => t.seen === false).forEach(t => save('tasks', t.id, { seen: true }).catch(() => {})), []);
  return html`<div class="pad"><h2>Neu für dich</h2>${of.map(o => html`<a class="offn" href=${o.projectId ? '#/projekt/' + o.projectId : '#/angebot/' + o.id}><${Icon} n="doc"/><span><b>${o.status === 'unterschrieben' ? 'Unterschrieben' : 'Abgelehnt'}: ${o.projectName}</b><small>${o.c?.name}${o.projectId ? ' · Projekt wurde angelegt' : ''}</small></span></a>`)}${ts.map(t => html`<div class=${t.seen === false ? 'new' : ''}><${TaskRow} t=${t} draggable=${false}/></div>`)}${!ts.length && html`<${Empty}>Keine offenen Aufgaben von anderen.<//>`}</div>`;
}
const MODALS = { task: TaskForm, client: ClientForm, project: ProjectForm, user: UserForm, search: Search, inbox: Inbox };
function Modal() {
  const ref = useRef(), m = S.modal;
  useLayoutEffect(() => { const esc = e => e.key === 'Escape' && closeModal(); addEventListener('keydown', esc); (ref.current?.querySelector('[autofocus]') || ref.current)?.focus(); return () => removeEventListener('keydown', esc); }, [m.key]);
  const Body = MODALS[m.type];
  return html`<div class="veil" onMouseDown=${e => e.target === e.currentTarget && closeModal()}><div class=${'modal' + (m.type === 'task' ? ' wide2' : '')} role="dialog" aria-modal="true" tabindex="-1" ref=${ref}><button class="close" aria-label="Schließen" onClick=${closeModal}><${Icon} n="x"/></button><${Body} key=${m.key} ...${m.props}/></div></div>`;
}
