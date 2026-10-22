-- Titel: GEN-3 Stile – Reihenfolge der Kacheln festlegen
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_1_kataloge.sql.
-- Reihenfolge von Victor am 08.10.2026. Jana kann sie später im CRM ändern.
-- Ändert nur die Spalte reihenfolge in der neuen Tabelle stile.

update public.stile s
set reihenfolge = v.reihenfolge
from (values
  ('individuell',        0),
  ('mediterran',        10),
  ('klassisch_deutsch', 20),
  ('modern_festlich',   30),
  ('osteuropaeisch',    40),
  ('buntes_buffet',     50),
  ('klassisch_elegant', 60),
  ('kinderfreundlich',  70)
) as v(slug, reihenfolge)
where s.slug = v.slug;

select slug, label, reihenfolge from public.stile order by reihenfolge;
