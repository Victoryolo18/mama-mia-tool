-- Titel: GEN-17 Janas Auswahl: vegan und glutenfrei auf Anfrage; Kalifornischer Spaghetti-Salat raus
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_14_kontaktformular_mailgrenze.sql.
--
-- Grundlage: Janas ausgefüllte Liste vom 15.10.2026 (C:\Dev\vegan-glutenfrei-liste.pdf), ihre Kreuze und ihre Notiz:
--   „Kalifornischen Salat ganz aus dem Menü. Knoblauchbrot ist mit Ei. Pancakes, Eierkuchen, Bananensplit und
--    Mousse au Chocolat bleiben normal.“
--
-- Was passiert:
--   1. vegan_moeglich = ja bei den 52 Gerichten, die Jana bei „vegan“ angekreuzt hat.
--   2. glutenfrei_moeglich = ja bei den 94 Gerichten, die Jana bei „glutenfrei“ angekreuzt hat,
--      dazu Obstplatte und Obstspieße (schon vegan, in der Liste als „glutenfrei ja“ genannt).
--   3. „Kalifornischer Spaghetti-Salat“ wird abgeschaltet (aktiv = false), nicht gelöscht. Alte Anfragen behalten ihn.
--   Alle übrigen Gerichte bleiben ohne Hinweis. Steht ein Name nicht (aktiv) im Katalog, bricht alles ab und nichts
--   ändert sich; die Meldung nennt den Namen.
-- Was NICHT passiert: kein Preis, keine Anfrage, keine Spalte ändert sich.
-- Wer darf was: unverändert.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

