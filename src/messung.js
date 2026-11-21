/* Ereignisse für Clarity (Victor, 20.11.2026): Jeder Schritt im Generator und das Ergebnis des Absendens.
   Daraus baut Victor in Clarity einen Trichter, statt die Schritte aus Aufnahmen abzulesen.
   Gemeldet wird nur, wenn Clarity geladen ist, also nach der Einwilligung (ladeClarity in einwilligung.js).
   Ohne Einwilligung gibt es window.clarity nicht, dann passiert nichts. Nie Kundendaten mitschicken. */
import { reportError } from "./errorLog.js";

export const EREIGNIS = {
  schritt: (n) => `schritt_${n}`,
  gesendet: "anfrage_gesendet",
  fehler: "anfrage_fehler",
};

/** Meldet ein Ereignis an Clarity. Wirft nie: Messung darf den Generator nicht stören. */
export function melde(name, ziel = globalThis.window) {
  const clarity = ziel?.clarity;
  if (typeof clarity !== "function") return false;
  try {
    clarity("event", name);
    return true;
  } catch (e) {
    reportError("clarity_ereignis", e, { ereignis: name });
    return false;
  }
}
