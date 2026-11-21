-- Getränkeservice in den Katalog der Zusatzwünsche (Logikprüfung 21.11.2026, Paket 4).
-- Bisher stand er fest im Generator (SchrittExtras.jsx). Migration 25 wollte ihm 19 % MwSt geben, fand aber keine
-- Zeile: Das CRM rechnete den Getränkeservice deshalb mit 7 %. Jetzt steht er im Katalog, mit 19 %, an erster Stelle,
-- und Jana pflegt ihn im CRM wie die anderen Extras. Das Label bleibt "Getränkeservice": So steht es in den alten Anfragen.
-- VOR dem Merge des Generator-PR ausführen, sonst zeigt der Generator ihn bis dahin doppelt.
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts.

begin;

insert into public.zusatzwuensche (label, label_en, label_ru, beschreibung, beschreibung_en, beschreibung_ru, reihenfolge, aktiv, mwst_prozent)
select 'Getränkeservice', 'Drinks service', 'Напитки',
       'Auf Anfrage. Wir besprechen gemeinsam das passende Getränkeangebot für Ihren Anlass.',
       'On request. We will discuss the right drinks for your occasion together.',
       'По запросу. Вместе подберём подходящие напитки для вашего праздника.',
       coalesce((select min(reihenfolge) from public.zusatzwuensche), 1) - 1,
       true, 19
where not exists (select 1 from public.zusatzwuensche where label = 'Getränkeservice');

commit;

-- Prüfen (Ausgabe zeigen): Getränkeservice zuerst, mit 19 %
select label, label_en, label_ru, reihenfolge, aktiv, mwst_prozent from public.zusatzwuensche order by reihenfolge;
