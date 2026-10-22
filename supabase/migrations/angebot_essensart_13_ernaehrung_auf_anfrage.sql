-- Titel: GEN-14 Vegan und glutenfrei auf Anfrage, doppeltes Gericht, fehlendes Themenbild
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_12_gerichte_vegan.sql.
-- WICHTIG: Der Generator auf dem Zweig gen-1 und die Website-Vorschau fragen die zwei neuen Spalten ab.
-- Bis diese Migration im Test-Projekt gelaufen ist, laden die Vorschauen das Menü nicht.
--
-- Was passiert:
--   1. Zwei neue Häkchen an gerichte: vegan_moeglich und glutenfrei_moeglich (ja/nein, Vorgabe nein).
--      Sie heißen "auf Anfrage möglich": Jana kann das Gericht so kochen, es ist aber mehr Aufwand und kann
--      einen Aufpreis haben. Gesetzt wird hier keines; das entscheidet Jana im CRM (Menü → Gerichte).
--   2. "Griechischer Nudelauflauf mit Feta und Hack" steht zweimal im Katalog, gleiche Gruppe, gleicher Stil.
--      Die Kopie ohne Unterkategorie wird abgeschaltet (aktiv = false), nicht gelöscht. Alte Anfragen behalten sie.
--   3. Das alte Thema "Private Feier" zeigt auf Themenbilder/private_feier-thema.jpg. Die Datei heißt
--      Private_Feier-Thema (Groß- und Kleinschreibung zählt), deshalb fehlte das Bild. Neu: die WebP-Datei.
--      Betrifft nur den alten Generator, der heute noch live ist.
-- Was NICHT passiert: kein Preis, keine Anfrage, kein anderes Gericht ändert sich.
-- Wer darf was: unverändert. gerichte und themen haben RLS; der Generator liest die neuen Spalten wie die übrigen.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

alter table public.gerichte add column if not exists vegan_moeglich boolean not null default false;
alter table public.gerichte add column if not exists glutenfrei_moeglich boolean not null default false;

update public.gerichte g set aktiv = false
where g.name = 'Griechischer Nudelauflauf mit Feta und Hack'
  and g.unterkategorie is null
  and g.aktiv
  and exists (
    select 1 from public.gerichte d
    where d.name = g.name and d.id <> g.id and d.aktiv and d.unterkategorie = 'auflauf'
  );

do $$
begin
  if to_regclass('public.themen') is not null then
    update public.themen
    set bild_url = 'https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Private_Feier-Thema.webp'
    where slug = 'private_feier'
      and bild_url like '%/Themenbilder/private_feier-thema.jpg';
  end if;
end;
$$;

do $$
declare
  doppelt integer;
begin
  select count(*) into doppelt from (
    select lower(trim(name)) from public.gerichte where aktiv group by 1 having count(*) > 1
  ) x;
  raise notice 'Aktive Gerichte mit doppeltem Namen: % (erwartet 0).', doppelt;
end;
$$;

commit;
