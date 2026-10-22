-- Titel: I18N-2 Katalog auf Englisch und Russisch, Sprache der Anfrage
-- Mama Mia · Mehrsprachig · Teil 1
--
-- 1. Neben jedem Text, den Kunden im Generator und auf der Website sehen, je eine Spalte _en und _ru.
--    Leer heißt: es erscheint der deutsche Text. Gefüllt aus supabase/daten/katalog-uebersetzung.json
--    (erzeugt mit werkzeug/uebersetzung-sql.mjs, nicht von Hand ändern).
-- 2. requests.sprache: in welcher Sprache der Kunde angefragt hat (de, en, ru; Vorgabe de).
--    Die Regel für anonyme Anfragen bleibt; der Check lässt nur diese drei Werte zu.
-- 3. Zwei deutsche Stil-Beschreibungen ohne Gedankenstrich.
--
-- Wer darf was: Die neuen Spalten erben die Regeln ihrer Tabelle (Kataloge lesen alle, schreiben nur angemeldet).
-- Bestehende Anfragen bekommen 'de'. Läuft als Ganzes oder gar nicht. Am Ende eine Übersicht, was gefüllt ist.

begin;

-- ───────────────────────── 1. Neue Spalten ─────────────────────────
alter table public.essensarten
  add column if not exists label_en text,
  add column if not exists label_ru text,
  add column if not exists beschreibung_en text,
  add column if not exists beschreibung_ru text;

alter table public.pakete
  add column if not exists name_en text,
  add column if not exists name_ru text,
  add column if not exists untertitel_en text,
  add column if not exists untertitel_ru text,
  add column if not exists hinweis_en text,
  add column if not exists hinweis_ru text,
  add column if not exists leistungen_en text[] not null default '{}',
  add column if not exists leistungen_ru text[] not null default '{}';

alter table public.gruppen
  add column if not exists label_en text,
  add column if not exists label_ru text,
  add column if not exists label_einzahl_en text,
  add column if not exists label_einzahl_ru text;

alter table public.paket_gruppen
  add column if not exists label_en text,
  add column if not exists label_ru text;

alter table public.stile
  add column if not exists label_en text,
  add column if not exists label_ru text,
  add column if not exists beschreibung_en text,
  add column if not exists beschreibung_ru text;

alter table public.gerichte
  add column if not exists name_en text,
  add column if not exists name_ru text;

-- ───────────────────────── 2. Sprache der Anfrage ─────────────────────────
alter table public.requests
  add column if not exists sprache text not null default 'de';
alter table public.requests drop constraint if exists requests_sprache_check;
alter table public.requests
  add constraint requests_sprache_check check (sprache in ('de', 'en', 'ru'));
comment on column public.requests.sprache is 'Sprache, in der der Kunde angefragt hat (de, en, ru). Mails an Jana bleiben deutsch.';

-- ───────────────────────── 3. Gedankenstriche ─────────────────────────
update public.stile set beschreibung = 'Pelmeni, Borschtsch, Plow: Spezialitäten aus Osteuropa' where slug = 'osteuropaeisch';
update public.stile set beschreibung = 'Vielfalt für jeden Geschmack, etwas für alle dabei' where slug = 'buntes_buffet';

