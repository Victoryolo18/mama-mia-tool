-- Titel: Kontaktformular mit Eckdaten, Freitext getrennt von den Extras, Geschirr & Besteck als Extra
-- Mama Mia · Angebot nach Essensart · Teil 23
--
-- Zuerst im TEST-Projekt (mama-mia-test), dann im echten Projekt. Im echten Projekt VOR dem Merge der PRs
-- in Generator, CRM und Website: Alle drei schreiben oder lesen die neuen Spalten.
--
-- Was passiert:
--   1. Neue Spalten in requests:
--        nachricht          freier Text des Kunden (Kontaktformular, Anmerkungen im Generator). Bisher stand er
--                           in zusatzwuensche; das CRM machte aus jeder Zeile ein Extra mit Preisfeld.
--        budget_pro_person  Budget, das der Kunde im Kontaktformular nennt (kein Preis, nur ein Hinweis für Jana).
--        event_art          privat oder geschaeftlich.
--   2. Bestehende Anfragen aus dem Kontaktformular: Ihr Text wandert von zusatzwuensche nach nachricht.
--      Anfragen aus dem Generator bleiben, wie sie sind (dort stehen Extras und Text gemischt).
--   3. Neues Extra „Geschirr & Besteck“ im Katalog (ohne Aufpreis, Victor 14.10.2026). Es erscheint im
--      Kontaktformular und im Generator unter Extras.
-- Wer darf was: unverändert. Unangemeldete legen Anfragen an (website_form weiter nur ohne Preise, Migration 14);
-- die neuen Spalten sind durch Prüfregeln begrenzt. Den Katalog lesen alle, schreiben nur Angemeldete.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

-- ───────────────────────── 1. Spalten ─────────────────────────

alter table public.requests
  add column if not exists nachricht text,
  add column if not exists budget_pro_person numeric(10,2),
  add column if not exists event_art text;

alter table public.requests drop constraint if exists requests_nachricht_laenge;
alter table public.requests add constraint requests_nachricht_laenge
  check (nachricht is null or char_length(nachricht) <= 5000);

alter table public.requests drop constraint if exists requests_budget_pro_person_check;
alter table public.requests add constraint requests_budget_pro_person_check
  check (budget_pro_person is null or (budget_pro_person > 0 and budget_pro_person <= 1000));

alter table public.requests drop constraint if exists requests_event_art_check;
alter table public.requests add constraint requests_event_art_check
  check (event_art is null or event_art in ('privat', 'geschaeftlich'));

-- ───────────────────────── 2. Bestehende Kontaktanfragen ─────────────────────────

update public.requests
set nachricht = zusatzwuensche,
    zusatzwuensche = null
where source = 'website_form'
  and nachricht is null
  and zusatzwuensche is not null;

-- ───────────────────────── 3. Geschirr & Besteck ─────────────────────────

insert into public.zusatzwuensche (label, label_en, label_ru, beschreibung, beschreibung_en, beschreibung_ru, reihenfolge)
select 'Geschirr & Besteck', 'Crockery & cutlery', 'Посуда и приборы',
       'Geschirr und Besteck für Ihre Gäste, ohne Aufpreis',
       'Crockery and cutlery for your guests, at no extra cost',
       'Посуда и приборы для ваших гостей без доплаты',
       coalesce((select max(reihenfolge) from public.zusatzwuensche), 0) + 1
where not exists (select 1 from public.zusatzwuensche where label = 'Geschirr & Besteck');

commit;

-- Prüfung: drei neue Spalten, keine Kontaktanfrage mehr mit Text in zusatzwuensche, Geschirr im Katalog.
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'requests' and column_name in ('nachricht', 'budget_pro_person', 'event_art');
select count(*) as kontaktanfragen_mit_text_in_extras from public.requests where source = 'website_form' and zusatzwuensche is not null;
select label, label_en, label_ru, reihenfolge, aktiv from public.zusatzwuensche order by reihenfolge;
