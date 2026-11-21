import { describe, it, expect } from "vitest";
import { ersterFehlenderSchritt, ersterOffenerBlock, fehlendeAnfrage, fehlendeDetails } from "./fehlendes.js";

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
  const grenzen = { mindestpersonen: 8, hoechstens: 250, heute: "2026-11-21" };
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

/* Prüfung 21.11.2026: Über Browser-Vorwärts ließ sich ohne Gäste, Datum oder volles Menü absenden. */
describe("Datum, Gäste und Absenden (Prüfung 21.11.2026)", () => {
  const grenzen = { mindestpersonen: 8, hoechstens: 250, heute: "2026-11-21" };
  const voll = { anlass: "geburtstag", gaeste: 30, datum: "2026-11-21", lieferung: "selbstabholung", plz: "16767" };

  it("nimmt heute, aber kein Datum in der Vergangenheit", () => {
    expect(fehlendeDetails(voll, grenzen)).toEqual([]);
    expect(fehlendeDetails({ ...voll, datum: "2026-11-20" }, grenzen)).toEqual(["datum"]);
  });

  it("nimmt nur ganze Gäste", () => {
    expect(fehlendeDetails({ ...voll, gaeste: "10.5" }, grenzen)).toEqual(["gaeste"]);
    expect(fehlendeDetails({ ...voll, gaeste: "10" }, grenzen)).toEqual([]);
  });

  const daten = { ...voll, name: "TEST Erika", kontaktdaten: "erika@example.org" };
  const pruefe = (mehr = {}) => ersterFehlenderSchritt({
    data: daten, essensart: { slug: "buffet" }, paket: { id: "p" }, ergebnis: { vollstaendig: true },
    mindestpersonen: 8, heute: "2026-11-21", ...mehr,
  });

  it("lässt absenden, wenn alles da ist", () => {
    expect(pruefe()).toBeNull();
  });

  it("schickt zum ersten Schritt, in dem etwas fehlt", () => {
    expect(pruefe({ essensart: null })).toBe(1);
    expect(pruefe({ paket: null })).toBe(2);
    expect(pruefe({ ergebnis: { vollstaendig: false } })).toBe(3);
    expect(pruefe({ ergebnis: null })).toBe(3);
    expect(pruefe({ data: { ...daten, gaeste: "" } })).toBe(4);
    expect(pruefe({ data: { ...daten, datum: "" } })).toBe(4);
    expect(pruefe({ ortsteilNoetig: true })).toBe(4);
    expect(pruefe({ data: { ...daten, name: "" } })).toBe(6);
  });
});

describe("Generator prüft vor dem Absenden", () => {
  it("handleSubmit springt zurück, statt unvollständig abzuschicken", async () => {
    const fs = await import("node:fs");
    const s = fs.readFileSync("src/MamaMiaAngebotsgenerator.jsx", "utf8");
    expect(s).toMatch(/async function handleSubmit\(\) \{[\s\S]{0,600}if \(fehlt\) return springeZu\(fehlt\);[\s\S]{0,40}setSubmitting\(true\)/);
  });
});
