# Angebot nach Essensart
Priorität: hoch

Betrifft Datenbank, Generator (`GEN`), CRM (`CRM`) und Website (`WEB`). Die Datei liegt im Generator-Repo, weil hier der größte Teil gebaut wird.

## Worum es geht

Heute wählt der Kunde zuerst den Anlass, dann ein Thema, dann ein Paket. Künftig wählt er zuerst, **was** er essen will: kalt-warmes Buffet, Fingerfood oder Frühstück. Zwei Gründe:

- **Marge:** Häppchen sind für Jana viel aufwendiger als eine Suppe, kosten im Buffet aber dasselbe (beide im Slot „Vorspeisen“).
- **Pflege:** Derselbe Preis steht 60-mal in `paket_konfiguration` (78 Zeilen, je Anlass × Thema × Paket), die Auswahllisten sind je Slot kopiert (`slot_gerichte`, mehrere tausend Zeilen), Aufpreise stehen fest im Code (`MamaMiaAngebotsgenerator.jsx:219`, `:1558`). Jana soll alles selbst im CRM ändern können, ohne Victor.

Ist-Stand der Daten: `C:\Dev\angebot-bestand\katalog-2026-10-08.md`.

## Was möglich sein soll

**Kunde (Generator)**
- [ ] Erster Schritt: Buffet, Fingerfood oder Frühstück. Ein Link von der Website kann die Essensart vorwählen und diesen Schritt überspringen.
- [ ] Zweiter Schritt: Paket (Klassisch, Genuss, Premium) mit Preis pro Person; dahinter ein Essensbild der gewählten Essensart.
- [ ] Dritter Schritt: Gerichte wählen. Oben stehen die Stile als Bildkacheln (heutige Themenbilder), „Individuell“ ist vorgewählt und zeigt alles. Die gewählte Kachel ist sichtbar umrandet. Ein Klick auf einen Stil filtert die Listen sofort. Schon gewählte Gerichte bleiben beim Wechsel erhalten.
- [ ] Im Buffet stehen Häppchen nicht mehr unter „Vorspeisen“, sondern in einem eigenen Block „Fingerfood dazu“: jedes Häppchen mit Aufpreis pro Person, die Summe läuft sichtbar mit.
- [ ] „+1 Vorspeise / Hauptgericht / Beilage / Dessert“ bleibt, die Preise kommen aus der Datenbank.
- [ ] Der Anlass ist ein freiwilliges Feld in der Zusammenfassung, kein eigener Schritt.
- [ ] Der angezeigte Preis ist auf jedem Schritt derselbe, den die Anfrage speichert.

**Jana (CRM)**
- [ ] Ein Paketpreis steht an genau einer Stelle (9 Zeilen: 3 Essensarten × 3 Pakete) und ist im CRM änderbar.
- [ ] Je Paket ist einstellbar, wie viele Gerichte je Gruppe gewählt werden.
- [ ] Je Gericht ist einstellbar: Gruppe, Stile, aktiv, bei Häppchen der Aufpreis. Ein neues Gericht erscheint ohne weitere Zuordnung in allen passenden Paketen.
- [ ] Aufpreise für „+1“ sind im CRM änderbar.
- [ ] Die Anfragenliste lässt sich nach Essensart und Stil filtern; die KPIs zeigen Anfragen je Essensart, Stil und Anlass.
- [ ] Eine Anfrage im CRM anlegen und bearbeiten rechnet mit denselben Regeln wie der Generator (eine gemeinsame Rechendatei je Repo, gleiche Tests).

**Bestand**
- [ ] Jede gespeicherte Anfrage zeigt nach der Umstellung dieselben Gerichte und denselben Preis wie vorher.

**Website**
- [ ] Hauptmenü: Buffet, Fingerfood, Frühstück; „Anlässe“ als Aufklapper mit den sechs bestehenden Seiten.
- [ ] Startseite: drei Kacheln für die Essensarten direkt unter dem ersten Bildschirm. Die Anlass-Karten führen auf ihre Seiten statt in den Generator.
- [ ] Je Essensart eine Seite, deren Knopf den Generator mit vorgewählter Essensart öffnet. Preise und Paketinhalte kommen aus der Datenbank, nicht aus dem Seitentext.

## Nicht dazu gehört

