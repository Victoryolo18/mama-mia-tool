-- Titel: GEN-6 Preis – Buffet Genuss von 30 € auf 33 € pro Person
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_8_fingerfood_janas_liste.sql.
-- Entscheidung von Victor am 13.10.2026. Begründung: C:\Dev\berichte\hochpreisige-kunden-2026-10-13.md
-- (Genuss ist das meistgewählte Paket; der Abstand zu Premium, 45 €, wird kleiner).
--
-- Was passiert: genau eine Zeile in `pakete` ändert ihren Preis.
-- Was NICHT passiert: Fingerfood Genuss und Frühstück Genuss bleiben. Keine gespeicherte Anfrage ändert
-- sich; ihr Preis steht in der Anfrage selbst. Der bisherige Generator (alte Tabellen) ist nicht betroffen.
-- Läuft als Ganzes oder gar nicht.

begin;

update public.pakete
set preis_pro_person = 33, updated_at = now()
where essensart = 'buffet' and name = 'Genuss' and preis_pro_person = 30;

do $$
declare
  n integer;
begin
  select count(*) into n from public.pakete where essensart = 'buffet' and name = 'Genuss' and preis_pro_person = 33;
  if n <> 1 then
    raise exception 'Buffet Genuss steht nicht auf 33 € (gefunden: % Zeilen). Stand der Tabelle pakete prüfen.', n;
  end if;
end;
$$;

commit;
