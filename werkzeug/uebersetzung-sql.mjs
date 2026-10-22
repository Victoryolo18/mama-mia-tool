// Schreibt aus supabase/daten/katalog-uebersetzung.json die Migration mehrsprachig_1 (I18N-2).
// Aufruf: node werkzeug/uebersetzung-sql.mjs > supabase/migrations/mehrsprachig_1_katalog_und_sprache.sql
import fs from 'node:fs';

const u = JSON.parse(fs.readFileSync(new URL('../supabase/daten/katalog-uebersetzung.json', import.meta.url), 'utf8'));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const zeilen = [];
const set = (tabelle, spalte, wo, werte) => {
  for (const [de, [en, ru]] of Object.entries(werte)) {
    zeilen.push(`update public.${tabelle} set ${spalte}_en = ${q(en)}, ${spalte}_ru = ${q(ru)} where ${wo} = ${q(de)};`);
  }
};

set('essensarten', 'label', 'label', u.essensarten);
set('pakete', 'name', 'name', u.pakete);
set('pakete', 'untertitel', 'untertitel', u.untertitel);
set('pakete', 'hinweis', 'hinweis', u.hinweise);
for (const [de, [en, ru]] of Object.entries(u.leistungen)) {
  zeilen.push(`update public.pakete set leistungen_en = array[${q(en)}], leistungen_ru = array[${q(ru)}] where leistungen = array[${q(de)}];`);
}
for (const [slug, [[en, ru], [een, eru]]] of Object.entries(u.gruppen)) {
  zeilen.push(`update public.gruppen set label_en = ${q(en)}, label_ru = ${q(ru)}, label_einzahl_en = ${q(een)}, label_einzahl_ru = ${q(eru)} where slug = ${q(slug)};`);
}
set('paket_gruppen', 'label', 'label', u.bloecke);
for (const [slug, [[en, ru], [ben, bru]]] of Object.entries(u.stile)) {
  zeilen.push(`update public.stile set label_en = ${q(en)}, label_ru = ${q(ru)}, beschreibung_en = ${q(ben)}, beschreibung_ru = ${q(bru)} where slug = ${q(slug)};`);
}
set('gerichte', 'name', 'name', u.gerichte);

const spalten = {
  essensarten: ['label', 'beschreibung'],
  pakete: ['name', 'untertitel', 'hinweis'],
  gruppen: ['label', 'label_einzahl'],
  paket_gruppen: ['label'],
  stile: ['label', 'beschreibung'],
  gerichte: ['name'],
};
const neueSpalten = Object.entries(spalten).map(([t, s]) =>
  `alter table public.${t}\n` + s.flatMap((c) => [`  add column if not exists ${c}_en text`, `  add column if not exists ${c}_ru text`]).join(',\n') +
  (t === 'pakete' ? `,\n  add column if not exists leistungen_en text[] not null default '{}',\n  add column if not exists leistungen_ru text[] not null default '{}'` : '') + ';').join('\n\n');

process.stdout.write(`-- Titel: I18N-2 Katalog auf Englisch und Russisch, Sprache der Anfrage
-- Mama Mia · Mehrsprachig · Teil 1
--
-- 1. Neben jedem Text, den Kunden im Generator und auf der Website sehen, je eine Spalte _en und _ru.
--    Leer heißt: es erscheint der deutsche Text. Gefüllt aus supabase/daten/katalog-uebersetzung.json
--    (erzeugt mit werkzeug/uebersetzung-sql.mjs, nicht von Hand ändern).
-- 2. requests.sprache: in welcher Sprache der Kunde angefragt hat (de, en, ru; Vorgabe de).
--    Die Regel für anonyme Anfragen bleibt; der Check lässt nur diese drei Werte zu.
-- 3. Zwei deutsche Stil-Beschreibungen ohne Gedankenstrich.
--
-- Wer darf was: Die neuen Spalten erben die Regeln ihrer Tabelle (Kataloge lesen alle, schreiben nur angemeldet).
-- Bestehende Anfragen bekommen 'de'. Läuft als Ganzes oder gar nicht. Am Ende eine Übersicht, was gefüllt ist.

begin;

-- ───────────────────────── 1. Neue Spalten ─────────────────────────
${neueSpalten}

-- ───────────────────────── 2. Sprache der Anfrage ─────────────────────────
alter table public.requests
  add column if not exists sprache text not null default 'de';
alter table public.requests drop constraint if exists requests_sprache_check;
alter table public.requests
  add constraint requests_sprache_check check (sprache in ('de', 'en', 'ru'));
comment on column public.requests.sprache is 'Sprache, in der der Kunde angefragt hat (de, en, ru). Mails an Jana bleiben deutsch.';

-- ───────────────────────── 3. Gedankenstriche ─────────────────────────
update public.stile set beschreibung = 'Pelmeni, Borschtsch, Plow: Spezialitäten aus Osteuropa' where slug = 'osteuropaeisch';
update public.stile set beschreibung = 'Vielfalt für jeden Geschmack, etwas für alle dabei' where slug = 'buntes_buffet';

-- ───────────────────────── 4. Übersetzungen ─────────────────────────
${zeilen.join('\n')}

commit;

-- Übersicht: aktive Einträge ohne russischen Text (sollte überall 0 sein; sonst fehlt eine Übersetzung).
select 'gerichte' as tabelle, count(*) filter (where name_ru is null) as ohne_ru, count(*) as aktiv from public.gerichte where aktiv
union all select 'pakete', count(*) filter (where name_ru is null), count(*) from public.pakete where aktiv
union all select 'stile', count(*) filter (where label_ru is null), count(*) from public.stile where aktiv
union all select 'paket_gruppen', count(*) filter (where label_ru is null), count(*) from public.paket_gruppen where aktiv
union all select 'gruppen', count(*) filter (where label_ru is null), count(*) from public.gruppen
union all select 'essensarten', count(*) filter (where label_ru is null), count(*) from public.essensarten where aktiv;
`);
