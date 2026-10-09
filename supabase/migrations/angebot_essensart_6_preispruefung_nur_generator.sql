-- Titel: CRM-2 Preisprüfung – nur Anfragen aus dem Generator bewerten
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_5_fingerfood_teile_wortlaut.sql.
--
-- Was passiert: Der Trigger aus Datei 3 rechnet weiter jede neue Anfrage mit angebot_snapshot nach
-- (preis_nachgerechnet), bewertet aber nur noch Anfragen mit source = 'generator' (preis_pruefung).
-- Warum: Im CRM legt Jana Anfragen selbst an und darf Preise bewusst ändern (eigener Gesamtpreis,
-- Zusatzleistungen mit Preis). Das wäre sonst jedes Mal als "weicht_ab" markiert.
-- Ein manipulierter Browser kann als Unangemeldeter die Quelle nicht umgehen: Die Regel für anonyme
-- Einträge wird unten so gesetzt, dass sie nur source = 'generator' zulässt.
--
-- Wer darf was: Eine Policy ändert sich. Bisher durfte ein Unangemeldeter eine Anfrage mit beliebiger
-- Quelle anlegen ("Anon insert requests", with check true). Jetzt nur noch mit Quelle "generator" und
-- Status "neu" — genau das, was der Angebotsgenerator schickt. Lesen, Ändern, Löschen bleibt allein
-- der eingeloggten CRM-Nutzerin.
-- Läuft als Ganzes oder gar nicht.

begin;

drop policy "Anon insert requests" on public.requests;
create policy "Anon insert requests" on public.requests
  for insert to anon
  with check (source = 'generator' and status = 'neu');

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