- Neue Preise. Die Umstellung übernimmt die heutigen; Jana ändert sie danach im CRM.
- Ortsseiten, Ratgeber, Texte für Google (eigenes Vorhaben „Seitenplan“, folgt direkt).
- Bilder je Gericht (kommt, wenn Jana genug Fotos hat; das Feld wird jetzt nicht angelegt).
- Online-Bezahlung, Grill, Spanferkel.
- Bewertungs-Widget von Elfsight auf der Website (eigenes kleines Vorhaben, siehe Offene Fragen).
- Klick-Auswertung im Generator (PostHog oder Ähnliches): von Victor am 08.10.2026 gestrichen.
- Ein eigenes kaltes Buffet. Kalt und warm bleiben ein Angebot.
- Neue Farben oder Schriften. Neue Elemente nehmen `C` und `S` aus dem Code.

## Offene Fragen

**An Jana**
1. Fingerfood-Pakete: Wie viele Teile je Paket und Gruppe? Janas Liste vom 08.10. (`C:Devangebot-bestandingerfood-liste-jana-2026-10-08.md`) nennt die Gerichte in vier Gruppen (Herzhaft, Im Glas, Spieße, Süß), aber keine Mengen. Heute: „Klassisch“ 2 Häppchen; „Genuss“ 3 Häppchen, 3 Salate, 1 Süßes; „Premium“ 4, 4, 2.
2. „Fingerfood dazu“ im Buffet: ein Aufpreis für alle Häppchen oder je Häppchen ein eigener? (Gebaut wird: ein Standard-Aufpreis, je Häppchen überschreibbar.)
3. Zwölf heutige Häppchen stehen nicht auf Janas Liste (Garnelen-Spieße, Bruschetta, Gefüllte Eier, Bouletten …). Bleiben sie als normale Buffet-Vorspeise, oder fallen sie weg? Angenommen wird: Vorspeise.
3a. Sorten: Miniburger (4), Canapés (3), Bagel (3), Wrapsröllchen (3–4 Füllungen). Wählt der Kunde die Sorte, oder gibt es je Gericht eine gemischte Platte? Angenommen wird: jede Sorte ist ein eigenes Gericht, Wrapsröllchen sind „gemischt“.
5. Brunch kostet heute 2 € mehr als Frühstück und hat einen Zusatz-Slot. Vorschlag: Brunch wird ein Aufpreis „Herzhaftes Brunch-Extra“ im Frühstück.
6. Mindestpersonenzahl je Essensart?
7. Was passiert mit „Business Lunch“, „Familien-Klassiker“ und „Russisches Frühstück“? Es gibt Pakete dazu, aber kein sichtbares Thema.

**An Victor**
8. Stile: Vorschlag für Buffet: Klassisch deutsch, Mediterran, Osteuropäisch, Festlich, Kinderfreundlich, dazu „Individuell“ (zeigt alles). „Buntes Buffet“ entfällt, weil es dasselbe wie „Individuell“ ist.
10. Elfsight-Widget: lädt von Elfsight-Servern. Vorschlag: erst nach Klick oder Einwilligung laden, darunter bleibt der Link zu Google.

## Design

Kein Prototyp nötig für Schritt 1 und 2 (bestehende Karten). Für Schritt 3 (Stil-Kacheln über der Gerichteliste, Block „Fingerfood dazu“, Handy-Ansicht) gibt es vor dem Bau einen Klick-Prototyp, weil das die Stelle ist, an der Kunden abspringen.

## Architektur

**Grundsatz:** Welche Gerichte ein Paket anbietet, wird aus Eigenschaften des Gerichts abgeleitet, nicht als Liste kopiert.

Neue Tabellen (Namen vorläufig):

| Tabelle | Inhalt | Zeilen etwa |
|---|---|---|
| `essensarten` | slug, label, beschreibung, bild_url, mindestpersonen, reihenfolge, aktiv | 3 |
| `pakete` | essensart, name, preis_pro_person, reihenfolge, aktiv | 9 |
| `gruppen` | slug, label, essensart, aufpreis_plus_eins, aufpreis_je_gericht, reihenfolge | ~12 (Vorspeise, Hauptgericht, Beilage, Dessert, Fingerfood, Salat, Frühstück herzhaft …) |
| `paket_gruppen` | paket, gruppe, min_auswahl, max_auswahl, typ (wahl, fix, zusatz), fix_gericht | ~40 |
| `stile` | slug, label, essensart, bild_url…, reihenfolge, aktiv | ~8 (ersetzt `themen`, eine Zeile je Stil statt je Anlass) |

Geänderte Tabellen:

