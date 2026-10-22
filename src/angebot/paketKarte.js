/* Zeilen einer Paket-Karte. Ohne React, ohne Datenbank. Die Website baut dieselben Zeilen in src/inhalte/katalog.ts. */

import { texte } from "./texte.js";

const DEUTSCH = texte("de");

/** Was ein Paket enthält, als Zeilen für die Karte: erst die Wahl, dann Inklusive, dann was es auf Wunsch dazu gibt
    ("Fingerfood (optional)": ohne "dazu", damit jede Zeile in eine Zeile passt; Victor, 20.10.2026),
    danach "Lieferung inklusive" und die weiteren Leistungen des Pakets (Paket Exklusiv). */
export function paketMerkmale(bloecke, paket = null, t = DEUTSCH) {
  const text = (b) => b.typ === "fix" ? t.merkmalInklusive(b.label)
    : b.typ === "zusatz" ? t.merkmalOptional(b.label.replace(/ (dazu|on the side|в дополнение)$/, ""))
    : t.merkmalAnzahl(b.max_auswahl, b.label);
  return [
    ...["wahl", "fix", "zusatz"].flatMap((typ) => bloecke.filter((b) => b.typ === typ).map(text)),
    ...(paket?.lieferung_inklusive ? [t.lieferungInklusive] : []),
    ...(paket?.leistungen ?? []),
  ];
}
