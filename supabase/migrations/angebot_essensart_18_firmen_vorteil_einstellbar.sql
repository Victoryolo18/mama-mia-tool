-- Titel: GEN-20 Firmen-Vorteil stellt Jana im CRM ein (an/aus, Prozent, Wochentage, ab wie vielen Personen)
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_17_firmendaten.sql.
--
-- Was passiert:
--   1. Neue Tabelle firmen_vorteil mit genau einer Zeile: an/aus, Prozent (ganze Zahl 1 bis 30), Wochentage
--      (1 = Montag bis 7 = Sonntag) und ab wie vielen Personen. Startwerte wie bisher im Code:
--      an, 5 %, Montag bis Donnerstag, ab 15 Personen. Generator, Website und CRM lesen sie von hier.
--   2. Die Preisprüfung (Trigger aus Migration 17) liest die Regel aus dieser Tabelle statt fester Zahlen.
--      Sonst unverändert gegenüber Migration 17.
-- Was NICHT passiert: keine bestehende Anfrage, kein Preis, kein Katalog ändert sich. Der Trigger läuft nur
--   beim Anlegen neuer Anfragen; gespeicherte Anfragen behalten ihren Preis und ihren Prozentsatz.
-- Wer darf was:
--   Unangemeldete (Generator, Website beim Bauen) lesen die Regel. Ändern darf sie nur die eingeloggte
--   CRM-Nutzerin. Anlegen oder löschen darf sie niemand: Es gibt immer genau diese eine Zeile.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr (vorhandene Werte bleiben).

begin;

create table if not exists public.firmen_vorteil (
  id              smallint primary key default 1 check (id = 1),
  aktiv           boolean  not null default true,
  prozent         integer  not null default 5 check (prozent between 1 and 30),
  wochentage      smallint[] not null default '{1,2,3,4}'
                  check (cardinality(wochentage) between 1 and 7 and wochentage <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  mindestpersonen integer  not null default 15 check (mindestpersonen between 1 and 250),
  geaendert_am    timestamptz not null default now()
);

insert into public.firmen_vorteil (id) values (1) on conflict (id) do nothing;

alter table public.firmen_vorteil enable row level security;

drop policy if exists firmen_vorteil_lesen on public.firmen_vorteil;
drop policy if exists firmen_vorteil_crm_aendern on public.firmen_vorteil;

create policy firmen_vorteil_lesen       on public.firmen_vorteil for select to anon, authenticated using (true);
create policy firmen_vorteil_crm_aendern on public.firmen_vorteil for update to authenticated using (true) with check (true);

revoke all on public.firmen_vorteil from anon, authenticated;
grant select on public.firmen_vorteil to anon;
grant select, update on public.firmen_vorteil to authenticated;

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
  v_regel    public.firmen_vorteil%rowtype;
  v_prozent  integer;
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

    -- Firmen-Vorteil (GEN-19, Regel seit GEN-20 in der Tabelle firmen_vorteil): Der Generator zieht ihn selbst ab.
    -- Hier wird nachgeprüft, dass er zur Regel passt, die Jana im CRM eingestellt hat, und dass Anlass und Firma
    -- stimmen; dieselben Regeln wie firmenVorteilMoeglich und pruefeFirma in src/angebot/firmenVorteil.js.
    -- Stimmt etwas nicht (etwa Freitag, zu wenige Gäste, Vorteil ausgeschaltet), gilt der Preis als abweichend.
    if jsonb_typeof(s->'firmen_vorteil') = 'object'
       and coalesce((s->'firmen_vorteil'->>'abgezogen')::boolean, false) then
      select * into v_regel from public.firmen_vorteil where id = 1;
      v_prozent := (s->'firmen_vorteil'->>'prozent')::integer;
      if found
         and v_regel.aktiv
         and v_prozent = v_regel.prozent
         and new.anlass = any (array['firmenfeier', 'seminar', 'empfang', 'eroeffnung'])
         and coalesce(new.gaeste, 0) >= v_regel.mindestpersonen
         and extract(isodow from new.event_datum::date)::smallint = any (v_regel.wochentage)
         and char_length(btrim(coalesce(new.firma_name, ''))) >= 2
         and coalesce(new.firma_adresse, '') ~ '[0-9]{5}' then
        v_cent := v_cent - round(v_cent * v_prozent / 100.0);
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
