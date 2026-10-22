import { describe, it, expect } from "vitest";
import { KOSTFORMEN, kostform, kostformenIn } from "./kostform.js";
import { SYMBOLE } from "./symbole.js";

describe("kostform", () => {
  it("folgt dem Häkchen aus dem CRM; vegan zählt als vegetarisch, ohne eigene Kostform", () => {
    expect(kostform({ name: "Obstspieße", vegetarisch: true, vegan: true })).toBe("vegetarisch");
    expect(kostform({ name: "Obstplatte", vegetarisch: false, vegan: true })).toBe("vegetarisch");
    expect(KOSTFORMEN.map((k) => k.slug)).not.toContain("vegan");
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

  it("hat drei Kostformen, jede mit eigenem Symbol", () => {
    expect(KOSTFORMEN).toHaveLength(3);
    for (const k of KOSTFORMEN) expect(SYMBOLE[k.slug], k.slug).toBeTruthy();
  });
});
