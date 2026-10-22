-- Titel: GEN-5 Fingerfood – Janas neue Gerichte vom 08.10.2026 eintragen
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_7_schild_nur_meistgebucht.sql.
-- Quelle: Janas handgeschriebene Liste, Abschrift in C:\Dev\angebot-bestand\fingerfood-liste-jana-2026-10-08.md.
--
-- Was passiert:
--   1. 19 neue Gerichte in `gerichte` (Häppchen, drei Gläser/Spieße, ein Dessert), alle im Topf "fingerfood".
--   2. Drei Gerichte, die es schon gibt und die auf Janas Fingerfood-Liste stehen, kommen zusätzlich in den
--      Topf "fingerfood": Kartoffelsalat im Glas mit Hackbällchen, Tomaten-Mozzarella im Glas,
--      Schwarzwälderdessert. Im Buffet bleiben sie, wo sie sind.
--   3. Der Sammeleintrag "Canapés" wird abgeschaltet (aktiv = false, nicht gelöscht), weil Jana drei Sorten
--      nennt: Lachs, Hähnchen, Ziegenkäse.
-- Was NICHT passiert: keine Preise, keine Pakete, keine Anfrage wird angefasst. Die zwölf Häppchen, die
-- heute im Katalog stehen, aber nicht auf Janas Liste (Gefüllte Eier, Bouletten …), bleiben unverändert.
--
-- Annahmen, die Jana bestätigen sollte (Prüfliste):
--   - "vegetarisch" ist nur gesetzt, wo die Liste es hergibt (Blätterteigtaschen, Flammkuchen: nein).
--   - Mini-Wrapröllchen sind EIN Gericht "gemischt", Bagel und Canapés je drei Gerichte.
--   - "Himbeertraum" steht nur im Fingerfood zur Wahl, nicht unter den Buffet-Desserts.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf legt nichts doppelt an.

begin;

with liste (name, kategorie, unterkategorie, vegetarisch) as (
  values
    ('Mini-Burger vegetarisch (Käse, Gemüse)',   'vorspeise', 'haeppchen', true),
    ('Mini-Burger mit Hühnchen',                 'vorspeise', 'haeppchen', false),
    ('Mini-Burger Pulled Pork',                  'vorspeise', 'haeppchen', false),
    ('Mini-Wrapröllchen gemischt',               'vorspeise', 'haeppchen', false),
    ('Hackbällchen-Platte',                      'vorspeise', 'haeppchen', false),
    ('Mini-Döner',                               'vorspeise', 'haeppchen', false),
    ('Mini-Flammkuchen',                         'vorspeise', 'haeppchen', false),
    ('Lachs-Canapés',                            'vorspeise', 'haeppchen', false),
    ('Hähnchen-Canapés',                         'vorspeise', 'haeppchen', false),
    ('Ziegenkäse-Canapés',                       'vorspeise', 'haeppchen', true),
    ('Bagel mit Lachs',                          'vorspeise', 'haeppchen', false),
    ('Bagel mit Hühnchen',                       'vorspeise', 'haeppchen', false),
    ('Bagel mit Tomate-Mozzarella',              'vorspeise', 'haeppchen', true),
    ('Mini-Sandwiches',                          'vorspeise', 'haeppchen', false),
    ('Blätterteigtaschen',                       'vorspeise', 'haeppchen', false),
    ('Mediterraner Nudelsalat im Glas',          'vorspeise', 'haeppchen', true),
    ('Couscoussalat im Glas',                    'vorspeise', 'haeppchen', true),
    ('Obstspieße',                               'vorspeise', 'haeppchen', true),
    ('Himbeertraum',                             'fingerfood', null,       true)
),
neu as (
  insert into public.gerichte (name, kategorie, unterkategorie, vegetarisch, aktiv)
  select l.name, l.kategorie, l.unterkategorie, l.vegetarisch, true
  from liste l
  where not exists (select 1 from public.gerichte g where g.name = l.name)
  returning id
)
insert into public.gericht_gruppen (gericht_id, gruppe)
select id, 'fingerfood' from neu;

insert into public.gericht_gruppen (gericht_id, gruppe)
select g.id, 'fingerfood'
from public.gerichte g
where g.name in ('Kartoffelsalat im Glas mit Hackbällchen', 'Tomaten-Mozzarella im Glas', 'Schwarzwälderdessert')
on conflict do nothing;

update public.gerichte set aktiv = false where name = 'Canapés' and aktiv;

do $$
declare
  n integer;
begin
  select count(*) into n
  from public.gerichte g
  join public.gericht_gruppen gg on gg.gericht_id = g.id and gg.gruppe = 'fingerfood'
  where g.aktiv and g.name in (
    'Mini-Burger vegetarisch (Käse, Gemüse)', 'Mini-Burger mit Hühnchen', 'Mini-Burger Pulled Pork',
    'Mini-Wrapröllchen gemischt', 'Hackbällchen-Platte', 'Mini-Döner', 'Mini-Flammkuchen',
    'Lachs-Canapés', 'Hähnchen-Canapés', 'Ziegenkäse-Canapés',
    'Bagel mit Lachs', 'Bagel mit Hühnchen', 'Bagel mit Tomate-Mozzarella',
    'Mini-Sandwiches', 'Blätterteigtaschen', 'Mediterraner Nudelsalat im Glas', 'Couscoussalat im Glas',
    'Obstspieße', 'Himbeertraum',
    'Kartoffelsalat im Glas mit Hackbällchen', 'Tomaten-Mozzarella im Glas', 'Schwarzwälderdessert');
  if n <> 22 then
    raise exception 'Erwartet 22 Gerichte von Janas Liste im Topf fingerfood, gefunden %.', n;
  end if;

  select count(*) into n from public.gerichte g
  where g.aktiv and not exists (select 1 from public.gericht_gruppen gg where gg.gericht_id = g.id);
  if n > 0 then
    raise exception '% aktive Gerichte liegen in keinem Topf.', n;
  end if;
end;
$$;

commit;
