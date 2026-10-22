-- Titel: GEN-4 Fingerfood – „Fingerfood-Teile“ statt „Fingerfood“ und „Häppchen“
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_4_fingerfood_teile.sql.
-- Entscheidung von Victor am 09.10.2026, Wortlaut wie bei relaxx-catering:
--   1. Der Block der drei Fingerfood-Pakete heißt „Fingerfood-Teile“ (Paket-Karte: „4× Fingerfood-Teile“).
--   2. Das Extra heißt „+ 1 Fingerfood-Teil“ statt „+ 1 Häppchen“.
-- Ändert nur zwei Texte in den neuen Tabellen paket_gruppen und gruppen. Keine Preise, keine Mengen.
-- Der Block-Name ist danach auch im CRM unter Menü-Verwaltung → Pakete änderbar.

begin;

update public.paket_gruppen pg
set label = 'Fingerfood-Teile'
from public.pakete p
where pg.paket_id = p.id
  and p.essensart = 'fingerfood'
  and pg.typ = 'wahl'
  and pg.gruppen = array['fingerfood']::text[]
  and pg.label = 'Fingerfood';

update public.gruppen
set label_einzahl = 'Fingerfood-Teil'
where slug = 'fingerfood';

do $$
declare
  n integer;
begin
  select count(*) into n
  from public.pakete p
  join public.paket_gruppen pg on pg.paket_id = p.id and pg.aktiv and pg.typ = 'wahl'
  where p.essensart = 'fingerfood' and pg.label = 'Fingerfood-Teile';
  if n <> 3 then
    raise exception 'Erwartet drei Blöcke „Fingerfood-Teile“, gefunden %. Wurde der Block im CRM schon umbenannt?', n;
  end if;
end;
$$;

commit;
