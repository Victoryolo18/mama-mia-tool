import { describe, it, expect } from "vitest";
import { ladePlzOrte, orteZurPlz, ortVorschlag } from "./plzOrte.js";

describe("Postleitzahlen (GeoNames)", () => {
  it("kennt alle deutschen Postleitzahlen mit ihren Orten", async () => {
    const plzOrte = await ladePlzOrte();
    expect(Object.keys(plzOrte).length).toBeGreaterThan(8000);
    expect(orteZurPlz(plzOrte, "16767")).toEqual(["Germendorf", "Leegebruch"]);
    expect(orteZurPlz(plzOrte, "10115")).toEqual(["Berlin"]);
    expect(orteZurPlz(plzOrte, "00000")).toBe(null);
    expect(Object.keys(plzOrte).every((plz) => /^\d{5}$/.test(plz))).toBe(true);
  });

  it("schlägt bei Großkunden-Postleitzahlen keine Firma als Ort vor", async () => {
    const plzOrte = await ladePlzOrte();
    const alle = Object.values(plzOrte).flat();
    expect(alle.some((ort) => /GmbH|\bAG\b|Finanzamt|Sparkasse/.test(ort))).toBe(false);
  });
});

describe("ortVorschlag", () => {
  const plzOrte = { "16767": ["Germendorf", "Leegebruch"], "16727": ["Velten"], "14469": ["Potsdam"] };

  it("trägt den Ort ein, wenn es genau einen gibt und das Feld leer ist", () => {
    expect(ortVorschlag(plzOrte, "16727", "", "")).toBe("Velten");
  });

  it("ersetzt einen früheren Vorschlag, aber nie, was der Kunde selbst geschrieben hat", () => {
    expect(ortVorschlag(plzOrte, "14469", "Velten", "16727")).toBe("Potsdam");
    expect(ortVorschlag(plzOrte, "14469", "Golm", "16727")).toBe(null);
  });

  it("schlägt nichts vor bei mehreren Orten oder unbekannter Postleitzahl", () => {
    expect(ortVorschlag(plzOrte, "16767", "", "")).toBe(null);
    expect(ortVorschlag(plzOrte, "99999", "", "")).toBe(null);
    expect(ortVorschlag(null, "16727", "", "")).toBe(null);
  });
});
