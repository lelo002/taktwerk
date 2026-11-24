-- ═══ 1. RLS einschalten: Ohne passende Regel ist alles gesperrt ═══
alter table public.employees enable row level security;
alter table public.clients   enable row level security;
alter table public.projects  enable row level security;

-- ═══ 2. Prüffunktion: Steht die angemeldete E-Mail in employees? ═══
-- Sie liegt im Schema „private“, damit man sie nicht von außen aufrufen kann.
-- „security definer“: Sie darf in employees nachsehen, obwohl RLS aktiv ist.
create schema if not exists private;
create or replace function private.is_team() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where lower(e.email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke all on function private.is_team() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_team() to authenticated;

-- ═══ 3. Grundrechte: nicht Angemeldete (anon) bekommen nichts ═══
revoke all on public.employees, public.clients, public.projects from anon, authenticated;
grant select                         on public.employees to authenticated;
grant select, insert, update, delete on public.clients   to authenticated;
grant select, insert, update, delete on public.projects  to authenticated;

-- ═══ 4. Die Regeln ═══
-- using      = welche vorhandenen Zeilen darf ich sehen / ändern / löschen?
-- with check = welche neuen Werte darf ich schreiben?
drop policy if exists "Team liest Mitarbeitende" on public.employees;
create policy "Team liest Mitarbeitende" on public.employees
  for select to authenticated using ((select private.is_team()));

drop policy if exists "Team bearbeitet Kunden" on public.clients;
create policy "Team bearbeitet Kunden" on public.clients
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

drop policy if exists "Team bearbeitet Projekte" on public.projects;
create policy "Team bearbeitet Projekte" on public.projects
  for all to authenticated using ((select private.is_team())) with check ((select private.is_team()));

-- Mitarbeitende ändert man nur im Supabase-Dashboard. Sonst könnte sich
-- jemand aus dem Team selbst neue Zugänge freischalten.
