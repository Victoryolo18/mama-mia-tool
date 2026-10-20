import { describe, it, expect } from "vitest";
import { aufAnfrage, aufAnfrageIn, brauchtAbsprache, ernaehrungText } from "./ernaehrung.js";

describe("aufAnfrage", () => {
  it("nennt, was ein Gericht auf Anfrage sein kann, vegan vor glutenfrei", () => {
    const g = { name: "Kartoffelsalat", vegetarisch: true, vegan_moeglich: true, glutenfrei_moeglich: true };
    expect(aufAnfrage(g).map((a) => a.slug)).toEqual(["vegan", "glutenfrei"]);
  });

  it("zeigt auch bei einem Gericht, das schon vegan ist, „vegan (auf Anfrage)“", () => {
    expect(aufAnfrage({ vegan: true }).map((a) => a.slug)).toEqual(["vegan"]);
    expect(aufAnfrage({ vegan: true, vegan_moeglich: true, glutenfrei_moeglich: true }).map((a) => a.slug)).toEqual(["vegan", "glutenfrei"]);
  });

  it("zeigt ohne Häkchen nichts, auch bei alten Daten ohne die Felder", () => {
    expect(aufAnfrage({ name: "Gulasch" })).toEqual([]);
    expect(aufAnfrage(undefined)).toEqual([]);
  });

  it("sammelt für die Legende nur, was vorkommt", () => {
    expect(aufAnfrageIn([{ glutenfrei_moeglich: true }, { name: "x" }]).map((a) => a.slug)).toEqual(["glutenfrei"]);
    expect(aufAnfrageIn([{ name: "x" }])).toEqual([]);
  });
});

describe("ernaehrungText und brauchtAbsprache", () => {
  it("schreibt nur, was angegeben ist", () => {
    expect(ernaehrungText({ vegetarisch: 0, vegan: 2, glutenfrei: 1 })).toBe("2 vegan, 1 glutenfrei");
    expect(ernaehrungText(null)).toBe("");
  });

  it("verlangt eine Absprache bei vegan oder glutenfrei, nicht bei vegetarisch", () => {
    expect(brauchtAbsprache({ vegetarisch: 5, vegan: 0, glutenfrei: 0 })).toBe(false);
    expect(brauchtAbsprache({ vegetarisch: 0, vegan: 1, glutenfrei: 0 })).toBe(true);
    expect(brauchtAbsprache({ vegetarisch: 0, vegan: 0, glutenfrei: 2 })).toBe(true);
    expect(brauchtAbsprache(null)).toBe(false);
  });
});
