-- ════════════════════════════════════════════════════════════════
-- MAMA MIA — MIGRATION 2: THEMEN-ARCHITEKTUR & MAMAS GERICHTE
-- ════════════════════════════════════════════════════════════════
-- Diese Migration:
--   1. Erweitert das Schema um Themen, Tags, Unterkategorien
--   2. Löscht die Test-Daten der 1. Migration
--   3. Befüllt mit Mamas echten Gerichten (146 Stück, 11 Kategorien)
--   4. Legt 24 Themen an (6 Anlässe × 3 kuratierte + Individuell)
--   5. Generiert 72 Paket-Konfigurationen (6×4×3) mit passenden Slots
--
-- AUSFÜHRUNG: Supabase → SQL Editor → komplett rein → Run
-- ROLLBACK:   Migration_2_Rollback.sql separat speichern
-- ════════════════════════════════════════════════════════════════

BEGIN;


-- ─────────────────────────────────────────────────────────────────
-- 1) SCHEMA-ERWEITERUNGEN
-- ─────────────────────────────────────────────────────────────────

-- 1a) Neue Kategorien zulassen (auflauf, gemuesebeilage, kuchen_torte, fruehstueck)
ALTER TABLE gerichte DROP CONSTRAINT IF EXISTS gerichte_kategorie_check;
ALTER TABLE gerichte ADD CONSTRAINT gerichte_kategorie_check CHECK (kategorie IN (
  'hauptspeise','vorspeise','beilage','salat','dessert','fingerfood',
  'fruehstueck_herzhaft','backwaren','obst_suess','inklusiv',
  'auflauf','gemuesebeilage','kuchen_torte','fruehstueck'
));

-- 1b) gerichte: themen_tags + unterkategorie
ALTER TABLE gerichte ADD COLUMN IF NOT EXISTS themen_tags    text[] NOT NULL DEFAULT '{}';
ALTER TABLE gerichte ADD COLUMN IF NOT EXISTS unterkategorie text;
CREATE INDEX IF NOT EXISTS idx_gerichte_themen_tags    ON gerichte USING GIN (themen_tags);
CREATE INDEX IF NOT EXISTS idx_gerichte_unterkategorie ON gerichte(unterkategorie);

-- 1c) paket_slots: kategorien[] zusätzlich zu kategorie (Mehrfach-Kategorie pro Slot)
ALTER TABLE paket_slots ADD COLUMN IF NOT EXISTS kategorien text[] NOT NULL DEFAULT '{}';
-- (alte 'kategorie' Spalte bleibt für Kompatibilität, wird nicht mehr benutzt)

-- 1d) paket_konfiguration: theme_slug
ALTER TABLE paket_konfiguration ADD COLUMN IF NOT EXISTS theme_slug text NOT NULL DEFAULT 'individuell';
-- Unique-Constraint anpassen: vorher (anlass, paket), jetzt (anlass, theme_slug, paket)
ALTER TABLE paket_konfiguration DROP CONSTRAINT IF EXISTS paket_konfiguration_anlass_paket_key;
ALTER TABLE paket_konfiguration ADD CONSTRAINT paket_konfig_unique UNIQUE (anlass, theme_slug, paket);


-- 1e) Tabelle 'themen'
CREATE TABLE IF NOT EXISTS themen (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anlass        text NOT NULL,
  slug          text NOT NULL,
  label         text NOT NULL,
  beschreibung  text,
  bild_url      text,
  reihenfolge   integer NOT NULL DEFAULT 0,
  aktiv         boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT themen_anlass_check CHECK (anlass IN (
    'hochzeit','geburtstag','einschulung','individuell','firmenfeier','fruehstueck'
  )),
  UNIQUE(anlass, slug)
);
CREATE INDEX IF NOT EXISTS idx_themen_anlass ON themen(anlass);


-- 1f) Tabelle 'zusatzwuensche' (für Kuchen & Torten auf Anfrage etc.)
CREATE TABLE IF NOT EXISTS zusatzwuensche (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,
  beschreibung  text,
  hinweis       text,                 -- z.B. "Preis auf Anfrage"
  reihenfolge   integer NOT NULL DEFAULT 0,
  aktiv         boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────
-- 2) RLS für neue Tabellen
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE themen           ENABLE ROW LEVEL SECURITY;
ALTER TABLE zusatzwuensche   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read themen"          ON themen;
DROP POLICY IF EXISTS "Auth write themen"           ON themen;
DROP POLICY IF EXISTS "Public read zusatzwuensche"  ON zusatzwuensche;
DROP POLICY IF EXISTS "Auth write zusatzwuensche"   ON zusatzwuensche;

CREATE POLICY "Public read themen"          ON themen          FOR SELECT USING (true);
CREATE POLICY "Auth write themen"           ON themen          FOR ALL    USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "Public read zusatzwuensche"  ON zusatzwuensche  FOR SELECT USING (true);
CREATE POLICY "Auth write zusatzwuensche"   ON zusatzwuensche  FOR ALL    USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

