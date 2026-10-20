/* Zeilen einer Paket-Karte. Ohne React, ohne Datenbank. Die Website baut dieselben Zeilen in src/inhalte/katalog.ts. */

/** Was ein Paket enthält, als Zeilen für die Karte: erst die Wahl, dann Inklusive, dann was es auf Wunsch dazu gibt,
    danach "Lieferung inklusive" und die weiteren Leistungen des Pakets (Paket Exklusiv). */
export function paketMerkmale(bloecke, paket = null) {
  const text = (b) => b.typ === "fix" ? `${b.label} inklusive`
    : b.typ === "zusatz" ? `${b.label} auf Wunsch`
    : `${b.max_auswahl}× ${b.label}`;
  return [
    ...["wahl", "fix", "zusatz"].flatMap((typ) => bloecke.filter((b) => b.typ === typ).map(text)),
    ...(paket?.lieferung_inklusive ? ["Lieferung inklusive"] : []),
    ...(paket?.leistungen ?? []),
  ];
}
