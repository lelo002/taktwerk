'use strict';
// ── Mein Tag: Beginning of Day / End of Day ──
function layout(items) {
  items.sort((a, b) => a.s - b.s || b.e - a.e); let grp = [], end = -1;
  const flush = () => { const cols = []; grp.forEach(i => { let c = cols.findIndex(e => e <= i.s); if (c < 0) c = cols.length; cols[c] = i.e; i.col = c; }); grp.forEach(i => { i.cols = cols.length; }); grp = []; };
  for (const i of items) { if (i.s >= end) { flush(); end = -1; } grp.push(i); end = Math.max(end, i.e); }
  flush(); return items;
}
function Calendar({ date, mini, pick, draft, who = uid(), skipId }) {
  const HOUR = mini ? 38 : 44, box = useRef(), foreign = who !== uid();
  const [hover, setHover] = useState(null), body = useRef();
  useEffect(() => { const prev = calDate; showCal(date); return () => { if (mini && prev) showCal(prev); }; }, [date]);
  useEffect(() => { if (mini && box.current) box.current.scrollTop = Math.max(0, y(draft ? toMin(draft.start) - 60 : toMin(C.workStart) - 30)); }, [date, draft?.start]);
  const ev = foreign ? [] : eventsOn(date), timed = [...ev.filter(e => !e.allDay).map(e => ({ e, s: toMin(e.start), e2: toMin(e.end) })), ...myAll(who).filter(t => t.date === date && t.start && t.id !== skipId).map(t => ({ t, s: toMin(t.start), e2: toMin(t.end) }))];
  const items = layout(timed.map(x => ({ ...x, e: Math.max(x.e2, x.s + 27), src: x.e })));
  const from = Math.min(C.dayStart, ...items.map(i => Math.floor(i.s / 60))), to = Math.max(C.dayEnd, ...items.map(i => Math.ceil(i.e / 60)));
  const y = m => (m - from * 60) / 60 * HOUR;
  const at = e => { const r = body.current.getBoundingClientRect(); return Math.max(from * 60, Math.min(to * 60 - 15, Math.floor((from * 60 + (e.clientY - r.top) / HOUR * 60) / 15) * 15)); };
  const drop = e => { e.preventDefault(); setHover(null); const t = get('tasks', S.drag?.task); S.drag = null; if (!t || t.external) return; const s = at(e), len = t.start ? toMin(t.end) - toMin(t.start) : 60, end = Math.min(s + len, 1439); saveTask(t.id, { date, start: toHM(s), end: toHM(end) }); toast(`${t.title}: ${toHM(s)}–${toHM(end)}`); };
  const now = toMin(nowHM());
  return html`<section class=${mini ? 'calmini' : 'card cal'}><div class="ch"><h3><${Icon} n="cal"/>${foreign ? 'Termine von ' + (get('users', who)?.name || '').split(' ')[0] : 'Google Kalender'}</h3><span class="cnt">${dayLabel(date)}</span>${foreign ? null : S.mode === 'demo' ? html`<${Pill}>simuliert<//>` : calOn() ? html`<${Pill} k="ok">verbunden<//>` : html`<button class="btn sm" onClick=${googleLogin}>Verbinden</button>`}</div>
    ${!mini && S.mode !== 'demo' && !calOn() && html`<p class="hint">Aus Sicherheitsgründen läuft die Google-Freigabe nach etwa einer Stunde ab. Ein Klick auf „Verbinden" genügt; Änderungen werden nachgetragen.</p>`}
    ${S.cal.error && html`<p class="hint bad">${S.cal.error}</p>`}
    ${ev.filter(e => e.allDay).map(e => html`<div class="allday">${e.title}</div>`)}
    <div class=${mini ? 'hbox' : 'hfull'} ref=${box}><div class="hours" ref=${body} style=${`height:${(to - from) * HOUR}px`} onDragOver=${e => { if (!S.drag?.task) return; e.preventDefault(); setHover(at(e)); }} onDragLeave=${e => { if (!body.current.contains(e.relatedTarget)) setHover(null); }} onDrop=${drop}
      onClick=${e => { if (e.target.closest('.ev') || e.target.closest('.draft')) return; const s = at(e); if (pick) return pick(toHM(s)); openModal('task', { preset: { date, start: toHM(s), end: toHM(Math.min(s + 60, 1439)) } }); }}>
      ${Array.from({ length: to - from }, (_, i) => html`<div class="hr" style=${`top:${i * HOUR}px`}><span>${pad(from + i)}:00</span></div>`)}
      ${hover != null && html`<div class="ghost" style=${`top:${y(hover)}px;height:${HOUR}px`}>${toHM(hover)}</div>`}
      ${draft && html`<div class="draft" style=${`top:${y(toMin(draft.start))}px;height:${Math.max(20, (toMin(draft.end) - toMin(draft.start)) / 60 * HOUR - 2)}px`}>${draft.start}–${draft.end}</div>`}
      ${date === today() && now >= from * 60 && now < to * 60 && html`<div class="now" style=${`top:${y(now)}px`}></div>`}
      <div class="evs">${items.map(i => { const x = i.t || i.src, short = i.e - i.s < 50;
        return html`<button key=${x.id} class=${'ev ' + (i.t ? (isBlocker(i.t) ? 'blk' : i.t.kind) : evBlocker(i.src) ? 'blk' : 'ext') + (i.t?.done ? ' done' : '') + (short ? ' short' : '')} style=${`top:${y(i.s)}px;height:${(i.e - i.s) / 60 * HOUR - 3}px;left:${i.col / i.cols * 100}%;width:calc(${100 / i.cols}% - 3px)`}
          draggable=${!mini && !!i.t && !i.t.external && !i.t.done} onDragStart=${e => { if (i.t) { S.drag = { task: i.t.id }; e.dataTransfer.setData('text/plain', i.t.id); } }} onDragEnd=${() => { S.drag = null; setHover(null); }}
          title=${`${x.start}–${x.end} ${x.title}${x.guests?.length ? `\nMit: ${x.guests.join(', ')}` : ''}`} onClick=${() => mini ? null : i.t ? openModal('task', { id: i.t.id }) : evBlocker(i.src) ? toast('Blocker: muss nicht abgehakt werden', { label: 'Als Termin übernehmen', run: () => importEvent(i.src) }) : importEvent(i.src).then(() => toast('Als Termin übernommen'))}><b>${i.t?.done ? '✓ ' : ''}${x.title}</b><span>${x.start}–${x.end}</span></button>`; })}</div>
    </div></div><p class="hint">${foreign ? 'Nur Einträge aus der App; den privaten Google Kalender anderer siehst du nicht.' : mini ? 'Auf eine freie Zeit klicken, um sie zu übernehmen.' : html`To-do auf eine freie Zeit ziehen, oder auf eine Uhrzeit klicken. Ein Klick auf einen grauen Google-Termin übernimmt ihn in deine Liste.`}</p></section>`;
}
const snap = t => ({ id: t.id, title: t.title, kind: t.kind, start: t.start || '', end: t.end || '', link: linkLabel(t), guests: t.guests || [], done: !!t.done, late: !!t.date && t.date < today() });
function reportText(r, kind) {
  const u = get('users', r.userId), L = (a, f) => a.filter(f).map(i => `• ${i.start ? i.start + '–' + i.end + ' ' : ''}${i.title}${i.link ? ` (${i.link})` : ''}`).join('\n') || '–';
  return kind === 'bod' ? `Beginning of Day – ${u?.name}, ${fmtD(r.date)}\n\nTermine\n${L(r.bodItems, i => i.kind === 'termin')}\n\nTo-dos\n${L(r.bodItems, i => i.kind !== 'termin')}`
    : `End of Day – ${u?.name}, ${fmtD(r.date)}\n\nErledigt\n${L(r.eodItems, i => i.done)}\n\nOffen\n${L(r.eodItems, i => !i.done)}${r.highlight ? `\n\nHighlight: ${r.highlight}` : ''}${r.load ? `\n\nAuslastung: ${r.load}/10` : ''}${r.negative || r.blocker ? `\n\nNicht so gut: ${r.negative || r.blocker}` : ''}`;
}
const copyReport = (r, k) => navigator.clipboard.writeText(reportText(r, k)).then(() => toast('In die Zwischenablage kopiert'), () => toast('Kopieren nicht möglich'));

// ── BOD & EOD ──
function DayPage({ tab = 'bod' }) {
  const [date, setDate] = useState(today()), u = uid(), r = report(u, date), st = tab === 'bod' ? r?.bodAt : r?.eodAt;
  return html`<${Head} title="BOD & EOD" sub=${fmtLong(date)}><${DateNav} date=${date} set=${setDate}/><//>
    <div class="steps">${[['bod', 'Beginning of Day', 'day', r?.bodAt, 'Morgens: Tag durchgehen und abschicken'], ['eod', 'End of Day', 'moon', r?.eodAt, 'Abends: Tag abschließen']].map(([k, n, i, at, d]) => html`<a href=${'#/tag/' + k} aria-current=${tab === k ? 'page' : null} class=${tab === k ? 'on' : ''}><${Icon} n=${i}/><span><b>${n}</b><small>${at ? `Abgegeben um ${hm(at)}` : d}</small></span>${at ? html`<em>✓</em>` : null}</a>`)}</div>
    ${tab === 'bod' ? html`<${Bod} key=${date + u} date=${date} r=${r}/>` : html`<${Eod} key=${date + u} date=${date} r=${r}/>`}`;
}
const lateFirst = (a, b) => (b.date < today()) - (a.date < today()) || byTime(a, b);
// Nach der Abgabe bleibt der Plan unverändert. Nur der Haken läuft synchron mit „Meine Aufgaben“.
function Bod({ date, r }) {
  const [edit, setEdit] = useState(false), frozen = !!r?.bodAt && !edit;
  const ts = dayTasks(uid(), date).sort(lateFirst), ext = importable(date);
  // Jede Planzeile mit ihrer Aufgabe verbinden; ältere Berichte ohne ID über den Titel
  const pair = plan => { const used = new Set(plan.map(i => i.id).filter(Boolean)); return plan.map(i => { if (i.id) return [i, get('tasks', i.id)]; const near = t => Math.abs(daysBetween(t.doneOn || t.date || date, date)), t = myAll(uid()).filter(t => t.title === i.title && !used.has(t.id)).sort((a, b) => near(a) - near(b))[0]; if (t) used.add(t.id); return [i, t]; }); };
  // Gibt es die Aufgabe nicht mehr, wird sie aus der Planzeile wiederhergestellt
  const revive = async i => {
    const id = i.id || newId(), pr = list('projects').find(p => i.link && linkLabel({ projectId: p.id }) === i.link), cl = !pr && list('clients').find(c => c.name === i.link);
    if (!await saveTask(id, { title: i.title, kind: i.kind, date, start: i.start, end: i.end, guests: [], projectId: pr?.id || '', clientId: cl?.id || '' }, { sync: false })) return null;
    if (!i.id) await save('reports', r.id, { bodItems: r.bodItems.map(x => x === i ? { ...x, id } : x) }).catch(() => {});
    return get('tasks', id);
  };
  const withTask = (i, t, fn) => t ? fn(t) : revive(i).then(x => x && fn(x));
  const submit = () => save('reports', uid() + '_' + date, { userId: uid(), date, bodAt: Date.now(), bodItems: ts.map(snap) }).then(() => { setEdit(false); toast(r?.bodAt ? 'Beginning of Day aktualisiert' : 'Beginning of Day abgegeben'); }, () => {});
  const Row = (i, t, act) => html`<div class=${'task' + (!t?.done && i.late ? ' late' : '')} key=${i.id || i.title}><button class=${'chk' + (t?.done ? ' on' : '')} role="checkbox" aria-checked=${!!t?.done} aria-label=${'Erledigt: ' + i.title} onClick=${() => withTask(i, t, toggleTask)}><${Icon} n="check"/></button><button class="tbody" onClick=${() => withTask(i, t, x => openModal('task', { id: x.id }))}><span class="tt">${i.title}${!t?.done && i.late && html` <${Pill} k="bad">Überfällig<//>`}</span><span class="tm">${i.start && html`<b><${Icon} n="clock"/>${i.start}–${i.end}</b>`}${i.link && html`<em>${i.link}</em>`}<${Guests} g=${i.guests}/>${frozen && t && !t.done && t.date > date && html`<em>verschoben auf ${fmtD(t.date)}</em>`}${frozen && !t && html`<em>Aufgabe wurde gelöscht</em>`}</span></button>${act}</div>`;
  const items = frozen ? pair(r.bodItems.filter(i => i.kind !== 'blocker')).map(([i, t]) => [t ? { ...snap(t), kind: i.kind, late: i.late } : i, t]) : ts.map(t => [{ ...snap(t), late: t.date < today() }, t]);
  const G = (kind, label, icon, ph, extra) => { const a = items.filter(([i]) => isT(i) === (kind === 'termin')); return html`<section class="card"><div class="ch"><h3><${Icon} n=${icon}/>${label}</h3><span class="cnt">${a.filter(([, t]) => t?.done).length}/${a.length}</span>${!frozen && extra}</div>${a.map(([i, t]) => Row(i, t, !frozen && !t.done && !t.external && html`<${MoveBtn} from=${t.date} onPick=${d => moveTask(t, d)}/>`))}${!a.length && html`<${Empty}>${frozen ? 'Nichts geplant.' : 'Noch nichts eingetragen.'}<//>`}${!frozen && html`<${QuickAdd} kind=${kind} date=${date} placeholder=${ph}/>`}</section>`; };
  return html`${frozen && html`<p class="frozen"><${Icon} n="check"/><span><b>Abgegeben um ${hm(r.bodAt)}.</b> Der Plan bleibt so stehen. Abhaken kannst du hier oder in „Meine Aufgaben“.</span></p>`}
    <div class="duo">${G('termin', 'Termine', 'cal', 'Termin, z. B. Kundencall 13-14 Uhr', ext.length > 0 && html`<button class="tag" onClick=${() => Promise.all(ext.map(importEvent)).then(() => toast(plural(ext.length, 'Termin', 'Termine') + ' übernommen'))}>${ext.length} aus Google übernehmen</button>`)}${G('todo', 'To-dos', 'check', 'To-do, mit @Person oder #Kunde')}</div>
    <div class="submit gap">${frozen ? html`<button class="btn ghost" onClick=${() => setEdit(true)}><${Icon} n="edit"/>Aktualisierten Beginning of Day abgeben</button><button class="tag" onClick=${() => copyReport(r, 'bod')}><${Icon} n="copy"/>Als Text kopieren</button>` : html`<button class="btn" onClick=${submit} disabled=${date > today() || !ts.length}>${r?.bodAt ? 'Beginning of Day aktualisieren' : 'Beginning of Day abgeben'}</button>${edit && html`<button class="tag" onClick=${() => setEdit(false)}>Abbrechen</button>`}`}</div>`;
}
function Eod({ date, r }) {
  const done = doneOn(uid(), date), open = openOn(uid(), date), [hl, setHl] = useState(r?.highlight || ''), [neg, setNeg] = useState(r?.negative || r?.blocker || ''), [load, setLoad] = useState(r?.load || 0);
  const submit = () => save('reports', uid() + '_' + date, { userId: uid(), date, eodAt: Date.now(), highlight: hl.trim(), negative: neg.trim(), review: '', blocker: '', load, eodItems: [...done, ...open].map(snap) }).then(() => toast('End of Day abgegeben. Schönen Feierabend!'), () => {});
  const movable = open.filter(t => !t.external);
  const Tile = (label, icon, v, set, ph) => html`<label class="card tile"><span><${Icon} n=${icon}/>${label}</span><textarea rows="4" placeholder=${ph} value=${v} onInput=${e => set(e.target.value)}></textarea></label>`;
  return html`<div class="duo"><section class="card"><div class="ch"><h3><${Icon} n="check"/>Erledigt</h3><span class="cnt">${done.length}</span></div>${done.map(t => html`<${TaskRow} key=${t.id} t=${t} draggable=${false}/>`)}${!done.length && html`<${Empty}>Was du in „Meine Aufgaben“ abhakst, erscheint hier automatisch.<//>`}
      ${date <= today() && html`<h4>Noch etwas erledigt?</h4><${QuickAdd} solo pickKind date=${date} preset=${{ done: true, doneOn: date, doneAt: date === today() ? Date.now() : parseD(date).getTime() + 648e5 }} placeholder="z. B. Anruf mit Kundin"/>`}</section>
    <section class="card"><div class="ch"><h3><${Icon} n="clock"/>Noch offen</h3><span class="cnt">${open.length}</span>${movable.length > 1 && html`<span class="right"><${MoveBtn} label="Alle verschieben" onPick=${d => movable.forEach(t => moveTask(t, d))}/></span>`}</div>
      ${open.map(t => html`<${TaskRow} key=${t.id} t=${t} draggable=${false} actions=${!t.external && html`<${MoveBtn} from=${t.date} onPick=${d => moveTask(t, d)}/>`}/>`)}${!open.length && html`<${Empty}>Nichts mehr offen.<//>`}</section></div>
    <div class="duo tiles">${Tile('Highlight des Tages', 'spark', hl, setHl, 'Was lief richtig gut?')}${Tile('Lief nicht so gut', 'flag', neg, setNeg, 'Was war schwierig oder ärgerlich?')}</div>
    <section class="card"><div class="f"><span class="ql">Wie hoch ist deine subjektive Auslastung? <span class="req" title="Pflichtfeld">*</span></span><${Stars} max=${10} value=${load} onChange=${setLoad} label="Subjektive Auslastung, Pflichtfeld"/><small>1 = ich bin kaum ausgelastet, 10 = ich bin maximal ausgelastet</small></div>
      <div class="submit"><button class="btn" disabled=${date > today() || !load} onClick=${submit}>${r?.eodAt ? 'End of Day aktualisieren' : 'End of Day abgeben'}</button>${r?.eodAt && html`<button class="tag" onClick=${() => copyReport(r, 'eod')}><${Icon} n="copy"/>Als Text kopieren</button>`}</div></section>`;
}

// ── Meine Aufgaben: der Arbeitsplatz für den ganzen Tag ──
function TasksPage() {
  const [date, setDate] = useState(today()), ext = importable(date);
  return html`<${Head} title="Meine Aufgaben" sub="Eintragen, einplanen und abhaken"><${DateNav} date=${date} set=${setDate}/><//>
    <div class="split"><div class="stack">
      <${TaskBox} kind="termin" date=${date} title="Termine" icon="cal" ph="Termin, z. B. Kundencall 13-14 Uhr" extra=${ext.length > 0 && html`<button class="tag" onClick=${() => Promise.all(ext.map(importEvent)).then(() => toast(plural(ext.length, 'Termin', 'Termine') + ' übernommen'))}>${ext.length} aus Google übernehmen</button>`}/>
      <${TaskBox} kind="todo" date=${date} title="To-dos" icon="check" ph="To-do, mit @Person oder #Kunde"/></div>
    <${Calendar} date=${date}/></div>`;
}
function TaskBox({ kind, date, title, icon, ph, extra }) {
  const [tab, setTab] = useState('open'), d = today(), K = t => isT(t) === (kind === 'termin');
  const mine = myTasks(uid()).filter(K), op = mine.filter(t => !t.done), dele = delegated(uid()).filter(K), dOpen = dele.filter(t => !t.done), dDone = dele.filter(t => t.done), dn = mine.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const plan = t => { const on = date < d ? d : date, s = freeSlot(on, 60, t.id); if (!s) return toast(`Keine freie Stunde mehr: ${dayLabel(on)}`); saveTask(t.id, { date: on, ...s }); toast(`Eingeplant: ${dayLabel(on)}, ${s.start}–${s.end}`); };
  const row = t => html`<${TaskRow} key=${t.id} t=${t} urgent=${!t.done && t.date && t.date < d} showWho=${tab === 'dele'} draggable=${tab === 'open'} actions=${t.done ? html`<span class="dl">erledigt ${relDay(t.doneOn)}</span>` : html`${t.date > d && html`<span class="dl">${relDay(t.date)}</span>`}${tab === 'open' && !t.start && html`<button class="tag" title="In die nächste freie Stunde legen" onClick=${() => plan(t)}><${Icon} n="spark"/>Einplanen</button>`}`}/>`;
  // Überfälliges steht bei „Heute“ ganz oben und ist rot markiert
  const G = (n, f, sort) => { const a = op.filter(f).sort(sort); return a.length ? html`<h4>${n}</h4>${a.map(row)}` : null; };
  const later = (a, b) => a.date.localeCompare(b.date) || byTime(a, b);
  return html`<section class="card"><div class="ch"><h3><${Icon} n=${icon}/>${title}</h3>${extra}</div><${Tabs} v=${tab} set=${setTab} items=${[['open', 'Offen', op.length], ['dele', 'Weitergegeben', dOpen.length], ['done', 'Erledigt', dn.length]]}/>
    ${tab === 'open' && html`${G('Heute', t => t.date && t.date <= d, lateFirst)}${G('Später', t => t.date > d, later)}${G('Ohne Datum', t => !t.date, byTime)}${!op.length && html`<${Empty}>Nichts offen.<//>`}<h4>Neu für ${dayLabel(date)}</h4><${QuickAdd} kind=${kind} date=${date} placeholder=${ph}/>`}
    ${tab === 'dele' && html`${dOpen.map(row)}${!dOpen.length && html`<${Empty}>Nichts weitergegeben. Mit @Person im Eingabefeld gibst du etwas weiter.<//>`}${dDone.length > 0 && html`<${Fold} label=${dDone.length + ' erledigte anzeigen'}>${dDone.map(row)}<//>`}`}
    ${tab === 'done' && html`${dn.slice(0, 60).map(row)}${!dn.length && html`<${Empty}>Noch nichts erledigt.<//>`}`}</section>`;
}

// ── Team ──
function TeamPage() {
  const [date, setDate] = useState(today()), [open, setOpen] = useState(null);
  const L = (items, label) => html`<h4>${label}</h4>${items.length ? html`<ul class="rep">${items.map(i => html`<li class=${i.done ? 'ok' : ''}>${i.start && html`<b>${i.start}</b>`} ${i.title}${i.link && html`<small>${i.link}</small>`}</li>`)}</ul>` : html`<p class="empty">–</p>`}`;
  return html`<${Head} title="Team & Tagesberichte" sub=${'Berichte für ' + fmtLong(date)}><${DateNav} date=${date} set=${setDate} max=${today()}/><button class="btn" onClick=${() => openModal('user')}><${Icon} n="plus"/>Mitglied</button><//>
    <div class="teams">${users().map(u => { const r = report(u.id, date), o = open === u.id, n = myTasks(u.id).filter(t => !t.done).length;
      return html`<section class="card" key=${u.id}><div class="person"><${Avatar} id=${u.id}/><div><strong>${u.name}</strong><small>${u.role || 'Ohne Rolle'} · ${plural(n, 'offene Aufgabe', 'offene Aufgaben')} · ${plural(myProjects(u.id).length, 'Projekt', 'Projekte')}</small></div><button class="icon" aria-label=${u.name + ' bearbeiten'} onClick=${() => openModal('user', { id: u.id })}><${Icon} n="edit"/></button></div>
        <div class="chips"><${Pill} k=${r?.bodAt ? 'ok' : ''}>${r?.bodAt ? '✓ BOD ' + hm(r.bodAt) : 'BOD offen'}<//><${Pill} k=${r?.eodAt ? 'ok' : ''}>${r?.eodAt ? '✓ EOD ' + hm(r.eodAt) : 'EOD offen'}<//>${(r?.bodAt || r?.eodAt) && html`<button class="tag" aria-expanded=${o} onClick=${() => setOpen(o ? null : u.id)}>${o ? 'Schließen' : 'Bericht ansehen'}</button>`}</div>
        ${r?.load > 0 && html`<p class="mood"><span>Auslastung</span><${Stars} value=${r.load} max=${10} label="Auslastung"/><b>${r.load}/10</b></p>`}
        
        ${o && html`<div>${r.bodAt && L(r.bodItems, 'Geplant')}${r.eodAt && html`${L(r.eodItems.filter(i => i.done), 'Erledigt')}${L(r.eodItems.filter(i => !i.done), 'Offen geblieben')}${r.highlight && html`<h4>Highlight</h4><p>${r.highlight}</p>`}${(r.negative || r.blocker) && html`<h4>Lief nicht so gut</h4><p>${r.negative || r.blocker}</p>`}`}</div>`}</section>`; })}</div>`;
}
