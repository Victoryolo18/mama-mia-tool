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

- `gerichte`: neue Spalte `gruppe` (Verweis auf `gruppen`), neue Spalte `aufpreis_pro_person` (leer = Standard der Gruppe). `themen_tags` wird zur einzigen Quelle für Stile und bereinigt.
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
- [ ] Migration legt die neuen Tabellen mit RLS an und befüllt sie aus dem Bestand
- [ ] Prüfabfrage zeigt: jedes aktive Gericht hat genau eine Gruppe; jedes Paket hat seine Gruppen
- [ ] Victor hat das SQL geprüft und ausgeführt

### GEN-2 Rechenregeln als eigene Datei
Baut auf: GEN-1
Fertig, wenn:
- [ ] `angebotspreis.js` rechnet Paket, „+1“, „Fingerfood dazu“ und Lieferung; Tests mit Gegenprobe
- [ ] Dieselben Testfälle laufen im CRM

### GEN-3 Klick-Prototyp Schritt „Gerichte“
Fertig, wenn:
- [ ] Victor hat Stil-Kacheln, Filter und „Fingerfood dazu“ am Handy und am Desktop abgenommen

### GEN-4 Generator: neuer Ablauf
Baut auf: GEN-2, GEN-3
Fertig, wenn:
- [ ] Essensart → Paket → Gerichte → Angaben → Zusammenfassung, mit Vorwahl per Link
- [ ] Anfrage speichert `essensart`, `stil`, freiwilligen `anlass` und `angebot_snapshot`
- [ ] Bestätigungs-Mail nennt Essensart, Paket, Aufpreise

### CRM-1 Pflege der Kataloge
Baut auf: GEN-1
Fertig, wenn:
- [ ] Pakete, Gruppen je Paket, Aufpreise, Stile und Gerichte sind im CRM änderbar; die alten Masken „Pakete & Slots“ sind ersetzt

### CRM-2 Anfragen mit der neuen Struktur
Baut auf: GEN-2, CRM-1
Fertig, wenn:
- [ ] Anlegen und Bearbeiten nutzt `angebotspreis.js`; alte Anfragen öffnen und speichern, ohne dass sich Preis oder Gerichte ändern (Test)
- [ ] Filter nach Essensart und Stil; KPIs je Essensart, Stil, Anlass

### WEB-6 Menü, Kacheln und Essensart-Seiten
Baut auf: GEN-4
Fertig, wenn:
- [ ] Menü und Startseite wie oben; drei Essensart-Seiten; Anlass-Seiten sind verlinkt

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
- 08.10.2026, Victor: Spec abgenommen. Bedingung: Es wird in Kopien gearbeitet, und beim Umzug gehen keine Kundendaten verloren.