DROP TRIGGER IF EXISTS set_updated_at_themen ON themen;
DROP TRIGGER IF EXISTS set_updated_at_zusatzwuensche ON zusatzwuensche;
CREATE TRIGGER set_updated_at_themen
  BEFORE UPDATE ON themen
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_zusatzwuensche
  BEFORE UPDATE ON zusatzwuensche
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────────────
-- 3) ALTE TEST-DATEN LÖSCHEN
-- ─────────────────────────────────────────────────────────────────
-- CASCADE entfernt automatisch alle abhängigen slot_gerichte + paket_slots

DELETE FROM slot_gerichte;
DELETE FROM paket_slots;
DELETE FROM paket_konfiguration;
DELETE FROM gerichte;


-- ═════════════════════════════════════════════════════════════════
-- 4) SEED-DATEN: GERICHTE (Mamas echte Liste)
-- ═════════════════════════════════════════════════════════════════
INSERT INTO gerichte (name, kategorie, vegetarisch, unterkategorie, themen_tags) VALUES
  ('Kartoffelsuppe mit/ohne Würstchen', 'vorspeise', false, 'suppen', ARRAY['klassisch_deutsch']),
  ('Kürbissuppe', 'vorspeise', true, 'suppen', ARRAY['klassisch_deutsch','klassisch_elegant','modern_festlich','familien_klassiker']),
  ('Käselauchsuppe mit/ohne Hack', 'vorspeise', false, 'suppen', ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Soljanka', 'vorspeise', false, 'suppen', ARRAY['osteuropaeisch']),
  ('Gulaschsuppe', 'vorspeise', false, 'suppen', ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Minestrone', 'vorspeise', true, 'suppen', ARRAY['mediterran']),
  ('Cremige Spinat-Tortellini-Suppe', 'vorspeise', true, 'suppen', ARRAY['mediterran','modern_festlich']),
  ('Tomatensuppe', 'vorspeise', true, 'suppen', ARRAY['mediterran','klassisch_elegant','familien_klassiker','kinderfreundlich']),
  ('Lasagnesuppe', 'vorspeise', false, 'suppen', ARRAY['mediterran','familien_klassiker']),
  ('Hähnchen-Parmesan-Suppe', 'vorspeise', false, 'suppen', ARRAY['mediterran','modern_festlich']),
  ('Gefüllte Eier', 'vorspeise', true, 'haeppchen', ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker','buntes_buffet']),
  ('Belegte Brötchen', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','business_lunch','familien_klassiker']),
  ('Canapés', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_elegant','modern_festlich','business_lunch','empfang_fingerfood']),
  ('Spieße: Tomate-Mozzarella', 'vorspeise', true, 'haeppchen', ARRAY['mediterran','klassisch_elegant','modern_festlich','empfang_fingerfood','buntes_buffet']),
  ('Spieße: Weintrauben-Käse', 'vorspeise', true, 'haeppchen', ARRAY['klassisch_elegant','modern_festlich','empfang_fingerfood','buntes_buffet']),
  ('Garnelen-Spieße', 'vorspeise', false, 'haeppchen', ARRAY['mediterran','klassisch_elegant','modern_festlich','empfang_fingerfood']),
  ('Hühnchen-Spieße', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','mediterran','modern_festlich','empfang_fingerfood','buntes_buffet']),
  ('Mini-Burger (hausgemacht)', 'vorspeise', false, 'haeppchen', ARRAY['business_lunch','modern_festlich','empfang_fingerfood','buntes_buffet','kinderfreundlich']),
  ('Mini-Wraps mit frittiertem Hühnchen', 'vorspeise', false, 'haeppchen', ARRAY['business_lunch','modern_festlich','empfang_fingerfood','buntes_buffet']),
  ('Mini-Wraps mit Tomate-Mozzarella', 'vorspeise', true, 'haeppchen', ARRAY['mediterran','business_lunch','modern_festlich','empfang_fingerfood','buntes_buffet']),
  ('Mini-Laugenteilchen mit Leberkäse', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','business_lunch','familien_klassiker']),
  ('Mini-Laugenteilchen mit Tomate-Mozzarella', 'vorspeise', true, 'haeppchen', ARRAY['mediterran','business_lunch']),
  ('Mini-Quiches', 'vorspeise', true, 'haeppchen', ARRAY['klassisch_elegant','modern_festlich','empfang_fingerfood','business_lunch']),
  ('Eierkuchen-Lachsröllchen', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_elegant','modern_festlich','empfang_fingerfood']),
  ('Mini-Schnitzel', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','business_lunch','kinderfreundlich','buntes_buffet','familien_klassiker']),
  ('Hühnerkeulchen', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','kinderfreundlich','familien_klassiker','buntes_buffet']),
  ('Bouletten', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich']),
  ('Bockwürste', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','kinderfreundlich','familien_klassiker']),
  ('Bruschetta', 'vorspeise', true, 'haeppchen', ARRAY['mediterran','empfang_fingerfood']),
  ('Knoblauchbrot', 'vorspeise', true, 'haeppchen', ARRAY['mediterran','familien_klassiker']),
  ('Überbackene Brezeln mit Füllung', 'vorspeise', false, 'haeppchen', ARRAY['klassisch_deutsch','business_lunch']),
  ('Platte Mediterran (Grillgemüse, Schafskäse)', 'vorspeise', true, 'platten', ARRAY['mediterran','klassisch_elegant','modern_festlich']),
  ('Antipasti-Platte mit Brotkorb', 'vorspeise', true, 'platten', ARRAY['mediterran','klassisch_elegant','modern_festlich','empfang_fingerfood']),
  ('Tomaten-Mozzarella-Teller', 'vorspeise', true, 'platten', ARRAY['mediterran','klassisch_elegant','klassisch_deutsch']),
  ('Tomaten-Mozzarella im Glas', 'vorspeise', true, 'platten', ARRAY['mediterran','modern_festlich','empfang_fingerfood']),
  ('Käseplatte', 'vorspeise', true, 'platten', ARRAY['klassisch_deutsch','klassisch_elegant','business_lunch','familien_klassiker']),
  ('Wurstplatte', 'vorspeise', false, 'platten', ARRAY['klassisch_deutsch','business_lunch','familien_klassiker']),
  ('Gemüseplatte mit Dips', 'vorspeise', true, 'platten', ARRAY['klassisch_elegant','modern_festlich','business_lunch','buntes_buffet','kinderfreundlich']),
  ('Obstplatte', 'vorspeise', true, 'platten', ARRAY['klassisch_elegant','modern_festlich','business_lunch','kinderfreundlich','buntes_buffet']),
  ('Platte rustikal (Brezeln, Leberkäs, Käse)', 'vorspeise', false, 'platten', ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Platte Brotreise mit Dipps', 'vorspeise', true, 'platten', ARRAY['mediterran','modern_festlich','empfang_fingerfood']),
  ('Schweinefilet in Rahmsoße', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker']),
  ('Schweinefilet in Rahmsoße mit Pilzen', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker']),
  ('Falscher Hase mit Soße', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Schweineschnitzel mit Pilzsoße', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Schweinefilet im Speckmantel', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','klassisch_elegant','modern_festlich']),
  ('Räuberschnitzel', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Kasslerscheiben', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Hähnchenfilet in Frischkäse-Parmesansoße', 'hauptspeise', false, 'fleisch', ARRAY['mediterran','klassisch_elegant','modern_festlich','familien_klassiker','buntes_buffet']),
  ('Hähnchenfilet in Tomaten-Mozzarellasoße', 'hauptspeise', false, 'fleisch', ARRAY['mediterran','klassisch_elegant','modern_festlich','familien_klassiker','buntes_buffet']),
  ('Hähnchenfilet in Honigsenfsoße', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','modern_festlich','familien_klassiker']),
  ('Überbackene Partyschnitzel aus dem Ofen', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Hähnchen überbacken mit Pfirsich und Käse', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Cremiges Toskanisches Hähnchen', 'hauptspeise', false, 'fleisch', ARRAY['mediterran','klassisch_elegant','modern_festlich']),
  ('Ofenhähnchen mit Gemüse und Käse', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','modern_festlich','familien_klassiker','buntes_buffet']),
  ('Hähnchenkeulen mit Ofengemüse', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Hähnchengeschnetzeltes', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Boeuf Stroganoff', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_elegant','modern_festlich','osteuropaeisch']),
  ('Rindfleisch in Rotwein geschmort', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_elegant','modern_festlich']),
  ('Roladentopf', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Gefüllte Paprika mit Hack', 'hauptspeise', false, 'fleisch', ARRAY['klassisch_deutsch','osteuropaeisch','familien_klassiker']),
  ('Lachs in Sahnesoße', 'hauptspeise', false, 'fisch', ARRAY['klassisch_elegant','modern_festlich','mediterran']),
  ('Lasagne klassisch', 'hauptspeise', false, 'vegetarisch_oder_pasta', ARRAY['mediterran','familien_klassiker','buntes_buffet']),
  ('Lasagne auf Kalabrisch', 'hauptspeise', false, 'vegetarisch_oder_pasta', ARRAY['mediterran','modern_festlich']),
  ('Lasagne vegetarisch (Spinat oder Gemüse)', 'hauptspeise', true, 'vegetarisch_oder_pasta', ARRAY['mediterran','familien_klassiker','modern_festlich','buntes_buffet']),
  ('Gemüsecurry-Reis', 'hauptspeise', true, 'vegetarisch_oder_pasta', ARRAY['modern_festlich']),
  ('Gefüllte Paprika vegetarisch', 'hauptspeise', true, 'vegetarisch_oder_pasta', ARRAY['klassisch_deutsch','osteuropaeisch','familien_klassiker','mediterran']),
  ('Kartoffelauflauf', 'auflauf', false, NULL, ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Nudelauflauf', 'auflauf', false, NULL, ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Polenta-Gemüse-Auflauf', 'auflauf', true, NULL, ARRAY['mediterran','modern_festlich']),
  ('Bunter Gemüseauflauf', 'auflauf', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Anatolischer Hackfleischauflauf mit Kohl', 'auflauf', false, NULL, ARRAY['osteuropaeisch']),
  ('Moussaka', 'auflauf', false, NULL, ARRAY['mediterran']),
  ('Cremiger Tortellini-Auflauf', 'auflauf', false, NULL, ARRAY['mediterran','familien_klassiker','buntes_buffet']),
  ('Kartoffel-Feta-Auflauf', 'auflauf', true, NULL, ARRAY['mediterran','modern_festlich']),
  ('Griechisches Nudelauflauf mit Feta und Hack', 'auflauf', false, NULL, ARRAY['mediterran']),
  ('Kroketten', 'beilage', true, NULL, ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Salzkartoffeln', 'beilage', true, NULL, ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker','buntes_buffet']),
  ('Spätzle', 'beilage', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Bandnudeln', 'beilage', true, NULL, ARRAY['mediterran','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Tagliatelle', 'beilage', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich']),
  ('Reis', 'beilage', true, NULL, ARRAY['mediterran','modern_festlich','familien_klassiker','osteuropaeisch','buntes_buffet']),
  ('Rosmarinkartoffeln', 'beilage', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich','klassisch_deutsch']),
  ('Polenta-Schnitten', 'beilage', true, NULL, ARRAY['mediterran','modern_festlich']),
  ('Buttergemüse', 'gemuesebeilage', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker','buntes_buffet']),
  ('Sauerkraut', 'gemuesebeilage', true, NULL, ARRAY['klassisch_deutsch','osteuropaeisch','familien_klassiker']),
  ('Rotkohl', 'gemuesebeilage', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker']),
  ('Ratatouille-Gemüse', 'gemuesebeilage', true, NULL, ARRAY['mediterran','modern_festlich','klassisch_elegant']),
  ('Glasierte Möhren', 'gemuesebeilage', true, NULL, ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker','kinderfreundlich','buntes_buffet']),
  ('Honig-Balsamico-Gemüse', 'gemuesebeilage', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich']),
  ('Grüne Bohnen', 'gemuesebeilage', true, NULL, ARRAY['klassisch_deutsch','mediterran','familien_klassiker','buntes_buffet']),
  ('Kartoffelsalat', 'salat', true, NULL, ARRAY['klassisch_deutsch','business_lunch','familien_klassiker','empfang_fingerfood','buntes_buffet']),
  ('Kartoffelsalat im Glas mit Hackbällchen', 'salat', false, NULL, ARRAY['klassisch_deutsch','modern_festlich','business_lunch','empfang_fingerfood']),
  ('Frischer Mixsalat', 'salat', true, NULL, ARRAY['klassisch_deutsch','mediterran','klassisch_elegant','familien_klassiker','business_lunch','empfang_fingerfood','buntes_buffet','fruehstueck_klassisch','fruehstueck_suess_pikant','kinderfreundlich']),
  ('Griechischer Salat', 'salat', true, NULL, ARRAY['mediterran','klassisch_elegant','familien_klassiker','fruehstueck_suess_pikant','business_lunch','empfang_fingerfood']),
  ('Rucolasalat mit Tomate, Zwiebeln, frittiertem Feta', 'salat', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich','empfang_fingerfood']),
  ('Backkartoffelsalat mit Tomate, Mozzarella, Pesto', 'salat', true, NULL, ARRAY['mediterran','modern_festlich','business_lunch']),
  ('Möhrensalat mit Apfel', 'salat', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker','kinderfreundlich','buntes_buffet','fruehstueck_klassisch']),
  ('Kalifornischer Spaghetti-Salat', 'salat', true, NULL, ARRAY['modern_festlich','buntes_buffet','kinderfreundlich']),
  ('Rote-Beete-Salat', 'salat', true, NULL, ARRAY['klassisch_deutsch','osteuropaeisch','familien_klassiker']),
  ('Pesto-Pasta-Salat', 'salat', true, NULL, ARRAY['mediterran','modern_festlich','business_lunch','empfang_fingerfood']),
  ('Mousse au Chocolat', 'dessert', true, NULL, ARRAY['klassisch_elegant','modern_festlich','familien_klassiker','business_lunch','empfang_fingerfood']),
  ('Panna Cotta', 'dessert', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich','business_lunch','empfang_fingerfood']),
  ('Apfelcrumble', 'dessert', true, NULL, ARRAY['klassisch_deutsch','familien_klassiker','fruehstueck_klassisch']),
  ('Bananensplit', 'dessert', true, NULL, ARRAY['buntes_buffet','kinderfreundlich','familien_klassiker','fruehstueck_suess_pikant']),
  ('Tiramisu klassisch', 'dessert', true, NULL, ARRAY['mediterran','klassisch_elegant','familien_klassiker','business_lunch','empfang_fingerfood']),
  ('Tiramisu-Törtchen', 'dessert', true, NULL, ARRAY['mediterran','modern_festlich','klassisch_elegant','empfang_fingerfood']),
  ('Käsekuchen mit Himbeeren im Glas', 'dessert', true, NULL, ARRAY['klassisch_elegant','modern_festlich','familien_klassiker','business_lunch','fruehstueck_suess_pikant']),
  ('Bienenstich im Glas', 'dessert', true, NULL, ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker','fruehstueck_klassisch']),
  ('Schwarzwälderdessert', 'dessert', true, NULL, ARRAY['klassisch_deutsch','klassisch_elegant','familien_klassiker']),
  ('Zitronen-Mousse-Käsekuchen', 'dessert', true, NULL, ARRAY['mediterran','modern_festlich','fruehstueck_suess_pikant']),
  ('Mini Brownie-Chocolate-Mousse-Trifles', 'dessert', true, NULL, ARRAY['modern_festlich','klassisch_elegant','buntes_buffet','empfang_fingerfood','business_lunch']),
  ('Limoncello-Mousse', 'dessert', true, NULL, ARRAY['mediterran','klassisch_elegant','modern_festlich','empfang_fingerfood']),
  ('Himbeer-Oreo-Dessert', 'dessert', true, NULL, ARRAY['modern_festlich','buntes_buffet','kinderfreundlich','fruehstueck_suess_pikant']),
  ('Mama Mia Dessert mit Quarkcreme und Beeren', 'dessert', true, NULL, ARRAY['klassisch_elegant','modern_festlich','mediterran','familien_klassiker','fruehstueck_suess_pikant']),
  ('Frischkäse-Brownies', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Tiramisu-Brownies', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Schokokäsekuchen mit Kirschen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Apfelmarzipankuchen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Streuselkuchen mit Kirschen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Streuselkuchen mit Apfel', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Apfelkuchen mit Pudding', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Kinder-Pingui-Kuchen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Milchschnitte-Kuchen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Zitronenkuchen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Erdbeerschnitten mit Pudding', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Butterkekskuchen', 'kuchen_torte', true, NULL, ARRAY[]::text[]),
  ('Salat Olivje (Russischer Kartoffelsalat)', 'salat', false, NULL, ARRAY['osteuropaeisch']),
  ('Salat Schuba (Matjes und Rote Beete)', 'salat', false, NULL, ARRAY['osteuropaeisch']),
  ('Caesar Salat', 'salat', false, NULL, ARRAY['osteuropaeisch','modern_festlich']),
  ('Tomatensalat mit roten Zwiebeln', 'salat', true, NULL, ARRAY['osteuropaeisch','klassisch_deutsch','russisches_fruehstueck']),
  ('Marinierte Auberginen', 'vorspeise', true, 'platten', ARRAY['osteuropaeisch','mediterran']),
  ('Plow (Reisgericht mit Fleisch)', 'hauptspeise', false, 'fleisch', ARRAY['osteuropaeisch']),
  ('Roter Borschtsch mit Pampuschki', 'vorspeise', false, 'suppen', ARRAY['osteuropaeisch']),
  ('Grüner Borschtsch (mit Sauerampfer)', 'vorspeise', true, 'suppen', ARRAY['osteuropaeisch']),
  ('Rassolnik (Suppe mit sauren Gurken)', 'vorspeise', false, 'suppen', ARRAY['osteuropaeisch']),
  ('Hatschapuri (Fladenbrot mit Käse)', 'vorspeise', true, 'haeppchen', ARRAY['osteuropaeisch']),
  ('Beljaschi (frittierte Teigtaschen mit Hack)', 'vorspeise', false, 'haeppchen', ARRAY['osteuropaeisch']),
  ('Pelmeni (Teigtaschen mit Hackfleisch)', 'hauptspeise', false, 'vegetarisch_oder_pasta', ARRAY['osteuropaeisch']),
  ('Wareniki (Teigtaschen mit Kartoffeln/Quark)', 'hauptspeise', true, 'vegetarisch_oder_pasta', ARRAY['osteuropaeisch']),
  ('Draniki (Reibekuchen) mit Smetana', 'hauptspeise', true, 'vegetarisch_oder_pasta', ARRAY['osteuropaeisch']),
  ('Piroschki mit Kartoffeln/Fleisch/Apfel', 'vorspeise', false, 'haeppchen', ARRAY['osteuropaeisch']),
  ('Nalisniki mit Hühnchen und Pilzen', 'hauptspeise', false, 'fleisch', ARRAY['osteuropaeisch','russisches_fruehstueck']),
  ('Nalisniki mit Quark und Beeren', 'dessert', true, NULL, ARRAY['osteuropaeisch','russisches_fruehstueck']),
  ('Watruschki mit süßem Quark', 'dessert', true, NULL, ARRAY['osteuropaeisch','russisches_fruehstueck']),
  ('Sirniki (Quarkkeulchen)', 'dessert', true, NULL, ARRAY['osteuropaeisch','russisches_fruehstueck']),
  ('Medowik (Honigkuchen)', 'kuchen_torte', true, NULL, ARRAY['osteuropaeisch']),
  ('Napoleon-Torte', 'kuchen_torte', true, NULL, ARRAY['osteuropaeisch']),
  ('Käse-Wurst-Platte mit Gemüse und Brotkorb', 'fruehstueck', false, NULL, ARRAY['fruehstueck_klassisch','fruehstueck_suess_pikant']),
  ('Müsli-Schichtspeise', 'fruehstueck', true, NULL, ARRAY['fruehstueck_klassisch','fruehstueck_suess_pikant']),
  ('Quarkspeise mit Obst', 'fruehstueck', true, NULL, ARRAY['fruehstueck_suess_pikant','russisches_fruehstueck']),
  ('Pancake-Platte mit Obst', 'fruehstueck', true, NULL, ARRAY['fruehstueck_suess_pikant']),
  ('Eierkuchen-Platte (mit Füllung oder pur)', 'fruehstueck', true, NULL, ARRAY['fruehstueck_klassisch','fruehstueck_suess_pikant','russisches_fruehstueck']),
  ('Gebäck-Platte (Hörnchen, Milchbrötchen, Schnecken)', 'fruehstueck', true, NULL, ARRAY['fruehstueck_klassisch','fruehstueck_suess_pikant']),
  ('Brot & Butter', 'inklusiv', true, NULL, ARRAY[]::text[]),
  ('Aufstriche-Variation', 'inklusiv', true, NULL, ARRAY[]::text[]),
  ('Brot, Butter & Aufstriche', 'inklusiv', true, NULL, ARRAY[]::text[]),
  ('Premium-Brot, Aufstriche & Käseplatte', 'inklusiv', true, NULL, ARRAY[]::text[]);

-- ═════════════════════════════════════════════════════════════════
-- 5) SEED-DATEN: THEMEN (24 Stück)
-- ═════════════════════════════════════════════════════════════════
INSERT INTO themen (anlass, slug, label, beschreibung, bild_url, reihenfolge) VALUES
  ('hochzeit', 'klassisch_elegant', 'Klassisch elegant', 'Zeitlose Eleganz mit feinen, traditionellen Speisen', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', 1),
  ('hochzeit', 'mediterran', 'Mediterran', 'Sommerlich-leichte Küche mit italienischem Flair', 'https://images.unsplash.com/photo-1498579485796-98be3abc076e?w=800&q=80', 2),
  ('hochzeit', 'modern_festlich', 'Modern festlich', 'Moderne Klassiker neu interpretiert für besondere Anlässe', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', 3),
  ('hochzeit', 'individuell', 'Individuell', 'Stellen Sie Ihr Menü komplett frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99),
  ('geburtstag', 'klassisch_deutsch', 'Klassisch deutsch', 'Herzhafte Hausmannskost, wie man sie liebt', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', 1),
  ('geburtstag', 'mediterran', 'Mediterran', 'Italienisch-mediterrane Köstlichkeiten', 'https://images.unsplash.com/photo-1498579485796-98be3abc076e?w=800&q=80', 2),
  ('geburtstag', 'buntes_buffet', 'Buntes Buffet', 'Vielfalt für jeden Geschmack — etwas für alle dabei', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', 3),
  ('geburtstag', 'individuell', 'Individuell', 'Stellen Sie Ihr Menü komplett frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99),
  ('einschulung', 'kinderfreundlich', 'Kinderfreundlich', 'Lieblingsgerichte, die Schulkindern schmecken', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800&q=80', 1),
  ('einschulung', 'familien_klassiker', 'Familien-Klassiker', 'Bewährte Lieblinge für die ganze Familie', 'https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80', 2),
  ('einschulung', 'buntes_buffet', 'Buntes Buffet', 'Abwechslungsreich für Klein und Groß', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', 3),
  ('einschulung', 'individuell', 'Individuell', 'Stellen Sie Ihr Menü komplett frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99),
  ('individuell', 'klassisch_deutsch', 'Klassisch deutsch', 'Herzhafte Hausmannskost wie früher', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', 1),
  ('individuell', 'osteuropaeisch', 'Osteuropäisch', 'Pelmeni, Borschtsch, Plow — Spezialitäten aus Osteuropa', 'https://images.unsplash.com/photo-1547928576-b822bc410bdf?w=800&q=80', 2),
  ('individuell', 'mediterran', 'Mediterran', 'Italienisch-mediterrane Vielfalt', 'https://images.unsplash.com/photo-1498579485796-98be3abc076e?w=800&q=80', 3),
  ('individuell', 'individuell', 'Individuell', 'Stellen Sie Ihr Menü komplett frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99),
  ('firmenfeier', 'business_lunch', 'Business-Lunch', 'Belegte Brötchen, Mini-Snacks — schnell, einfach, fürs Büro', 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&q=80', 1),
  ('firmenfeier', 'modern_festlich', 'Mittagsbuffet warm', 'Warmes Mittagessen für die ganze Belegschaft', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', 2),
  ('firmenfeier', 'empfang_fingerfood', 'Empfang & Fingerfood', 'Stehempfang-tauglich mit feinen Häppchen', 'https://images.unsplash.com/photo-1530648672449-81f6c723e2f1?w=800&q=80', 3),
  ('firmenfeier', 'individuell', 'Individuell', 'Stellen Sie Ihr Menü komplett frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99),
  ('fruehstueck', 'fruehstueck_klassisch', 'Klassisch', 'Brötchen, Aufschnitt, Käse — der bewährte Frühstücks-Klassiker', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80', 1),
  ('fruehstueck', 'fruehstueck_suess_pikant', 'Süß & Pikant', 'Pancakes, Quarkspeisen, Eierkuchen und Herzhaftes', 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80', 2),
  ('fruehstueck', 'russisches_fruehstueck', 'Russisches Frühstück', 'Sirniki, Nalisniki, Watruschki — osteuropäische Spezialitäten', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&q=80', 3),
  ('fruehstueck', 'individuell', 'Individuell', 'Stellen Sie Ihr Frühstück frei zusammen', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', 99);

-- ═════════════════════════════════════════════════════════════════
-- 6) SEED-DATEN: ZUSATZWÜNSCHE
-- ═════════════════════════════════════════════════════════════════
INSERT INTO zusatzwuensche (label, beschreibung, hinweis, reihenfolge) VALUES
  ('Kuchen & Torten',
   'Wählen Sie aus unserer Auswahl an hausgemachten Kuchen und Torten (Apfelkuchen, Zitronenkuchen, Brownies, Streuselkuchen, Erdbeerschnitten u.v.m.)',
   'Preis auf Anfrage — je nach Größe und Aufwand',
   1);

-- ═════════════════════════════════════════════════════════════════
-- 7) PAKET-KONFIGURATIONEN + SLOTS + INKLUSIV-GERICHTE
--    72 Konfigurationen (6 Anlässe × 4 Themen × 3 Pakete)
-- ═════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  v_konfig_id uuid;
  v_slot_id   uuid;
  v_inkl_id   uuid;
BEGIN

  -- ─── hochzeit / klassisch_elegant / Klassisch (30 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'klassisch_elegant', 'Klassisch', 30) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / klassisch_elegant / Genuss (44 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'klassisch_elegant', 'Genuss', 44) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / klassisch_elegant / Premium (64 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'klassisch_elegant', 'Premium', 64) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_elegant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / mediterran / Klassisch (30 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'mediterran', 'Klassisch', 30) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / mediterran / Genuss (44 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'mediterran', 'Genuss', 44) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / mediterran / Premium (64 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'mediterran', 'Premium', 64) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / modern_festlich / Klassisch (30 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'modern_festlich', 'Klassisch', 30) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / modern_festlich / Genuss (44 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'modern_festlich', 'Genuss', 44) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / modern_festlich / Premium (64 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'modern_festlich', 'Premium', 64) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / individuell / Klassisch (30 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'individuell', 'Klassisch', 30) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / individuell / Genuss (44 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'individuell', 'Genuss', 44) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── hochzeit / individuell / Premium (64 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('hochzeit', 'individuell', 'Premium', 64) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / klassisch_deutsch / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'klassisch_deutsch', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / klassisch_deutsch / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'klassisch_deutsch', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / klassisch_deutsch / Premium (50 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'klassisch_deutsch', 'Premium', 50) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / mediterran / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'mediterran', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / mediterran / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'mediterran', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / mediterran / Premium (50 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'mediterran', 'Premium', 50) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / buntes_buffet / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'buntes_buffet', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / buntes_buffet / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'buntes_buffet', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / buntes_buffet / Premium (50 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'buntes_buffet', 'Premium', 50) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / individuell / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'individuell', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / individuell / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'individuell', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── geburtstag / individuell / Premium (50 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('geburtstag', 'individuell', 'Premium', 50) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / kinderfreundlich / Klassisch (20 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'kinderfreundlich', 'Klassisch', 20) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / kinderfreundlich / Genuss (28 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'kinderfreundlich', 'Genuss', 28) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / kinderfreundlich / Premium (40 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'kinderfreundlich', 'Premium', 40) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'kinderfreundlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / familien_klassiker / Klassisch (20 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'familien_klassiker', 'Klassisch', 20) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / familien_klassiker / Genuss (28 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'familien_klassiker', 'Genuss', 28) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / familien_klassiker / Premium (40 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'familien_klassiker', 'Premium', 40) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'familien_klassiker' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / buntes_buffet / Klassisch (20 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'buntes_buffet', 'Klassisch', 20) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / buntes_buffet / Genuss (28 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'buntes_buffet', 'Genuss', 28) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / buntes_buffet / Premium (40 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'buntes_buffet', 'Premium', 40) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'buntes_buffet' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / individuell / Klassisch (20 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'individuell', 'Klassisch', 20) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / individuell / Genuss (28 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'individuell', 'Genuss', 28) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── einschulung / individuell / Premium (40 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('einschulung', 'individuell', 'Premium', 40) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / klassisch_deutsch / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'klassisch_deutsch', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / klassisch_deutsch / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'klassisch_deutsch', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / klassisch_deutsch / Premium (48 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'klassisch_deutsch', 'Premium', 48) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'klassisch_deutsch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / osteuropaeisch / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'osteuropaeisch', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / osteuropaeisch / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'osteuropaeisch', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / osteuropaeisch / Premium (48 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'osteuropaeisch', 'Premium', 48) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'osteuropaeisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / mediterran / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'mediterran', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / mediterran / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'mediterran', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / mediterran / Premium (48 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'mediterran', 'Premium', 48) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'mediterran' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / individuell / Klassisch (24 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'individuell', 'Klassisch', 24) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / individuell / Genuss (34 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'individuell', 'Genuss', 34) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── individuell / individuell / Premium (48 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('individuell', 'individuell', 'Premium', 48) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / business_lunch / Klassisch (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'business_lunch', 'Klassisch', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / business_lunch / Genuss (37 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'business_lunch', 'Genuss', 37) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / business_lunch / Premium (54 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'business_lunch', 'Premium', 54) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 7, 7, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'business_lunch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / modern_festlich / Klassisch (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'modern_festlich', 'Klassisch', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / modern_festlich / Genuss (37 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'modern_festlich', 'Genuss', 37) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / modern_festlich / Premium (54 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'modern_festlich', 'Premium', 54) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'modern_festlich' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / empfang_fingerfood / Klassisch (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'empfang_fingerfood', 'Klassisch', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / empfang_fingerfood / Genuss (37 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'empfang_fingerfood', 'Genuss', 37) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / empfang_fingerfood / Premium (54 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'empfang_fingerfood', 'Premium', 54) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Häppchen-Auswahl', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 7, 7, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'empfang_fingerfood' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / individuell / Klassisch (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'individuell', 'Klassisch', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeise', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgericht', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilage', 'beilage', ARRAY['beilage'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 4) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / individuell / Genuss (37 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'individuell', 'Genuss', 37) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 3, 3, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Dessert', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── firmenfeier / individuell / Premium (54 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('firmenfeier', 'individuell', 'Premium', 54) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Vorspeisen', 'vorspeise', ARRAY['vorspeise'], 'wahl_mehrfach', 5, 5, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['vorspeise']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Hauptgerichte', 'hauptspeise', ARRAY['hauptspeise','auflauf'], 'wahl_mehrfach', 3, 3, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['hauptspeise','auflauf']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Beilagen', 'beilage', ARRAY['beilage','gemuesebeilage'], 'wahl_mehrfach', 2, 2, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['beilage','gemuesebeilage']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salat', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 3) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Desserts', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 4) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 5) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_klassisch / Klassisch (18 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_klassisch', 'Klassisch', 18) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatte', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_einzel', 1, 1, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 1) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_klassisch / Genuss (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_klassisch', 'Genuss', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_klassisch / Premium (38 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_klassisch', 'Premium', 38) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'fruehstueck_klassisch' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_suess_pikant / Klassisch (18 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_suess_pikant', 'Klassisch', 18) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatte', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_einzel', 1, 1, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 1) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_suess_pikant / Genuss (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_suess_pikant', 'Genuss', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / fruehstueck_suess_pikant / Premium (38 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'fruehstueck_suess_pikant', 'Premium', 38) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'fruehstueck_suess_pikant' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / russisches_fruehstueck / Klassisch (18 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'russisches_fruehstueck', 'Klassisch', 18) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatte', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_einzel', 1, 1, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 1) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / russisches_fruehstueck / Genuss (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'russisches_fruehstueck', 'Genuss', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / russisches_fruehstueck / Premium (38 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'russisches_fruehstueck', 'Premium', 38) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND 'russisches_fruehstueck' = ANY(themen_tags) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / individuell / Klassisch (18 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'individuell', 'Klassisch', 18) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatte', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_einzel', 1, 1, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 1) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot & Butter' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / individuell / Genuss (26 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'individuell', 'Genuss', 26) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_einzel', 1, 1, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 2) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Brot, Butter & Aufstriche' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

  -- ─── fruehstueck / individuell / Premium (38 €) ───
  INSERT INTO paket_konfiguration (anlass, theme_slug, paket, preis_pro_person) VALUES ('fruehstueck', 'individuell', 'Premium', 38) RETURNING id INTO v_konfig_id;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Frühstücksplatten', 'fruehstueck', ARRAY['fruehstueck'], 'wahl_mehrfach', 2, 2, 0) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['fruehstueck']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Süßes', 'dessert', ARRAY['dessert'], 'wahl_mehrfach', 2, 2, 1) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['dessert']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Salate', 'salat', ARRAY['salat'], 'wahl_einzel', 1, 1, 2) RETURNING id INTO v_slot_id;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) SELECT v_slot_id, id, row_number() OVER (ORDER BY name) - 1 FROM gerichte WHERE kategorie = ANY(ARRAY['salat']) AND aktiv = true;
  INSERT INTO paket_slots (paket_konfiguration_id, label, kategorie, kategorien, typ, min_auswahl, max_auswahl, reihenfolge) VALUES (v_konfig_id, 'Inklusive', 'inklusiv', ARRAY['inklusiv'], 'fix', 1, 1, 3) RETURNING id INTO v_slot_id;
  SELECT id INTO v_inkl_id FROM gerichte WHERE name = 'Premium-Brot, Aufstriche & Käseplatte' LIMIT 1;
  INSERT INTO slot_gerichte (slot_id, gericht_id, reihenfolge) VALUES (v_slot_id, v_inkl_id, 0);

END $seed$;

-- ─────────────────────────────────────────────────────────────────
-- 8) ZUSAMMENFASSUNG
-- ─────────────────────────────────────────────────────────────────
-- Erwartete Counts:
--   gerichte             : 146
--   themen               :  24
--   paket_konfiguration  :  72   (6 Anlässe × 4 Themen × 3 Pakete)
--   paket_slots          : ~370  (5-6 Slots × 72 Konfig)
--   slot_gerichte        : ~3500 (variiert je Thema)
--   lieferzonen          :   5
--   zusatzwuensche       :   1

COMMIT;

-- Sanity Checks (optional manuell ausführen):
-- SELECT count(*) FROM gerichte;
-- SELECT count(*) FROM themen;
-- SELECT count(*) FROM paket_konfiguration;
-- SELECT count(*) FROM paket_slots;
-- SELECT count(*) FROM slot_gerichte;
