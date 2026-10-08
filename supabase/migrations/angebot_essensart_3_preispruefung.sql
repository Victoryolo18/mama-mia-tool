-- Titel: GEN-4 Angebot nach Essensart – Paket-Texte, Essensbilder, Preis einer Anfrage nachrechnen
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_2_stil_reihenfolge.sql.
-- Im echten Projekt erst zur Umschaltung, nach Victors Freigabe.
--
-- Was passiert:
--   1. pakete bekommt die Texte der Paket-Karten (bisher fest im Generator-Code): Untertitel,
--      Hinweis-Schild ("Meistgebucht"), hervorgehoben ja/nein.
--   2. essensarten bekommt vorläufige Bilder (die bisherigen Anlass-Bilder), nur wo noch keines steht.
--   3. requests bekommt zwei Spalten für die Preisprüfung. Ein Trigger rechnet bei jeder NEUEN
--      Anfrage, die einen angebot_snapshot mitbringt, den Speisenpreis aus den Katalogen nach und
--      trägt ein, ob er zu dem Preis passt, den der Browser geschickt hat.
-- Was NICHT passiert: Keine bestehende Anfrage wird angefasst (der Trigger läuft nur beim Anlegen).
--   Der gespeicherte Preis wird nie überschrieben, auch nicht bei einer Abweichung: Was der Kunde
--   gesehen hat, bleibt stehen; die Abweichung wird nur markiert. Anfragen ohne Snapshot (alle aus
--   dem heutigen Generator und aus dem CRM) bleiben ungeprüft.
-- Wer darf was: Keine neue Tabelle, keine neue oder geänderte Policy. Die Funktion läuft mit den
--   Rechten dessen, der die Anfrage anlegt (security invoker) und liest nur Kataloge, die der
--   Generator ohnehin lesen darf. Niemand kann sie direkt aufrufen.
-- Läuft als Ganzes oder gar nicht.

begin;

-- ───────────────────────── 1. Texte der Paket-Karten ─────────────────────────
alter table public.pakete
  add column untertitel    text,
  add column hinweis       text,
  add column hervorgehoben boolean not null default false;

comment on column public.pakete.untertitel    is 'Zeile unter dem Paketnamen im Generator, z. B. "Die beliebteste Wahl".';
comment on column public.pakete.hinweis       is 'Kleines Schild an der Paket-Karte, z. B. "Meistgebucht". Leer = kein Schild.';
comment on column public.pakete.hervorgehoben is 'Die Karte dieses Pakets ist im Generator dunkel abgesetzt.';

-- Stand des Generator-Codes vom 08.10.2026 (Liste PAKETE).
update public.pakete p
set untertitel = v.untertitel, hinweis = v.hinweis, hervorgehoben = v.hervorgehoben
from (values
  ('Klassisch', 'Schmackhaft & solide', null,           false),
  ('Genuss',    'Die beliebteste Wahl', 'Meistgebucht', true),
  ('Premium',   'Das volle Erlebnis',   'Premium',      false)
) as v (name, untertitel, hinweis, hervorgehoben)
where p.name = v.name;

