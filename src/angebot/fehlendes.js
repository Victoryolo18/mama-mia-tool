/* Wohin "Auswahl vervollständigen" springt (GEN-28): zum ersten Teil des Menüs, in dem noch etwas fehlt,
   in der Reihenfolge der Seite (Victor, 23.10.2026). Ohne React. */
import { blockErfuellt } from "./angebotspreis.js";

/** Der erste Block, dessen Auswahl noch nicht reicht; null, wenn alles gewählt ist. */
export function ersterOffenerBlock(bloecke, auswahl = {}, plusEins = {}) {
  return bloecke.find((b) => !blockErfuellt(b, auswahl[b.id] ?? [], !!plusEins[b.id])) ?? null;
}

/** Die Adresse im Dokument, unter der ein Block steht. */
export const blockAnker = (block) => `mm-block-${block.id}`;

/** Welche Pflichtangaben in "Details" fehlen, in der Reihenfolge der Seite. Leer: Es geht weiter.
    Der Knopf bleibt antippbar und springt zur ersten Lücke, statt stumm grau zu bleiben (Victor, 02.11.2026). */
export function fehlendeDetails(data, { mindestpersonen, hoechstens, ortsteilNoetig = false }) {
  const gaeste = Number(data.gaeste);
  const gaesteOk = data.gaeste !== "" && data.gaeste !== null && data.gaeste !== undefined && gaeste >= mindestpersonen && gaeste <= hoechstens;
  return [
    !data.anlass && "anlass",
    !gaesteOk && "gaeste",
    !data.datum && "datum",
    !data.lieferung && "lieferung",
    !data.plz && "plz",
    ortsteilNoetig && "ortsteil",
  ].filter(Boolean);
}

/** Welche Pflichtangaben vor dem Absenden fehlen, in der Reihenfolge der Seite. */
export function fehlendeAnfrage(data, { firmaOk = true } = {}) {
  return [
    String(data.name ?? "").trim().length < 2 && "name",
    String(data.kontaktdaten ?? "").trim().length < 5 && "kontaktdaten",
    !firmaOk && "firma",
  ].filter(Boolean);
}

/** Bringt das erste fehlende Feld in die Mitte des Bildschirms. */
export function zeigeFeld(feld) {
  document.getElementById(`mm-feld-${feld}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
