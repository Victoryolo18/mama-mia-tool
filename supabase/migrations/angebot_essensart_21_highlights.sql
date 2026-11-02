-- Titel: GEN-29 Highlights, Gänse- und Entenkeule als Hauptgericht mit Aufpreis, Klöße
-- Mama Mia · Angebot nach Essensart · Teil 21
--
-- Zuerst im TEST-Projekt (mama-mia-test), dann im echten Projekt. Im echten Projekt VOR dem Merge des
-- Generator-PR: Der neue Generator liest die Spalte aufpreis_im_paket und die Tabellen highlights.
--
-- Was passiert:
--   1. Neue Spalte gerichte.aufpreis_im_paket: Aufpreis p. P., wenn der Kunde das Gericht in einem Wahl-Block
--      statt eines normalen Gerichts nimmt (Gänsekeule statt Hähnchen). Getrennt von aufpreis_pro_person, das nur
--      in Zusatz-Blöcken gilt (Victor, 02.11.2026).
--   2. Neue Tabellen highlights und highlight_gerichte: Kästen mit Titel und Zeitraum, die Jana im CRM pflegt.
--      nur_im_zeitraum = true: Das Gericht gibt es außerhalb des Zeitraums gar nicht.
--   3. Neue Gerichte: Gänsekeule (+5 €), Entenkeule (+3 €) als Hauptgericht, Kartoffelklöße ohne Aufpreis als Beilage.
--   4. Ein Highlight „Highlight“ vom 15.11. bis 26.12.2026 mit Gänse- und Entenkeule, beide nur in dieser Zeit.
--   5. Die Preisprüfung in der Datenbank rechnet den Aufpreis im Paket mit (sonst stünde jede Anfrage mit
--      Gänsekeule als „weicht ab“ im CRM).
-- Was NICHT passiert: Keine Preise bestehender Pakete oder Gerichte, keine gespeicherte Anfrage wird angefasst.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf legt nichts doppelt an.

begin;

-- ───────────────────────── 1. Spalte ─────────────────────────

alter table public.gerichte
  add column if not exists aufpreis_im_paket numeric(10,2)
  check (aufpreis_im_paket is null or aufpreis_im_paket >= 0);

-- ───────────────────────── 2. Tabellen ─────────────────────────

create table if not exists public.highlights (
  id         uuid primary key default gen_random_uuid(),
  titel      text not null default 'Highlight' check (char_length(btrim(titel)) between 1 and 60),
  titel_en   text check (titel_en is null or char_length(titel_en) <= 60),
  titel_ru   text check (titel_ru is null or char_length(titel_ru) <= 60),
  von        date not null,
  bis        date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint highlights_zeitraum_check check (bis >= von)
);

create table if not exists public.highlight_gerichte (
  highlight_id    uuid not null references public.highlights(id) on delete cascade,
  gericht_id      uuid not null references public.gerichte(id) on delete cascade,
  nur_im_zeitraum boolean not null default false,
  primary key (highlight_id, gericht_id)
);
create index if not exists idx_highlight_gerichte_gericht on public.highlight_gerichte (gericht_id);

drop trigger if exists set_updated_at_highlights on public.highlights;
create trigger set_updated_at_highlights before update on public.highlights
  for each row execute function public.trigger_set_updated_at();

-- Wer darf was: anonym (Generator) nur lesen, eingeloggt (CRM) alles.
alter table public.highlights         enable row level security;
alter table public.highlight_gerichte enable row level security;

drop policy if exists highlights_anon_lesen         on public.highlights;
drop policy if exists highlights_crm                on public.highlights;
drop policy if exists highlight_gerichte_anon_lesen on public.highlight_gerichte;
drop policy if exists highlight_gerichte_crm        on public.highlight_gerichte;
create policy highlights_anon_lesen         on public.highlights         for select to anon using (true);
create policy highlights_crm                on public.highlights         for all to authenticated using (true) with check (true);
create policy highlight_gerichte_anon_lesen on public.highlight_gerichte for select to anon using (true);
create policy highlight_gerichte_crm        on public.highlight_gerichte for all to authenticated using (true) with check (true);

