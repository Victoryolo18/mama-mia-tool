/* Besondere Ernährung: was ein Gericht auf Anfrage sein kann.
   Ohne React. Die Website und das CRM nutzen Kopien dieser Datei.

   Vegan und glutenfrei kocht Jana nur auf Anfrage: Es ist mehr Aufwand und kann teurer werden.
   Deshalb steht am Gericht ein Hinweis "auf Anfrage möglich" (Häkchen `vegan_moeglich`, `glutenfrei_moeglich` im CRM).
   Wer ein Gericht so möchte, schreibt es in die Anmerkungen. Die Zahl der Gäste je Ernährung fragt der Generator
   seit dem 19.10.2026 nicht mehr ab (Victor: zu mühsam); ältere Anfragen haben sie noch im Snapshot (`ernaehrung`),
   das CRM zeigt sie dort weiter an.
   Ein Gericht, das schon vegan ist (`vegan`), braucht keinen Hinweis "vegan möglich". */

export const AUF_ANFRAGE = [
  { slug: "vegan",      kurz: "VG", label: "vegan auf Anfrage",      feld: "vegan_moeglich" },
  { slug: "glutenfrei", kurz: "GF", label: "glutenfrei auf Anfrage", feld: "glutenfrei_moeglich" },
];

export const ERNAEHRUNG = [
  { slug: "vegetarisch", label: "vegetarisch" },
  { slug: "vegan",       label: "vegan" },
  { slug: "glutenfrei",  label: "glutenfrei" },
];

/** Was dieses Gericht auf Anfrage sein kann, in fester Reihenfolge. */
export function aufAnfrage(gericht) {
  return AUF_ANFRAGE.filter((a) => gericht?.[a.feld] && !(a.slug === "vegan" && gericht.vegan));
}

/** Die Hinweise, die in einer Liste von Gerichten vorkommen (für die Legende). */
export function aufAnfrageIn(gerichte) {
  const da = new Set(gerichte.flatMap((g) => aufAnfrage(g).map((a) => a.slug)));
  return AUF_ANFRAGE.filter((a) => da.has(a.slug));
}

/** "2 vegan, 1 glutenfrei" für das CRM bei älteren Anfragen; leer, wenn nichts angegeben ist. */
export function ernaehrungText(ernaehrung) {
  if (!ernaehrung) return "";
  return ERNAEHRUNG.filter(({ slug }) => ernaehrung[slug] > 0).map(({ slug, label }) => `${ernaehrung[slug]} ${label}`).join(", ");
}

/** Wünscht der Kunde etwas, das Jana nur auf Anfrage kocht? Dann steht im CRM der Hinweis auf möglichen Aufpreis. */
export function brauchtAbsprache(ernaehrung) {
  return !!ernaehrung && (ernaehrung.vegan > 0 || ernaehrung.glutenfrei > 0);
}
