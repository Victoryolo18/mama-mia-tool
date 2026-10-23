import { describe, it, expect } from "vitest";
import { gefiltert, passtZumFilter, umschalten } from "./filter.js";

const braten = { id: 1, name_de: "Schweinebraten" };
const lachs = { id: 2, name_de: "Lachsfilet", glutenfrei_moeglich: true };
const salat = { id: 3, name_de: "Kartoffelsalat", vegetarisch: true, vegan_moeglich: true };
const gnocchi = { id: 4, name_de: "Gnocchi", vegetarisch: true };
const huhn = { id: 5, name_de: "Hähnchen", glutenfrei_moeglich: true };
const alle = [braten, lachs, salat, gnocchi, huhn];
const ids = (liste) => liste.map((g) => g.id);

describe("passtZumFilter", () => {
  it("ohne Filter ist alles sichtbar", () => {
    expect(ids(gefiltert(alle, []))).toEqual([1, 2, 3, 4, 5]);
  });

  it("nach Kostform", () => {
    expect(ids(gefiltert(alle, ["fleisch"]))).toEqual([1, 5]);
    expect(ids(gefiltert(alle, ["fisch"]))).toEqual([2]);
    expect(ids(gefiltert(alle, ["vegetarisch"]))).toEqual([3, 4]);
  });

  it("vegan und glutenfrei nach „auf Anfrage möglich“", () => {
    expect(ids(gefiltert(alle, ["vegan"]))).toEqual([3]);
    expect(ids(gefiltert(alle, ["glutenfrei"]))).toEqual([2, 5]);
  });

  it("alle Symbole gelten gleich: passt zu irgendeinem angetippten", () => {
    expect(ids(gefiltert(alle, ["fleisch", "vegan"]))).toEqual([1, 3, 5]);
    expect(ids(gefiltert(alle, ["vegetarisch", "glutenfrei"]))).toEqual([2, 3, 4, 5]);
  });

  it("ein schon veganes Gericht zählt als vegan", () => {
    expect(passtZumFilter({ name_de: "Hummus", vegan: true }, ["vegan"])).toBe(true);
  });
});

describe("gefiltert", () => {
  it("gewählte Gerichte bleiben sichtbar, auch wenn sie nicht passen", () => {
    expect(ids(gefiltert(alle, ["fisch"], [1]))).toEqual([1, 2]);
  });
});

describe("umschalten", () => {
  it("an und wieder aus", () => {
    expect(umschalten([], "vegan")).toEqual(["vegan"]);
    expect(umschalten(["vegan", "fisch"], "vegan")).toEqual(["fisch"]);
  });
});