-- ───────────────────────── 4. Übersetzungen ─────────────────────────
update public.essensarten set label_en = 'Breakfast', label_ru = 'Завтрак' where label = 'Frühstück';
update public.essensarten set label_en = 'Hot & cold buffet', label_ru = 'Буфет с холодными и горячими блюдами' where label = 'Kalt-warmes Buffet';
update public.essensarten set label_en = 'Finger food', label_ru = 'Фингерфуд' where label = 'Fingerfood';
update public.pakete set name_en = 'Classic', name_ru = 'Классика' where name = 'Klassisch';
update public.pakete set name_en = 'Delight', name_ru = 'Наслаждение' where name = 'Genuss';
update public.pakete set name_en = 'Premium', name_ru = 'Премиум' where name = 'Premium';
update public.pakete set name_en = 'Exclusive', name_ru = 'Эксклюзив' where name = 'Exklusiv';
update public.pakete set untertitel_en = 'Tasty & reliable', untertitel_ru = 'Вкусно и надёжно' where untertitel = 'Schmackhaft & solide';
update public.pakete set untertitel_en = 'The most popular choice', untertitel_ru = 'Самый популярный выбор' where untertitel = 'Die beliebteste Wahl';
update public.pakete set untertitel_en = 'The full experience', untertitel_ru = 'По полной программе' where untertitel = 'Das volle Erlebnis';
update public.pakete set untertitel_en = 'For special occasions', untertitel_ru = 'Для особых случаев' where untertitel = 'Für besondere Anlässe';
update public.pakete set hinweis_en = 'Most booked', hinweis_ru = 'Чаще всего заказывают' where hinweis = 'Meistgebucht';
update public.pakete set leistungen_en = array['Menu consultation'], leistungen_ru = array['Консультация по меню'] where leistungen = array['Menüberatung'];
update public.gruppen set label_en = 'Starters', label_ru = 'Закуски', label_einzahl_en = 'Starter', label_einzahl_ru = 'Закуска' where slug = 'vorspeise';
update public.gruppen set label_en = 'Main courses', label_ru = 'Горячие блюда', label_einzahl_en = 'Main course', label_einzahl_ru = 'Горячее блюдо' where slug = 'hauptgericht';
update public.gruppen set label_en = 'Sides', label_ru = 'Гарниры', label_einzahl_en = 'Side', label_einzahl_ru = 'Гарнир' where slug = 'beilage';
update public.gruppen set label_en = 'Vegetable sides', label_ru = 'Овощные гарниры', label_einzahl_en = 'Vegetable side', label_einzahl_ru = 'Овощной гарнир' where slug = 'gemuese';
update public.gruppen set label_en = 'Salads', label_ru = 'Салаты', label_einzahl_en = 'Salad', label_einzahl_ru = 'Салат' where slug = 'salat';
update public.gruppen set label_en = 'Desserts', label_ru = 'Десерты', label_einzahl_en = 'Dessert', label_einzahl_ru = 'Десерт' where slug = 'dessert';
update public.gruppen set label_en = 'Cakes & tortes', label_ru = 'Пироги и торты', label_einzahl_en = 'Cake', label_einzahl_ru = 'Пирог' where slug = 'kuchen';
update public.gruppen set label_en = 'Savoury breakfast', label_ru = 'Сытный завтрак', label_einzahl_en = 'Savoury', label_einzahl_ru = 'Сытное' where slug = 'fruehstueck_herzhaft';
update public.gruppen set label_en = 'Sweets & pastries', label_ru = 'Сладкое и выпечка', label_einzahl_en = 'Sweet', label_einzahl_ru = 'Сладкое' where slug = 'fruehstueck_suess';
update public.gruppen set label_en = 'In a glass', label_ru = 'В стаканчике', label_einzahl_en = 'In a glass', label_einzahl_ru = 'В стаканчике' where slug = 'fruehstueck_glas';
update public.gruppen set label_en = 'Savoury brunch extra', label_ru = 'Сытное дополнение к бранчу', label_einzahl_en = 'Brunch extra', label_einzahl_ru = 'Дополнение к бранчу' where slug = 'brunch_herzhaft';
update public.gruppen set label_en = 'Salmon upgrade', label_ru = 'Дополнение с лососем', label_einzahl_en = 'Salmon upgrade', label_einzahl_ru = 'Дополнение с лососем' where slug = 'fruehstueck_lachs';
update public.gruppen set label_en = 'Included', label_ru = 'Включено', label_einzahl_en = 'Included', label_einzahl_ru = 'Включено' where slug = 'inklusiv';
update public.gruppen set label_en = 'Finger food', label_ru = 'Фингерфуд', label_einzahl_en = 'Finger food item', label_einzahl_ru = 'Позиция фингерфуда' where slug = 'fingerfood';
update public.paket_gruppen set label_en = 'Savoury platter', label_ru = 'Сытное ассорти' where label = 'Herzhafte Platte';
update public.paket_gruppen set label_en = 'Sweets & pastries', label_ru = 'Сладкое и выпечка' where label = 'Süßes & Gebäck';
update public.paket_gruppen set label_en = 'In a glass', label_ru = 'В стаканчике' where label = 'Im Glas';
update public.paket_gruppen set label_en = 'Canapé platter', label_ru = 'Ассорти канапе' where label = 'Canapé-Platte';
update public.paket_gruppen set label_en = 'Rolls & croissants', label_ru = 'Булочки и круассаны' where label = 'Brötchen & Croissants';
update public.paket_gruppen set label_en = 'Starter', label_ru = 'Закуска' where label = 'Vorspeise';
update public.paket_gruppen set label_en = 'Main course', label_ru = 'Горячее блюдо' where label = 'Hauptgericht';
update public.paket_gruppen set label_en = 'Sides', label_ru = 'Гарниры' where label = 'Beilagen';
update public.paket_gruppen set label_en = 'Starters', label_ru = 'Закуски' where label = 'Vorspeisen';
update public.paket_gruppen set label_en = 'Main courses', label_ru = 'Горячие блюда' where label = 'Hauptgerichte';
update public.paket_gruppen set label_en = 'Dessert', label_ru = 'Десерт' where label = 'Dessert';
update public.paket_gruppen set label_en = 'Desserts', label_ru = 'Десерты' where label = 'Desserts';
update public.paket_gruppen set label_en = 'Finger food on the side', label_ru = 'Фингерфуд в дополнение' where label = 'Fingerfood dazu';
update public.paket_gruppen set label_en = 'Savoury brunch extra', label_ru = 'Сытное дополнение к бранчу' where label = 'Herzhaftes Brunch-Extra';
update public.paket_gruppen set label_en = 'Salmon upgrade', label_ru = 'Дополнение с лососем' where label = 'Lachs-Upgrade';
update public.paket_gruppen set label_en = 'Finger food', label_ru = 'Фингерфуд' where label = 'Fingerfood';
update public.paket_gruppen set label_en = 'Finger food items', label_ru = 'Позиции фингерфуда' where label = 'Fingerfood-Teile';
update public.stile set label_en = 'Your choice', label_ru = 'Свой выбор', beschreibung_en = 'Put your menu together completely freely', beschreibung_ru = 'Соберите меню полностью на свой вкус' where slug = 'individuell';
update public.stile set label_en = 'Mediterranean', label_ru = 'Средиземноморский', beschreibung_en = 'Light summery cooking with an Italian touch', beschreibung_ru = 'Лёгкая летняя кухня в итальянском стиле' where slug = 'mediterran';
update public.stile set label_en = 'Classic German', label_ru = 'Классическая немецкая', beschreibung_en = 'Hearty home cooking, just the way people love it', beschreibung_ru = 'Сытная домашняя кухня, как все любят' where slug = 'klassisch_deutsch';
update public.stile set label_en = 'Modern festive', label_ru = 'Современный праздничный', beschreibung_en = 'Modern classics reinterpreted for special occasions', beschreibung_ru = 'Современная классика в новом прочтении для особых случаев' where slug = 'modern_festlich';
update public.stile set label_en = 'Eastern European', label_ru = 'Восточноевропейская', beschreibung_en = 'Pelmeni, borscht, plov: specialities from Eastern Europe', beschreibung_ru = 'Пельмени, борщ, плов: блюда восточноевропейской кухни' where slug = 'osteuropaeisch';
update public.stile set label_en = 'Colourful buffet', label_ru = 'Пёстрый буфет', beschreibung_en = 'Variety for every taste, something for everyone', beschreibung_ru = 'Разнообразие на любой вкус, каждый найдёт своё' where slug = 'buntes_buffet';
update public.stile set label_en = 'Classic elegant', label_ru = 'Классика с элегантностью', beschreibung_en = 'Timeless elegance with fine traditional dishes', beschreibung_ru = 'Неподвластная времени элегантность и изысканные традиционные блюда' where slug = 'klassisch_elegant';
update public.stile set label_en = 'Kid friendly', label_ru = 'Для детей', beschreibung_en = 'Favourite dishes that school children love', beschreibung_ru = 'Любимые блюда, которые нравятся школьникам' where slug = 'kinderfreundlich';
update public.gerichte set name_en = 'Anatolian minced meat bake with cabbage', name_ru = 'Анатолийская запеканка с фаршем и капустой' where name = 'Anatolischer Hackfleischauflauf mit Kohl';
update public.gerichte set name_en = 'Antipasti platter with bread basket', name_ru = 'Ассорти антипасти с хлебной корзиной' where name = 'Antipasti-Platte mit Brotkorb';
update public.gerichte set name_en = 'Apple crumble', name_ru = 'Яблочный крамбл' where name = 'Apfelcrumble';
update public.gerichte set name_en = 'Apple cake with custard', name_ru = 'Яблочный пирог с заварным кремом' where name = 'Apfelkuchen mit Pudding';
update public.gerichte set name_en = 'Apple marzipan cake', name_ru = 'Яблочный пирог с марципаном' where name = 'Apfelmarzipankuchen';
update public.gerichte set name_en = 'Selection of spreads', name_ru = 'Ассорти паст и намазок' where name = 'Aufstriche-Variation';
update public.gerichte set name_en = 'Roast potato salad with tomato, mozzarella and pesto', name_ru = 'Салат из запечённого картофеля с томатами, моцареллой и песто' where name = 'Backkartoffelsalat mit Tomate, Mozzarella, Pesto';
update public.gerichte set name_en = 'Chicken bagel', name_ru = 'Бейгл с курицей' where name = 'Bagel mit Hühnchen';
update public.gerichte set name_en = 'Salmon bagel', name_ru = 'Бейгл с лососем' where name = 'Bagel mit Lachs';
update public.gerichte set name_en = 'Tomato mozzarella bagel', name_ru = 'Бейгл с томатами и моцареллой' where name = 'Bagel mit Tomate-Mozzarella';
update public.gerichte set name_en = 'Banana split', name_ru = 'Банана сплит' where name = 'Bananensplit';
update public.gerichte set name_en = 'Ribbon noodles', name_ru = 'Ленточная лапша' where name = 'Bandnudeln';
update public.gerichte set name_en = 'Filled rolls', name_ru = 'Булочки с начинкой' where name = 'Belegte Brötchen';
update public.gerichte set name_en = 'Belyashi (fried pastries with minced meat)', name_ru = 'Беляши' where name = 'Beljaschi (frittierte Teigtaschen mit Hack)';
update public.gerichte set name_en = 'Bee sting cake in a glass', name_ru = 'Пирог «Пчелиный укус» в стаканчике' where name = 'Bienenstich im Glas';
update public.gerichte set name_en = 'Puff pastry parcels', name_ru = 'Слойки' where name = 'Blätterteigtaschen';
update public.gerichte set name_en = 'Bockwurst sausages', name_ru = 'Сосиски' where name = 'Bockwürste';
update public.gerichte set name_en = 'Meat patties (Bouletten)', name_ru = 'Котлеты' where name = 'Bouletten';
update public.gerichte set name_en = 'Bread & butter', name_ru = 'Хлеб и масло' where name = 'Brot & Butter';
update public.gerichte set name_en = 'Bread, butter & spreads', name_ru = 'Хлеб, масло и пасты' where name = 'Brot, Butter & Aufstriche';
update public.gerichte set name_en = 'Rolls & croissants', name_ru = 'Булочки и круассаны' where name = 'Brötchen & Croissants';
update public.gerichte set name_en = 'Bruschetta', name_ru = 'Брускетта' where name = 'Bruschetta';
update public.gerichte set name_en = 'Colourful vegetable bake', name_ru = 'Пёстрая овощная запеканка' where name = 'Bunter Gemüseauflauf';
update public.gerichte set name_en = 'Buttered vegetables', name_ru = 'Овощи в сливочном масле' where name = 'Buttergemüse';
update public.gerichte set name_en = 'Butter biscuit cake', name_ru = 'Торт из печенья' where name = 'Butterkekskuchen';
update public.gerichte set name_en = 'Caesar salad', name_ru = 'Салат «Цезарь»' where name = 'Caesar Salat';
update public.gerichte set name_en = 'Canapé platter', name_ru = 'Ассорти канапе' where name = 'Canapé-Platte';
update public.gerichte set name_en = 'Couscous salad in a glass', name_ru = 'Салат с кускусом в стаканчике' where name = 'Couscoussalat im Glas';
update public.gerichte set name_en = 'Creamy spinach and tortellini soup', name_ru = 'Сливочный суп со шпинатом и тортеллини' where name = 'Cremige Spinat-Tortellini-Suppe';
update public.gerichte set name_en = 'Creamy tortellini bake', name_ru = 'Сливочная запеканка с тортеллини' where name = 'Cremiger Tortellini-Auflauf';
update public.gerichte set name_en = 'Creamy Tuscan chicken', name_ru = 'Курица по-тоскански в сливочном соусе' where name = 'Cremiges Toskanisches Hähnchen';
update public.gerichte set name_en = 'Draniki (potato pancakes) with sour cream', name_ru = 'Драники со сметаной' where name = 'Draniki (Reibekuchen) mit Smetana';
update public.gerichte set name_en = 'Pancake rolls with salmon', name_ru = 'Блинные рулетики с лососем' where name = 'Eierkuchen-Lachsröllchen';
update public.gerichte set name_en = 'Pancake platter (filled or plain)', name_ru = 'Блины (с начинкой или без)' where name = 'Eierkuchen-Platte (mit Füllung oder pur)';
update public.gerichte set name_en = 'Strawberry slices with custard', name_ru = 'Клубничные пирожные с заварным кремом' where name = 'Erdbeerschnitten mit Pudding';
update public.gerichte set name_en = 'Meatloaf with gravy', name_ru = 'Мясной рулет с соусом' where name = 'Falscher Hase mit Soße';
update public.gerichte set name_en = 'Fresh mixed salad', name_ru = 'Свежий микс салат' where name = 'Frischer Mixsalat';
update public.gerichte set name_en = 'Cream cheese brownies', name_ru = 'Брауни со сливочным сыром' where name = 'Frischkäse-Brownies';
update public.gerichte set name_en = 'Prawn skewers', name_ru = 'Шпажки с креветками' where name = 'Garnelen-Spieße';
update public.gerichte set name_en = 'Pastry platter (crescents, milk rolls, swirls)', name_ru = 'Ассорти выпечки (рогалики, молочные булочки, улитки)' where name = 'Gebäck-Platte (Hörnchen, Milchbrötchen, Schnecken)';
update public.gerichte set name_en = 'Devilled eggs', name_ru = 'Фаршированные яйца' where name = 'Gefüllte Eier';
update public.gerichte set name_en = 'Stuffed peppers with minced meat', name_ru = 'Фаршированный перец с мясом' where name = 'Gefüllte Paprika mit Hack';
update public.gerichte set name_en = 'Vegetarian stuffed peppers', name_ru = 'Фаршированный перец вегетарианский' where name = 'Gefüllte Paprika vegetarisch';
update public.gerichte set name_en = 'Vegetable curry with rice', name_ru = 'Овощное карри с рисом' where name = 'Gemüsecurry-Reis';
update public.gerichte set name_en = 'Vegetable platter with dips', name_ru = 'Овощное ассорти с соусами' where name = 'Gemüseplatte mit Dips';
update public.gerichte set name_en = 'Glazed carrots', name_ru = 'Глазированная морковь' where name = 'Glasierte Möhren';
update public.gerichte set name_en = 'Greek pasta bake with feta and minced meat', name_ru = 'Греческая запеканка из макарон с фетой и фаршем' where name = 'Griechischer Nudelauflauf mit Feta und Hack';
update public.gerichte set name_en = 'Greek salad', name_ru = 'Греческий салат' where name = 'Griechischer Salat';
update public.gerichte set name_en = 'Green beans', name_ru = 'Стручковая фасоль' where name = 'Grüne Bohnen';
update public.gerichte set name_en = 'Green borscht (with sorrel)', name_ru = 'Зелёный борщ со щавелем' where name = 'Grüner Borschtsch (mit Sauerampfer)';
update public.gerichte set name_en = 'Goulash soup', name_ru = 'Суп-гуляш' where name = 'Gulaschsuppe';
update public.gerichte set name_en = 'Cucumber and tomato salad', name_ru = 'Салат из огурцов и помидоров' where name = 'Gurken-Tomaten-Salat';
update public.gerichte set name_en = 'Meatball platter', name_ru = 'Ассорти тефтелек' where name = 'Hackbällchen-Platte';
update public.gerichte set name_en = 'Chicken baked with peach and cheese', name_ru = 'Курица, запечённая с персиком и сыром' where name = 'Hähnchen überbacken mit Pfirsich und Käse';
update public.gerichte set name_en = 'Chicken canapés', name_ru = 'Канапе с курицей' where name = 'Hähnchen-Canapés';
update public.gerichte set name_en = 'Chicken parmesan soup', name_ru = 'Куриный суп с пармезаном' where name = 'Hähnchen-Parmesan-Suppe';
update public.gerichte set name_en = 'Chicken breast in cream cheese and parmesan sauce', name_ru = 'Куриное филе в соусе из сливочного сыра и пармезана' where name = 'Hähnchenfilet in Frischkäse-Parmesansoße';
update public.gerichte set name_en = 'Chicken breast in honey mustard sauce', name_ru = 'Куриное филе в медово-горчичном соусе' where name = 'Hähnchenfilet in Honigsenfsoße';
update public.gerichte set name_en = 'Chicken breast in tomato mozzarella sauce', name_ru = 'Куриное филе в томатном соусе с моцареллой' where name = 'Hähnchenfilet in Tomaten-Mozzarellasoße';
update public.gerichte set name_en = 'Sliced chicken in cream sauce', name_ru = 'Куриный бефстроганов' where name = 'Hähnchengeschnetzeltes';
update public.gerichte set name_en = 'Chicken legs with roast vegetables', name_ru = 'Куриные окорочка с запечёнными овощами' where name = 'Hähnchenkeulen mit Ofengemüse';
update public.gerichte set name_en = 'Khachapuri (cheese bread)', name_ru = 'Хачапури' where name = 'Hatschapuri (Fladenbrot mit Käse)';
update public.gerichte set name_en = 'Raspberry Oreo dessert', name_ru = 'Малиновый десерт с орео' where name = 'Himbeer-Oreo-Dessert';
update public.gerichte set name_en = 'Raspberry dream', name_ru = 'Малиновая мечта' where name = 'Himbeertraum';
update public.gerichte set name_en = 'Honey balsamic vegetables', name_ru = 'Овощи в медово-бальзамическом соусе' where name = 'Honig-Balsamico-Gemüse';
update public.gerichte set name_en = 'Chicken drumsticks', name_ru = 'Куриные голени' where name = 'Hühnerkeulchen';
update public.gerichte set name_en = 'Potato and feta bake', name_ru = 'Картофельная запеканка с фетой' where name = 'Kartoffel-Feta-Auflauf';
update public.gerichte set name_en = 'Potato bake', name_ru = 'Картофельная запеканка' where name = 'Kartoffelauflauf';
update public.gerichte set name_en = 'Mashed potatoes', name_ru = 'Картофельное пюре' where name = 'Kartoffelpüree';
update public.gerichte set name_en = 'Potato salad', name_ru = 'Картофельный салат' where name = 'Kartoffelsalat';
update public.gerichte set name_en = 'Potato salad in a glass with meatballs', name_ru = 'Картофельный салат в стаканчике с тефтельками' where name = 'Kartoffelsalat im Glas mit Hackbällchen';
update public.gerichte set name_en = 'Potato soup with or without sausage', name_ru = 'Картофельный суп с сосисками или без' where name = 'Kartoffelsuppe mit/ohne Würstchen';
update public.gerichte set name_en = 'Cheese and cold cuts platter with vegetables and bread basket', name_ru = 'Сырно-колбасное ассорти с овощами и хлебной корзиной' where name = 'Käse-Wurst-Platte mit Gemüse und Brotkorb';
update public.gerichte set name_en = 'Raspberry cheesecake in a glass', name_ru = 'Чизкейк с малиной в стаканчике' where name = 'Käsekuchen mit Himbeeren im Glas';
update public.gerichte set name_en = 'Cheese and leek soup with or without minced meat', name_ru = 'Сырный суп с пореем, с фаршем или без' where name = 'Käselauchsuppe mit/ohne Hack';
update public.gerichte set name_en = 'Cheese platter', name_ru = 'Сырное ассорти' where name = 'Käseplatte';
update public.gerichte set name_en = 'Smoked pork slices (Kassler)', name_ru = 'Копчёная свиная корейка' where name = 'Kasslerscheiben';
update public.gerichte set name_en = 'Kinder Pingui cake', name_ru = 'Торт «Киндер Пингви»' where name = 'Kinder-Pingui-Kuchen';
update public.gerichte set name_en = 'Garlic bread', name_ru = 'Чесночный хлеб' where name = 'Knoblauchbrot';
update public.gerichte set name_en = 'Potato croquettes', name_ru = 'Картофельные крокеты' where name = 'Kroketten';
update public.gerichte set name_en = 'Pumpkin soup', name_ru = 'Тыквенный суп' where name = 'Kürbissuppe';
update public.gerichte set name_en = 'Salmon in cream sauce', name_ru = 'Лосось в сливочном соусе' where name = 'Lachs in Sahnesoße';
update public.gerichte set name_en = 'Salmon in lemon sauce', name_ru = 'Лосось в лимонном соусе' where name = 'Lachs in Zitronensoße';
update public.gerichte set name_en = 'Salmon canapés', name_ru = 'Канапе с лососем' where name = 'Lachs-Canapés';
update public.gerichte set name_en = 'Salmon upgrade', name_ru = 'Дополнение с лососем' where name = 'Lachs-Upgrade';
update public.gerichte set name_en = 'Calabrian lasagne', name_ru = 'Лазанья по-калабрийски' where name = 'Lasagne auf Kalabrisch';
update public.gerichte set name_en = 'Classic lasagne', name_ru = 'Классическая лазанья' where name = 'Lasagne klassisch';
update public.gerichte set name_en = 'Vegetarian lasagne (spinach or vegetables)', name_ru = 'Вегетарианская лазанья (со шпинатом или овощами)' where name = 'Lasagne vegetarisch (Spinat oder Gemüse)';
update public.gerichte set name_en = 'Lasagne soup', name_ru = 'Суп-лазанья' where name = 'Lasagnesuppe';
update public.gerichte set name_en = 'Limoncello mousse', name_ru = 'Мусс лимончелло' where name = 'Limoncello-Mousse';
update public.gerichte set name_en = 'Mama Mia dessert with quark cream and berries', name_ru = 'Десерт «Мама Миа» с творожным кремом и ягодами' where name = 'Mama Mia Dessert mit Quarkcreme und Beeren';
update public.gerichte set name_en = 'Marinated aubergines', name_ru = 'Маринованные баклажаны' where name = 'Marinierte Auberginen';
update public.gerichte set name_en = 'Mediterranean pasta salad in a glass', name_ru = 'Средиземноморский салат с макаронами в стаканчике' where name = 'Mediterraner Nudelsalat im Glas';
update public.gerichte set name_en = 'Medovik (honey layer cake)', name_ru = 'Медовик' where name = 'Medowik (Honigkuchen)';
update public.gerichte set name_en = 'Milk slice cake', name_ru = 'Торт «Милх-шнитте»' where name = 'Milchschnitte-Kuchen';
update public.gerichte set name_en = 'Minestrone', name_ru = 'Минестроне' where name = 'Minestrone';
update public.gerichte set name_en = 'Mini brownie and chocolate mousse trifles', name_ru = 'Мини-трайфлы с брауни и шоколадным муссом' where name = 'Mini Brownie-Chocolate-Mousse-Trifles';
update public.gerichte set name_en = 'Mini burgers (homemade)', name_ru = 'Мини-бургеры (домашние)' where name = 'Mini-Burger (hausgemacht)';
update public.gerichte set name_en = 'Mini chicken burgers', name_ru = 'Мини-бургеры с курицей' where name = 'Mini-Burger mit Hühnchen';
update public.gerichte set name_en = 'Mini pulled pork burgers', name_ru = 'Мини-бургеры с пулд порк' where name = 'Mini-Burger Pulled Pork';
update public.gerichte set name_en = 'Vegetarian mini burgers (cheese, vegetables)', name_ru = 'Вегетарианские мини-бургеры (сыр, овощи)' where name = 'Mini-Burger vegetarisch (Käse, Gemüse)';
update public.gerichte set name_en = 'Mini doner kebabs', name_ru = 'Мини-дёнер' where name = 'Mini-Döner';
update public.gerichte set name_en = 'Mini tarte flambée', name_ru = 'Мини-фламмкухен' where name = 'Mini-Flammkuchen';
update public.gerichte set name_en = 'Mini pretzel rolls with Leberkäse', name_ru = 'Мини-брецели с леберкезе' where name = 'Mini-Laugenteilchen mit Leberkäse';
update public.gerichte set name_en = 'Mini pretzel rolls with tomato and mozzarella', name_ru = 'Мини-брецели с томатами и моцареллой' where name = 'Mini-Laugenteilchen mit Tomate-Mozzarella';
update public.gerichte set name_en = 'Mini quiches', name_ru = 'Мини-киши' where name = 'Mini-Quiches';
update public.gerichte set name_en = 'Mini sandwiches', name_ru = 'Мини-сэндвичи' where name = 'Mini-Sandwiches';
update public.gerichte set name_en = 'Mini schnitzels', name_ru = 'Мини-шницели' where name = 'Mini-Schnitzel';
update public.gerichte set name_en = 'Mixed mini wrap rolls', name_ru = 'Ассорти мини-роллов из лаваша' where name = 'Mini-Wrapröllchen gemischt';
update public.gerichte set name_en = 'Mini wraps with crispy chicken', name_ru = 'Мини-врапы с жареной курицей' where name = 'Mini-Wraps mit frittiertem Hühnchen';
update public.gerichte set name_en = 'Mini wraps with tomato and mozzarella', name_ru = 'Мини-врапы с томатами и моцареллой' where name = 'Mini-Wraps mit Tomate-Mozzarella';
update public.gerichte set name_en = 'Carrot and apple salad', name_ru = 'Морковный салат с яблоком' where name = 'Möhrensalat mit Apfel';
update public.gerichte set name_en = 'Moussaka', name_ru = 'Мусака' where name = 'Moussaka';
update public.gerichte set name_en = 'Chocolate mousse', name_ru = 'Шоколадный мусс' where name = 'Mousse au Chocolat';
update public.gerichte set name_en = 'Layered muesli dessert', name_ru = 'Мюсли-парфе' where name = 'Müsli-Schichtspeise';
update public.gerichte set name_en = 'Nalysnyky (crêpes) with chicken and mushrooms', name_ru = 'Налистники с курицей и грибами' where name = 'Nalisniki mit Hühnchen und Pilzen';
update public.gerichte set name_en = 'Nalysnyky (crêpes) with quark and berries', name_ru = 'Налистники с творогом и ягодами' where name = 'Nalisniki mit Quark und Beeren';
update public.gerichte set name_en = 'Napoleon cake', name_ru = 'Торт «Наполеон»' where name = 'Napoleon-Torte';
update public.gerichte set name_en = 'Pasta bake', name_ru = 'Запеканка из макарон' where name = 'Nudelauflauf';
update public.gerichte set name_en = 'Fruit platter', name_ru = 'Фруктовое ассорти' where name = 'Obstplatte';
update public.gerichte set name_en = 'Fruit skewers', name_ru = 'Фруктовые шпажки' where name = 'Obstspieße';
update public.gerichte set name_en = 'Oven baked chicken with vegetables and cheese', name_ru = 'Курица из духовки с овощами и сыром' where name = 'Ofenhähnchen mit Gemüse und Käse';
update public.gerichte set name_en = 'Pancake platter with fruit', name_ru = 'Панкейки с фруктами' where name = 'Pancake-Platte mit Obst';
update public.gerichte set name_en = 'Panna cotta', name_ru = 'Панна-котта' where name = 'Panna Cotta';
update public.gerichte set name_en = 'Boiled jacket potatoes with dill', name_ru = 'Картофель в мундире с укропом' where name = 'Pellkartoffeln mit Dill';
update public.gerichte set name_en = 'Pelmeni (dumplings with minced meat)', name_ru = 'Пельмени' where name = 'Pelmeni (Teigtaschen mit Hackfleisch)';
update public.gerichte set name_en = 'Pesto pasta salad', name_ru = 'Салат с пастой и песто' where name = 'Pesto-Pasta-Salat';
update public.gerichte set name_en = 'Pirozhki with potato, meat or apple', name_ru = 'Пирожки с картошкой, мясом или яблоком' where name = 'Piroschki mit Kartoffeln/Fleisch/Apfel';
update public.gerichte set name_en = 'Bread journey platter with dips', name_ru = 'Ассорти «Хлебное путешествие» с соусами' where name = 'Platte Brotreise mit Dipps';
update public.gerichte set name_en = 'Mediterranean platter (grilled vegetables, sheep''s cheese)', name_ru = 'Средиземноморское ассорти (овощи гриль, овечий сыр)' where name = 'Platte Mediterran (Grillgemüse, Schafskäse)';
update public.gerichte set name_en = 'Rustic platter (pretzels, Leberkäse, cheese)', name_ru = 'Деревенское ассорти (брецели, леберкезе, сыр)' where name = 'Platte rustikal (Brezeln, Leberkäs, Käse)';
update public.gerichte set name_en = 'Plov (rice with meat)', name_ru = 'Плов' where name = 'Plow (Reisgericht mit Fleisch)';
update public.gerichte set name_en = 'Polenta and vegetable bake', name_ru = 'Запеканка из поленты с овощами' where name = 'Polenta-Gemüse-Auflauf';
update public.gerichte set name_en = 'Polenta slices', name_ru = 'Ломтики поленты' where name = 'Polenta-Schnitten';
update public.gerichte set name_en = 'Premium bread, spreads & cheese platter', name_ru = 'Премиум-хлеб, пасты и сырное ассорти' where name = 'Premium-Brot, Aufstriche & Käseplatte';
update public.gerichte set name_en = 'Quark dessert with fruit', name_ru = 'Творожный десерт с фруктами' where name = 'Quarkspeise mit Obst';
update public.gerichte set name_en = 'Rassolnik (pickle soup)', name_ru = 'Рассольник' where name = 'Rassolnik (Suppe mit sauren Gurken)';
update public.gerichte set name_en = 'Ratatouille vegetables', name_ru = 'Рататуй' where name = 'Ratatouille-Gemüse';
update public.gerichte set name_en = 'Robber''s schnitzel', name_ru = 'Шницель «по-разбойничьи»' where name = 'Räuberschnitzel';
update public.gerichte set name_en = 'Rice', name_ru = 'Рис' where name = 'Reis';
update public.gerichte set name_en = 'Beef roulade casserole', name_ru = 'Рагу из мясных рулетов' where name = 'Roladentopf';
update public.gerichte set name_en = 'Rosemary potatoes', name_ru = 'Картофель с розмарином' where name = 'Rosmarinkartoffeln';
update public.gerichte set name_en = 'Beetroot salad', name_ru = 'Свекольный салат' where name = 'Rote-Bete-Salat';
update public.gerichte set name_en = 'Red borscht with pampushky', name_ru = 'Красный борщ с пампушками' where name = 'Roter Borschtsch mit Pampuschki';
update public.gerichte set name_en = 'Red cabbage', name_ru = 'Краснокочанная капуста' where name = 'Rotkohl';
update public.gerichte set name_en = 'Red cabbage with apples', name_ru = 'Краснокочанная капуста с яблоками' where name = 'Rotkohl mit Äpfeln';
update public.gerichte set name_en = 'Rocket salad with tomato, onion and fried feta', name_ru = 'Салат из рукколы с томатами, луком и жареной фетой' where name = 'Rucolasalat mit Tomate, Zwiebeln, frittiertem Feta';
update public.gerichte set name_en = 'Olivier salad (Russian potato salad)', name_ru = 'Салат «Оливье»' where name = 'Salat Olivje (Russischer Kartoffelsalat)';
update public.gerichte set name_en = 'Shuba salad (herring and beetroot)', name_ru = 'Селёдка под шубой' where name = 'Salat Schuba (Matjes und Rote Bete)';
update public.gerichte set name_en = 'Boiled potatoes', name_ru = 'Отварной картофель' where name = 'Salzkartoffeln';
update public.gerichte set name_en = 'Sauerkraut', name_ru = 'Квашеная капуста' where name = 'Sauerkraut';
update public.gerichte set name_en = 'Chocolate cheesecake with cherries', name_ru = 'Шоколадный чизкейк с вишней' where name = 'Schokokäsekuchen mit Kirschen';
update public.gerichte set name_en = 'Black Forest dessert', name_ru = 'Десерт «Шварцвальд»' where name = 'Schwarzwälderdessert';
update public.gerichte set name_en = 'Pork tenderloin wrapped in bacon', name_ru = 'Свиная вырезка в беконе' where name = 'Schweinefilet im Speckmantel';
update public.gerichte set name_en = 'Pork tenderloin in cream sauce', name_ru = 'Свиная вырезка в сливочном соусе' where name = 'Schweinefilet in Rahmsoße';
update public.gerichte set name_en = 'Pork tenderloin in cream sauce with mushrooms', name_ru = 'Свиная вырезка в сливочном соусе с грибами' where name = 'Schweinefilet in Rahmsoße mit Pilzen';
update public.gerichte set name_en = 'Pork schnitzel with mushroom sauce', name_ru = 'Свиной шницель с грибным соусом' where name = 'Schweineschnitzel mit Pilzsoße';
update public.gerichte set name_en = 'Syrniki (quark pancakes)', name_ru = 'Сырники' where name = 'Sirniki (Quarkkeulchen)';
update public.gerichte set name_en = 'Solyanka', name_ru = 'Солянка' where name = 'Soljanka';
update public.gerichte set name_en = 'Spätzle (egg noodles)', name_ru = 'Шпецле' where name = 'Spätzle';
update public.gerichte set name_en = 'Skewers: tomato and mozzarella', name_ru = 'Шпажки: томат и моцарелла' where name = 'Spieße: Tomate-Mozzarella';
update public.gerichte set name_en = 'Skewers: grape and cheese', name_ru = 'Шпажки: виноград и сыр' where name = 'Spieße: Weintrauben-Käse';
update public.gerichte set name_en = 'Apple crumb cake', name_ru = 'Пирог с яблоками и штрейзелем' where name = 'Streuselkuchen mit Apfel';
update public.gerichte set name_en = 'Cherry crumb cake', name_ru = 'Пирог с вишней и штрейзелем' where name = 'Streuselkuchen mit Kirschen';
update public.gerichte set name_en = 'Tagliatelle', name_ru = 'Тальятелле' where name = 'Tagliatelle';
update public.gerichte set name_en = 'Classic tiramisu', name_ru = 'Классический тирамису' where name = 'Tiramisu klassisch';
update public.gerichte set name_en = 'Tiramisu brownies', name_ru = 'Брауни тирамису' where name = 'Tiramisu-Brownies';
update public.gerichte set name_en = 'Tiramisu tartlets', name_ru = 'Пирожные тирамису' where name = 'Tiramisu-Törtchen';
update public.gerichte set name_en = 'Tomato mozzarella in a glass', name_ru = 'Томаты с моцареллой в стаканчике' where name = 'Tomaten-Mozzarella im Glas';
update public.gerichte set name_en = 'Tomato mozzarella plate', name_ru = 'Тарелка томатов с моцареллой' where name = 'Tomaten-Mozzarella-Teller';
update public.gerichte set name_en = 'Tomato salad with red onion', name_ru = 'Салат из помидоров с красным луком' where name = 'Tomatensalat mit roten Zwiebeln';
update public.gerichte set name_en = 'Tomato soup', name_ru = 'Томатный суп' where name = 'Tomatensuppe';
update public.gerichte set name_en = 'Baked filled pretzels', name_ru = 'Запечённые брецели с начинкой' where name = 'Überbackene Brezeln mit Füllung';
update public.gerichte set name_en = 'Oven baked party schnitzels with cheese', name_ru = 'Запечённые праздничные шницели из духовки' where name = 'Überbackene Partyschnitzel aus dem Ofen';
update public.gerichte set name_en = 'Vareniki (dumplings with potato or quark)', name_ru = 'Вареники с картошкой или творогом' where name = 'Wareniki (Teigtaschen mit Kartoffeln/Quark)';
update public.gerichte set name_en = 'Vatrushki with sweet quark', name_ru = 'Ватрушки со сладким творогом' where name = 'Watruschki mit süßem Quark';
update public.gerichte set name_en = 'Cold cuts platter', name_ru = 'Колбасное ассорти' where name = 'Wurstplatte';
update public.gerichte set name_en = 'Goat cheese canapés', name_ru = 'Канапе с козьим сыром' where name = 'Ziegenkäse-Canapés';
update public.gerichte set name_en = 'Lemon mousse cheesecake', name_ru = 'Лимонный чизкейк с муссом' where name = 'Zitronen-Mousse-Käsekuchen';
update public.gerichte set name_en = 'Lemon cake', name_ru = 'Лимонный кекс' where name = 'Zitronenkuchen';
update public.gerichte set name_en = 'Courgette carpaccio', name_ru = 'Карпаччо из цукини' where name = 'Zucchini-Carpaccio';

commit;

-- Übersicht: aktive Einträge ohne russischen Text (sollte überall 0 sein; sonst fehlt eine Übersetzung).
select 'gerichte' as tabelle, count(*) filter (where name_ru is null) as ohne_ru, count(*) as aktiv from public.gerichte where aktiv
union all select 'pakete', count(*) filter (where name_ru is null), count(*) from public.pakete where aktiv
union all select 'stile', count(*) filter (where label_ru is null), count(*) from public.stile where aktiv
union all select 'paket_gruppen', count(*) filter (where label_ru is null), count(*) from public.paket_gruppen where aktiv
union all select 'gruppen', count(*) filter (where label_ru is null), count(*) from public.gruppen
union all select 'essensarten', count(*) filter (where label_ru is null), count(*) from public.essensarten where aktiv;
