-- Titel: GEN-9 Bilder – Essensarten und Stile zeigen WebP statt JPG (46 Bilder, zusammen 27 MB → 6 MB)
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_10_fingerfood_18_24_30.sql.
-- VORHER müssen die WebP-Dateien im Speicher liegen: Victor lädt den Inhalt von
-- C:\Dev\bilder-supabase-webp\Themenbilder\ in den Storage-Ordner "Themenbilder" des Projekts hoch, auf das die
-- Adressen zeigen (jypugzjdoluvmawkwewl, das echte Projekt). Die JPG-Dateien bleiben dort liegen; der bisherige
-- Generator und das CRM auf main zeigen weiter auf sie.
--
-- Was passiert: In essensarten.bild_url und stile.bild_url, bild_url_1, bild_url_2, bild_url_3 wird bei genau
-- diesen 46 Adressen die Endung .jpg zu .webp. Andere Adressen (etwa im CRM neu hochgeladene Bilder,
-- Unsplash) bleiben unverändert und werden am Ende nur gezählt.
-- Was NICHT passiert: Keine Anfrage, kein Preis, keine alte Tabelle (themen, paket_konfiguration) wird angefasst.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

create temporary table _webp (url text primary key) on commit drop;
insert into _webp (url) values
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/individuell-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/individuell-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Individuell-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/individuell-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Empfang%20%26%20Fingerfood-Thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/empfang_fingerfood-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/empfang_fingerfood-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Empfang%20%26%20Fingerfood-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/buntes_buffet-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/buntes_buffet-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/buntes_buffet-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/buntes_buffet-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20deutsch-Thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20deutsch-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20deutsch-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20deutsch-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20elegant-Thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20elegant-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20elegant-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch%20elegant-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/modern_festlich-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Modern%20festlich-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Modern%20festlich-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/modern_festlich-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Kinderfreundlich-Thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/kinderfreundlich-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Kinderfreundlich-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/kinderfreundlich-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/fruehstueck_brunch-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Klassisch-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/osteuropaeisch-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/osteuropaeisch-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/osteuropaeisch-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/osteuropaeisch-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/fruehstueck_suess_pikant-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/fruehstueck_suess_pikant-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Suess%20%26%20Pikant-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/fruehstueck_suess_pikant-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/mediterran-thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/mediterran-1.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Mediterran-2.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Mediterran-3.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Private_Feier-Thema.jpg'),
    ('https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Firmenfeier-Thema.jpg');

update public.essensarten set bild_url = regexp_replace(bild_url, '\.jpe?g$', '.webp', 'i')
where bild_url in (select url from _webp);

update public.stile set bild_url = regexp_replace(bild_url, '\.jpe?g$', '.webp', 'i')
where bild_url in (select url from _webp);

update public.stile set bild_url_1 = regexp_replace(bild_url_1, '\.jpe?g$', '.webp', 'i')
where bild_url_1 in (select url from _webp);

update public.stile set bild_url_2 = regexp_replace(bild_url_2, '\.jpe?g$', '.webp', 'i')
where bild_url_2 in (select url from _webp);

update public.stile set bild_url_3 = regexp_replace(bild_url_3, '\.jpe?g$', '.webp', 'i')
where bild_url_3 in (select url from _webp);

do $$
declare
  rest integer;
begin
  rest := (select count(*) from public.essensarten where bild_url ~* '\.jpe?g$')
    + (select count(*) from public.stile where bild_url ~* '\.jpe?g$')
    + (select count(*) from public.stile where bild_url_1 ~* '\.jpe?g$')
    + (select count(*) from public.stile where bild_url_2 ~* '\.jpe?g$')
    + (select count(*) from public.stile where bild_url_3 ~* '\.jpe?g$');
  raise notice 'Noch % Bildadressen mit .jpg in essensarten und stile (nicht in der Liste, bleiben unverändert).', rest;
end;
$$;

commit;
