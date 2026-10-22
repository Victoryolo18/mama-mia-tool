-- Titel: WEB-25 Kontaktformular der Website legt eine Anfrage an; Mengengrenze für Mails
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_13_ernaehrung_auf_anfrage.sql.
-- Danach die Edge Function send-email neu ausrollen (sie nutzt die neue Tabelle mail_versand).
--
-- Was passiert:
--   1. Unangemeldete dürfen weiterhin nur NEUE Anfragen anlegen. Erlaubt ist jetzt zusätzlich die Quelle
--      "website_form" (Kontaktformular), aber nur ohne Angebot und ohne Preise. So kann niemand über das
--      Formular eine Anfrage mit erfundenem Preis einschmuggeln.
--   2. Neue Tabelle mail_versand: Die Funktion send-email trägt jede verschickte Mail ein (Zeit, Art,
--      Empfänger als Prüfsumme, nicht im Klartext) und zählt vor dem Versand. So hat jede Mail eine Grenze
--      (Leitplanken, Abschnitt 5). Kundendaten stehen dort nicht.
-- Was NICHT passiert: keine bestehende Anfrage, kein Preis, kein Katalog ändert sich.
-- Wer darf was:
--   requests: Unangemeldete legen an (generator wie bisher, website_form ohne Preise). Lesen, Ändern, Löschen
--             bleibt allein der eingeloggten CRM-Nutzerin (unverändert).
--   mail_versand: RLS an, keine Regel für anon oder authenticated. Nur die Edge Function (service_role) liest
--             und schreibt. Jana braucht die Tabelle nicht.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

drop policy if exists "Anon insert requests" on public.requests;
create policy "Anon insert requests" on public.requests
  for insert to anon
  with check (
    status = 'neu'
    and (
      source = 'generator'
      or (
        source = 'website_form'
        and angebot_snapshot is null
        -- leer oder 0: so greift die Regel auch, falls eine Spalte eine Vorgabe hat
        and coalesce(gesamtpreis, 0) = 0
        and coalesce(speisenpreis, 0) = 0
        and coalesce(preis_pro_person, 0) = 0
        and coalesce(lieferzuschlag, 0) = 0
      )
    )
  );

create table if not exists public.mail_versand (
  id         bigint generated always as identity primary key,
  erstellt   timestamptz not null default now(),
  art        text not null,
  empfaenger text not null  -- SHA-256 der kleingeschriebenen Adresse, nie die Adresse selbst
);
create index if not exists mail_versand_erstellt on public.mail_versand (erstellt);
alter table public.mail_versand enable row level security;
revoke all on public.mail_versand from anon, authenticated;

commit;
