-- Titel: GEN-4 Fingerfood-Pakete – 4, 6 und 8 Teile zur Wahl (wie relaxx-catering)
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_3_preispruefung.sql.
-- Entscheidung von Victor am 09.10.2026: Die Fingerfood-Pakete bestehen aus einer einzigen Wahl,
-- Klassisch 4 Teile, Genuss 6, Premium 8. Die Preise bleiben, wie sie sind.
--
-- Was passiert (nur in der neuen Tabelle paket_gruppen, nur bei den drei Fingerfood-Paketen):
--   1. Der Block "Häppchen-Auswahl" heißt jetzt "Fingerfood" und verlangt 4 / 6 / 8 statt 2 / 3 / 4.
--   2. Die Blöcke "Salate" und "Süßes" werden abgeschaltet (aktiv = false), nicht gelöscht.
--      Salate und Desserts selbst bleiben unberührt und stehen weiter im Buffet zur Wahl.
-- Was NICHT passiert: Buffet und Frühstück ändern sich nicht. Keine Anfrage wird angefasst.
-- Läuft als Ganzes oder gar nicht.

begin;

update public.paket_gruppen pg
set label = 'Fingerfood', min_auswahl = v.teile, max_auswahl = v.teile
from public.pakete p
join (values ('Klassisch', 4), ('Genuss', 6), ('Premium', 8)) as v (name, teile) on v.name = p.name
where pg.paket_id = p.id
  and p.essensart = 'fingerfood'
  and pg.typ = 'wahl'
  and pg.gruppen = array['fingerfood']::text[];

update public.paket_gruppen pg
set aktiv = false
from public.pakete p
where pg.paket_id = p.id
  and p.essensart = 'fingerfood'
  and pg.typ = 'wahl'
  and pg.gruppen <> array['fingerfood']::text[];

do $$
declare
  n integer;
begin
  select count(*) into n
  from public.pakete p
  join public.paket_gruppen pg on pg.paket_id = p.id and pg.aktiv and pg.typ = 'wahl'
  where p.essensart = 'fingerfood'
    and pg.label = 'Fingerfood'
    and pg.min_auswahl = pg.max_auswahl
    and pg.max_auswahl = case p.name when 'Klassisch' then 4 when 'Genuss' then 6 when 'Premium' then 8 end;
  if n <> 3 then
    raise exception 'Erwartet je Fingerfood-Paket genau einen Block mit 4, 6 oder 8 Teilen, gefunden %.', n;
  end if;

  select count(*) into n
  from public.pakete p
  join public.paket_gruppen pg on pg.paket_id = p.id and pg.aktiv and pg.typ = 'wahl'
  where p.essensart = 'fingerfood';
  if n <> 3 then
    raise exception 'Die Fingerfood-Pakete haben zusammen % aktive Wahl-Blöcke statt 3.', n;
  end if;

  select count(*) into n
  from public.gerichte g
  join public.gericht_gruppen gg on gg.gericht_id = g.id and gg.gruppe = 'fingerfood'
  where g.aktiv;
  if n < 9 then
    raise exception 'Nur % aktive Fingerfood-Gerichte; für 8 Teile plus "+1" braucht es mindestens 9.', n;
  end if;
end;
$$;

commit;
