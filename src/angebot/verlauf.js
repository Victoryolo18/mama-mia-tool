/* Die Zurück-Taste des Browsers geht einen Schritt zurück statt aus dem Generator heraus (GEN-28).
   Jeder Schritt bekommt einen Eintrag im Verlauf; die Adresse bleibt dieselbe. Ohne React. */

/** Der Schritt, der zu einem Eintrag im Verlauf gehört. Ein Eintrag ohne Schritt ist der Start. */
export function schrittAusVerlauf(zustand, start) {
  const s = Number(zustand?.mmSchritt);
  return Number.isInteger(s) && s >= 1 ? s : start;
}

/** Der Eintrag für einen Schritt; andere Werte im Zustand bleiben erhalten. */
export function verlaufFuer(zustand, schritt) {
  return { ...(zustand ?? {}), mmSchritt: schritt };
}

/** Kam der Besucher von der Website (mama-mia-events.de, nicht vom Generator selbst)? Dann führt der Pfeil in
    Schritt 1 dorthin zurück, wo er war; sonst auf die Startseite der Website (Victor, 02.11.2026). */
export function vonDerWebsite(referrer) {
  return /^https:\/\/(www\.)?mama-mia-events\.de(\/|$)/.test(referrer ?? "");
}

/** Sprung auf einen erledigten Schritt (Klick auf den Kreis oder das Logo). `zurueck`: so viele Einträge im
    Browserverlauf zurück. Vor dem Schritt, mit dem der Link begann, gibt es keinen Eintrag: Dann landet der
    Verlauf beim Start, und `ersetzen` nennt den Schritt, der dort eingetragen wird. `null`: kein Sprung. */
export function sprungPlan(ziel, schritt, start) {
  if (!Number.isInteger(ziel) || ziel < 1 || ziel >= schritt) return null;
  const landung = Math.max(ziel, start);
  return { zurueck: schritt - landung, ersetzen: ziel < start ? ziel : null };
}
