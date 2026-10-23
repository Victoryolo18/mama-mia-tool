import { describe, it, expect } from "vitest";
import { S } from "./theme.js";

describe("Rand der Knöpfe mit …Active-Stil", () => {
  // Setzt der aktive Stil nur `borderColor` und der Grundstil den Rand als `border`, verliert React beim
  // Abwählen die Farbe: Der Rand wird schwarz (Victor, 23.10.2026). Der Grundstil braucht die Einzelwerte.
  const paare = Object.keys(S).filter((k) => S[`${k}Active`]?.borderColor !== undefined);

  it.each(paare)("%s hat die Randfarbe als Einzelwert", (k) => {
    expect(S[k].border).toBeUndefined();
    expect(S[k].borderColor).toBeDefined();
  });

  it("findet die bekannten Knöpfe", () => {
    expect(paare).toEqual(expect.arrayContaining(["menueWahlBtn", "paketCard", "anlassCard", "toggleBtn"]));
  });
});
