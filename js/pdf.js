'use strict';
// ── Angebot als echte PDF-Datei (A4), unabhängig vom Druckdialog des Browsers ──
const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
let pdfLib = null;
const pdfReady = () => pdfLib ||= Promise.all([loadScript('vendor/jspdf.js'), loadScript('vendor/pdf-fonts.js')]).catch(e => { pdfLib = null; throw e; });
// Beliebiges Bild oder Schriftzug als PNG samt Seitenverhältnis
const toPng = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); ok({ src: c.toDataURL('image/png'), r: c.width / c.height }); }; i.onerror = no; i.src = src; });
function cursivePng(text) {
  const c = document.createElement('canvas'), x = c.getContext('2d'), font = 'italic 80px "Snell Roundhand","Segoe Script",cursive';
  x.font = font; c.width = Math.ceil(x.measureText(text).width) + 60; c.height = 130; x.font = font; x.fillStyle = '#17324d'; x.textBaseline = 'middle'; x.fillText(text, 24, 68);
  return { src: c.toDataURL('image/png'), r: c.width / c.height };
}
async function buildPdf(d, pub) {
  await pdfReady();
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
  for (const [st, b64] of Object.entries(window.PDF_FONTS)) { doc.addFileToVFS(`F-${st}.ttf`, b64); doc.addFont(`F-${st}.ttf`, 'F', st); }
  const W = 210, H = 297, M = 22, R = W - M, CW = R - M, BOT = H - 30, INK = '#22332c', MUT = '#62736b', LINE = '#dfe6e2', a = d.agency, sg = signOf(pub), k = calc(d), dL = x => parseD(x).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let y = M;
  const font = (size, bold, color = INK) => { doc.setFont('F', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color); };
  const lh = size => size * 0.3528 * 1.45;
  const clean = t => String(t ?? '').normalize('NFC').replace(/\r/g, '').replace(/\t/g, '  ').replace(/−/g, '-').replace(/[  ]/g, ' ');
  const wrap = (t, w) => clean(t).split('\n').flatMap(l => l.trim() ? doc.splitTextToSize(l, w) : ['']);
  const page = () => { doc.addPage(); y = M + 6; };
  const need = h => { if (y + h > BOT) page(); };
  const text = (t, { size = 10.5, bold, color, w = CW, x = M } = {}) => { font(size, bold, color); let gap = true; for (const l of wrap(t, w)) { need(lh(size) * (gap && l ? 2 : 1)); gap = !l; if (!l && y <= M + 6) continue; font(size, bold, color); if (l) doc.text(l, x, y + size * 0.3528); y += lh(size); } };
  const h1 = t => { text(t, { size: 20, bold: true }); y += 5; };
  const h2 = t => { y += 6; need(20); text(t, { size: 13, bold: true }); y += 1; };
  const right = (t, x, yy) => doc.text(clean(t), x, yy, { align: 'right' });
  const rule = (c = LINE, x1 = M, x2 = R) => { doc.setDrawColor(c); doc.setLineWidth(0.25); doc.line(x1, y, x2, y); };
  const row = (l, v, { bold, size = 10.5 } = {}) => { font(size, bold); const ls = wrap(l, CW - 48), h = ls.length * lh(size) + 5; need(h); rule(); font(size, bold); ls.forEach((t, i) => doc.text(t, M, y + 2.5 + size * 0.3528 + i * lh(size))); right(v, R, y + 2.5 + size * 0.3528); y += h; };
  const image = (im, x, yBottom, maxW, maxH) => { const w = Math.min(maxW, maxH * im.r), h = w / im.r; doc.addImage(im.src, 'PNG', x, yBottom - h, w, h); };

  // Deckblatt
  doc.setFillColor('#e9f6ef'); doc.rect(0, 0, W, H, 'F'); doc.setFillColor('#cfeadd'); doc.circle(W, H, 72, 'F');
  const logo = /^data:image\//.test(a.logo || '') ? await toPng(a.logo).catch(() => null) : null;
  if (logo) image(logo, M, 38, 60, 16); else { font(14, true); doc.text(clean(a.name), M, 32); }
  y = 92; font(32, true); for (const l of wrap(d.projectName, CW).slice(0, 4)) { doc.text(l, M, y); y += 14; }
  y -= 4; text('Angebot für ' + d.c.name, { size: 14 }); y += 14;
  for (const [l, v] of [['Angebot', d.number], ['Datum', dL(d.date)], ['Gültig bis', dL(d.validUntil)], ['Für', [d.c.contactName, d.c.name, d.c.street, `${d.c.zip} ${d.c.city}`].join('\n')], ['Von', [d.owner.name, a.email || d.owner.email, a.phone].filter(Boolean).join('\n')]]) { font(10.5, false, MUT); doc.text(l, M, y + 3.7); text(v, { x: M + 34, w: CW - 34 }); y += 2; }

  page(); h1('Worum es geht'); if (d.intro) text(d.intro);
  if (d.about) { h2('Über uns'); text(d.about); } if (d.process) { h2('So läuft das Projekt ab'); text(d.process); }
  if (d.startDate || d.deadline) { h2('Zeitplan'); text([d.startDate && 'Start: ' + dL(d.startDate), d.deadline && 'Fertigstellung: ' + dL(d.deadline)].filter(Boolean).join('\n')); }

  page(); h1('Leistungen und Preis');
  const X = { qty: M + 108, price: M + 138 }, thead = () => { font(9, false, MUT); doc.text('Leistung', M, y + 3); right('Menge', X.qty, y + 3); right('Einzelpreis', X.price, y + 3); right('Gesamt', R, y + 3); y += 6; };
  thead();
  for (const i of d.items) {
    font(10.5, true); const t = wrap(i.title, 72); font(9); const ds = i.desc ? wrap(i.desc, 76) : [], q = wrap(`${num(i.qty).toLocaleString('de-DE')} ${i.unit}`, 26), h = Math.max(t.length * lh(10.5) + ds.length * lh(9), q.length * lh(10.5)) + 6;
    if (y + h > BOT) { page(); thead(); }
    rule(); let yy = y + 6.5; font(10.5, true); t.forEach(l => { doc.text(l, M, yy); yy += lh(10.5); }); font(9, false, MUT); ds.forEach(l => { if (l) doc.text(l, M, yy); yy += lh(9); });
    font(10.5); q.forEach((l, n) => right(l, X.qty, y + 6.5 + n * lh(10.5))); right(money(Math.round(num(i.price) * 100)), X.price, y + 6.5); right(money(lineTotal(i)), R, y + 6.5); y += h;
  }
  const mon = d.pay.mode === 'monatlich', months = Math.max(1, Math.round(num(d.pay.months)) || 1);
  need(48);
  if (k.disc > 0) row(`Rabatt ${num(d.discount).toLocaleString('de-DE')} %`, '-' + money(k.disc));
  row('Nettobetrag', money(k.net)); if (d.vat !== 'klein') row(`Umsatzsteuer ${d.vat} %`, money(k.vat));
  row('Gesamtbetrag' + (mon ? ' pro Monat' : ''), money(k.gross), { bold: true, size: 13 });
  if (d.vat === 'klein') { y += 2; text('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', { size: 9, color: MUT }); }
  h2('Zahlung'); if (d.pay.mode !== 'einmal') row('Gesamtpreis' + (mon ? ` über ${plural(months, 'Monat', 'Monate')}` : ''), money(mon ? k.gross * months : k.gross), { bold: true });
  payPlan(d).forEach(([l, v]) => row(l, money(v)));

  page(); h1('Konditionen'); text(d.terms);

  page(); h1('Annahme des Angebots');
  text(`Mit der Unterschrift nimmt ${d.c.name} das Angebot ${d.number} „${d.projectName}“ über ${money(k.gross)}${mon ? ' pro Monat' : ''} einschließlich der Konditionen verbindlich an.`);
  need(75); y += 40; const x2 = M + CW / 2 + 6, sw = CW / 2 - 6, ySig = y;
  const mine = /^data:image\/png;base64,/.test(a.signature || '') ? await toPng(a.signature).catch(() => null) : cursivePng(a.signer || d.owner.name);
  if (mine) image(mine, M, y - 1, sw, 22);
  if (sg && /^data:image\/png;base64,/.test(sg.image)) { const s = await toPng(sg.image).catch(() => null); if (s) image(s, x2, y - 1, sw, 22); }
  rule(INK, M, M + sw); rule(INK, x2, R); y += 2;
  const stamp = t => new Date(t).toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'medium' });
  const who = (x, n, c, s) => { y = ySig + 2; text(n, { x, w: sw, bold: true }); text(c, { x, w: sw }); if (s) text(s, { x, w: sw, size: 9, color: MUT }); return y; };
  const e1 = who(M, a.signer || d.owner.name, a.name, dL(d.date) + (a.signature ? '' : ' · Beispielsignatur')), e2 = who(x2, sg ? sg.name : d.c.contactName, d.c.name, sg ? stamp(ms(sg.at) || Date.now()) : '');
  y = Math.max(e1, e2) + 10;
  if (sg) {
    const ok = sha256(pub.docJson) === pub.hash && sg.hash === pub.hash, ls = [`Elektronisch unterschrieben von ${sg.name}`, `E-Mail laut Angebot: ${sg.email}`, `Zeitpunkt: ${stamp(ms(sg.at) || Date.now())}`, `Vorgang: ${pub.id}`, `Prüfsumme (SHA-256): ${pub.hash}`, ok ? 'Dokument unverändert: geprüft' : 'Achtung: Dokument stimmt nicht mit der Prüfsumme überein'];
    font(8.5); const n = ls.flatMap(l => wrap(l, CW - 12)), h = n.length * lh(8.5) + 15; need(h); doc.setFillColor('#f3f7f5'); doc.roundedRect(M, y, CW, h, 2.5, 2.5, 'F');
    font(10.5, true); doc.text('Signaturprotokoll', M + 6, y + 8); font(8.5); n.forEach((l, i) => doc.text(l, M + 6, y + 13.5 + i * lh(8.5)));
  }
  // Fußzeilen
  const N = doc.getNumberOfPages(), fl = clean([a.name, a.street, `${a.zip} ${a.city}`, a.vatId && 'USt-IdNr. ' + a.vatId].filter(Boolean).join(' · '));
  for (let i = 2; i <= N; i++) { doc.setPage(i); font(8, false, MUT); doc.text(doc.splitTextToSize(fl, CW - 55)[0], M, H - 14); right(`${d.number} · Seite ${i} von ${N}`, R, H - 14); }
  doc.setProperties({ title: `Angebot ${d.number}: ${d.projectName}`, author: a.name });
  return doc;
}
function PdfBtn({ d, pub }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  const run = async () => { setBusy(true); setErr(false); try { (await buildPdf(d, pub)).save(`Angebot_${d.number}${signOf(pub) ? '_unterschrieben' : ''}.pdf`); } catch (e) { console.error(e); setErr(true); } setBusy(false); };
  return html`<button class="btn ghost" disabled=${busy} onClick=${run}><${Icon} n="print"/>${busy ? 'PDF wird erstellt …' : err ? 'Fehler, nochmal versuchen' : 'PDF herunterladen'}</button>`;
}