-- ───────────────────────── 2. Vorläufige Bilder je Essensart ─────────────────────────
-- Dieselben Bilder, die der Generator bisher bei den Anlässen gezeigt hat. Jana ersetzt sie später.
update public.essensarten e
set bild_url = v.bild_url
from (values
  ('buffet',      'https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Private_Feier-Thema.jpg'),
  ('fingerfood',  'https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Firmenfeier-Thema.jpg'),
  ('fruehstueck', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80')
) as v (slug, bild_url)
where e.slug = v.slug and e.bild_url is null;

-- ───────────────────────── 3. Preis einer neuen Anfrage nachrechnen ─────────────────────────
alter table public.requests
  add column preis_nachgerechnet numeric(10,2),
  add column preis_pruefung      text check (preis_pruefung in ('stimmt', 'weicht_ab', 'nicht_pruefbar'));

comment on column public.requests.preis_nachgerechnet is
  'Speisenpreis gesamt (Paket + Aufpreise) × Gäste, beim Eingang der Anfrage aus den Katalogen nachgerechnet. Ohne Lieferung.';
comment on column public.requests.preis_pruefung is
  'Stand beim Eingang: stimmt = gesamtpreis minus lieferzuschlag ist der nachgerechnete Preis; weicht_ab = Preis oder Anzahl der Gerichte passt nicht zum Katalog; nicht_pruefbar = Paket, Block oder Gericht nicht (mehr) im Katalog. Leer = Anfrage ohne angebot_snapshot.';

-- Rechnet wie src/angebot/angebotspreis.js: Paketpreis + "+1" je Block + Aufpreis je Zusatz-Gericht,
-- in Cent, mal Gäste. Geprüft wird außerdem, ob in einem Wahl-Block mehr oder weniger Gerichte
-- stehen, als das Paket erlaubt, und ob sie in den Block gehören.
-- Nicht geprüft: der Lieferzuschlag (hängt an Ort und Zone) und ob Blöcke fehlen.
-- Die Funktion darf eine Anfrage nie verhindern: Geht beim Nachrechnen etwas schief, wird die
-- Anfrage als nicht_pruefbar gespeichert.
create function public.requests_preis_nachrechnen()
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
      new.preis_pruefung := 'nicht_pruefbar';
      return new;
    end if;

    for v_block in select * from jsonb_array_elements(s->'bloecke') loop
      select * into v_pg from public.paket_gruppen
      where id = (v_block->>'id')::uuid and paket_id = v_paket.id and aktiv;
      if not found then
        new.preis_pruefung := 'nicht_pruefbar';
        return new;
      end if;

      v_plus := coalesce((v_block->>'plus_eins')::boolean, false);
      v_anzahl := jsonb_array_length(coalesce(v_block->'gerichte', '[]'::jsonb));

      if v_plus then
        select aufpreis_plus_eins into v_preis from public.gruppen where slug = v_pg.gruppen[1];
        if v_pg.typ <> 'wahl' or v_preis is null then
          new.preis_pruefung := 'nicht_pruefbar';
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
            new.preis_pruefung := 'nicht_pruefbar';
            return new;
          end if;
          v_aufcent := v_aufcent + round(v_preis * 100);
        end loop;
      end if;
    end loop;

    v_cent := (round(v_paket.preis_pro_person * 100) + v_aufcent) * coalesce(new.gaeste, 0);
    new.preis_nachgerechnet := v_cent / 100.0;
    if round((coalesce(new.gesamtpreis, 0) - coalesce(new.lieferzuschlag, 0)) * 100) <> v_cent then
      v_passt := false;
    end if;
    new.preis_pruefung := case when v_passt then 'stimmt' else 'weicht_ab' end;
  exception when others then
    -- z. B. ein Snapshot in unerwarteter Form. Die Anfrage wird trotzdem gespeichert.
    new.preis_nachgerechnet := null;
    new.preis_pruefung := 'nicht_pruefbar';
  end;

  return new;
end;
$$;

revoke execute on function public.requests_preis_nachrechnen() from public, anon, authenticated;

create trigger requests_preis_nachrechnen before insert on public.requests
  for each row execute function public.requests_preis_nachrechnen();

-- ───────────────────────── 4. Selbstprüfung ─────────────────────────
do $$
declare
  n integer;
begin
  select count(*) into n from public.pakete where untertitel is null;
  if n > 0 then
    raise exception '% Pakete haben keinen Untertitel bekommen. Heißt ein Paket anders als Klassisch, Genuss, Premium?', n;
  end if;

  select count(*) into n from public.pakete where hervorgehoben;
  if n <> (select count(*) from public.essensarten) then
    raise exception 'Erwartet je Essensart genau ein hervorgehobenes Paket, gefunden %.', n;
  end if;

  select count(*) into n from public.essensarten where bild_url is null;
  if n > 0 then
    raise exception '% Essensarten haben kein Bild.', n;
  end if;
end;
$$;

commit;
