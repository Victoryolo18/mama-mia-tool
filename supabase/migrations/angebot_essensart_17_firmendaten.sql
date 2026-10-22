-- Titel: GEN-19 Firmendaten an der Anfrage, damit der Firmen-Vorteil direkt im Preis abgezogen werden kann
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_16_stellen_bewerbungen.sql.
--
-- Was passiert:
--   1. Drei neue, leere Spalten an requests: Firmenname, Rechnungsadresse, Umsatzsteuer-ID.
--      Der Generator füllt sie bei Firmenanlässen; ohne Firmendaten gibt es keinen Firmen-Vorteil.
--      Die Längengrenzen sind dieselben wie im Generator (FIRMA_GRENZEN in src/angebot/firmenVorteil.js).
--   2. Die Preisprüfung (Trigger aus Migration 3, zuletzt 6) kennt den Firmen-Vorteil: Ist er abgezogen und
--      stimmen alle Bedingungen, gilt der Preis als "stimmt". Hat jemand ihn ohne Berechtigung abgezogen
--      (etwa am Samstag oder ohne Firma), steht die Anfrage im CRM als "weicht_ab". Sonst unverändert
--      gegenüber Migration 6.
-- Was NICHT passiert: keine bestehende Anfrage, kein Preis, kein Katalog ändert sich.
-- Wer darf was (unverändert):
--   Unangemeldete legen nur neue Anfragen an (Regel "Anon insert requests" aus Migration 14); die neuen Spalten
--   gehören dazu wie Name und Telefon. Lesen, Ändern, Löschen bleibt allein der eingeloggten CRM-Nutzerin.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

alter table public.requests
  add column if not exists firma_name    text,
  add column if not exists firma_adresse text,
  add column if not exists firma_ust_id  text;

alter table public.requests drop constraint if exists requests_firma_laengen;
alter table public.requests add constraint requests_firma_laengen check (
  coalesce(char_length(firma_name), 0) <= 120
  and coalesce(char_length(firma_adresse), 0) <= 200
  and coalesce(char_length(firma_ust_id), 0) <= 20
);

create or replace function public.requests_preis_nachrechnen()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  s          jsonb := new.angebot_snapshot;
  v_paket    public.pakete%rowtype;
  v_block    jsonb;
  v_pg       public.paket_gruppen%rowtype;
  v_gericht  jsonb;
  v_preis    numeric;
  v_anzahl   integer;
  v_plus     boolean;
  v_aufcent  bigint := 0;
  v_cent     bigint;
  v_passt    boolean := true;
  v_bewerten boolean := (new.source = 'generator');
