/* Besondere Ernährung: was ein Gericht auf Anfrage sein kann und was der Kunde für seine Gäste wünscht.
   Ohne React. Die Website und das CRM nutzen Kopien dieser Datei.

   Vegan und glutenfrei kocht Jana nur auf Anfrage: Es ist mehr Aufwand und kann teurer werden.
   Deshalb zweierlei:
   - am Gericht ein Hinweis "auf Anfrage möglich" (Häkchen `vegan_moeglich`, `glutenfrei_moeglich` im CRM)
   - im Schritt "Anfrage" die Zahl der Gäste, die vegetarisch, vegan oder glutenfrei essen
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

/** Eingabe des Kunden → gespeicherte Form. Ganze Zahlen von 0 bis zur Gästezahl; null, wenn nichts angegeben ist.
    Mehr als Gäste geht nicht: Wer 20 Gäste hat, kann nicht 25 Veganer melden. */
export function ernaehrungAusEingabe(eingabe, gaeste) {
  const grenze = Math.max(0, Math.floor(Number(gaeste) || 0));
  const werte = Object.fromEntries(ERNAEHRUNG.map(({ slug }) => {
    const n = Math.floor(Number(eingabe?.[slug]) || 0);
    return [slug, Math.min(grenze, Math.max(0, n))];
  }));
  return Object.values(werte).some((n) => n > 0) ? werte : null;
}

/** "2 vegan, 1 glutenfrei" für Mail, Zusammenfassung und CRM; leer, wenn nichts angegeben ist. */
export function ernaehrungText(ernaehrung) {
  if (!ernaehrung) return "";
  return ERNAEHRUNG.filter(({ slug }) => ernaehrung[slug] > 0).map(({ slug, label }) => `${ernaehrung[slug]} ${label}`).join(", ");
}

/** Wünscht der Kunde etwas, das Jana nur auf Anfrage kocht? Dann steht in Mail und CRM der Hinweis auf möglichen Aufpreis. */
export function brauchtAbsprache(ernaehrung) {
  return !!ernaehrung && (ernaehrung.vegan > 0 || ernaehrung.glutenfrei > 0);
}