- `gerichte`: neue Spalte `aufpreis_pro_person` (leer = Standard der Gruppe). Gruppe und Stil eines Gerichts stehen in den Zuordnungstabellen `gericht_gruppen` und `gericht_stile`, weil ein Gericht in mehreren Töpfen liegen kann (Draniki ist Hauptgericht und Brunch-Extra). `themen_tags` wird nicht mehr gelesen und entfällt mit GEN-5.
- `requests`: neue Spalten `essensart`, `stil`; `anlass` wird freiwillig. `angebot_snapshot` (JSON) hält Paket, Preise, Aufpreise und Gerichte, wie der Kunde sie gesehen hat.

Entfällt nach der Umstellung, in einem zweiten Schritt und erst nach Victors OK: `paket_konfiguration`, `paket_slots`, `slot_gerichte`, `themen`, `pakete_versionen`.

**Rechnen:** Eine Datei ohne React je Repo (`angebotspreis.js`): Paketpreis × Gäste + Aufpreise × Gäste + Lieferung. Generator und CRM importieren sie; die Tests sind in beiden Repos dieselben Fälle. Vorbild: `paketpreis.js`, `lieferpreis.js` im CRM.

**Arbeiten in Kopien:** Code entsteht auf Zweigen und wird in der Vercel-Vorschau geprüft; live ändert sich erst mit dem Merge. Die alten Tabellen werden während des ganzen Umbaus weder geändert noch gelöscht, der Live-Generator liest bis zur Umschaltung nur sie. Wo die neuen Tabellen während des Baus liegen (echte Datenbank oder Test-Projekt), ist noch zu entscheiden.

**Umstellung ohne Ausfall:**
1. Neue Tabellen anlegen und aus den alten befüllen (eine Migration, nur hinzufügen).
2. Generator und CRM lesen neu; alte Tabellen bleiben unberührt und lesbar.
3. Alte Anfragen bekommen `essensart` aus Anlass und Thema abgeleitet; ihre Preise und Gerichte bleiben, wie sie sind.
4. Alte Tabellen in einer späteren Migration entfernen.

**Generator-Datei:** `MamaMiaAngebotsgenerator.jsx` hat über 1.700 Zeilen. Die Schritte, die neu entstehen (Essensart, Paket, Gerichte), kommen in eigene Dateien; der Rest bleibt, wo er ist.

## Sicherheit

- Neue Tabellen: Row Level Security an. Anonym darf Kataloge lesen (nur `aktiv`), schreiben darf nur die eingeloggte CRM-Nutzerin.
- `requests`: unverändert, anonym nur anlegen.
- Der Preis einer Anfrage wird heute im Browser berechnet und so gespeichert (`:544`–`:547`). Ein manipulierter Browser kann einen falschen Preis einreichen. Jana prüft jedes Angebot vor dem Versand; trotzdem: Die Umstellung legt einen Datenbank-Trigger an, der den Preis aus den Katalogen nachrechnet und Abweichungen markiert. (Prüfung mit `sicherheit-sql` beim Bau.)
- Keine neuen Geheimnisse, keine neuen Fremddienste.

## Aufgaben

### GEN-1 Neue Kataloge in der Datenbank
Fertig, wenn:
- [x] Migration legt die neuen Tabellen mit RLS an und befüllt sie aus dem Bestand (`supabase/migrations/angebot_essensart_1_kataloge.sql`)
- [x] Prüfabfrage zeigt: jedes aktive Gericht hat mindestens eine Gruppe; jedes Paket hat seine Gruppen (Test-Projekt, 08.10.2026: 9 Pakete, 37 Blöcke, 175 Zuordnungen, alle wie vorausberechnet)
- [ ] Victor hat das SQL geprüft und ausgeführt (im Test-Projekt am 08.10.2026 erledigt; im echten Projekt erst zur Umschaltung)

### GEN-2 Rechenregeln als eigene Datei
Baut auf: GEN-1
Fertig, wenn:
- [x] `src/angebot/angebotspreis.js` rechnet Paket, „+1“, „Fingerfood dazu“ und Lieferung; 28 Tests. Gegenprobe am 08.10.2026: Rechnen ohne Cent, eigener Gerichtpreis ignoriert, „+1“ ohne Pflichtwahl, Doppelangebot im Zusatz-Block, Auswahl verschwindet beim Stilwechsel – jeder Fehler ließ einen Test rot werden
- [x] Dieselben Testfälle laufen im CRM (`src/shared/angebotspreis.js` und `.test.js`, unverändert kopiert; 29 Tests grün am 09.10.2026)

