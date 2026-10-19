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

/** Ort, der sich beim Eintippen der Postleitzahl von selbst einträgt: nur bei genau einem Ort
    und wenn das Feld leer ist oder noch einen Vorschlag einer anderen Postleitzahl enthält. */
export function ortVorschlag(plzOrte, plz, ortBisher, plzBisher) {
  const orte = orteZurPlz(plzOrte, plz);
  if (!orte || orte.length !== 1) return null;
  const bisher = String(ortBisher ?? "").trim();
  const warVorschlag = (orteZurPlz(plzOrte, plzBisher) ?? []).includes(bisher);
  return !bisher || warVorschlag ? orte[0] : null;
}
