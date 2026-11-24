-- Beispielabfragen zum Datenmodell (PostgreSQL)

-- Projekte mit Kunde und zuständiger Person
select p.name as projekt, c.name as kunde, e.name as zustaendig
from projects p
join clients c on c.id = p.client_id
left join employees e on e.id = p.owner_id;

-- Projekte je Phase
select phase, count(*) as anzahl from projects group by phase order by anzahl desc;

-- Kunden mit mehr als einem Projekt
select c.name, count(*) as projekte
from clients c join projects p on p.client_id = c.id
group by c.id, c.name having count(*) > 1 order by projekte desc, c.name;

-- Datenqualität: mögliche doppelte Kunden
select contact_email, count(*) from clients
where contact_email is not null
group by contact_email having count(*) > 1;

-- Phasenverlauf aus der jsonb-Spalte (Grundlage für ein Event Log).
-- Liefert Zeilen für Projekte, die in der App bereits bewegt wurden.
select p.id as case_id, h ->> 'phase' as activity,
       to_timestamp((h ->> 'at')::bigint / 1000.0) as zeitpunkt
from projects p, jsonb_array_elements(p.extra -> 'history') h
order by p.id, zeitpunkt;