begin
  -- Diese beiden Spalten setzt nur die Datenbank, egal was der Absender mitschickt.
  new.preis_nachgerechnet := null;
  new.preis_pruefung := null;
  if s is null then
    return new;
  end if;

  begin
    select * into v_paket from public.pakete
    where id = (s->'paket'->>'id')::uuid and essensart = new.essensart and aktiv;
    if not found then
      if v_bewerten then new.preis_pruefung := 'nicht_pruefbar'; end if;
      return new;
    end if;

    for v_block in select * from jsonb_array_elements(s->'bloecke') loop
      select * into v_pg from public.paket_gruppen
      where id = (v_block->>'id')::uuid and paket_id = v_paket.id and aktiv;
      if not found then
        if v_bewerten then new.preis_pruefung := 'nicht_pruefbar'; end if;
        return new;
      end if;

      v_plus := coalesce((v_block->>'plus_eins')::boolean, false);
      v_anzahl := jsonb_array_length(coalesce(v_block->'gerichte', '[]'::jsonb));

      if v_plus then
        select aufpreis_plus_eins into v_preis from public.gruppen where slug = v_pg.gruppen[1];
        if v_pg.typ <> 'wahl' or v_preis is null then
          if v_bewerten then new.preis_pruefung := 'nicht_pruefbar'; end if;
          return new;
        end if;
        v_aufcent := v_aufcent + round(v_preis * 100);
      end if;

      if v_pg.typ = 'wahl' then
        if v_anzahl < v_pg.min_auswahl + (case when v_plus then 1 else 0 end)
           or v_anzahl > v_pg.max_auswahl + (case when v_plus then 1 else 0 end) then
          v_passt := false;
        end if;
        if exists (
          select 1 from jsonb_array_elements(v_block->'gerichte') e
          where not exists (
            select 1 from public.gericht_gruppen gg
            where gg.gericht_id = (e->>'id')::uuid and gg.gruppe = any (v_pg.gruppen)
          )
        ) then
          v_passt := false;
        end if;
      end if;

      if v_pg.typ = 'zusatz' then
        if v_pg.max_auswahl is not null and v_anzahl > v_pg.max_auswahl then
          v_passt := false;
        end if;
        for v_gericht in select * from jsonb_array_elements(v_block->'gerichte') loop
          -- Eigener Aufpreis des Gerichts, sonst der seiner Gruppe (die erste des Blocks, in der es liegt).
          select coalesce(
                   g.aufpreis_pro_person,
                   (select gr.aufpreis_je_gericht
                    from public.gericht_gruppen gg
                    join public.gruppen gr on gr.slug = gg.gruppe
                    where gg.gericht_id = g.id and gg.gruppe = any (v_pg.gruppen)
                    order by array_position(v_pg.gruppen, gg.gruppe)
                    limit 1))
          into v_preis
          from public.gerichte g
          where g.id = (v_gericht->>'id')::uuid and g.aktiv;
          if v_preis is null then
            if v_bewerten then new.preis_pruefung := 'nicht_pruefbar'; end if;
            return new;
          end if;
          v_aufcent := v_aufcent + round(v_preis * 100);
        end loop;
      end if;
    end loop;

    v_cent := (round(v_paket.preis_pro_person * 100) + v_aufcent) * coalesce(new.gaeste, 0);

    -- Firmen-Vorteil (GEN-19): Der Generator zieht ihn selbst ab. Hier wird nachgeprüft, dass alle Bedingungen
    -- stimmen; dieselben Regeln wie FIRMEN_VORTEIL und pruefeFirma in src/angebot/firmenVorteil.js
    -- (5 %, Montag bis Donnerstag, ab 15 Personen, Anlass mit Vorteil, Firmenname und Adresse mit PLZ).
    -- Ein Test im Generator vergleicht diese Werte mit der Datei. Stimmt etwas nicht, gilt der Preis als abweichend.
    if jsonb_typeof(s->'firmen_vorteil') = 'object'
       and coalesce((s->'firmen_vorteil'->>'abgezogen')::boolean, false) then
      if (s->'firmen_vorteil'->>'prozent')::numeric = 5
         and new.anlass = any (array['firmenfeier', 'seminar', 'empfang', 'eroeffnung'])
         and coalesce(new.gaeste, 0) >= 15
         and extract(isodow from new.event_datum::date) in (1, 2, 3, 4)
         and char_length(btrim(coalesce(new.firma_name, ''))) >= 2
         and coalesce(new.firma_adresse, '') ~ '[0-9]{5}' then
        v_cent := v_cent - round(v_cent * 5 / 100.0);
      else
        v_passt := false;
      end if;
    end if;

    new.preis_nachgerechnet := v_cent / 100.0;
    if round((coalesce(new.gesamtpreis, 0) - coalesce(new.lieferzuschlag, 0)) * 100) <> v_cent then
      v_passt := false;
    end if;
    if v_bewerten then
      new.preis_pruefung := case when v_passt then 'stimmt' else 'weicht_ab' end;
    end if;
  exception when others then
    -- z. B. ein Snapshot in unerwarteter Form. Die Anfrage wird trotzdem gespeichert.
    new.preis_nachgerechnet := null;
    new.preis_pruefung := case when v_bewerten then 'nicht_pruefbar' else null end;
  end;

  return new;
end;
$$;

revoke execute on function public.requests_preis_nachrechnen() from public, anon, authenticated;

commit;
