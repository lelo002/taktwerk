# Taktwerk mit Supabase verbinden

1. **SQL Editor:** `1_vorbereitung.sql` einfügen, unten deine E-Mail eintragen, ausführen.
2. **SQL Editor:** `2_zugriffsregeln.sql` einfügen und ausführen.
3. **Authentication → Users → Add user → Create new user:** dieselbe E-Mail, ein eigenes Passwort, „Auto Confirm User“ an.
4. **Authentication → Sign In / Providers:** „Allow new users to sign up“ ausschalten.
5. **Connect** bzw. **Project Settings → API:** `config.local.example.js` als `config.local.js` kopieren, Project URL und Publishable Key eintragen.
6. `index.html` öffnen und anmelden.

## Was liegt wo?
| Supabase | Nur in diesem Browser |
|---|---|
| Kunden, Projekte (mit Phasenverlauf und Checkliste), Mitarbeitende | Aufgaben, Termine, BOD/EOD, Angebote, Kommentare, Dashboard |

Der Kalender ist in dieser Version simuliert. Änderungen anderer erscheinen nach spätestens 30 Sekunden. Bearbeiten zwei Personen gleichzeitig dieselben Zusatzinfos (z. B. Checkliste) eines Projekts, gewinnt die letzte Änderung.
