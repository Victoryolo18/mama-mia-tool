import { describe, it, expect } from "vitest";
import { FIRMEN_VORTEIL, firmenAnlass, firmenVorteilBedingungen, firmenVorteilMoeglich, wochentageText } from "./firmenVorteil.js";
import { ANLAESSE } from "./anlaesse.js";

// 2026-10-19 ist ein Montag, 2026-10-22 ein Donnerstag, 2026-10-23 ein Freitag, 2026-10-24 ein Samstag.
const gut = { anlass: "firmenfeier", datum: "2026-10-19", gaeste: 20 };

describe("firmenVorteilMoeglich", () => {
  it("gilt Montag bis Donnerstag für Firmenanlässe ab 15 Personen", () => {
    expect(firmenVorteilMoeglich(gut)).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, datum: "2026-10-22" })).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, gaeste: 15 })).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, anlass: "seminar" })).toBe(true);
  });

  it("gilt nicht am Freitag, Samstag oder Sonntag", () => {
    for (const datum of ["2026-10-23", "2026-10-24", "2026-10-25"]) {
      expect(firmenVorteilMoeglich({ ...gut, datum }), datum).toBe(false);
    }
  });

  it("gilt nicht unter 15 Personen und nicht ohne Personenzahl", () => {
    expect(firmenVorteilMoeglich({ ...gut, gaeste: 14 })).toBe(false);
    expect(firmenVorteilMoeglich({ ...gut, gaeste: "" })).toBe(false);
  });

  it("gilt nicht für private Anlässe, die Weihnachtsfeier oder ohne Anlass", () => {
    for (const anlass of ["geburtstag", "hochzeit", "weihnachtsfeier", null, undefined]) {
      expect(firmenVorteilMoeglich({ ...gut, anlass }), String(anlass)).toBe(false);
    }
  });

  it("gilt nicht ohne gültiges Datum", () => {
    for (const datum of ["", null, "19.10.2026", "2026-02-30", "2026-13-01"]) {
      expect(firmenVorteilMoeglich({ ...gut, datum }), String(datum)).toBe(false);
    }
  });

  it("nennt nur Anlässe, die der Generator kennt", () => {
    for (const anlass of FIRMEN_VORTEIL.anlaesse) expect(ANLAESSE.some((a) => a.slug === anlass), anlass).toBe(true);
    expect(firmenAnlass("eroeffnung")).toBe(true);
  });
});

describe("Texte", () => {
  it("fasst lückenlose Wochentage zusammen und zählt andere auf", () => {
    expect(wochentageText([1, 2, 3, 4])).toBe("Montag bis Donnerstag");
    expect(wochentageText([1, 3, 5])).toBe("Montag, Mittwoch und Freitag");
    expect(wochentageText([2])).toBe("Dienstag");
  });

  it("nennt die Bedingungen aus den Regeln", () => {
    expect(firmenVorteilBedingungen()).toBe("Montag bis Donnerstag, für Firmen auf Rechnung, ab 15 Personen");
  });
});
