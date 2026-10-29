-- Titel: I18N-6 Janas Korrektur der russischen Gerichtsnamen; Draniki, Rotkohl und Zucchini-Carpaccio raus
-- Mama Mia · Mehrsprachig · Teil 4
--
-- Grundlage: Janas zwei Listen vom 26. und 29.10.2026 (per Nachricht an Victor; die Nummern der zweiten Liste
-- beziehen sich auf C:\Dev\berichte\uebersetzung-speisen-jana.txt) und ihre Nachrichten
-- „Налисники!! Без т“ und „Драники пожалуйста убери из меню“. Wo beide Listen etwas sagen, gilt die zweite.
--
-- Was passiert:
--   1. name_ru wird bei 31 Gerichten durch Janas Wortlaut ersetzt (ё wie im übrigen Katalog).
--   2. Drei Gerichte werden abgeschaltet (aktiv = false), nicht gelöscht. Alte Anfragen behalten sie:
--      Draniki (Reibekuchen) mit Smetana; Rotkohl („es reicht Rotkohl mit Äpfeln“); Zucchini-Carpaccio.
--   Steht ein Name nicht als aktives Gericht im Katalog (die drei abzuschaltenden: gar nicht), bricht alles ab
--   und nichts ändert sich; die Meldung nennt den Namen.
-- Was NICHT passiert: kein deutscher oder englischer Name, kein Preis, keine Anfrage ändert sich.
-- Wer darf was: unverändert (Katalog lesen alle, schreiben nur angemeldet).
-- Läuft als Ganzes oder gar nicht; ein zweiter Lauf ändert nichts mehr.

begin;

do $$
declare
  neu text[][] := array[
    ['Antipasti-Platte mit Brotkorb', 'Ассорти итальянских закусок с хлебной корзиной'],
    ['Aufstriche-Variation', 'Ассорти закусочных паст'],
    ['Belegte Brötchen', 'Булочки с колбасой, сыром, овощами'],
    ['Brot, Butter & Aufstriche', 'Хлеб, масло и закусочные пасты'],
    ['Gemüseplatte mit Dips', 'Овощная тарелка с соусами'],
    ['Mini-Quiches', 'Мини-киш (мини-пироги)'],
    ['Mini-Wraps mit Tomate-Mozzarella', 'Лаваш с томатами и моцареллой'],
    ['Anatolischer Hackfleischauflauf mit Kohl', 'Капустная запеканка по-анатолийски с фаршем'],
    ['Bandnudeln', 'Лапша'],
    ['Bunter Gemüseauflauf', 'Овощная запеканка'],
    ['Griechischer Nudelauflauf mit Feta und Hack', 'Греческая запеканка из макарон с брынзой и фаршем'],
    ['Gulaschsuppe', 'Гуляш-суп'],
    ['Hackbällchen-Platte', 'Поднос с фрикадельками'],
    ['Kartoffel-Feta-Auflauf', 'Картофельная запеканка с брынзой'],
    ['Kasslerscheiben', 'Сочная копчёная свинина Касслер'],
    ['Mini-Burger Pulled Pork', 'Мини-бургеры Pulled Pork'],
    ['Moussaka', 'Мусака (греческая запеканка)'],
    ['Pellkartoffeln mit Dill', 'Отварной картофель в мундире'],
    ['Ratatouille-Gemüse', 'Овощное рагу'],
    ['Räuberschnitzel', 'Шницель «Разбойничий»'],
    ['Roladentopf', 'Бефстроганов из говядины по-домашнему'],
    ['Überbackene Partyschnitzel aus dem Ofen', 'Запечённые шницели по-французски'],
    ['Frischer Mixsalat', 'Свежий салат'],
    ['Honig-Balsamico-Gemüse', 'Запечённые овощи в медово-бальзамической глазури'],
    ['Pesto-Pasta-Salat', 'Салат с пастой и соусом песто'],
    ['Bananensplit', 'Банановый сплит'],
    ['Bienenstich im Glas', 'Десерт «Пчелиный укус» в стаканчиках'],
    ['Blätterteigtaschen', 'Конвертики из слоёного теста'],
    ['Milchschnitte-Kuchen', 'Нежный молочно-шоколадный торт'],
    ['Nalisniki mit Hühnchen und Pilzen', 'Налисники с курицей и грибами'],
    ['Nalisniki mit Quark und Beeren', 'Налисники с творогом и ягодами']
  ];
  raus text[] := array['Draniki (Reibekuchen) mit Smetana', 'Rotkohl', 'Zucchini-Carpaccio'];
  fehlt text;
  i integer;
begin
  select string_agg(x, ', ') into fehlt from (
    select neu[k][1] as x from generate_subscripts(neu, 1) as k
    where not exists (select 1 from public.gerichte g where g.name = neu[k][1] and g.aktiv)
    union all
    select r from unnest(raus) as r
    where not exists (select 1 from public.gerichte g where g.name = r)
  ) as f;
  if fehlt is not null then
    raise exception 'Nicht als Gericht gefunden, nichts geändert: %', fehlt;
  end if;

  for i in 1 .. array_length(neu, 1) loop
    update public.gerichte set name_ru = neu[i][2] where name = neu[i][1] and name_ru is distinct from neu[i][2];
  end loop;
  update public.gerichte set aktiv = false where name = any(raus) and aktiv;
end;
$$;

commit;
