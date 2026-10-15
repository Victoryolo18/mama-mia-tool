/* Was ein Paket mehr hat als das vorige: eine Zeile auf der Paket-Karte, damit man sieht, wofür man mehr zahlt.
   Ohne React. Die Website nutzt eine Kopie dieser Datei für ihre Paket-Karten.
   Verglichen werden nur Wahl-Blöcke, über ihre erste Gruppe (die Bezeichnung kann "Dessert" oder "Desserts" heißen). */

/** Unterschiede je Wahl-Block: `{ label, jetzt, vorher }`, nur wo das Paket mehr hat. */
export function mehrAlsVorher(bloecke, vorherBloecke) {
  const wahl = (b) => b.typ === "wahl";
  const vorher = new Map(vorherBloecke.filter(wahl).map((b) => [b.gruppen?.[0], b.max_auswahl ?? 0]));
  return bloecke
    .filter(wahl)
    .map((b) => ({ label: b.label, jetzt: b.max_auswahl ?? 0, vorher: vorher.get(b.gruppen?.[0]) ?? 0 }))
    .filter((u) => u.jetzt > u.vorher);
}

/** "Gegenüber Genuss: Vorspeisen 4 statt 3, Desserts dazu" oder null, wenn es nichts mehr gibt. */
export function mehrText(vorherName, unterschiede) {
  if (!vorherName || unterschiede.length === 0) return null;
  const teile = unterschiede.map((u) => (u.vorher === 0 ? `${u.label} dazu` : `${u.label} ${u.jetzt} statt ${u.vorher}`));
  return `Gegenüber ${vorherName}: ${teile.join(", ")}`;
}
