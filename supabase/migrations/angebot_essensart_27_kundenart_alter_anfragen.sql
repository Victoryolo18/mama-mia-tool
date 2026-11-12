-- Privat oder Firma auch für alle bisherigen Anfragen (Victor, 12.11.2026).
-- Der Generator speichert die Wahl ab jetzt in requests.event_art, derselben Spalte wie das Kontaktformular
-- ("privat" oder "geschaeftlich" = Firma). Bisherige Anfragen ohne Angabe werden nach dem Anlass eingeordnet,
-- mit derselben festen Zuordnung wie im Generator (src/angebot/anlaesse.js):
--   Firma:  Firmenfeier, Seminar, Weihnachtsfeier, Eröffnung, Empfang
--   Privat: jeder andere Anlass
--   ohne Anlass: Firma, wenn ein Firmenname eingetragen ist, sonst Privat
-- Anfragen, bei denen der Kunde selbst gewählt hat (event_art schon gesetzt), bleiben unverändert.
-- Wer darf was: unverändert, es kommt keine Spalte und keine Regel dazu.
-- Läuft als Ganzes; ein zweiter Lauf ändert nichts mehr. Das Ergebnis zeigt die Anzahl je Gruppe.

begin;

with geaendert as (
  update public.requests
  set event_art = case
        when anlass in ('firmenfeier', 'seminar', 'weihnachtsfeier', 'eroeffnung', 'empfang') then 'geschaeftlich'
        when anlass is not null and anlass <> '' then 'privat'
        when nullif(trim(firma_name), '') is not null then 'geschaeftlich'
        else 'privat'
      end
  where event_art is null
  returning event_art, anlass
)
select event_art, coalesce(nullif(anlass, ''), '(ohne Anlass)') as anlass, count(*) as anzahl
from geaendert
group by 1, 2
order by 1, 3 desc;

commit;
