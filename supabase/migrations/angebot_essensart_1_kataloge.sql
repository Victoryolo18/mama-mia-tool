-- Titel: GEN-1 Angebot nach Essensart – neue Kataloge anlegen und aus dem Bestand befüllen
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen. Im echten Projekt erst nach Victors Freigabe.
--
-- Was passiert:
--   1. Neue Tabellen: essensarten, gruppen, pakete, paket_gruppen, stile, gericht_gruppen, gericht_stile.
--   2. Neue Spalten: gerichte.aufpreis_pro_person; requests.essensart, .stil, .angebot_snapshot.
--   3. Befüllung aus paket_konfiguration, paket_slots, slot_gerichte, themen, gerichte.
-- Was NICHT passiert: Keine bestehende Tabelle wird gelöscht, keine bestehende Zeile geändert,
--   außer dass alte Anfragen die neue Spalte essensart gefüllt bekommen (Preise, Gerichte und
--   updated_at bleiben unberührt). Der heutige Generator liest die neuen Tabellen nicht.
-- Läuft als Ganzes oder gar nicht: Bei einem Fehler bleibt die Datenbank, wie sie war.

begin;

-- ───────────────────────── 1. Tabellen ─────────────────────────

create table public.essensarten (
  slug            text primary key,
  label           text not null,
  beschreibung    text,
  bild_url        text,
  mindestpersonen integer check (mindestpersonen is null or mindestpersonen > 0),
  reihenfolge     integer not null default 0,
  aktiv           boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- Eine Gruppe ist ein Topf von Gerichten (Vorspeisen, Fingerfood, Beilagen …).
-- aufpreis_plus_eins:  Preis p. P. für "+1" in einem Paket-Block, dessen erste Gruppe diese ist.
-- aufpreis_je_gericht: Preis p. P. je gewähltem Gericht in einem Zusatz-Block ("Fingerfood dazu").
create table public.gruppen (
  slug                text primary key,
  label               text not null,
  label_einzahl       text not null,
  aufpreis_plus_eins  numeric(10,2) check (aufpreis_plus_eins is null or aufpreis_plus_eins >= 0),
  aufpreis_je_gericht numeric(10,2) check (aufpreis_je_gericht is null or aufpreis_je_gericht >= 0),
  reihenfolge         integer not null default 0,
  updated_at          timestamptz not null default now()
);

-- Der Paketpreis steht genau hier: eine Zeile je Essensart und Paket.
create table public.pakete (
  id               uuid primary key default gen_random_uuid(),
  essensart        text not null references public.essensarten(slug) on update cascade,
  name             text not null,
  preis_pro_person numeric(10,2) not null check (preis_pro_person >= 0),
  reihenfolge      integer not null default 0,
  aktiv            boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (essensart, name)
);

-- Ein Block eines Pakets: "3 Vorspeisen wählen", "Brötchen inklusive", "Fingerfood dazu".
--   wahl:   im Paketpreis enthalten, min bis max Gerichte aus den Gruppen
--   fix:    im Paketpreis enthalten, genau das Gericht fix_gericht_id
--   zusatz: freiwillig, jedes gewählte Gericht kostet seinen Aufpreis
create table public.paket_gruppen (
  id             uuid primary key default gen_random_uuid(),
  paket_id       uuid not null references public.pakete(id) on delete cascade,
  label          text not null,
  gruppen        text[] not null check (cardinality(gruppen) >= 1),
  typ            text not null check (typ in ('wahl', 'fix', 'zusatz')),
  min_auswahl    integer not null default 1,
  max_auswahl    integer,
  fix_gericht_id uuid references public.gerichte(id),
  reihenfolge    integer not null default 0,
  aktiv          boolean not null default true,
  updated_at     timestamptz not null default now(),
  constraint paket_gruppen_minmax_check check (min_auswahl >= 0 and (max_auswahl is null or max_auswahl >= min_auswahl)),
  constraint paket_gruppen_fix_check    check ((typ = 'fix') = (fix_gericht_id is not null)),
  constraint paket_gruppen_max_check    check (typ = 'zusatz' or max_auswahl is not null)
);
create index idx_paket_gruppen_paket on public.paket_gruppen (paket_id);

-- Ein Stil ist eine Bildkachel über der Gerichteliste, die die Liste filtert.
-- zeigt_alles = true: "Individuell", filtert nicht.
create table public.stile (
  slug         text primary key,
  essensart    text not null references public.essensarten(slug) on update cascade,
  label        text not null,
  beschreibung text,
  bild_url     text,
  bild_url_1   text,
  bild_url_2   text,
  bild_url_3   text,
  zeigt_alles  boolean not null default false,
  reihenfolge  integer not null default 0,
  aktiv        boolean not null default true,
  updated_at   timestamptz not null default now()
);

-- Welches Gericht in welchem Topf liegt. Ersetzt die je Slot kopierten Listen (slot_gerichte).
create table public.gericht_gruppen (
  gericht_id uuid not null references public.gerichte(id) on delete cascade,
  gruppe     text not null references public.gruppen(slug) on update cascade,
  primary key (gericht_id, gruppe)
);
create index idx_gericht_gruppen_gruppe on public.gericht_gruppen (gruppe);

-- Zu welchem Stil ein Gericht passt.
create table public.gericht_stile (
  gericht_id uuid not null references public.gerichte(id) on delete cascade,
  stil       text not null references public.stile(slug) on update cascade on delete cascade,
  primary key (gericht_id, stil)
);
create index idx_gericht_stile_stil on public.gericht_stile (stil);

-- Leer = Standard-Aufpreis der Gruppe.
alter table public.gerichte
  add column aufpreis_pro_person numeric(10,2) check (aufpreis_pro_person is null or aufpreis_pro_person >= 0);

alter table public.requests
  add column essensart        text references public.essensarten(slug) on update cascade,
  add column stil             text,
  add column angebot_snapshot jsonb;
create index idx_requests_essensart on public.requests (essensart);

-- paket_gruppen.gruppen ist eine Liste; diese Prüfung ersetzt den Fremdschlüssel.
create function public.paket_gruppen_pruefen()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  fehlt text;
begin
  select g into fehlt from unnest(new.gruppen) g
  where not exists (select 1 from public.gruppen where slug = g) limit 1;
  if fehlt is not null then
    raise exception 'Gruppe "%" gibt es nicht.', fehlt;
  end if;
  return new;
end;
$$;

create trigger paket_gruppen_gruppen_pruefen before insert or update of gruppen on public.paket_gruppen
  for each row execute function public.paket_gruppen_pruefen();

create trigger set_updated_at_essensarten   before update on public.essensarten   for each row execute function public.trigger_set_updated_at();
create trigger set_updated_at_gruppen       before update on public.gruppen       for each row execute function public.trigger_set_updated_at();
create trigger set_updated_at_pakete        before update on public.pakete        for each row execute function public.trigger_set_updated_at();
create trigger set_updated_at_paket_gruppen before update on public.paket_gruppen for each row execute function public.trigger_set_updated_at();
create trigger set_updated_at_stile         before update on public.stile         for each row execute function public.trigger_set_updated_at();

-- ───────────────────────── 2. Wer darf was ─────────────────────────
-- Anonym (Generator): nur lesen, bei Tabellen mit "aktiv" nur aktive Zeilen.
-- Eingeloggt (CRM): alles.

alter table public.essensarten     enable row level security;
alter table public.gruppen         enable row level security;
alter table public.pakete          enable row level security;
alter table public.paket_gruppen   enable row level security;
alter table public.stile           enable row level security;
alter table public.gericht_gruppen enable row level security;
alter table public.gericht_stile   enable row level security;

create policy essensarten_anon_lesen     on public.essensarten     for select to anon using (aktiv);
create policy pakete_anon_lesen          on public.pakete          for select to anon using (aktiv);
create policy paket_gruppen_anon_lesen   on public.paket_gruppen   for select to anon using (aktiv);
create policy stile_anon_lesen           on public.stile           for select to anon using (aktiv);
create policy gruppen_anon_lesen         on public.gruppen         for select to anon using (true);
create policy gericht_gruppen_anon_lesen on public.gericht_gruppen for select to anon using (true);
create policy gericht_stile_anon_lesen   on public.gericht_stile   for select to anon using (true);

create policy essensarten_crm     on public.essensarten     for all to authenticated using (true) with check (true);
create policy pakete_crm          on public.pakete          for all to authenticated using (true) with check (true);
create policy paket_gruppen_crm   on public.paket_gruppen   for all to authenticated using (true) with check (true);
create policy stile_crm           on public.stile           for all to authenticated using (true) with check (true);
create policy gruppen_crm         on public.gruppen         for all to authenticated using (true) with check (true);
create policy gericht_gruppen_crm on public.gericht_gruppen for all to authenticated using (true) with check (true);
create policy gericht_stile_crm   on public.gericht_stile   for all to authenticated using (true) with check (true);

revoke all on public.essensarten, public.gruppen, public.pakete, public.paket_gruppen,
              public.stile, public.gericht_gruppen, public.gericht_stile from anon;
grant select on public.essensarten, public.gruppen, public.pakete, public.paket_gruppen,
                public.stile, public.gericht_gruppen, public.gericht_stile to anon;
grant select, insert, update, delete on public.essensarten, public.gruppen, public.pakete, public.paket_gruppen,
                public.stile, public.gericht_gruppen, public.gericht_stile to authenticated;

-- ───────────────────────── 3. Befüllen ─────────────────────────

insert into public.essensarten (slug, label, reihenfolge) values
  ('buffet',      'Kalt-warmes Buffet', 1),
  ('fingerfood',  'Fingerfood',         2),
  ('fruehstueck', 'Frühstück',          3);

-- Aufpreise: Stand des Generator-Codes vom 08.10.2026 (UPGRADE_PREISE, Lachs-Upgrade).
-- "Fingerfood dazu" kostet vorläufig so viel wie heute "+1 Vorspeise"; Brunch-Extra = heutiger
-- Preisunterschied zwischen Brunch und Frühstück. Jana ändert die Werte später im CRM.
insert into public.gruppen (slug, label, label_einzahl, aufpreis_plus_eins, aufpreis_je_gericht, reihenfolge) values
  ('vorspeise',            'Vorspeisen',              'Vorspeise',      3.50, null, 10),
  ('fingerfood',           'Fingerfood',              'Häppchen',       3.50, 3.50, 20),
  ('hauptgericht',         'Hauptgerichte',           'Hauptgericht',   9.50, null, 30),
  ('beilage',              'Beilagen',                'Beilage',        3.50, null, 40),
  ('gemuese',              'Gemüsebeilagen',          'Gemüsebeilage',  3.50, null, 50),
  ('salat',                'Salate',                  'Salat',          3.50, null, 60),
  ('dessert',              'Desserts',                'Dessert',        4.20, null, 70),
  ('kuchen',               'Kuchen & Torten',         'Kuchen',         null, null, 80),
  ('fruehstueck_herzhaft', 'Frühstück herzhaft',      'Herzhaftes',     null, null, 90),
  ('fruehstueck_suess',    'Süßes & Gebäck',          'Süßes',          null, null, 100),
  ('fruehstueck_glas',     'Im Glas',                 'Im Glas',        null, null, 110),
  ('brunch_herzhaft',      'Herzhaftes Brunch-Extra', 'Brunch-Extra',   null, 2.00, 120),
  ('fruehstueck_lachs',    'Lachs-Upgrade',           'Lachs-Upgrade',  null, 3.50, 130),
  ('inklusiv',             'Inklusive',               'Inklusive',      null, null, 140);

-- Aus diesen drei heutigen Kombinationen entstehen die neuen Pakete.
create temporary table _vorlage on commit drop as
select k.id as konfig_id, v.essensart, k.paket, k.preis_pro_person
from (values ('buffet',      'geburtstag',  'individuell'),
             ('fingerfood',  'firmenfeier', 'empfang_fingerfood'),
             ('fruehstueck', 'fruehstueck', 'fruehstueck_suess_pikant')) as v(essensart, anlass, theme_slug)
join public.paket_konfiguration k on k.anlass = v.anlass and k.theme_slug = v.theme_slug;

insert into public.pakete (essensart, name, preis_pro_person, reihenfolge)
select essensart, paket, preis_pro_person,
       case paket when 'Klassisch' then 1 when 'Genuss' then 2 else 3 end
from _vorlage;

insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, fix_gericht_id, reihenfolge)
select p.id, s.label,
       case
         when s.kategorie = 'vorspeise' and s.label ilike 'Häppchen%' then array['fingerfood']
         when s.kategorie = 'vorspeise' and s.label = 'Salate'        then array['salat']
         when s.kategorie = 'vorspeise'                               then array['vorspeise']
         when s.kategorie = 'hauptspeise'                             then array['hauptgericht']
         when s.kategorie = 'beilage' and 'gemuesebeilage' = any (s.kategorien) then array['beilage', 'gemuese']
         when s.kategorie = 'beilage'                                 then array['beilage']
         when s.kategorie = 'dessert'                                 then array['dessert']
         when s.kategorie in ('fruehstueck_herzhaft', 'fruehstueck_fix') then array['fruehstueck_herzhaft']
         when s.kategorie = 'fruehstueck_suess'                       then array['fruehstueck_suess']
         when s.kategorie = 'fruehstueck_glas'                        then array['fruehstueck_glas']
       end,
       case s.typ when 'fix' then 'fix' else 'wahl' end,
       s.min_auswahl, s.max_auswahl,
       case when s.typ = 'fix' then
         (select sg.gericht_id from public.slot_gerichte sg where sg.slot_id = s.id order by sg.reihenfolge limit 1)
       end,
       s.reihenfolge * 10
