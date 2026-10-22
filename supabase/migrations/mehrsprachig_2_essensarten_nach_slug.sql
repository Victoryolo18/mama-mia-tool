-- Titel: I18N-2 Nachtrag: Essensarten über den festen Schlüssel übersetzen
-- Mama Mia · Mehrsprachig · Teil 2
--
-- Teil 1 suchte die Essensarten über ihren deutschen Namen. Im Test-Projekt heißt eine anders, sie blieb leer.
-- Hier über den Schlüssel (slug), der sich nie ändert. Überschreibt nur die Übersetzungen, sonst nichts.
-- Läuft als Ganzes oder gar nicht.

begin;

update public.essensarten set label_en = 'Hot & cold buffet', label_ru = 'Буфет с холодными и горячими блюдами' where slug = 'buffet';
update public.essensarten set label_en = 'Finger food',       label_ru = 'Фингерфуд'                            where slug = 'fingerfood';
update public.essensarten set label_en = 'Breakfast',         label_ru = 'Завтрак'                              where slug = 'fruehstueck';

do $$
begin
  if exists (select 1 from public.essensarten where aktiv and label_ru is null) then
    raise exception 'Eine aktive Essensart hat noch keinen russischen Namen.';
  end if;
end $$;

commit;

select slug, label, label_en, label_ru from public.essensarten order by reihenfolge;
