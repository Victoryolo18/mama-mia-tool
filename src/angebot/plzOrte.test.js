import { describe, it, expect } from "vitest";
import { ladePlzOrte, orteZurPlz, ortZurPlz } from "./plzOrte.js";

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

describe("ortZurPlz", () => {
  const plzOrte = { "16767": ["Germendorf", "Leegebruch"], "16727": ["Velten"], "14469": ["Potsdam"], "10875": [] };

  it("trägt bei genau einem Ort diesen ein, auch wenn vorher ein anderer drinstand (Victor, 20.10.2026)", () => {
    expect(ortZurPlz(plzOrte, "16727", "")).toBe("Velten");
    expect(ortZurPlz(plzOrte, "16727", "Leegebruch")).toBe("Velten");
    expect(ortZurPlz(plzOrte, "14469", "Velten")).toBe("Potsdam");
  });

  it("lässt bei mehreren Orten einen passenden stehen und leert einen unpassenden", () => {
    expect(ortZurPlz(plzOrte, "16767", "Leegebruch")).toBe(undefined);
    expect(ortZurPlz(plzOrte, "16767", "Velten")).toBe("");
  });

  it("ändert nichts bei unvollständiger, unbekannter oder Großkunden-Postleitzahl", () => {
    expect(ortZurPlz(plzOrte, "1676", "Leegebruch")).toBe(undefined);
    expect(ortZurPlz(plzOrte, "99999", "Leegebruch")).toBe(undefined);
    expect(ortZurPlz(plzOrte, "10875", "Stuttgart")).toBe(undefined);
    expect(ortZurPlz(null, "16727", "")).toBe(undefined);
  });
});
