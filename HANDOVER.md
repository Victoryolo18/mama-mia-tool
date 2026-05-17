# Mama Mia — Projekt-Übergabe

## Stack & URLs

| Projekt | Repo | Live-URL |
|---------|------|----------|
| Generator (öffentlich) | `Victoryolo18/mama-mia-tool` | https://mama-mia-tool.vercel.app |
| CRM (intern) | `Victoryolo18/mama-mia-crm` | https://mama-mia-crm.vercel.app |

- **Frontend:** React + Vite, deployed auf Vercel (main-Branch)
- **Backend:** Supabase (Postgres + Storage + Edge Functions)
- **E-Mail:** Resend über Supabase Edge Function `send-email`
- **PDF:** jsPDF + jspdf-autotable (im CRM)
- **Auth:** Supabase Auth (CRM-Login)
- **GitHub Token:** in Vercel-Umgebung gesetzt (nicht hier dokumentiert)
- **Supabase Project ID:** `jypugzjdoluvmawkwewl`
- **Supabase Storage Bucket:** `Themenbilder`

---

## DB-Schema (wichtigste Tabellen)

### `themen`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| slug | text PK | z.B. `klassisch_deutsch` |
| label | text | Anzeigename |
| anlass | text | z.B. `hochzeit` |
| beschreibung | text | Kurzbeschreibung |
| bild_url | text | Themenkarte (Schritt 2) |
| bild_url_1/2/3 | text | Vorschaubilder (Schritt 5) |
| reihenfolge | int | Sortierung |
| aktiv | bool | |

### `paket_konfiguration`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | uuid PK | |
| anlass | text | |
| theme_slug | text | FK → themen.slug |
| paket | text | `Klassisch` / `Genuss` / `Premium` |
| preis_pro_person | numeric | 25 / 30 / 45 |
| aktiv | bool | |

### `paket_slots`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | uuid PK | |
| paket_konfiguration_id | uuid FK | |
| label | text | z.B. `Vorspeisen` |
| typ | text | `fix` / `wahl_einzel` / `wahl_mehrfach` |
| min_auswahl / max_auswahl | int | |
| reihenfolge | int | |
| aktiv | bool | |

### `slot_gerichte` — Verbindung Slot ↔ Gericht
### `gerichte` — Gerichte-Pool (name, kategorie, vegetarisch, unterkategorie)
### `zusatzwuensche` — Extras (label, beschreibung, preis, aktiv)
### `lieferzonen` — PLZ-Bereiche mit Zuschlag
### `requests` — Kundenanfragen
| Spalte | Typ |
|--------|-----|
| id, request_number, status, source | |
| customer_name, customer_email, customer_phone, customer_contact_preference | |
| anlass, thema, paket, gaeste, event_datum, plz, lieferung | |
| menue_auswahl (jsonb), zusatzwuensche (text) | |
| preis_pro_person, speisenpreis, lieferzuschlag, gesamtpreis | |
| zahlungsstatus | text | `offen` / `rechnung_verschickt` / `beglichen` |
| interne_notiz, pakete_snapshot (jsonb) | |

### `fixkosten` — Monatliche Fixkosten (bezeichnung, betrag_monatlich, kategorie, aktiv)
### `variable_kosten` — Variable Kosten (monat, bezeichnung, betrag, notiz)

---

## Generator — Was implementiert ist (`mama-mia-tool`)

**7-Schritte-Flow:**
1. Anlass wählen (6 Anlässe, Bilder aus Supabase Storage)
2. Thema wählen (live aus `themen`-Tabelle, gefiltert nach Anlass)
3. Details (Gästezahl 8–250, Datum, PLZ, Lieferung/Abholung)
4. Paket wählen (Klassisch/Genuss/Premium, Preise + Features live aus DB)
5. Menü zusammenstellen (Slots + Gerichte live aus DB, Vorschaubilder aus bild_url_1/2/3)
6. Extras (Zusatzwünsche aus DB)
7. Anfrage absenden (Name Pflichtfeld, Kontakt Pflichtfeld)

**Submit-Logik:**
- Speichert in `requests`-Tabelle
- Sendet E-Mail via Edge Function `send-email` (Resend):
  - Bestätigung an Kunden (nur wenn E-Mail angegeben)
  - Benachrichtigung an `info@mama-mia-events.de`
- Absender: `noreply@mama-mia-events.de`

