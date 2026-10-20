-- Titel: GEN-25 Viertes Buffet-Paket „Exklusiv“ für 65 € pro Person
-- Mama Mia · Angebot nach Essensart · Teil 19
--
-- Exklusiv = Premium mit einem Dessert mehr und zwei Fingerfood-Sorten inklusive, dazu Lieferung inklusive
-- und eine persönliche Menüberatung mit Jana (Victor, 20.10.2026). Es dient vor allem als Preisanker neben Premium.
--
--   1. Zwei neue Spalten in `pakete`:
--        lieferung_inklusive  Der Kunde zahlt keine Lieferung, in jeder Zone mit bekanntem Preis.
--        leistungen           Weitere Zeilen für die Paket-Karte, z. B. "Persönliche Menüberatung mit Jana".
--   2. Das Paket Exklusiv (nur Buffet). Seine Blöcke werden aus dem aktuellen Premium kopiert, so wie Jana es
--      im CRM eingestellt hat; Desserts bekommen eins mehr. "Fingerfood dazu" fällt weg, an seine Stelle
--      tritt "2× Fingerfood" ohne Aufpreis.
--
-- Bestehende Anfragen und die anderen Pakete ändern sich nicht. Die Preisprüfung (requests_preis_nachrechnen)
-- rechnet nur die Speisen nach und braucht keine Änderung.
-- Läuft als Ganzes oder gar nicht.

begin;

-- ───────────────────────── 1. Neue Spalten ─────────────────────────
alter table public.pakete
  add column lieferung_inklusive boolean not null default false,
  add column leistungen          text[]  not null default '{}';

comment on column public.pakete.lieferung_inklusive is 'Lieferung ist im Paketpreis enthalten: Lieferpreis 0 €, sofern die Zone bekannt ist.';
comment on column public.pakete.leistungen          is 'Weitere Zeilen für die Paket-Karte nach den Gerichten, z. B. "Persönliche Menüberatung mit Jana".';

-- ───────────────────────── 2. Paket Exklusiv ─────────────────────────
insert into public.pakete (essensart, name, preis_pro_person, reihenfolge, untertitel, hinweis, hervorgehoben,
                           lieferung_inklusive, leistungen)
select 'buffet', 'Exklusiv', 65, p.reihenfolge + 1, 'Für besondere Anlässe', null, false,
       true, array['Persönliche Menüberatung mit Jana']
from public.pakete p
where p.essensart = 'buffet' and p.name = 'Premium';

-- Blöcke wie Premium; der Dessert-Block bekommt eins mehr, "Fingerfood dazu" bleibt weg.
insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, fix_gericht_id, reihenfolge)
select e.id, g.label, g.gruppen, g.typ,
       g.min_auswahl + case when g.typ = 'wahl' and 'dessert' = any (g.gruppen) then 1 else 0 end,
       g.max_auswahl + case when g.typ = 'wahl' and 'dessert' = any (g.gruppen) then 1 else 0 end,
       g.fix_gericht_id, g.reihenfolge
from public.pakete pr
join public.paket_gruppen g on g.paket_id = pr.id and g.aktiv
cross join (select id from public.pakete where essensart = 'buffet' and name = 'Exklusiv') e
where pr.essensart = 'buffet' and pr.name = 'Premium'
  and not (g.typ = 'zusatz' and 'fingerfood' = any (g.gruppen));

-- 2× Fingerfood ohne Aufpreis, nach den übrigen Wahl-Blöcken.
insert into public.paket_gruppen (paket_id, label, gruppen, typ, min_auswahl, max_auswahl, reihenfolge)
select e.id, 'Fingerfood', array['fingerfood'], 'wahl', 2, 2,
       coalesce((select max(g.reihenfolge) from public.paket_gruppen g where g.paket_id = e.id and g.typ = 'wahl'), 0) + 1
from public.pakete e
where e.essensart = 'buffet' and e.name = 'Exklusiv';

-- ───────────────────────── 3. Prüfung ─────────────────────────
do $$
declare
  v_premium   uuid;
  v_exklusiv  uuid;
  n_premium   integer;
  n_exklusiv  integer;
  d_premium   integer;
  d_exklusiv  integer;
begin
  select id into v_premium  from public.pakete where essensart = 'buffet' and name = 'Premium';
  select id into v_exklusiv from public.pakete where essensart = 'buffet' and name = 'Exklusiv';
  if v_premium is null or v_exklusiv is null then
    raise exception 'Buffet-Paket Premium oder Exklusiv fehlt.';
  end if;

  select count(*) into n_premium from public.paket_gruppen
  where paket_id = v_premium and aktiv and not (typ = 'zusatz' and 'fingerfood' = any (gruppen));
  select count(*) into n_exklusiv from public.paket_gruppen where paket_id = v_exklusiv;
  if n_exklusiv <> n_premium + 1 then
    raise exception 'Exklusiv hat % Blöcke, erwartet %.', n_exklusiv, n_premium + 1;
  end if;

  select max(max_auswahl) into d_premium  from public.paket_gruppen where paket_id = v_premium  and aktiv and typ = 'wahl' and 'dessert' = any (gruppen);
  select max(max_auswahl) into d_exklusiv from public.paket_gruppen where paket_id = v_exklusiv and typ = 'wahl' and 'dessert' = any (gruppen);
  if d_premium is null or d_exklusiv is distinct from d_premium + 1 then
    raise exception 'Desserts: Premium %, Exklusiv %, erwartet eins mehr.', d_premium, d_exklusiv;
  end if;

  if not exists (select 1 from public.paket_gruppen
                 where paket_id = v_exklusiv and typ = 'wahl' and gruppen = array['fingerfood'] and min_auswahl = 2 and max_auswahl = 2) then
    raise exception 'Exklusiv: Block "2× Fingerfood" fehlt.';
  end if;
end $$;

commit;
