// ───────── Hier kannst du die App anpassen ─────────
window.CONFIG = {
  appName: 'Taktwerk',

  // Solange hier null steht, läuft die App im Demo-Modus (Daten nur in diesem Browser).
  // Für den Team-Betrieb die Werte aus Firebase einsetzen, siehe ANLEITUNG.md:
  // firebase: { apiKey: '…', authDomain: '…', projectId: '…', appId: '…' },
  firebase: null,

  // Verbindung zu Supabase: steht in config.local.js (Vorlage: config.local.example.js).
  // Ohne diese Datei läuft die Demo mit ausgedachten Daten.
  supabase: null,


  // Arbeitszeit: für Kalender und die Suche nach freien Zeitfenstern
  dayStart: 7, dayEnd: 20,
  workStart: '09:00', workEnd: '18:00',

  // Ab wann an einen fehlenden BOD / EOD erinnert wird
  bodReminder: '10:00', eodReminder: '17:00',

  // Ab so vielen Tagen in derselben Phase gilt ein Projekt als „hängt fest"
  stuckDays: 14,

  // Phasen samt Standard-Checkliste. Die „id" nach dem Start nicht mehr ändern.
  phases: [
    { id: 'onboarding', name: 'Onboarding', checks: ['Vertrag unterschrieben', 'Zugänge erhalten', 'Ansprechpartner geklärt'] },
    { id: 'kickoff', name: 'Kick-Off', checks: ['Kick-Off-Termin geführt', 'Ziele und KPIs festgelegt', 'Protokoll verschickt'] },
    { id: 'strategie', name: 'Strategie & Umsetzung', checks: ['Strategie ausgearbeitet', 'Entwürfe erstellt'] },
    { id: 'qc', name: 'Teamfeedback / Quality Check', checks: ['Vier-Augen-Prüfung', 'Feedback eingearbeitet'] },
    { id: 'praesentation', name: 'Präsentation', checks: ['Präsentation vorbereitet', 'Beim Kunden präsentiert'] },
    { id: 'kundenfeedback', name: 'Kundenfeedback-Umsetzung', checks: ['Feedback erhalten', 'Feedback eingearbeitet', 'Freigabe erhalten'] },
    { id: 'golive', name: 'Go Live', checks: ['Tracking geprüft', 'Rechtliches geprüft', 'Live geschaltet'] },
    { id: 'betreuung', name: 'Betreuung', checks: ['Reporting eingerichtet', 'Regeltermin vereinbart'] },
  ],
};