from _vorlage v
join public.pakete p on p.essensart = v.essensart and p.name = v.paket
join public.paket_slots s on s.paket_konfiguration_id = v.konfig_id and s.aktiv;

-- Zusatz-Blöcke
insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, reihenfolge)
select id, 'Fingerfood dazu', array['fingerfood'], 'zusatz', 0, null, 5
from public.pakete where essensart = 'buffet';

insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, reihenfolge)
select id, 'Herzhaftes Brunch-Extra', array['brunch_herzhaft'], 'zusatz', 0, 1, 100
from public.pakete where essensart = 'fruehstueck';

insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, reihenfolge)
select id, 'Lachs-Upgrade', array['fruehstueck_lachs'], 'zusatz', 0, 1, 110
from public.pakete where essensart = 'fruehstueck' and name in ('Genuss', 'Premium');

-- Gerichte in ihre Töpfe: zuerst nach Kategorie …
insert into public.gericht_gruppen (gericht_id, gruppe)
select id, gruppe from (
  select id, case
    when kategorie = 'vorspeise' and unterkategorie = 'haeppchen' then 'fingerfood'
    when kategorie = 'fingerfood'                      then 'fingerfood'
    when kategorie = 'vorspeise'                       then 'vorspeise'
    when kategorie in ('hauptspeise', 'auflauf')       then 'hauptgericht'
    when kategorie = 'beilage'                         then 'beilage'
    when kategorie = 'gemuesebeilage'                  then 'gemuese'
    when kategorie = 'salat'                           then 'salat'
    when kategorie = 'dessert'                         then 'dessert'
    when kategorie = 'kuchen_torte'                    then 'kuchen'
    when kategorie = 'inklusiv'                        then 'inklusiv'
    when kategorie = 'fruehstueck' and unterkategorie = 'im_glas'       then 'fruehstueck_glas'
    when kategorie = 'fruehstueck' and unterkategorie = 'suess_gebaeck' then 'fruehstueck_suess'
    when kategorie = 'fruehstueck'                     then 'fruehstueck_herzhaft'
    when kategorie = 'fruehstueck_herzhaft'            then 'fruehstueck_herzhaft'
    when kategorie in ('backwaren', 'obst_suess')      then 'fruehstueck_suess'
  end as gruppe
  from public.gerichte
) g where gruppe is not null;

