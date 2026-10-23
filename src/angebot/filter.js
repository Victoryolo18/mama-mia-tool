/* Filter im Schritt "Menü": Der Kunde tippt Symbole der Legende an und sieht nur noch passende Gerichte (GEN-26).
   Ohne React. Alle fünf Symbole gelten gleich (Victor, 23.10.2026): Ein Gericht bleibt sichtbar, wenn es zu
   irgendeinem angetippten passt. Fleisch, Fisch und Vegetarisch nach der Kostform (kostform.js), Vegan und
   Glutenfrei nach "auf Anfrage möglich" (ernaehrung.js). Ist nichts angetippt, ist alles sichtbar.
   Der Filter blendet nur aus: Auswahl und Preis bleiben, gespeichert wird er nicht. */
import { kostform } from "./kostform.js";
import { aufAnfrage } from "./ernaehrung.js";

/** Passt das Gericht zu einem der angetippten Symbole? `an`: Liste der Slugs, z. B. ["fisch", "vegan"]. */
export function passtZumFilter(gericht, an) {
  if (!an || an.length === 0) return true;
  if (an.includes(kostform(gericht))) return true;
  return aufAnfrage(gericht).some((a) => an.includes(a.slug));
}

/** Die sichtbaren Gerichte: passende und alle schon gewählten, damit nichts aus der Auswahl verschwindet. */
export function gefiltert(gerichte, an, gewaehlt = []) {
  return gerichte.filter((g) => gewaehlt.includes(g.id) || passtZumFilter(g, an));
}

/** Symbol an- oder ausschalten. */
export function umschalten(an, slug) {
  return an.includes(slug) ? an.filter((s) => s !== slug) : [...an, slug];
}
