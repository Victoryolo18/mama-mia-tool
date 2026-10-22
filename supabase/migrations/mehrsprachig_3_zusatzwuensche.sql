-- Titel: I18N-3 Zusatzwünsche auf Englisch und Russisch
-- Mama Mia · Mehrsprachig · Teil 3
--
-- Die Extras im Generator (Kuchen & Torten, Dekoration, Servicekraft) fehlten in Teil 1.
-- Leer heißt wie überall: Es erscheint der deutsche Text. Gemerkt wird in der Anfrage weiter der deutsche Name.
-- Wer darf was: wie bisher (Katalog lesen alle, schreiben nur angemeldet). Läuft als Ganzes oder gar nicht.

begin;

alter table public.zusatzwuensche
  add column if not exists label_en text,
  add column if not exists label_ru text,
  add column if not exists beschreibung_en text,
  add column if not exists beschreibung_ru text;

update public.zusatzwuensche set
  label_en = 'Cakes & tortes', label_ru = 'Пироги и торты',
  beschreibung_en = 'Choose from our homemade cakes and tortes (apple cake, lemon cake, brownies, crumb cake, strawberry slices and much more)',
  beschreibung_ru = 'Выберите из наших домашних пирогов и тортов (яблочный пирог, лимонный кекс, брауни, пирог со штрейзелем, клубничные пирожные и многое другое)'
where label = 'Kuchen & Torten';

update public.zusatzwuensche set
  label_en = 'Decoration', label_ru = 'Оформление',
  beschreibung_en = 'Table decoration to match your theme',
  beschreibung_ru = 'Оформление стола в стиле вашего праздника'
where label = 'Dekoration';

update public.zusatzwuensche set
  label_en = 'Service staff', label_ru = 'Официант',
  beschreibung_en = 'Professional service staff for your event',
  beschreibung_ru = 'Профессиональный официант на вашем празднике'
where label = 'Servicekraft';

commit;

select label, label_en, label_ru from public.zusatzwuensche where aktiv order by reihenfolge;