-- … dann alles, was heute in einem Slot einer anderen Kategorie angeboten wird
-- (z. B. Rote-Bete-Salat unter den osteuropäischen Beilagen), damit kein Stil ein Gericht verliert.
-- Ausnahmen: Häppchen kommen nicht zurück in die Vorspeisen, Gemüsebeilagen nicht in die Beilagen,
-- und die heutigen Fingerfood-Themen bestimmen nicht, was im Buffet steht.
insert into public.gericht_gruppen (gericht_id, gruppe)
select distinct sg.gericht_id, z.ziel
from public.paket_slots s
join public.paket_konfiguration k on k.id = s.paket_konfiguration_id
join public.slot_gerichte sg on sg.slot_id = s.id
cross join lateral (
  select case
    when k.anlass = 'fruehstueck' and s.kategorie = 'brunch_herzhaft' then 'brunch_herzhaft'
    when k.anlass = 'fruehstueck'                                     then null
    when k.theme_slug in ('empfang_fingerfood', 'business_lunch')     then null
    when s.kategorie = 'vorspeise'   then 'vorspeise'
    when s.kategorie = 'hauptspeise' then 'hauptgericht'
    when s.kategorie = 'beilage'     then 'beilage'
    when s.kategorie = 'dessert'     then 'dessert'
  end as ziel
) z
where z.ziel is not null
  and not (z.ziel = 'vorspeise' and exists (
        select 1 from public.gericht_gruppen x where x.gericht_id = sg.gericht_id and x.gruppe = 'fingerfood'))
  and not (z.ziel = 'beilage' and exists (
        select 1 from public.gericht_gruppen x where x.gericht_id = sg.gericht_id and x.gruppe = 'gemuese'))
