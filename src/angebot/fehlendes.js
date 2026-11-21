/* Wohin "Auswahl vervollständigen" springt (GEN-28): zum ersten Teil des Menüs, in dem noch etwas fehlt,
   in der Reihenfolge der Seite (Victor, 23.10.2026). Ohne React. */
import { blockErfuellt } from "./angebotspreis.js";
import { berlinerDatum } from "./highlights.js";

/** Mehr Gäste nimmt der Generator nicht an; darüber fragt man Jana direkt. */
export const HOECHSTENS = 250;

/** Der erste Block, dessen Auswahl noch nicht reicht; null, wenn alles gewählt ist. */
export function ersterOffenerBlock(bloecke, auswahl = {}, plusEins = {}) {
  return bloecke.find((b) => !blockErfuellt(b, auswahl[b.id] ?? [], !!plusEins[b.id])) ?? null;
}

/** Die Adresse im Dokument, unter der ein Block steht. */
export const blockAnker = (block) => `mm-block-${block.id}`;

/** Welche Pflichtangaben in "Details" fehlen, in der Reihenfolge der Seite. Leer: Es geht weiter.
    Der Knopf bleibt antippbar und springt zur ersten Lücke, statt stumm grau zu bleiben (Victor, 02.11.2026). */
export function fehlendeDetails(data, { mindestpersonen, hoechstens = HOECHSTENS, ortsteilNoetig = false, heute = berlinerDatum() }) {
  const gaeste = Number(data.gaeste);
  // Nur ganze Gäste: Mit 10,5 rechneten die Zeilen der Zusammenfassung anders als der Gesamtpreis.
  const gaesteOk = data.gaeste !== "" && data.gaeste !== null && data.gaeste !== undefined
    && Number.isInteger(gaeste) && gaeste >= mindestpersonen && gaeste <= hoechstens;
  // Das Datum zählt nach Berliner Zeit; ein Tag in der Vergangenheit gilt als nicht angegeben.
  const datumOk = !!data.datum && String(data.datum) >= heute;
  return [
    !data.anlass && "anlass",
    !gaesteOk && "gaeste",
    !datumOk && "datum",
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

/** Der erste Schritt, in dem vor dem Absenden noch etwas fehlt; null, wenn alles da ist.
    Der Browser-Verlauf (Vorwärts) springt an den Knöpfen "Weiter" vorbei. Deshalb prüft das Absenden alles noch einmal. */
export function ersterFehlenderSchritt({ data, essensart, paket, ergebnis, mindestpersonen, ortsteilNoetig = false, firmaOk = true, heute = berlinerDatum() }) {
  if (!essensart) return 1;
  if (!paket) return 2;
  if (!ergebnis?.vollstaendig) return 3;
  if (fehlendeDetails(data, { mindestpersonen, ortsteilNoetig, heute }).length > 0) return 4;
  if (fehlendeAnfrage(data, { firmaOk }).length > 0) return 6;
  return null;
}

/** Bringt das erste fehlende Feld in die Mitte des Bildschirms. */
export function zeigeFeld(feld) {
  document.getElementById(`mm-feld-${feld}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
