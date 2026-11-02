import { describe, it, expect } from "vitest";
import { ersterOffenerBlock, fehlendeAnfrage, fehlendeDetails } from "./fehlendes.js";

const vorspeisen = { id: "v", typ: "wahl", min_auswahl: 2, max_auswahl: 2 };
const haupt = { id: "h", typ: "wahl", min_auswahl: 1, max_auswahl: 1 };
const fest = { id: "f", typ: "fix" };
const beilagen = { id: "b", typ: "wahl", min_auswahl: 2, max_auswahl: 2 };
const extras = { id: "z", typ: "zusatz", min_auswahl: 0, max_auswahl: 3 };
const bloecke = [vorspeisen, haupt, fest, beilagen, extras];

describe("ersterOffenerBlock", () => {
  it("der erste Teil, in dem etwas fehlt, in der Reihenfolge der Seite", () => {
    expect(ersterOffenerBlock(bloecke, {})?.id).toBe("v");
    expect(ersterOffenerBlock(bloecke, { v: [1] })?.id).toBe("v");
    expect(ersterOffenerBlock(bloecke, { v: [1, 2] })?.id).toBe("h");
  });

  it("fehlt nur bei Beilagen, geht es dorthin; feste Teile und Extras fehlen nie", () => {
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3] })?.id).toBe("b");
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3], b: [4, 5] })).toBeNull();
  });

  it("mit +1 fehlt das zusätzliche Gericht", () => {
    expect(ersterOffenerBlock(bloecke, { v: [1, 2], h: [3], b: [4, 5] }, { v: true })?.id).toBe("v");
  });
});

describe("fehlendeDetails", () => {
  const grenzen = { mindestpersonen: 8, hoechstens: 250 };
  const voll = { anlass: "geburtstag", gaeste: 30, datum: "2026-12-12", lieferung: "selbstabholung", plz: "16767" };

  it("lässt weiter, wenn alles da ist", () => {
    expect(fehlendeDetails(voll, grenzen)).toEqual([]);
  });

  it("nennt die Lücken in der Reihenfolge der Seite", () => {
    expect(fehlendeDetails({ gaeste: "" }, grenzen)).toEqual(["anlass", "gaeste", "datum", "lieferung", "plz"]);
  });

  it("verlangt die Postleitzahl auch bei Selbstabholung", () => {
    expect(fehlendeDetails({ ...voll, plz: "" }, grenzen)).toEqual(["plz"]);
  });

  it("zählt zu wenige oder zu viele Gäste als Lücke", () => {
    expect(fehlendeDetails({ ...voll, gaeste: 7 }, grenzen)).toEqual(["gaeste"]);
    expect(fehlendeDetails({ ...voll, gaeste: 251 }, grenzen)).toEqual(["gaeste"]);
    expect(fehlendeDetails({ ...voll, gaeste: 8 }, grenzen)).toEqual([]);
  });

  it("verlangt den Ortsteil nur, wenn er nötig ist", () => {
    expect(fehlendeDetails(voll, { ...grenzen, ortsteilNoetig: true })).toEqual(["ortsteil"]);
  });
});

describe("fehlendeAnfrage", () => {
  it("verlangt Name, Kontakt und, wo nötig, die Firma", () => {
    expect(fehlendeAnfrage({ name: " A ", kontaktdaten: "123" }, { firmaOk: false })).toEqual(["name", "kontaktdaten", "firma"]);
    expect(fehlendeAnfrage({ name: "Anna", kontaktdaten: "0173 123" })).toEqual([]);
  });
});
