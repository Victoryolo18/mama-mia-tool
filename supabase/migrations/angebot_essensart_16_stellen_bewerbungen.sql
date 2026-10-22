-- Titel: WEB-30 Mitarbeiten: Stellen, die Jana im CRM pflegt, und Kurzbewerbungen von der Website
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_15_janas_auswahl_vegan_glutenfrei.sql.
-- Vorhaben: mama-mia-website/features/1_geplant/mitarbeiten.md
--
-- Was passiert:
--   1. Neue Tabelle stellen: Jana schreibt Stellen nur über feste Felder aus (Art, Bereich, Tage, ab wann,
--      Zeitraum, kurzer eigener Text). Die Website setzt daraus immer gleich aufgebaute Karten zusammen.
--   2. Neue Tabelle bewerbungen: Kurzbewerbungen von der Seite /mitarbeiten, ohne Dateien.
--   3. Bewerbungen werden nach 6 Monaten gelöscht: täglich um 3:15 Uhr über pg_cron (im Gratis-Tarif enthalten).
-- Was NICHT passiert: keine bestehende Tabelle, kein Preis, keine Anfrage ändert sich.
-- Wer darf was:
--   stellen:      Unangemeldete lesen nur eingeschaltete Stellen (die Website beim Bauen). Anlegen, ändern,
--                 löschen nur die eingeloggte CRM-Nutzerin.
--   bewerbungen:  Unangemeldete dürfen nur eine neue Bewerbung anlegen, nicht lesen (auch nicht die eigene).
--                 Lesen, als gelesen markieren, löschen nur die eingeloggte CRM-Nutzerin.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

create extension if not exists pg_cron;

create table if not exists public.stellen (
  id             uuid primary key default gen_random_uuid(),
  erstellt       timestamptz not null default now(),
  art            text not null check (art in ('vollzeit', 'teilzeit', 'minijob', 'aushilfe', 'saison')),
  bereich        text not null check (bereich in ('kueche', 'service', 'fahrer', 'spuelen', 'allgemein')),
  tage           text[] not null default '{}' check (tage <@ array['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so']),
  nach_absprache boolean not null default false,
  ab_wann        date,
  zeitraum       text check (char_length(zeitraum) <= 80),
  text           text check (char_length(text) <= 300),
  aktiv          boolean not null default true,
  reihenfolge    integer not null default 0
);

create table if not exists public.bewerbungen (
  id          uuid primary key default gen_random_uuid(),
  erstellt    timestamptz not null default now(),
  -- Die Stelle kann später gelöscht werden; stelle_text hält fest, worauf sich jemand beworben hat.
  stelle_id   uuid references public.stellen (id) on delete set null,
  stelle_text text not null check (char_length(stelle_text) between 1 and 120),
  name        text not null check (char_length(name) between 2 and 80),
  telefon     text check (char_length(telefon) <= 40),
  email       text check (char_length(email) <= 150),
  verfuegbar  text check (char_length(verfuegbar) <= 300),
  nachricht   text check (char_length(nachricht) <= 2000),
  gelesen     boolean not null default false,
  check (coalesce(telefon, '') <> '' or coalesce(email, '') <> '')
);
create index if not exists bewerbungen_erstellt on public.bewerbungen (erstellt);

alter table public.stellen     enable row level security;
alter table public.bewerbungen enable row level security;

drop policy if exists stellen_anon_lesen on public.stellen;
drop policy if exists stellen_crm on public.stellen;
drop policy if exists bewerbungen_anon_anlegen on public.bewerbungen;
drop policy if exists bewerbungen_crm on public.bewerbungen;

create policy stellen_anon_lesen on public.stellen for select to anon using (aktiv);
create policy stellen_crm        on public.stellen for all to authenticated using (true) with check (true);
create policy bewerbungen_anon_anlegen on public.bewerbungen for insert to anon with check (gelesen = false);
create policy bewerbungen_crm          on public.bewerbungen for all to authenticated using (true) with check (true);

revoke all on public.stellen, public.bewerbungen from anon;
grant select on public.stellen to anon;
grant insert on public.bewerbungen to anon;
grant select, insert, update, delete on public.stellen, public.bewerbungen to authenticated;

-- Legt den Auftrag an oder ersetzt ihn (gleicher Name).
select cron.schedule(
  'bewerbungen-nach-6-monaten-loeschen',
  '15 3 * * *',
  $$delete from public.bewerbungen where erstellt < now() - interval '6 months'$$
);

commit;
