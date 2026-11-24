# Taktwerk: internes Agentur-Tool

## Sofort ausprobieren
`index.html` doppelklicken. Die App startet im Demo-Modus mit Beispieldaten, gespeichert nur in diesem Browser. Unten links kannst du die Person wechseln und so Zuweisungen testen.

## Für das Team einrichten (kostenlos, etwa 30 Minuten)

### 1. Firebase-Projekt (Datenbank und Login)
1. https://console.firebase.google.com öffnen, **Projekt erstellen** (Analytics aus, Spark-Tarif).
2. **Authentication → Anmeldemethode → Google** aktivieren.
3. **Firestore Database → Datenbank erstellen**: Standort `europe-west3` (Frankfurt), Produktionsmodus.
4. Unter **Regeln** den Inhalt von `firestore.rules` einfügen, dabei die zwei Beispieladressen durch die Gmail-Adressen eures Teams ersetzen, **Veröffentlichen**.
5. **Projekteinstellungen → Meine Apps → Web (`</>`)**: App registrieren und die Werte aus `firebaseConfig` in `config.js` bei `firebase:` eintragen (statt `null`). Diese Werte sind nicht geheim; den Schutz übernehmen die Regeln.

### 2. Google Kalender freischalten
1. https://console.cloud.google.com öffnen und oben **dasselbe Projekt** wählen.
2. **APIs & Dienste → Bibliothek → Google Calendar API → Aktivieren**.
3. **Google Auth Platform (OAuth-Zustimmungsbildschirm)**:
   - Zielgruppe **Extern**, Status **Test** lassen, und jede Gmail-Adresse als **Testnutzer** eintragen (max. 100).
   - Beim Anmelden zeigt Google den Hinweis „nicht überprüft“: auf **Weiter** klicken und den Kalenderzugriff anhaken.
   - Später mit Google Workspace: Zielgruppe **Intern**, dann entfällt der Hinweis.
4. Unter **Datenzugriff** den Bereich `https://www.googleapis.com/auth/calendar.events` hinzufügen.

### 3. Online stellen
1. Den kompletten Ordner (ohne `.git`) auf https://app.netlify.com/drop ziehen und das Gratis-Konto anlegen. Alternativ: Cloudflare Pages, Direkt-Upload.
2. Die erhaltene Adresse (z. B. `agentur.netlify.app`) in Firebase unter **Authentication → Einstellungen → Autorisierte Domains** hinzufügen.
3. Link ans Team schicken. Jede Person meldet sich mit Google an und erscheint automatisch im Team.

Lokal mit Firebase testen: im Ordner `python3 -m http.server 8000` ausführen und http://localhost:8000 öffnen. (Mit Doppelklick funktioniert die Google-Anmeldung nicht. Ist `localhost` nicht in den autorisierten Domains, dort hinzufügen.)

## So arbeitet die Kalenderverbindung
- Mit Uhrzeit landet ein To-do oder Termin im Google Kalender. Abgehakt: ✅ und grau.
- Bei Zuweisung an andere erhält die Person eine Google-Einladung. Das Ereignis steht auch beim Ersteller, dort als „abgelehnt“. Erscheint eine Einladung nicht von selbst: Google Kalender → Einstellungen → Termineinstellungen → Einladungen hinzufügen „Von allen“, oder die Einladung in der E-Mail annehmen.
- Bestehende Google-Termine lassen sich übernehmen. Beim Abhaken ändert sich nur deine Farbe, nie der Titel, damit Kunden nichts davon sehen.
- Teilnehmende eines Termins erhalten eine Google-Einladung. Interne Notizen und der Erledigt-Haken werden dann nicht mitgeschickt.
- Google-Termine wie Mittagspause oder Fokuszeit gelten als Blocker und müssen nicht abgehakt werden.
- In Google verschobene Termine werden nachgezogen, solange die App offen ist. Wird ein Eintrag in Google **gelöscht**, bleibt er in der App stehen.
- Die Google-Freigabe läuft nach etwa einer Stunde ab; dann unter „Meine Aufgaben“ am Kalender auf **Verbinden** klicken. Änderungen aus der Zwischenzeit werden nachgetragen.

## Angebote
- Zuerst unter **Angebote → Vorlage & Konditionen** eure Agenturdaten, eure Unterschrift, Leistungen, Preise und Konditionen eintragen. Der mitgelieferte Text ist ein Muster und muss **rechtlich geprüft** werden.
- Der Kunde öffnet den Link ohne Login. Wer den Link kennt, kann das Angebot sehen. Im Demo-Modus funktioniert der Link nur im selben Browser.
- Unterschrieben wird mit einer **einfachen elektronischen Signatur** (Name, E-Mail, Unterschriftsbild, Server-Zeitstempel, Prüfsumme des Dokuments). Sie genügt, wo das Gesetz keine Schriftform verlangt; eine qualifizierte Signatur (QES) ist sie nicht. Die Identität wird nicht unabhängig geprüft.
- Kunde und Projekt werden angelegt, sobald die Unterschrift in einer geöffneten App eines Teammitglieds ankommt: sofort, wenn jemand sie offen hat, sonst beim nächsten Öffnen. Automatische E-Mails verschickt die kostenlose Version nicht.

## Anpassen
Name, Phasen, Checklisten, Arbeits- und Erinnerungszeiten stehen in `config.js`.

## Datenschutz
Alle im Team sehen Kunden, Projekte, Aufgaben und Tagesberichte. Notizen und Dashboard sind privat. Vor dem Einsatz mit Kundendaten bitte den Auftragsverarbeitungsvertrag von Google/Firebase prüfen und das Team informieren.