on conflict do nothing;

-- Das Lachs-Upgrade war bisher nur eine Zeile im Code; jetzt ist es ein Gericht in einem Zusatz-Block.
with neu as (
  insert into public.gerichte (name, kategorie, vegetarisch, aktiv)
  values ('Lachs-Upgrade', 'fruehstueck', false, true)
  returning id
)
insert into public.gericht_gruppen (gericht_id, gruppe) select id, 'fruehstueck_lachs' from neu;

-- Stile: eine Zeile je heutigem Buffet-Thema (bisher eine je Anlass).
insert into public.stile (slug, essensart, label, beschreibung, bild_url, bild_url_1, bild_url_2, bild_url_3,
                          zeigt_alles, reihenfolge, aktiv)
select distinct on (slug)
       slug, 'buffet', label, beschreibung, bild_url, bild_url_1, bild_url_2, bild_url_3,
       slug = 'individuell',
       case when slug = 'individuell' then 0 else reihenfolge end,
       aktiv
from public.themen
where anlass not in ('fruehstueck', 'private_feier') and slug <> 'empfang_fingerfood'
order by slug, case anlass when 'hochzeit' then 0 when 'geburtstag' then 1 when 'individuell' then 2 else 3 end;

-- Ein Gericht passt zu einem Stil, wenn es heute in irgendeinem Paket dieses Themas angeboten wird.
insert into public.gericht_stile (gericht_id, stil)
select distinct sg.gericht_id, k.theme_slug
from public.paket_konfiguration k
join public.paket_slots s on s.paket_konfiguration_id = k.id
join public.slot_gerichte sg on sg.slot_id = s.id
where k.anlass <> 'fruehstueck'
  and k.theme_slug in (select slug from public.stile where not zeigt_alles);

