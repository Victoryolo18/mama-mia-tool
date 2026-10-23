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
