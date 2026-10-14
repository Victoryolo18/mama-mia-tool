-- Titel: GEN-7 Preis – Fingerfood Klassisch 18 €, Genuss 24 €, Premium 30 € pro Person
--
-- Zuerst nur im TEST-Projekt (mama-mia-test) ausführen, nach angebot_essensart_9_buffet_genuss_33.sql.
-- Entscheidung von Victor am 14.10.2026. Begründung: C:\Dev\berichte\hochpreisige-kunden-2026-10-13.md,
-- Abschnitt 8 (relaxx 14,90 / 17,90 / 24,90 € für 4 / 6 / 8 Teile; Mama Mia rund 20 % darüber).
--
-- Was passiert: genau die drei Fingerfood-Pakete in `pakete` bekommen einen neuen Preis.
-- Was NICHT passiert: Buffet und Frühstück bleiben. Der Aufpreis "+ 1 Fingerfood-Teil" (3,50 €) bleibt.
-- Keine gespeicherte Anfrage ändert sich; ihr Preis steht in der Anfrage selbst. Der bisherige
-- Generator (alte Tabellen) ist nicht betroffen.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

update public.pakete p
set preis_pro_person = v.preis, updated_at = now()
from (values ('Klassisch', 18), ('Genuss', 24), ('Premium', 30)) as v(name, preis)
where p.essensart = 'fingerfood' and p.name = v.name and p.preis_pro_person <> v.preis;

do $$
declare
  n integer;
begin
  select count(*) into n from public.pakete
  where essensart = 'fingerfood'
    and (name, preis_pro_person) in (('Klassisch', 18), ('Genuss', 24), ('Premium', 30));
  if n <> 3 then
    raise exception 'Erwartet drei Fingerfood-Pakete mit 18 / 24 / 30 €, gefunden %. Namen in der Tabelle pakete prüfen.', n;
  end if;
end;
$$;

commit;