-- Alte Anfragen bekommen ihre Essensart. Sonst ändert sich an ihnen nichts, auch nicht updated_at.
alter table public.requests disable trigger trigger_requests_updated_at;
update public.requests
set essensart = case
      when anlass = 'fruehstueck'      then 'fruehstueck'
      when thema ilike '%fingerfood%'  then 'fingerfood'
      else 'buffet'
    end
where essensart is null and paket is not null;
alter table public.requests enable trigger trigger_requests_updated_at;

-- ───────────────────────── 4. Selbstprüfung ─────────────────────────
do $$
declare
  n integer;
begin
  select count(*) into n from public.pakete;
  if n <> 9 then
    raise exception 'Erwartet 9 Pakete, gefunden %. Fehlt eine der drei Vorlagen in paket_konfiguration?', n;
  end if;

  select count(*) into n from public.pakete p
  where not exists (select 1 from public.paket_gruppen pg where pg.paket_id = p.id and pg.typ <> 'zusatz');
  if n > 0 then
    raise exception '% Pakete haben keinen Inhalt.', n;
  end if;

  select count(*) into n from public.paket_gruppen where gruppen is null;
  if n > 0 then
    raise exception '% Paket-Blöcke konnten keiner Gruppe zugeordnet werden.', n;
  end if;

  select count(*) into n from public.gerichte g
  where g.aktiv and not exists (select 1 from public.gericht_gruppen gg where gg.gericht_id = g.id);
  if n > 0 then
    raise exception '% aktive Gerichte haben keine Gruppe.', n;
  end if;
end;
$$;

commit;
