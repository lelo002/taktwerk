-- ═══ 1. Eine Sammelspalte für Zusatzinfos (Checkliste, Notizen, Phasenverlauf …) ═══
-- jsonb speichert strukturierte Daten, für die es keine eigene Spalte gibt.
alter table public.clients   add column if not exists extra jsonb not null default '{}';
alter table public.projects  add column if not exists extra jsonb not null default '{}';

-- ═══ 2. Regeln für erlaubte Werte ═══
-- Ein Tippfehler wie „Kickof“ wird damit abgelehnt.
alter table public.projects drop constraint if exists projects_phase_ok;
alter table public.projects add constraint projects_phase_ok
  check (phase in ('onboarding','kickoff','strategie','qc','praesentation','kundenfeedback','golive','betreuung'));

alter table public.clients drop constraint if exists clients_status_ok;
alter table public.clients add constraint clients_status_ok
  check (status in ('Onboarding','Aktiv','Nicht mehr aktiv'));

-- ═══ 3. Deine Login-E-Mail bei Lena hinterlegen ═══
-- BITTE ANPASSEN: deine echte E-Mail-Adresse, mit der du dich anmeldest.
update public.employees set email = 'DEINE-EMAIL@BEISPIEL.DE' where id = 'M001';
