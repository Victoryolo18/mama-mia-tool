-- Titel: GEN-29 Russische und englische Namen für Gänsekeule, Entenkeule, Kartoffelklöße und das Highlight
-- Mama Mia · Angebot nach Essensart · Teil 22
--
-- Zuerst im TEST-Projekt (mama-mia-test), dann im echten Projekt. Nach angebot_essensart_21_highlights.sql.
-- Füllt nur leere Felder: Was Jana unter Übersetzungen schon eingetragen hat, bleibt.
-- Läuft als Ganzes oder gar nicht.

begin;

update public.gerichte g
set name_ru = coalesce(g.name_ru, v.ru),
    name_en = coalesce(g.name_en, v.en)
from (values
  ('Gänsekeule',     'Goose leg',        'Гусиная ножка'),
  ('Entenkeule',     'Duck leg',         'Утиная ножка'),
  ('Kartoffelklöße', 'Potato dumplings', 'Картофельные клёцки')
) as v(name, en, ru)
where g.name = v.name;

update public.highlights
set titel_en = coalesce(titel_en, 'Highlight'),
    titel_ru = coalesce(titel_ru, 'Хит сезона')
where titel = 'Highlight';

commit;
