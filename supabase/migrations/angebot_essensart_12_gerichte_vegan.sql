-- Titel: GEN-12 Gerichte – Häkchen "vegan" (für die farbigen Punkte im Menü)
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_11_bilder_webp.sql.
-- WICHTIG: Der Generator auf dem Zweig gen-1 und die Website-Vorschau fragen die Spalte "vegan" ab.
-- Bis diese Migration im Test-Projekt gelaufen ist, laden die Vorschauen das Menü nicht.
--
-- Was passiert:
--   1. Neue Spalte gerichte.vegan (ja/nein, Vorgabe nein). Ein veganes Gericht ist immer auch vegetarisch.
--   2. Nur zwei Gerichte werden vegan gesetzt, weil sie nur aus Obst bestehen: Obstplatte, Obstspieße.
--      Alles andere entscheidet Jana im CRM (Menü → Gerichte), vor dem Livegang mit ihr durchgehen.
-- Was NICHT passiert: kein Preis, keine Anfrage, kein anderes Häkchen ändert sich.
-- Wer darf was: unverändert. Die Tabelle gerichte hat RLS; die neue Spalte liest der Generator wie die übrigen.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

alter table public.gerichte add column if not exists vegan boolean not null default false;

alter table public.gerichte drop constraint if exists gerichte_vegan_ist_vegetarisch;
alter table public.gerichte add constraint gerichte_vegan_ist_vegetarisch check (not vegan or vegetarisch);

update public.gerichte set vegan = true
where name in ('Obstplatte', 'Obstspieße') and vegetarisch and not vegan;

do $$
declare
  n integer;
begin
  select count(*) into n from public.gerichte where vegan;
  raise notice '% Gerichte sind jetzt als vegan markiert.', n;
end;
$$;

commit;
