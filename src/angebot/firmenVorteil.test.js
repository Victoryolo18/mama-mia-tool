import { describe, it, expect } from "vitest";
import { FIRMEN_VORTEIL, firmaAbfrage, firmenAnlass, firmenVorteilBedingungen, firmenVorteilMoeglich, mitFirmenVorteil, pruefeFirma, vorteilProzent, wochentageText } from "./firmenVorteil.js";
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
    expect(firmenVorteilBedingungen()).toBe("Montag bis Donnerstag, ab 15 Personen, mit Rechnung an die Firma");
  });
});

const firma = { name: "Muster GmbH", adresse: "Hauptstraße 1, 16767 Leegebruch", ust_id: "" };

describe("pruefeFirma", () => {
  it("nimmt Name und Adresse mit Postleitzahl, die Umsatzsteuer-ID ist freiwillig", () => {
    expect(pruefeFirma(firma)).toEqual({ wert: { name: "Muster GmbH", adresse: "Hauptstraße 1, 16767 Leegebruch", ust_id: null } });
    expect(pruefeFirma({ ...firma, ust_id: " de 123 456 789 " }).wert.ust_id).toBe("DE123456789");
  });

  it("ist leer, wenn nichts eingetragen ist", () => {
    expect(pruefeFirma({ name: " ", adresse: "", ust_id: "" })).toEqual({ wert: null });
    expect(pruefeFirma(undefined)).toEqual({ wert: null });
  });

  it("lehnt fehlenden Namen, Adresse ohne Postleitzahl und eine falsche Umsatzsteuer-ID ab", () => {
    expect(pruefeFirma({ ...firma, name: "" }).fehler).toMatch(/Namen der Firma/);
    expect(pruefeFirma({ ...firma, adresse: "Hauptstraße 1, Leegebruch" }).fehler).toMatch(/Postleitzahl/);
    expect(pruefeFirma({ ...firma, ust_id: "123" }).fehler).toMatch(/Umsatzsteuer-ID/);
    expect(pruefeFirma({ ...firma, name: "x".repeat(121) }).fehler).toMatch(/zu lang/);
  });
});

describe("firmaAbfrage", () => {
  it("verlangt die Firma bei den Anlässen mit Vorteil und fragt sie bei der Weihnachtsfeier freiwillig ab", () => {
    for (const anlass of FIRMEN_VORTEIL.anlaesse) expect(firmaAbfrage(anlass), anlass).toBe("pflicht");
    expect(firmaAbfrage("weihnachtsfeier")).toBe("freiwillig");
    expect(firmaAbfrage("hochzeit")).toBe(null);
    expect(firmaAbfrage(null)).toBe(null);
  });
});

describe("vorteilProzent", () => {
  it("gibt 5 Prozent nur mit gültigen Firmendaten", () => {
    expect(vorteilProzent({ ...gut, firma })).toBe(5);
    expect(vorteilProzent(gut)).toBe(null);
    expect(vorteilProzent({ ...gut, firma: { ...firma, adresse: "Leegebruch" } })).toBe(null);
  });

  it("gibt keinen Vorteil am Freitag, auch mit Firmendaten", () => {
    expect(vorteilProzent({ ...gut, datum: "2026-10-23", firma })).toBe(null);
  });
});

describe("mitFirmenVorteil", () => {
  const ergebnis = { speisenGesamt: 1200, lieferzuschlag: 25, gesamt: 1225 };

  it("zieht den Vorteil nur von den Speisen ab, nicht von der Lieferung", () => {
    expect(mitFirmenVorteil(ergebnis, 5)).toEqual({ ...ergebnis, gesamt: 1165, firmenVorteil: { prozent: 5, betrag: 60 } });
  });

  it("rundet auf den Cent", () => {
    const r = mitFirmenVorteil({ speisenGesamt: 333.33, lieferzuschlag: 0, gesamt: 333.33 }, 5);
    expect(r.firmenVorteil.betrag).toBe(16.67);
    expect(r.gesamt).toBe(316.66);
  });

  it("lässt den Preis ohne Vorteil stehen", () => {
    expect(mitFirmenVorteil(ergebnis, null)).toEqual({ ...ergebnis, firmenVorteil: null });
    expect(mitFirmenVorteil(null, 5)).toBe(null);
  });
});
