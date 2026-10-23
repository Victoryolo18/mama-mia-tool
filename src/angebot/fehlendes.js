/* Wohin "Auswahl vervollständigen" springt (GEN-28): zum ersten Teil des Menüs, in dem noch etwas fehlt,
   in der Reihenfolge der Seite (Victor, 23.10.2026). Ohne React. */
import { blockErfuellt } from "./angebotspreis.js";

/** Der erste Block, dessen Auswahl noch nicht reicht; null, wenn alles gewählt ist. */
export function ersterOffenerBlock(bloecke, auswahl = {}, plusEins = {}) {
  return bloecke.find((b) => !blockErfuellt(b, auswahl[b.id] ?? [], !!plusEins[b.id])) ?? null;
}

/** Die Adresse im Dokument, unter der ein Block steht. */
export const blockAnker = (block) => `mm-block-${block.id}`;
