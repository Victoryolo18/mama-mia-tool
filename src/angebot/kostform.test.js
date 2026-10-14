import { describe, it, expect } from "vitest";
import { KOSTFORMEN, kostform, kostformenIn } from "./kostform.js";

describe("kostform", () => {
  it("folgt den Häkchen aus dem CRM: vegan vor vegetarisch", () => {
    expect(kostform({ name: "Obstspieße", vegetarisch: true, vegan: true })).toBe("vegan");
    expect(kostform({ name: "Käseplatte", vegetarisch: true, vegan: false })).toBe("vegetarisch");
  });

  it("erkennt Fisch an der Unterkategorie oder am Namen", () => {
    expect(kostform({ name: "Lachs in Sahnesoße", unterkategorie: "fisch", vegetarisch: false })).toBe("fisch");
    for (const name of ["Eierkuchen-Lachsröllchen", "Garnelen-Spieße", "Salat Schuba (Matjes und Rote Bete)", "Bagel mit Lachs"]) {
      expect(kostform({ name, unterkategorie: "haeppchen", vegetarisch: false }), name).toBe("fisch");
    }
  });

  it("nennt alles andere ohne Häkchen Fleisch", () => {
    expect(kostform({ name: "Bouletten", unterkategorie: "haeppchen", vegetarisch: false })).toBe("fleisch");
    expect(kostform({ name: "Schweinefilet in Rahmsoße", unterkategorie: "fleisch", vegetarisch: false })).toBe("fleisch");
  });

  it("ein vegetarisches Gericht mit Fisch-Wort im Namen bleibt vegetarisch", () => {
    expect(kostform({ name: "Fischbrötchen-Art mit Gemüse", vegetarisch: true })).toBe("vegetarisch");
  });
});

describe("kostformenIn", () => {
  it("zeigt in der Legende nur, was vorkommt, in fester Reihenfolge", () => {
    const liste = [{ name: "Käseplatte", vegetarisch: true }, { name: "Bouletten", vegetarisch: false }];
    expect(kostformenIn(liste).map((k) => k.slug)).toEqual(["fleisch", "vegetarisch"]);
    expect(kostformenIn([])).toEqual([]);
  });

  it("hat vier Kostformen mit eigener Farbe", () => {
    expect(new Set(KOSTFORMEN.map((k) => k.farbe)).size).toBe(4);
  });
});