do $$
declare
  liste_vegan text[] := array[
    'Gemüseplatte mit Dips', 'Marinierte Auberginen', 'Antipasti-Platte mit Brotkorb', 'Kürbissuppe', 'Tomatensuppe',
    'Minestrone', 'Grüner Borschtsch (mit Sauerampfer)', 'Roter Borschtsch mit Pampuschki', 'Kartoffelsuppe mit/ohne Würstchen',
    'Platte Mediterran (Grillgemüse, Schafskäse)',
    'Kartoffelsalat', 'Frischer Mixsalat', 'Tomatensalat mit roten Zwiebeln', 'Möhrensalat mit Apfel', 'Rote-Bete-Salat',
    'Pesto-Pasta-Salat',
    'Salzkartoffeln', 'Pellkartoffeln mit Dill', 'Rosmarinkartoffeln', 'Kartoffelpüree', 'Reis', 'Polenta-Schnitten',
    'Rotkohl mit Äpfeln', 'Rotkohl', 'Zucchini-Carpaccio', 'Gurken-Tomaten-Salat', 'Buttergemüse', 'Glasierte Möhren',
    'Grüne Bohnen', 'Honig-Balsamico-Gemüse', 'Ratatouille-Gemüse', 'Sauerkraut', 'Bandnudeln', 'Tagliatelle',
    'Gemüsecurry-Reis', 'Gefüllte Paprika vegetarisch', 'Polenta-Gemüse-Auflauf', 'Bunter Gemüseauflauf',
    'Draniki (Reibekuchen) mit Smetana', 'Wareniki (Teigtaschen mit Kartoffeln/Quark)',
    'Bruschetta', 'Couscoussalat im Glas', 'Mediterraner Nudelsalat im Glas', 'Piroschki mit Kartoffeln/Fleisch/Apfel',
    'Aufstriche-Variation', 'Brot & Butter', 'Brot, Butter & Aufstriche', 'Müsli-Schichtspeise', 'Quarkspeise mit Obst',
    'Brötchen & Croissants',
    'Panna Cotta', 'Apfelcrumble'
  ];
  liste_gf text[] := array[
    'Gemüseplatte mit Dips', 'Marinierte Auberginen', 'Antipasti-Platte mit Brotkorb', 'Kürbissuppe', 'Tomatensuppe',
    'Minestrone', 'Grüner Borschtsch (mit Sauerampfer)', 'Roter Borschtsch mit Pampuschki', 'Kartoffelsuppe mit/ohne Würstchen',
    'Platte Mediterran (Grillgemüse, Schafskäse)', 'Tomaten-Mozzarella-Teller', 'Tomaten-Mozzarella im Glas', 'Käseplatte',
    'Gulaschsuppe', 'Soljanka', 'Käselauchsuppe mit/ohne Hack', 'Hähnchen-Parmesan-Suppe', 'Wurstplatte',
    'Kartoffelsalat', 'Frischer Mixsalat', 'Tomatensalat mit roten Zwiebeln', 'Möhrensalat mit Apfel', 'Rote-Bete-Salat',
    'Pesto-Pasta-Salat', 'Backkartoffelsalat mit Tomate, Mozzarella, Pesto', 'Griechischer Salat', 'Caesar Salat',
    'Salat Olivje (Russischer Kartoffelsalat)', 'Salat Schuba (Matjes und Rote Bete)',
    'Salzkartoffeln', 'Pellkartoffeln mit Dill', 'Rosmarinkartoffeln', 'Kartoffelpüree', 'Reis', 'Polenta-Schnitten',
    'Rotkohl mit Äpfeln', 'Rotkohl', 'Zucchini-Carpaccio', 'Gurken-Tomaten-Salat', 'Buttergemüse', 'Glasierte Möhren',
    'Grüne Bohnen', 'Honig-Balsamico-Gemüse', 'Ratatouille-Gemüse', 'Sauerkraut', 'Bandnudeln', 'Tagliatelle',
    'Gemüsecurry-Reis', 'Gefüllte Paprika vegetarisch', 'Polenta-Gemüse-Auflauf', 'Bunter Gemüseauflauf',
    'Draniki (Reibekuchen) mit Smetana', 'Kartoffel-Feta-Auflauf', 'Cremiges Toskanisches Hähnchen',
    'Hähnchen überbacken mit Pfirsich und Käse', 'Hähnchenfilet in Frischkäse-Parmesansoße', 'Hähnchenfilet in Honigsenfsoße',
    'Hähnchenfilet in Tomaten-Mozzarellasoße', 'Hähnchengeschnetzeltes', 'Hähnchenkeulen mit Ofengemüse',
    'Ofenhähnchen mit Gemüse und Käse', 'Gefüllte Paprika mit Hack', 'Anatolischer Hackfleischauflauf mit Kohl',
    'Kartoffelauflauf', 'Kasslerscheiben', 'Schweinefilet im Speckmantel', 'Schweinefilet in Rahmsoße',
    'Schweinefilet in Rahmsoße mit Pilzen', 'Roladentopf', 'Räuberschnitzel', 'Überbackene Partyschnitzel aus dem Ofen',
    'Schweineschnitzel mit Pilzsoße', 'Plow (Reisgericht mit Fleisch)', 'Lachs in Sahnesoße', 'Lachs in Zitronensoße',
    'Couscoussalat im Glas', 'Mediterraner Nudelsalat im Glas', 'Spieße: Tomate-Mozzarella', 'Spieße: Weintrauben-Käse',
    'Gefüllte Eier', 'Garnelen-Spieße', 'Hühnerkeulchen', 'Bockwürste',
    'Aufstriche-Variation', 'Brot & Butter', 'Brot, Butter & Aufstriche', 'Müsli-Schichtspeise', 'Quarkspeise mit Obst',
    'Käse-Wurst-Platte mit Gemüse und Brotkorb', 'Lachs-Upgrade',
    'Panna Cotta', 'Apfelcrumble', 'Limoncello-Mousse', 'Mama Mia Dessert mit Quarkcreme und Beeren',
    'Obstplatte', 'Obstspieße'
  ];
  fehlt text;
  n_vegan integer;
  n_gf integer;
begin
  select string_agg(x, ', ') into fehlt
  from unnest(liste_vegan || liste_gf || array['Kalifornischer Spaghetti-Salat']) as x
  where not exists (select 1 from public.gerichte g where g.name = x and g.aktiv);
  if fehlt is not null then
    raise exception 'Nicht als aktives Gericht gefunden, nichts geändert: %', fehlt;
  end if;

  -- Ein Gericht, das schon vegan ist, braucht kein "vegan auf Anfrage".
  update public.gerichte set vegan_moeglich = true where name = any(liste_vegan) and not vegan and not vegan_moeglich;
  update public.gerichte set glutenfrei_moeglich = true where name = any(liste_gf) and not glutenfrei_moeglich;
  update public.gerichte set aktiv = false where name = 'Kalifornischer Spaghetti-Salat' and aktiv;

  select count(*) into n_vegan from public.gerichte where aktiv and vegan_moeglich;
  select count(*) into n_gf from public.gerichte where aktiv and glutenfrei_moeglich;
  raise notice 'Vegan auf Anfrage: % Gerichte (erwartet %). Glutenfrei auf Anfrage: % Gerichte (erwartet %).',
    n_vegan, cardinality(liste_vegan), n_gf, cardinality(liste_gf);
end;
$$;

commit;