### GEN-3 Klick-Prototyp Schritt „Gerichte“
Fertig, wenn:
- [x] Victor hat Stil-Kacheln, Filter und „Fingerfood dazu“ am Handy und am Desktop abgenommen (08.10.2026, nach Korrektur von Überlauf und Reihenfolge; Aufruf `?prototyp=gerichte`)

### GEN-4 Generator: neuer Ablauf
Baut auf: GEN-2, GEN-3
Fertig, wenn:
- [x] Essensart → Paket → Gerichte → Angaben → Zusammenfassung, mit Vorwahl per Link (`?essensart=`; die alten Links `?anlass=` füllen den freiwilligen Anlass, `?anlass=fruehstueck` führt zum Frühstück). Klickprüfung am 08.10.2026 lokal mit abgefangener Datenbank, Desktop und Handy: 55 von 55 Punkten
- [x] Anfrage speichert `essensart`, `stil`, freiwilligen `anlass` und `angebot_snapshot` (`src/angebot/anfrage.js`, 27 Tests mit Gegenprobe; die bisherigen Spalten bleiben gefüllt, damit das CRM neue Anfragen ohne Umbau anzeigt. TEST-Anfrage MM-26-1759 aus der Vorschau am 08.10.2026 im Test-Projekt gespeichert: buffet, individuell, Genuss, 1.305,00 €)
- [x] Bestätigungs-Mail nennt Essensart, Paket, Aufpreise (`src/angebot/mail.js`, Tests; Versand selbst im Test-Projekt nicht prüfbar, dort gibt es die Mailfunktion nicht)
- [x] Datenbank rechnet den Preis jeder neuen Anfrage nach und markiert Abweichungen (`angebot_essensart_3_preispruefung.sql`; von Victor am 08.10.2026 im Test-Projekt ausgeführt; MM-26-1759: nachgerechnet 1.290,00 €, `preis_pruefung = stimmt`. Der Lieferzuschlag wird nicht nachgerechnet)

### CRM-1 Pflege der Kataloge
Baut auf: GEN-1
Fertig, wenn:
- [x] Pakete, Gruppen je Paket, Aufpreise, Stile und Gerichte sind im CRM änderbar; die alten Masken „Pakete & Slots“ sind ersetzt (CRM-Zweig `crm-1-kataloge-pflegen`, Commit 8c4217a; Klickprüfung lokal mit nachgebauter Anmeldung und Datenbank: 29 von 29 Punkten. Offen: Durchklicken in der Vorschau gegen das Test-Projekt, dafür fehlt dort ein CRM-Nutzer)

### CRM-2 Anfragen mit der neuen Struktur
Baut auf: GEN-2, CRM-1
Fertig, wenn:
- [x] Anlegen und Bearbeiten nutzt `angebotspreis.js`; alte Anfragen öffnen und speichern, ohne dass sich Preis oder Gerichte ändern (Test) (CRM-Zweig `crm-2-anfragen-nach-essensart`, Commit 41528e2; `anfrageMenue.test.js` mit 20 Tests und Gegenprobe; Klickprüfung lokal mit nachgebauter Datenbank 28 von 28. Offen: Abnahme in der Vorschau, Migration 6 im Test-Projekt)
- [x] Filter nach Essensart und Stil; KPIs je Essensart, Stil, Anlass (Commit f24094e; Abnahme offen)

### WEB-6 Menü, Kacheln und Essensart-Seiten
Baut auf: GEN-4
Fertig, wenn:
- [ ] Menü und Startseite wie oben; drei Essensart-Seiten; Anlass-Seiten sind verlinkt (Website-Repo, Zweig `web-6-essensarten`, Commit 3c780d0, baut auf `web-1-nachbau` auf; 263 Tests mit Gegenprobe, lokal in vier Breiten angesehen. Frühstück nutzt die bestehende Adresse `/services/frühstück`. Offen: `KATALOG_SCHLUESSEL` als Vorschau-Variable bei Vercel, dann Abnahme in der Vorschau)

### GEN-5 Alte Tabellen entfernen
Baut auf: GEN-4, CRM-2, zwei Wochen Betrieb ohne Befund
Fertig, wenn:
- [ ] Kein Code liest die alten Tabellen (Suche in beiden Repos); Migration entfernt sie; Victor hat ausgeführt

## Entscheidungen

