/* Sprache des Generators (I18N-3). Ohne React, ohne Datenbank.

   Die Website hängt `?lang=en` oder `?lang=ru` an den Link; ohne Angabe gilt Deutsch.
   Gespeichert und an Jana geschickt wird immer der deutsche Katalog: Nur die Anzeige folgt der Sprache.
   Fehlt eine Übersetzung in der Datenbank, steht der deutsche Text da. */

export const SPRACHEN = ["de", "en", "ru"];
export const LOCALE = { de: "de-DE", en: "en-GB", ru: "ru-RU" };

/** Sprache aus dem Link; Unbekanntes wird Deutsch. */
export function spracheAusLink(suche) {
  const lang = new URLSearchParams(suche || "").get("lang");
  return SPRACHEN.includes(lang) ? lang : "de";
}

/** Der Text eines Feldes in der Sprache, sonst der deutsche. */
export function lokal(zeile, feld, sprache) {
  if (!zeile || sprache === "de") return zeile?.[feld];
  const uebersetzt = zeile[`${feld}_${sprache}`];
  if (Array.isArray(zeile[feld])) return Array.isArray(uebersetzt) && uebersetzt.length === zeile[feld].length ? uebersetzt : zeile[feld];
  return uebersetzt || zeile[feld];
}

const mitFeldern = (zeile, felder, sprache) => {
  const kopie = { ...zeile };
  for (const feld of felder) {
    kopie[`${feld}_de`] = zeile[feld];
    kopie[feld] = lokal(zeile, feld, sprache);
  }
  return kopie;
};

/** Kataloge für die Anzeige: `label`, `name` usw. in der Sprache, das Deutsche daneben als `…_de`.
    Für Deutsch kommen dieselben Kataloge zurück. Rechnen und Speichern nehmen weiter die deutschen. */
export function katalogeInSprache(kataloge, sprache) {
  if (!kataloge || sprache === "de") return kataloge;
  return {
    essensarten: kataloge.essensarten.map((e) => mitFeldern(e, ["label", "beschreibung"], sprache)),
    pakete: kataloge.pakete.map((p) => mitFeldern(p, ["name", "untertitel", "hinweis", "leistungen"], sprache)),
    bloecke: kataloge.bloecke.map((b) => mitFeldern(b, ["label"], sprache)),
    stile: kataloge.stile.map((s) => mitFeldern(s, ["label", "beschreibung"], sprache)),
    gruppen: Object.fromEntries(Object.entries(kataloge.gruppen).map(([slug, g]) => [slug, mitFeldern(g, ["label", "label_einzahl"], sprache)])),
    gerichte: kataloge.gerichte.map((g) => mitFeldern(g, ["name"], sprache)),
  };
}
