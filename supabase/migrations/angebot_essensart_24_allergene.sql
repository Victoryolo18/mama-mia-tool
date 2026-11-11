-- Titel: Allergene je Gericht (LMIV Anhang II, Kennbuchstaben A bis N)
--
-- Zuerst im TEST-Projekt (mama-mia-test) ausführen, dann im echten Projekt.
-- Kann vor dem Merge laufen: Die neue Spalte stört den heutigen Generator und das heutige CRM nicht.
--
-- Was passiert:
--   Neue Spalte gerichte.allergene: Liste der Kennbuchstaben, die im Gericht stecken.
--     null  = noch nicht erfasst (Vorgabe für alle bestehenden Gerichte)
--     {}    = von Jana geprüft, keine der 14 Allergene
--     {A,G} = Gluten und Milch
--   A Gluten · B Krebstiere · C Eier · D Fisch · E Erdnüsse · F Soja · G Milch · H Schalenfrüchte
--   I Sellerie · J Senf · K Sesam · L Sulfite · M Lupinen · N Weichtiere
--   Eine Prüfregel lässt nur diese Buchstaben zu.
-- Was NICHT passiert: kein Gericht, kein Preis, keine Anfrage ändert sich. Jana trägt die Allergene im CRM ein.
-- Wer darf was: unverändert. gerichte hat RLS; anonym nur lesen (der Generator zeigt die Buchstaben),
--   ändern nur die angemeldete CRM-Nutzerin.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

alter table public.gerichte add column if not exists allergene text[];

alter table public.gerichte drop constraint if exists gerichte_allergene_gueltig;
alter table public.gerichte add constraint gerichte_allergene_gueltig check (
  allergene is null
  or allergene <@ array['A','B','C','D','E','F','G','H','I','J','K','L','M','N']::text[]
);

commit;

-- Prüfen (Ausgabe zeigen):
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'gerichte' and column_name = 'allergene';

select count(*) filter (where aktiv) as aktive_gerichte,
       count(*) filter (where aktiv and allergene is not null) as davon_erfasst
from public.gerichte;
