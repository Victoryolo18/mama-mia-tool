/* Allergene je Gericht: die 14 Hauptallergene aus Anhang II der LMIV mit festen Kennbuchstaben.
   Die Liste steht nur hier; das CRM hat eine zeichengleiche Kopie (mama-mia-crm/src/shared/allergene.js),
   die Prüfregel der Datenbank dieselben Buchstaben (Migration 24).

   In der Datenbank (gerichte.allergene): null = noch nicht erfasst, [] = geprüft, keine Allergene. */

export const ALLERGENE = [
  { k: "A", name: "Gluten" },
  { k: "B", name: "Krebstiere" },
  { k: "C", name: "Eier" },
  { k: "D", name: "Fisch" },
  { k: "E", name: "Erdnüsse" },
  { k: "F", name: "Soja" },
  { k: "G", name: "Milch" },
  { k: "H", name: "Schalenfrüchte" },
  { k: "I", name: "Sellerie" },
  { k: "J", name: "Senf" },
  { k: "K", name: "Sesam" },
  { k: "L", name: "Sulfite" },
  { k: "M", name: "Lupinen" },
  { k: "N", name: "Weichtiere" },
];

const REIHENFOLGE = ALLERGENE.map((a) => a.k);

/** Bereinigt eine Liste: nur bekannte Buchstaben, jeder einmal, in fester Reihenfolge. null bleibt null. */
export function ordneAllergene(liste) {
  if (liste === null || liste === undefined) return null;
  const da = new Set((Array.isArray(liste) ? liste : []).map((k) => String(k).trim().toUpperCase()));
  return REIHENFOLGE.filter((k) => da.has(k));
}

/** Schaltet einen Buchstaben ein oder aus. Aus "noch nicht erfasst" wird dabei eine Liste. */
export function schalteAllergen(liste, k) {
  const jetzt = ordneAllergene(liste) ?? [];
  return ordneAllergene(jetzt.includes(k) ? jetzt.filter((x) => x !== k) : [...jetzt, k]);
}

/** Kurzform für Karten und Angebote: "A, C, G", "keine" oder "" (nicht erfasst). */
export function allergenKurz(liste) {
  const l = ordneAllergene(liste);
  if (l === null) return "";
  return l.length ? l.join(", ") : "keine";
}

/** Der Schlüssel als eine Zeile, etwa für die Fußnote im Angebot. */
export const ALLERGEN_SCHLUESSEL = ALLERGENE.map((a) => `${a.k} ${a.name}`).join(" · ");

/** Wie viele Gerichte schon erfasst sind. */
export function erfasst(gerichte) {
  const gesamt = gerichte.length;
  const fertig = gerichte.filter((g) => Array.isArray(g.allergene)).length;
  return { fertig, gesamt, offen: gesamt - fertig };
}
