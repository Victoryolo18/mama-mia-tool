-- Titel: Google-Bewertung im Abzeichen der Website bleibt ohne Handarbeit aktuell
--
-- Was passiert:
--   1. Neue Tabelle google_bewertung mit genau einer Zeile: Note und Anzahl der Google-Bewertungen.
--      Startwert wie bisher auf der Website: 5,0 aus 55 Bewertungen.
--   2. Neue Funktion melde_google_bewertung(note, anzahl): Der Browser eines Besuchers, der im Banner den
--      Google-Bewertungen zugestimmt hat, holt die Live-Zahl von Elfsight und meldet sie hierher. Die Website baut
--      jeden Morgen neu und schreibt den Stand dieser Tabelle fest ins Abzeichen, für alle Besucher.
--      Gemeldet werden nur die zwei Zahlen, keine Daten über den Besucher.
-- Was NICHT passiert: keine bestehende Tabelle, kein Preis, keine Anfrage ändert sich.
-- Wer darf was:
--   Unangemeldete lesen die Zeile (die Website beim Bauen). Direkt ändern, anlegen oder löschen darf sie niemand.
--   Ändern geht nur über melde_google_bewertung, und die nimmt nur glaubwürdige Werte an: mehr Bewertungen als
--   gespeichert, höchstens 2 neue je Tag, Note zwischen 1 und 5 und höchstens 0,2 neben der bisherigen.
--   Wer die Funktion missbraucht, kann die Anzahl also um höchstens 2 am Tag erhöhen.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr (vorhandene Werte bleiben).

begin;

create table if not exists public.google_bewertung (
  id                 smallint primary key default 1 check (id = 1),
  note               numeric(2, 1) not null check (note between 1 and 5),
  anzahl             integer not null check (anzahl between 1 and 100000),
  -- Anzahl zu Beginn des Tages (Zeit Berlin): Grenze für neue Bewertungen je Tag.
  tag                date not null default (now() at time zone 'Europe/Berlin')::date,
  anzahl_tagesbeginn integer not null,
  geaendert_am       timestamptz not null default now()
);

insert into public.google_bewertung (id, note, anzahl, anzahl_tagesbeginn) values (1, 5.0, 55, 55) on conflict (id) do nothing;

alter table public.google_bewertung enable row level security;

drop policy if exists google_bewertung_lesen on public.google_bewertung;
create policy google_bewertung_lesen on public.google_bewertung for select to anon, authenticated using (true);

revoke all on public.google_bewertung from anon, authenticated;
grant select on public.google_bewertung to anon, authenticated;

create or replace function public.melde_google_bewertung(p_note numeric, p_anzahl integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zeile public.google_bewertung%rowtype;
  v_heute date := (now() at time zone 'Europe/Berlin')::date;
  v_basis integer;
begin
  select * into v_zeile from public.google_bewertung where id = 1 for update;
  if not found or p_note is null or p_anzahl is null then
    return;
  end if;
  v_basis := case when v_zeile.tag = v_heute then v_zeile.anzahl_tagesbeginn else v_zeile.anzahl end;
  -- Nur mehr Bewertungen als gespeichert, höchstens 2 neue je Tag.
  if p_anzahl <= v_zeile.anzahl or p_anzahl > v_basis + 2 then
    return;
  end if;
  -- Note zwischen 1 und 5 und höchstens 0,2 neben der bisherigen.
  if p_note < 1 or p_note > 5 or abs(round(p_note, 1) - v_zeile.note) > 0.2 then
    return;
  end if;
  update public.google_bewertung
     set note = round(p_note, 1), anzahl = p_anzahl, tag = v_heute, anzahl_tagesbeginn = v_basis, geaendert_am = now()
   where id = 1;
end;
$$;

revoke all on function public.melde_google_bewertung(numeric, integer) from public, anon, authenticated;
grant execute on function public.melde_google_bewertung(numeric, integer) to anon, authenticated;

commit;