- 08.10.2026, Victor: Einstieg nach Essensart (Buffet, Fingerfood, Frühstück) wie relaxx-catering; Grill und Spanferkel entfallen.
- 08.10.2026, Victor: Fingerfood ist eigene Essensart **und** im Buffet als „Fingerfood dazu“ mit Aufpreis wählbar.
- 08.10.2026, Victor: Die Themenbilder bleiben. Das Thema wird kein eigener Schritt mehr, sondern steht als Bildkacheln über der Gerichteliste und filtert dort.
- 08.10.2026, Victor: Der Anlass wird ein freiwilliges Feld am Ende.
- 08.10.2026, Victor: Preise sind nachrangig; erst die Struktur.
- 08.10.2026, Victor: Kalt und warm werden nicht getrennt. Die vorgewählte Kachel heißt weiter „Individuell“. Keine Klick-Auswertung über Fremddienste.
- 08.10.2026, Victor: Gebaut wird gegen ein eigenes Supabase-Test-Projekt, nicht gegen die echte Datenbank.
- 08.10.2026, Victor: Die zwölf heutigen Häppchen, die nicht auf Janas Liste stehen, bleiben Fingerfood; ihre Liste ergänzt den Bestand. Miniwraps gibt es in zwei Sorten: Tomate, Mozzarella, Pesto, Salat · frittiertes Hühnchen, Salat, Gurke, Soße.
- 08.10.2026, Victor: Die Teilanzahl je Fingerfood-Paket richtet sich nach relaxx-catering (Zahlen noch zu erheben; sie stehen nur im Bestellablauf).
- 08.10.2026, Victor: Das Elfsight-Bewertungs-Widget wird ohne Einwilligungsabfrage eingebaut; das Risiko trägt er. Eigenes Vorhaben im Website-Repo.
- 08.10.2026, Victor, am Prototyp: Reihenfolge der Stile Individuell, Mediterran, Klassisch deutsch, Modern festlich, Osteuropäisch, Buntes Buffet, Klassisch elegant, Kinderfreundlich. Die drei Stimmungsbilder bleiben unter den Kacheln. „Fingerfood dazu“ bleibt zwischen Vorspeisen und Hauptgerichten, eingeklappt und ohne Stil-Filter. Wer „+1“ bucht, muss das zusätzliche Gericht wählen.
- 08.10.2026, Victor: Spec abgenommen. Bedingung: Es wird in Kopien gearbeitet, und beim Umzug gehen keine Kundendaten verloren.
- 09.10.2026, Victor, an der Vorschau: Essensart-Karten ohne „ab“-Preis (keine Lockpreise), Name mittig. Glatte Preise ohne „,00“. Fingerfood-Pakete wie relaxx mit 4 / 6 / 8 Teilen in einem einzigen Block, Preise bleiben (`angebot_essensart_4_fingerfood_teile.sql`; die Blöcke Salate und Süßes sind dort abgeschaltet – süßes Fingerfood kommt mit Janas Liste als Fingerfood-Gericht). In der Vorschau gibt es einen Umschalter für die Breiten 1200 / 768 / 390.
- 09.10.2026, Victor: GEN-4 in der Vorschau abgenommen, nach Migration 4 im Test-Projekt. Gemergt wird erst zur Umschaltung, weil die echte Datenbank die neuen Tabellen noch nicht hat.
- 09.10.2026, Victor: CRM-1 in der Vorschau abgenommen. Wortlaut wie relaxx: Block „Fingerfood-Teile“, Extra „+ 1 Fingerfood-Teil“ (`angebot_essensart_5_fingerfood_teile_wortlaut.sql`).
- 09.10.2026, Victor: Eine gespeicherte Anfrage ist gegen Änderungen am System eingefroren, bleibt für Jana aber jederzeit frei bearbeitbar (Gerichte herausnehmen, tauschen, dazunehmen, Preis ändern); was sie speichert, ist der neue Stand. Das gilt auch für Anfragen von vor der Umstellung.
- 09.10.2026, Victor: CRM-2 in der Vorschau abgenommen, nach Migration 6 im Test-Projekt. Einzige Rückmeldung: Bei „1 von 1“ blieb der Rest nicht ausgegraut (behoben in ecb3a4a).
- 09.10.2026, Victor: Die Website kommt vor der Umschaltung, damit alles zusammen in der Vorschau zu sehen ist. Preise stehen auf den Unterseiten, nicht auf den drei Kacheln der Startseite. Aus dem Firmen-Repo `website-framework` werden Regeln und Prüfungen übernommen, nicht der Code: Paket A mit WEB-6, Paket B (noindex am Host, Markdown-Fassung, Vorschaubild je Seitenart, Search-Console-Baseline, IndexNow) vor dem Umzug von Framer, Paket C (Überlappung der Ortsseiten messen, Herkunftsliste für Bilder) mit den Ortsseiten.
