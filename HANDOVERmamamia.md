# Handoff: Mama Mia — Angebotsgenerator & CRM
2026-07-17 · Fortsetzung der Arbeit an mama-mia-tool (Generator) und mama-mia-crm, jetzt in lokaler Session mit direktem Repo-Zugriff (`C:\Dev\mama-mia-crm`, `C:\Dev\mama-mia-tool`)

## Objective
Zwei Repos für Mama Mia Events & Catering pflegen/erweitern:
1. **Angebotsgenerator** (`mama-mia-tool`, public) — Kunden-facing Angebots-Tool, Vercel-deployed, Domain `angebot.mama-mia-events.de`
2. **CRM** (`mama-mia-crm`, privat) — internes Tool für Jana zur Anfragenverwaltung

Beide teilen sich **ein** Supabase-Projekt (im Supabase-Dashboard "mama-mia-crm" genannt) mit Tabellen: `gerichte`, `paket_slots`, `slot_gerichte`, `paket_konfiguration`, `lieferzonen`, `pakete_versionen`, `themen`, `zusatzwuensche`, `requests`.

## Current state

**Wichtigster Fakt zuerst:** Die Live-Produktionsseite des Generators (`angebot.mama-mia-events.de`) läuft aktuell auf einem **alten Deployment vom 24. Juni** (per "Promote to Production" wiederhergestellt, nicht neu gebaut). Sie enthält **keinen** der heute besprochenen Fixes (weder Datum/Uhrzeit-Klickfeld-Fix noch Fehlerbehandlung). Grund: ein bislang ungeklärter Bug, siehe Dead Ends unten.

CRM-Seite (`Individuell`-Paket-Feature) wurde mehrfach über manuelles Copy-Paste in GitHub deployt — letzter bekannter Stand sollte funktionieren, aber der aktuelle Dateiinhalt in GitHub muss vor Weiterarbeit als Quelle der Wahrheit neu geladen werden (siehe Artefakte).

## Decisions (and why)

- **CRM „Individuell"-Paket:** Statt 4 Kategorien (Vorspeisen/Hauptgerichte/Beilagen/Desserts) mit je eigenem Zähler → **eine einzige** "Gerichte"-Zähler-Leiste (0–20, +/-), lädt **alle** `gerichte` mit `aktiv = true` ohne Kategoriefilter. Grund: Bug, dass "Hauptgerichte" nie Gerichte zeigte (DB-Kategorie heißt `hauptspeise`, nicht `hauptgericht` — Key-Mismatch), plus User-Wunsch nach Vereinfachung.
- **Live-Suchfeld pro Slot, nicht global:** Ein einzelnes globales Suchfeld filterte alle Slots gleichzeitig und ließ bereits gewählte Gerichte in anderen Slots optisch verschwinden. Jetzt hat jeder Gerichte-Slot sein **eigenes** Suchfeld (State `slotSuche` als Objekt, keyed by Index); bereits gewähltes Gericht bleibt in seinem eigenen Dropdown immer sichtbar, auch wenn der Suchtext es sonst ausfiltern würde.
- **Datum/Uhrzeit-Feld komplett klickbar:** Erster Versuch (`height: '100%'` am unsichtbaren `<input>`) hat **nicht** funktioniert (User hat getestet: nur Icon rechts klickbar). Zweiter Versuch, der strukturell richtig ist: sichtbares Div + unsichtbares `<input>` beide in ein `<label>`-Element wrappen (nativer HTML-Mechanismus — Klick irgendwo im Label aktiviert das Kind-Input). `pointerEvents:'none'` → `userSelect:'none'` am sichtbaren Div geändert, damit Klicks durchkommen.
- **Fehlerbehandlung Generator-Datenladen:** Drei `useEffect`-Blöcke in `MamaMiaAngebotsgenerator.jsx` (Themen/Lieferzonen laden, Paket-Features laden, Menü laden) hatten **keinerlei** try/catch. Bricht die Netzwerkverbindung während des Ladens ab (z.B. Handy wechselt WLAN↔Mobilfunk), bleibt `appLoading`/`menuLoading` für immer `true`, Seite friert leer/leblos ein, ohne Fehlermeldung — das war exakt der von einer echten Kundin gemeldete Bug ("hat sich was ausgesucht, dann ging nichts mehr", reproduziert unterschiedlich in Berlin vs. Hohenneuendorf → netzabhängig, nicht ortsspezifisch). Fix: try/catch/finally um alle drei, plus Fallback-UI mit "Erneut versuchen"-Button. **Diese Fix ist allgemein**, nicht auf das Thema "Mediterran" beschränkt.

## Dead ends — do not retry

