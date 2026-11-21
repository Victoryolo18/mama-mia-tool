/* Was der Kunde gewählt hat, in der Sprache der Anzeige: für die Zusammenfassung und die Bestätigungs-Mail.
   Ohne React, ohne Datenbank. Feste Teile stehen getrennt unter "Inklusive" (inklusive.js). */
import { lokal } from "./sprache.js";

/** Gewählte Gerichte je Block (ohne feste Teile): [{ id, label, namen }], leere Blöcke fallen weg. */
export function gewaehltNachBlock(bloecke, auswahl = {}, gerichte = {}) {
  return (bloecke || [])
    .filter((b) => b?.typ !== "fix")
    .map((b) => ({ id: b.id, label: b.label, namen: (auswahl[b.id] ?? []).map((id) => gerichte[id]?.name).filter(Boolean) }))
    .filter((b) => b.namen.length > 0);
}

/** Gewählte Zusatzwünsche mit ihrem Namen in der Sprache; der Getränkeservice steht fest im Generator. */
export function zusatzwuenscheInSprache(extras = [], katalog = [], t) {
  return extras.map((e) => {
    if (e === "Getränkeservice") return t.getraenke;
    const z = katalog.find((k) => k.label === e);
    return z ? lokal(z, "label", t.sprache) : e;
  });
}
