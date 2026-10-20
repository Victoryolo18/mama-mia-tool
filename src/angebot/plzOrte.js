/* Alle deutschen Postleitzahlen mit ihren Orten, für die Rechnungsadresse der Firma.
   Quelle: GeoNames (www.geonames.org), Lizenz CC BY 4.0. Neu bauen etwa einmal im Jahr:
   DE.zip von https://download.geonames.org/export/zip/ laden, entpacken und
   `node werkzeug/plz-bauen.cjs DE.txt src/angebot/plz-orte.json` ausführen (Kopien in Website und CRM gleich halten).
   Großkunden-Postleitzahlen (Firmen, Ämter) gelten, haben aber keinen Ortsvorschlag.
   Ohne React. Die Website nutzt eine Kopie dieser Datei. */

let geladen;

/** Lädt die Liste erst, wenn sie gebraucht wird (rund 100 KB). `{ "16767": ["Germendorf", "Leegebruch"], … }` */
export function ladePlzOrte() {
  geladen ??= import("./plz-orte.json").then((m) => m.default);
  return geladen;
}

/** Orte zu einer Postleitzahl; null, wenn es sie nicht gibt oder die Liste fehlt. */
export function orteZurPlz(plzOrte, plz) {
  return plzOrte && Object.hasOwn(plzOrte, plz) ? plzOrte[plz] : null;
}

/** Was im Feld "Ort" stehen soll, wenn die Postleitzahl vollständig ist:
    - genau ein Ort: dieser, auch wenn vorher etwas anderes drinstand
    - mehrere Orte: was drinsteht, wenn es einer davon ist; sonst leer, damit der Kunde wählt
    - unbekannte oder Großkunden-Postleitzahl, unvollständige Eingabe: unverändert (undefined) */
export function ortZurPlz(plzOrte, plz, ortBisher) {
  const orte = orteZurPlz(plzOrte, plz);
  if (!orte || orte.length === 0) return undefined;
  if (orte.length === 1) return orte[0];
  return orte.includes(String(ortBisher ?? "").trim()) ? undefined : "";
}