- **`height: '100%'` allein am unsichtbaren date/time-Input** — behebt das "nur Icon klickbar"-Problem NICHT. Der Label-Wrapper-Ansatz ist der richtige.
- **Ursachensuche für "supabaseUrl is required" (weißer Bildschirm, Generator) im Code** — vollständig ausgeschlossen als Code-Problem. Beweisführung:
  - Ein Commit (`482514bfb6c826d7d0fa244c280010988c81e435`, "Remove error handling for app and menu loading", vom User selbst via GitHub-Web-UI committed, NICHT von Claude gepusht) hat meine Fehlerbehandlung UND den Label-Wrapper-Fix zurückgerollt — der exakt gleiche Fehler blieb trotzdem bestehen. Dieser Commit rührt die `createClient(...)`-Zeile nicht an → Beweis, dass der Fehler unabhängig vom JSX-Inhalt ist.
  - Vercel-Kontingent geprüft: Free Plan, nur 290 MB / 100 GB genutzt — kein Limit-Problem.
  - Env-Variablen `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sind in Vercel → Project Settings → Environment Variables korrekt für "Production and Preview" hinterlegt (seit Mai).
  - Komplette Repo-Konfiguration geprüft (`vite.config.js`, `.gitignore`, `package.json`, kein `vercel.json`, `supabase/migrations` nur SQL) — nichts Auffälliges.
  - **Fazit: Ursache nie abschließend gefunden.** Vermutung (unbestätigt): irgendein Vercel-seitiger Hänger beim Einspeisen der Env-Variable in neue Builds, zeitlich begrenzt auf diese Session. Ob ein **neuer** Build (z.B. durch den nächsten Commit ausgelöst) den Fehler wieder reproduziert, ist **nicht getestet worden** — der User wurde gebeten, einen Test-Redeploy zu machen, hat aber nie zurückgemeldet, was dabei rauskam.
  - **Praktische Konsequenz:** Vor dem nächsten Commit auf `mama-mia-tool` main mit einem sofortigen Live-Check nach dem automatischen Vercel-Build rechnen — Browser-Konsole prüfen, falls wieder alles weiß ist, nicht direkt wieder Code verdächtigen.
- **GitHub-Zugriff aus der Cloud-Session:** Mehrere Fine-Grained PATs ausprobiert, keiner hatte tatsächlich Contents:Write für `mama-mia-crm`; `git push` scheiterte durchgehend am Sandbox-Proxy (403). Dieses Problem ist mit dem lokalen Setup jetzt hinfällig, aber falls nochmal eine eingeschränkte Cloud-Session genutzt wird: nicht wieder Zeit mit Token-Debugging verschwenden, sondern gleich auf manuelles Copy-Paste-Deliver-Workflow umsteigen.

## Artifacts

- **`mama-mia-crm/src/components/RequestForm.jsx`** — Enthält (Stand letzter Übergabe an User zum manuellen Einfügen): Individuell-Paket-Feature (Preis pro Person frei, ein Gerichte-Zähler 0–20, alle aktiven Gerichte ohne Kategoriefilter, pro-Slot-Suchfeld) + Datum/Uhrzeit Label-Wrapper-Fix. **Unbestätigt**, ob der Label-Wrapper-Fix tatsächlich in GitHub eingefügt wurde (User hat das für den Generator gemacht, für CRM nie explizit bestätigt). **Vor Weiterarbeit: aktuellen Dateiinhalt aus dem echten Repo neu laden, nicht aus dieser Zusammenfassung rekonstruieren.**
- **`mama-mia-tool/src/MamaMiaAngebotsgenerator.jsx`** — Live auf Vercel: Snapshot vom 24. Juni (ohne heutige Fixes). Verbesserte Version (Label-Wrapper-Fix + try/catch-Fehlerbehandlung) existiert nur als von Claude gelieferte Datei; ob sie irgendwo im Git-Verlauf sicher wiederauffindbar ist, ist unklar (lokale Commits in der Cloud-Sandbox auf Branch `claude/wizardly-ride-kt7qdv`, nie gepusht).
- **CRM PDF-Generierung** — Datei nie erhalten (zweimal angefragt). Die geplante Änderung ("Gerichteauswahl" als Überschrift statt Kategorienamen, für Paket "Individuell") ist **nicht umgesetzt**.
- **`theme.js` (CRM)** — enthält bereits ein ungenutztes `REJECTION_REASONS`-Objekt mit 6 Gründen (zu_teuer, termin_nicht_moeglich, konkurrenz, keine_rueckmeldung, kunde_abgesprungen, sonstiges) — aktuell an keiner UI-Stelle verdrahtet. Für das neue Ablehnungsgrund-Feature (siehe Open items) bewusst NICHT genutzt, stattdessen einfachere 2er-Lösung gewählt.

## Verbatim essentials

SQL-Ergebnis (User hat das selbst in Supabase ausgeführt):
```sql
SELECT kategorie, COUNT(*) as anzahl FROM gerichte WHERE aktiv = true GROUP BY kategorie ORDER BY kategorie;
```
| kategorie | anzahl |
|---|---|
| beilage | 13 |
| dessert | 15 |
| fruehstueck | 10 |
| gemuesebeilage | 7 |
| hauptspeise | 40 |
| inklusiv | 4 |
| kuchen_torte | 14 |
| salat | 14 |
| vorspeise | 48 |

**Wichtig:** Es existiert aktuell **keine** Kategorie `fingerfood` in der DB — das widerspricht der neuesten User-Idee, Fingerfood als eigene Sache zu trennen (siehe Open items, letzter Punkt).

Offene Frage nie beantwortet: Soll die Kategorie `inklusiv` (4 Gerichte) aus der freien "Individuell"-Auswahl ausgeschlossen werden (klingt nach automatisch inkludierten Fix-Posten)?

## Working preferences

- User reagiert allergisch auf unbegründete Spekulation — will belegte Ursachenanalyse, sonst lieber ehrliches "weiß ich nicht" als Rätselraten.
- Direkte, knappe Kommunikation, auf Deutsch.
- Wenn Push nicht möglich ist: **komplette Dateien** liefern, kein Diff, das der User selbst zusammenführen müsste (jetzt mit lokalem Zugriff vermutlich nicht mehr nötig, aber Muster beibehalten falls wieder Zugriffsprobleme auftreten).
- Keine PRs, kein automatisches Pushen ohne explizite Aufforderung.

## Open items

- **Next step:** Aktuellen Stand von `RequestForm.jsx` UND `MamaMiaAngebotsgenerator.jsx` direkt aus den lokalen Repo-Ordnern lesen (Ground Truth), bevor irgendwas weitergebaut wird — nicht auf Basis dieser Zusammenfassung annehmen, was drinsteht.
- **CRM-Feature „Ablehnungsgrund" (noch nicht begonnen):**
  - 2 Kategorien: **"Von Kunde abgelehnt"** / **"Von uns abgelehnt"**
  - UI: kleines Popup/Chip-Auswahl direkt neben dem "Abgelehnt"-Button beim Klick
  - Die 8 bestehenden "Abgelehnt"-Anfragen bleiben leer, nachträglich pro Anfrage editierbar (kein Bulk-Backfill)
  - Muss später in der Anfragenliste filterbar sein (Filter-UI noch nicht designt, Dateiname der Anfragenliste/Dashboard-Seite nicht bekannt — muss erst gefunden werden, vermutlich in `src/pages/`)
  - DB: neue Spalte nötig, z.B. `ALTER TABLE requests ADD COLUMN ablehnungsgrund text;` (Werte `'kunde'` | `'caterer'` | null) — noch nicht ausgeführt
- **CRM PDF:** Bei Paket "Individuell" soll die Überschrift "Gerichteauswahl" statt Kategorienamen zeigen, mit allen gewählten Gerichten flach untereinander. Blockiert, weil die PDF-Generierungsdatei nie geliefert wurde — muss zuerst lokalisiert werden.
- **Unresolved question:** Wird ein neuer Vercel-Build von `mama-mia-tool` main den "supabaseUrl is required"-Fehler wieder auslösen? Nie zu Ende getestet.
- **Ganz neue, kaum spezifizierte Idee (unconfirmed — user erwähnte es nur kurz, nie im Detail besprochen):** "System neu aufbauen, Fingerfood und so weiter trennen" — bezieht sich vermutlich auf eine Neustrukturierung der Paket-/Kategorien-Logik. Nicht klar: was genau getrennt werden soll, wie sich das zur bestehenden `kategorie`-Spalte auf `gerichte` verhält (die aktuell KEINEN `fingerfood`-Wert kennt), und ob "und so weiter" noch weitere Kategorien meint. **Muss vor jeder Umsetzung erst im Detail mit dem User geklärt werden — nicht raten.**

## Suggested opening prompt

```
Ich mache weiter an mama-mia-crm und mama-mia-tool. Lies bitte zuerst
HANDOVER-mama-mia.md in diesem Ordner komplett durch, das fasst den
kompletten bisherigen Stand zusammen.

Danach: Lies den aktuellen Inhalt von
C:\Dev\mama-mia-crm\src\components\RequestForm.jsx und
C:\Dev\mama-mia-tool\src\MamaMiaAngebotsgenerator.jsx direkt von der
Platte (nicht aus dem Handover-Dokument annehmen), damit wir auf dem
echten aktuellen Stand aufbauen.

Als nächstes will ich das "Ablehnungsgrund"-Feature im CRM bauen (Details
im Handover unter "Open items"). Fang damit an, die Anfragenliste/
Dashboard-Seite in mama-mia-crm zu finden, die ich dir noch nicht gezeigt
habe.
```
