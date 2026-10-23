-- Titel: I18N-2 Nachtrag: Essensarten über den festen Schlüssel, Janas russische Stilnamen
-- Mama Mia · Mehrsprachig · Teil 2
--
-- 1. Teil 1 suchte die Essensarten über ihren deutschen Namen. Im Test-Projekt heißt eine anders, sie blieb leer.
--    Hier über den Schlüssel (slug), der sich nie ändert.
-- 2. Jana hat sechs russische Stilnamen korrigiert (22.10.2026).
-- Überschreibt nur Übersetzungen, sonst nichts. Läuft als Ganzes oder gar nicht.

begin;

update public.stile set label_ru = 'Индивидуальный заказ'    where slug = 'individuell';
update public.stile set label_ru = 'Средиземноморская кухня' where slug = 'mediterran';
update public.stile set label_ru = 'Немецкая классика'       where slug = 'klassisch_deutsch';
update public.stile set label_ru = 'Ассорти'                 where slug = 'buntes_buffet';
update public.stile set label_ru = 'Элегантная классика'     where slug = 'klassisch_elegant';
update public.stile set label_ru = 'Детское меню'            where slug = 'kinderfreundlich';

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

select 'essensart' as art, slug, label, label_en, label_ru from public.essensarten
union all
select 'stil', slug, label, label_en, label_ru from public.stile where aktiv
order by 1, 2;
