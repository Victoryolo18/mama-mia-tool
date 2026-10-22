-- Titel: GEN-25 Exklusiv: Kartenzeile nur „Menüberatung“
-- Mama Mia · Angebot nach Essensart · Teil 20
--
-- „Persönliche Menüberatung mit Jana“ brach auf der Paket-Karte um; es heißt jetzt nur „Menüberatung“
-- (Victor, 20.10.2026). Gespeicherte Anfragen behalten im Snapshot den Wortlaut, den der Kunde gesehen hat.
-- Läuft als Ganzes oder gar nicht.

begin;

update public.pakete
set leistungen = array['Menüberatung']
where essensart = 'buffet' and name = 'Exklusiv';

do $$
begin
  if not exists (select 1 from public.pakete
                 where essensart = 'buffet' and name = 'Exklusiv' and leistungen = array['Menüberatung']) then
    raise exception 'Paket Exklusiv nicht gefunden oder nicht geändert.';
  end if;
end $$;

commit;
