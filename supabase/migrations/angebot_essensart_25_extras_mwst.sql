-- Titel: Steuersatz je Extra (7 % Speisen, 19 % Getränke)
--
-- Zuerst im TEST-Projekt (mama-mia-test) ausführen, dann im echten Projekt.
-- VOR dem Merge des CRM-PR "Extras zählten doppelt" ausführen: Das neue CRM liest die Spalte schon.
-- Den heutigen Generator und das heutige CRM stört sie nicht.
--
-- Was passiert:
--   Neue Spalte zusatzwuensche.mwst_prozent, nur 7 oder 19, Vorgabe 7.
--   Getränkeservice bekommt 19 % (Getränke). Alle anderen Extras bleiben bei 7 %.
--   Welche Extras sonst 19 % brauchen (etwa Dekoration oder Servicekraft, wenn extra berechnet),
--   klärt Jana mit dem Steuerbüro; dann eine Zeile wie unten mit dem Namen des Extras.
--   Das CRM übernimmt den Satz, wenn Jana einem Extra einen Preis gibt, und friert ihn in der Anfrage ein.
-- Was NICHT passiert: keine Anfrage und kein Preis ändert sich.
-- Wer darf was: unverändert. zusatzwuensche hat RLS; anonym nur lesen, ändern nur die angemeldete CRM-Nutzerin.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

alter table public.zusatzwuensche add column if not exists mwst_prozent smallint not null default 7;

alter table public.zusatzwuensche drop constraint if exists zusatzwuensche_mwst_gueltig;
alter table public.zusatzwuensche add constraint zusatzwuensche_mwst_gueltig check (mwst_prozent in (7, 19));

update public.zusatzwuensche set mwst_prozent = 19 where label = 'Getränkeservice';

commit;

-- Prüfen (Ausgabe zeigen): jedes Extra mit seinem Satz
select label, aktiv, mwst_prozent from public.zusatzwuensche order by reihenfolge;
