/* Feste Teile eines Pakets (Blöcke vom Typ "fix", z. B. Brötchen & Croissants beim Frühstück).
   Bis 21.11.2026 fehlten sie in der Zusammenfassung und in den Mails; Jana hat sie bei einer Anfrage
   nicht geliefert. Ohne React, ohne Datenbank. */

const ohneDoppelte = (namen) => [...new Set(namen.filter(Boolean))];

/** Namen der festen Teile aus den Blöcken des Pakets und dem Gerichte-Katalog (in der Sprache der Anzeige). */
export function inklusiveNamen(bloecke, gerichte) {
  return ohneDoppelte((bloecke || []).filter((b) => b?.typ === "fix").map((b) => gerichte?.[b.fix_gericht_id]?.name));
}

/** Namen der festen Teile aus einer gespeicherten Anfrage (angebot_snapshot.bloecke). */
export function inklusiveAusSnapshot(snapshot) {
  if (!Array.isArray(snapshot?.bloecke)) return [];
  return ohneDoppelte(snapshot.bloecke.filter((b) => b?.typ === "fix").flatMap((b) => (b.gerichte || []).map((g) => g?.name)));
}
