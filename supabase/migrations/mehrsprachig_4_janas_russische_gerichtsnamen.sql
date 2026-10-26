-- Titel: I18N-6 Janas Korrektur der russischen Gerichtsnamen; Draniki raus
-- Mama Mia · Mehrsprachig · Teil 4
--
-- Grundlage: Janas Liste vom 26.10.2026 (per Nachricht an Victor) und ihre beiden Nachrichten:
--   „Налисники!! Без т“ und „Драники пожалуйста убери из меню“.
--
-- Was passiert:
--   1. name_ru wird bei 23 Gerichten durch Janas Wortlaut ersetzt (ё wie im übrigen Katalog).
--   2. „Draniki (Reibekuchen) mit Smetana“ wird abgeschaltet (aktiv = false), nicht gelöscht. Alte Anfragen behalten es.
--   Steht ein Name nicht als aktives Gericht im Katalog (Draniki: gar nicht), bricht alles ab und nichts ändert sich; die Meldung nennt den Namen.
-- Was NICHT passiert: kein deutscher oder englischer Name, kein Preis, keine Anfrage ändert sich.
-- Wer darf was: unverändert (Katalog lesen alle, schreiben nur angemeldet).
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

do $$
declare
  neu text[][] := array[
    ['Antipasti-Platte mit Brotkorb', 'Ассорти итальянских закусок с хлебной корзиной'],
    ['Aufstriche-Variation', 'Ассорти закусочных паст'],
    ['Gemüseplatte mit Dips', 'Овощная тарелка с соусами'],
    ['Mini-Quiches', 'Мини-киш (мини-пироги)'],
    ['Mini-Wraps mit Tomate-Mozzarella', 'Лаваш с томатами и моцареллой'],
    ['Anatolischer Hackfleischauflauf mit Kohl', 'Капустная запеканка по-анатолийски с фаршем'],
    ['Bandnudeln', 'Лапша'],
    ['Gulaschsuppe', 'Гуляш-суп'],
    ['Hackbällchen-Platte', 'Поднос с фрикадельками'],
    ['Kasslerscheiben', 'Сочная копчёная свинина Касслер'],
    ['Moussaka', 'Мусака (греческая запеканка)'],
    ['Pellkartoffeln mit Dill', 'Отварной картофель в мундире'],
    ['Ratatouille-Gemüse', 'Овощное рагу'],
    ['Räuberschnitzel', 'Шницель «Разбойничий»'],
    ['Roladentopf', 'Бефстроганов из говядины по-домашнему'],
    ['Honig-Balsamico-Gemüse', 'Запечённые овощи в медово-бальзамической глазури'],
    ['Pesto-Pasta-Salat', 'Салат с пастой и соусом песто'],
    ['Bananensplit', 'Десерт «Банановый сплит»'],
    ['Bienenstich im Glas', 'Десерт «Пчелиный укус» в стаканчиках'],
    ['Blätterteigtaschen', 'Конвертики из слоёного теста'],
    ['Milchschnitte-Kuchen', 'Нежный молочно-шоколадный торт'],
    ['Nalisniki mit Hühnchen und Pilzen', 'Налисники с курицей и грибами'],
    ['Nalisniki mit Quark und Beeren', 'Налисники с творогом и ягодами']
  ];
  fehlt text;
  i integer;
begin
  select string_agg(neu[k][1], ', ') into fehlt
  from generate_subscripts(neu, 1) as k
  where not exists (select 1 from public.gerichte g where g.name = neu[k][1] and g.aktiv);
  if fehlt is null and not exists (select 1 from public.gerichte where name = 'Draniki (Reibekuchen) mit Smetana') then
    fehlt := 'Draniki (Reibekuchen) mit Smetana';
  end if;
  if fehlt is not null then
    raise exception 'Nicht als aktives Gericht gefunden, nichts geändert: %', fehlt;
  end if;

  for i in 1 .. array_length(neu, 1) loop
    update public.gerichte set name_ru = neu[i][2] where name = neu[i][1] and name_ru is distinct from neu[i][2];
  end loop;
  update public.gerichte set aktiv = false where name = 'Draniki (Reibekuchen) mit Smetana' and aktiv;
end;
$$;

commit;