revoke all on public.highlights, public.highlight_gerichte from anon;
grant select on public.highlights, public.highlight_gerichte to anon;
grant select, insert, update, delete on public.highlights, public.highlight_gerichte to authenticated;

-- ───────────────────────── 3. Gerichte ─────────────────────────

with liste (name, name_en, kategorie, gruppe, vegetarisch, aufpreis_im_paket, stile) as (
  values
    ('Gänsekeule',      'Goose leg',        'hauptspeise', 'hauptgericht', false, 5.00,
       array['klassisch_deutsch', 'klassisch_elegant', 'modern_festlich']),
    ('Entenkeule',      'Duck leg',         'hauptspeise', 'hauptgericht', false, 3.00,
       array['klassisch_deutsch', 'klassisch_elegant', 'modern_festlich']),
    ('Kartoffelklöße',  'Potato dumplings', 'beilage',     'beilage',      true,  null::numeric,
       array['klassisch_deutsch', 'klassisch_elegant', 'osteuropaeisch'])
),
neu as (
  insert into public.gerichte (name, name_en, kategorie, vegetarisch, aufpreis_im_paket, aktiv)
  select l.name, l.name_en, l.kategorie, l.vegetarisch, l.aufpreis_im_paket, true
  from liste l
  where not exists (select 1 from public.gerichte g where g.name = l.name)
  returning id, name
),
gruppen as (
  insert into public.gericht_gruppen (gericht_id, gruppe)
  select n.id, l.gruppe from neu n join liste l on l.name = n.name
  returning gericht_id
)
insert into public.gericht_stile (gericht_id, stil)
select n.id, s.stil
from neu n
join liste l on l.name = n.name
cross join lateral unnest(l.stile) as s(stil)
where exists (select 1 from public.stile st where st.slug = s.stil);

-- ───────────────────────── 4. Highlight ─────────────────────────

insert into public.highlights (titel, von, bis)
select 'Highlight', date '2026-11-15', date '2026-12-26'
where not exists (select 1 from public.highlights);

insert into public.highlight_gerichte (highlight_id, gericht_id, nur_im_zeitraum)
select h.id, g.id, true
from public.highlights h
join public.gerichte g on g.name in ('Gänsekeule', 'Entenkeule')
where h.titel = 'Highlight' and h.von = date '2026-11-15'
on conflict do nothing;

-- ───────────────────────── 5. Preisprüfung ─────────────────────────
-- Wie in angebot_essensart_18, dazu im Wahl-Block der Aufpreis im Paket (paketAufpreis in src/angebot/angebotspreis.js).

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
        -- Gericht mit Aufpreis im Paket (Gänsekeule statt Hähnchen).
        select coalesce(sum(round(g.aufpreis_im_paket * 100)), 0) into v_preis
        from jsonb_array_elements(v_block->'gerichte') e
        join public.gerichte g on g.id = (e->>'id')::uuid
        where g.aufpreis_im_paket > 0;
        v_aufcent := v_aufcent + v_preis::bigint;
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

-- Prüfung: Ohne diese Zeilen bricht der Lauf ab und nichts bleibt hängen.
do $$
begin
  if (select count(*) from public.gerichte where name in ('Gänsekeule', 'Entenkeule') and aufpreis_im_paket > 0) <> 2 then
    raise exception 'Gänse- oder Entenkeule fehlt oder hat keinen Aufpreis.';
  end if;
  if not exists (select 1 from public.gericht_gruppen gg join public.gerichte g on g.id = gg.gericht_id
                 where g.name = 'Kartoffelklöße' and gg.gruppe = 'beilage') then
    raise exception 'Kartoffelklöße fehlen in den Beilagen.';
  end if;
  if (select count(*) from public.highlight_gerichte where nur_im_zeitraum) < 2 then
    raise exception 'Das Highlight hat seine Gerichte nicht bekommen.';
  end if;
end $$;

commit;