**Weitere Features:**
- Lieferzuschlag-Berechnung nach PLZ
- Vegetarisch-Kennzeichnung mit 🌱
- Slot-Reihenfolge: Vorspeisen → Hauptgerichte → Beilagen → Salat → Dessert → Fix
- Leere Slots (keine Gerichte hinterlegt) werden ausgeblendet
- Footer mit Impressum/AGB/Datenschutz-Links

---

## CRM — Was implementiert ist (`mama-mia-crm`)

**Seiten:**
- **Dashboard** — letzte 5 neue Anfragen, klickbar
- **Anfragen** — Tabelle aller Anfragen mit Zahlungsstatus-Badge
- **Anfrage-Detail** — vollständige Ansicht, Status ändern, Zahlungsstatus, PDF-Download, Rechnung-PDF
- **Neue Anfrage** — manuelle Erfassung
- **KPIs** — 10 KPI-Karten (Umsatz, Conversion, Pakete, Orte, Auslastung) + Gewinnvorschau
- **Kosten** — Fixkosten-CRUD, Variable Kosten-CRUD, Gewinnvorschau pro Monat
- **Menü-Verwaltung** — 4 Sub-Tabs:
  - Gerichte-Pool (CRUD)
  - Pakete & Slots (CRUD, Gerichte zuweisen)
  - Lieferzonen (CRUD)
  - **Themenbilder** (Upload-Funktion für bild_url/1/2/3 direkt in Supabase Storage)
- **Einstellungen**

**PDF-Features:**
- Angebots-PDF (Angebotsdaten, Preisübersicht)
- Rechnungs-PDF (RE-YYYY-XXXXXX, Netto/MwSt 7%/Brutto, Bankdaten)
- Absender: Jana Ketelhohn, Eichenallee 20, 16767 Leegebruch
- IBAN: DE60 1001 1001 2679 7576 91, BIC: NTSBDEB1XXX (N26)
- Steuer-Nr.: 053/238/12294

---

## Letzte Änderungen

| Commit | Beschreibung |
|--------|-------------|
| `feat: Themenbilder-Tab` | CRM: Upload-UI für 4 Bildfelder pro Thema |
| `feat: Footer-Links` | Impressum/AGB/Datenschutz in beiden Repos |
| `fix: Anlass-Emojis + Bilder` | Emojis entfernt, 4 Anlassbilder → Supabase Storage |
| `feat: bild_url_1/2/3` | Vorschaubilder in Schritt 5 aus DB |
| `fix: Salat-Slot` | Kontextsensitive Anzeige (nur unterdrücken wenn fix-Salat existiert) |
| `fix: Slot-Reihenfolge` | Dessert nach Salat, leere Slots ausblenden |
| `feat: Kosten-Seite` | Fixkosten + Variable Kosten + Gewinnvorschau |
| `feat: KPIs` | 10 KPI-Karten + Perioden-Toggle |

---

## Offene Punkte / Bekannte Issues

- **E-Mail-Versand testen:** Nach dem Fix (response.ok-Prüfung + console.log) wurde noch kein bestätigter End-to-End-Test durchgeführt. Browser-Konsole beim nächsten Submit prüfen (`[email] sendNotificationEmails aufgerufen, URL: ...`).
- **Supabase Storage Policies:** Bucket `Themenbilder` benötigt INSERT/UPDATE-Rechte für authentifizierte CRM-Nutzer (für den Themenbilder-Upload).
- **Preise in paket_konfiguration:** Wurden auf 25/30/45 vereinheitlicht — aber nur mit korrekter Groß-/Kleinschreibung (`Klassisch`/`Genuss`/`Premium`).
- **Gelöschte Themen:** `russisches_fruehstueck`, `business_lunch`, `familien_klassiker` — aus DB gelöscht, aber ggf. noch verwaiste `paket_konfiguration`-Einträge prüfen.

---

## Wichtige Konstanten im Code

**Generator** (`src/MamaMiaAngebotsgenerator.jsx`):
- `ANLAESSE` — 6 Anlass-Definitionen mit label, icon, image
- `PAKETE` — 3 Paket-Definitionen (Klassisch/Genuss/Premium)
- `SLOT_SORT_ORDER` — Reihenfolge der Slots in Paketvorschau
- `C` — Farb-Konstanten aus `src/lib/theme.js`

**CRM** (`src/lib/theme.js`):
- `ANLAESSE` — inkl. `individuell: { label: 'Private Feier' }`
- `ZAHLUNGSSTATUS_CFG` — offen / rechnung_verschickt / beglichen
- `formatEUR()` — Euro-Formatierung

---

*Letzte Aktualisierung: Mai 2026*
