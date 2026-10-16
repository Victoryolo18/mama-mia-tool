/* Kostform eines Gerichts für die farbigen Punkte und die Legende im Schritt "Menü".
   Ohne React. Die Website nutzt eine Kopie dieser Datei (mama-mia-website/src/angebot/).

   Grundlage ist das Häkchen "vegetarisch", das Jana im CRM setzt; vegane Gerichte zählen als vegetarisch.
   Einen eigenen Punkt für vegan gibt es nicht mehr (Victor, 16.10.2026): Vegan steht als "VG" am Gericht. Was kein Häkchen hat,
   enthält Fleisch oder Fisch. Fisch erkennt die Unterkategorie "fisch" oder der Name (Lachs, Garnelen,
   Matjes …), weil Fisch-Häppchen und Fisch-Salate keine eigene Unterkategorie haben. */
export const KOSTFORMEN = [
  { slug: "fleisch",     label: "Fleisch",     farbe: "#5C2818" },
  { slug: "fisch",       label: "Fisch",       farbe: "#4F7EA0" },
  { slug: "vegetarisch", label: "Vegetarisch", farbe: "#3D8B40" },
];

const FISCH = /lachs|garnele|matjes|hering|thunfisch|forelle|scampi|krabbe|shrimp|fisch/i;

/** "vegetarisch" | "fisch" | "fleisch" */
export function kostform(gericht) {
  if (gericht.vegetarisch || gericht.vegan) return "vegetarisch";
  if (gericht.unterkategorie === "fisch" || FISCH.test(gericht.name ?? "")) return "fisch";
  return "fleisch";
}

/** Die Kostformen, die in einer Liste von Gerichten vorkommen, in fester Reihenfolge (für die Legende). */
export function kostformenIn(gerichte) {
  const da = new Set(gerichte.map(kostform));
  return KOSTFORMEN.filter((k) => da.has(k.slug));
}
