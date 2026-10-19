import { describe, it, expect, vi } from "vitest";
import {
  FIRMEN_ANLAESSE, adresseAusFeldern, firmaAbfrage, firmenAnlass, firmenVorteilBedingungen, firmenVorteilMoeglich, ladeFirmenVorteil,
  mitFirmenVorteil, pruefeFirma, pruefeFirmaEingabe, pruefeRegel, regelAusZeile, vorteilProzent, wochentag, wochentageText,
} from "./firmenVorteil.js";
import { ANLAESSE } from "./anlaesse.js";

// Startwerte aus Migration 18. 2026-10-19 ist ein Montag, 2026-10-22 ein Donnerstag, 2026-10-23 ein Freitag.
const regel = { prozent: 5, wochentage: [1, 2, 3, 4], mindestpersonen: 15 };
const gut = { anlass: "firmenfeier", datum: "2026-10-19", gaeste: 20 };

describe("firmenVorteilMoeglich", () => {
  it("gilt an den eingestellten Tagen für Firmenanlässe ab der eingestellten Personenzahl", () => {
    expect(firmenVorteilMoeglich(gut, regel)).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, datum: "2026-10-22" }, regel)).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, gaeste: 15 }, regel)).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, anlass: "seminar" }, regel)).toBe(true);
  });

  it("gilt nicht an anderen Tagen", () => {
    for (const datum of ["2026-10-23", "2026-10-24", "2026-10-25"]) {
      expect(firmenVorteilMoeglich({ ...gut, datum }, regel), datum).toBe(false);
    }
  });

  it("folgt der Einstellung: andere Tage und Personenzahl", () => {
    const freitags = { ...regel, wochentage: [5], mindestpersonen: 30 };
    expect(firmenVorteilMoeglich({ ...gut, datum: "2026-10-23", gaeste: 30 }, freitags)).toBe(true);
    expect(firmenVorteilMoeglich({ ...gut, datum: "2026-10-23", gaeste: 29 }, freitags)).toBe(false);
    expect(firmenVorteilMoeglich({ ...gut, gaeste: 30 }, freitags)).toBe(false);
    expect(firmenVorteilMoeglich({ ...gut, datum: "2026-10-25" }, { ...regel, wochentage: [7] })).toBe(true);
  });

  it("gilt nicht, wenn der Vorteil ausgeschaltet ist", () => {
    expect(firmenVorteilMoeglich(gut, null)).toBe(false);
  });

  it("gilt nicht unter der Personenzahl und nicht ohne Personenzahl", () => {
    expect(firmenVorteilMoeglich({ ...gut, gaeste: 14 }, regel)).toBe(false);
    expect(firmenVorteilMoeglich({ ...gut, gaeste: "" }, regel)).toBe(false);
  });

  it("gilt nicht für private Anlässe, die Weihnachtsfeier oder ohne Anlass", () => {
    for (const anlass of ["geburtstag", "hochzeit", "weihnachtsfeier", null, undefined]) {
      expect(firmenVorteilMoeglich({ ...gut, anlass }, regel), String(anlass)).toBe(false);
    }
  });

  it("gilt nicht ohne gültiges Datum", () => {
    for (const datum of ["", null, "19.10.2026", "2026-02-30", "2026-13-01"]) {
      expect(firmenVorteilMoeglich({ ...gut, datum }, regel), String(datum)).toBe(false);
    }
  });

  it("nennt nur Anlässe, die der Generator kennt", () => {
    for (const anlass of FIRMEN_ANLAESSE) expect(ANLAESSE.some((a) => a.slug === anlass), anlass).toBe(true);
    expect(firmenAnlass("eroeffnung")).toBe(true);
  });
});

describe("wochentag", () => {
  it("zählt wie die Datenbank: 1 = Montag bis 7 = Sonntag", () => {
    expect(wochentag("2026-10-19")).toBe(1);
    expect(wochentag("2026-10-25")).toBe(7);
    expect(wochentag("2026-02-30")).toBe(null);
  });
});

describe("pruefeRegel und regelAusZeile", () => {
  const zeile = { aktiv: true, prozent: 5, wochentage: [4, 1, 2, 3], mindestpersonen: 15 };

  it("nimmt eine gültige Einstellung und sortiert die Tage", () => {
    expect(pruefeRegel(zeile)).toEqual({ wert: { aktiv: true, prozent: 5, wochentage: [1, 2, 3, 4], mindestpersonen: 15 } });
    expect(pruefeRegel({ ...zeile, prozent: "10", mindestpersonen: " 20 " }).wert).toMatchObject({ prozent: 10, mindestpersonen: 20 });
  });

  it("lehnt Prozent außerhalb von 1 bis 30, Kommazahlen, keine Tage und falsche Personenzahlen ab", () => {
    for (const prozent of [0, 31, "", "5,5", 5.5, null]) expect(pruefeRegel({ ...zeile, prozent }).fehler, String(prozent)).toMatch(/Prozent/);
    expect(pruefeRegel({ ...zeile, wochentage: [] }).fehler).toMatch(/Wochentag/);
    expect(pruefeRegel({ ...zeile, wochentage: [0] }).fehler).toMatch(/Wochentag/);
    for (const mindestpersonen of [0, 251, ""]) expect(pruefeRegel({ ...zeile, mindestpersonen }).fehler).toMatch(/Personenzahl/);
  });

  it("rechnet nur mit einer eingeschalteten, gültigen Regel", () => {
    expect(regelAusZeile(zeile)).toEqual({ aktiv: true, prozent: 5, wochentage: [1, 2, 3, 4], mindestpersonen: 15 });
    expect(regelAusZeile({ ...zeile, aktiv: false })).toBe(null);
    expect(regelAusZeile({ ...zeile, prozent: 0 })).toBe(null);
    expect(regelAusZeile(undefined)).toBe(null);
  });
});

describe("ladeFirmenVorteil", () => {
  const supabaseMit = (antwort) => {
    const kette = { select: vi.fn(() => kette), eq: vi.fn(() => kette), limit: vi.fn(async () => antwort) };
    return { from: vi.fn(() => kette) };
  };

  it("liest die eine Zeile der Tabelle firmen_vorteil", async () => {
    const supabase = supabaseMit({ data: [{ aktiv: true, prozent: 7, wochentage: [1, 2], mindestpersonen: 10 }], error: null });
    expect(await ladeFirmenVorteil(supabase)).toMatchObject({ prozent: 7, wochentage: [1, 2], mindestpersonen: 10 });
    expect(supabase.from).toHaveBeenCalledWith("firmen_vorteil");
  });

  it("gibt null zurück, wenn ausgeschaltet oder keine Zeile da ist, und wirft bei einem Fehler", async () => {
    expect(await ladeFirmenVorteil(supabaseMit({ data: [{ aktiv: false, prozent: 5, wochentage: [1], mindestpersonen: 15 }], error: null }))).toBe(null);
    expect(await ladeFirmenVorteil(supabaseMit({ data: [], error: null }))).toBe(null);
    await expect(ladeFirmenVorteil(supabaseMit({ data: null, error: { message: "kaputt" } }))).rejects.toThrow(/kaputt/);
  });
});

describe("Texte", () => {
  it("fasst lückenlose Wochentage zusammen und zählt andere auf", () => {
    expect(wochentageText([1, 2, 3, 4])).toBe("Montag bis Donnerstag");
    expect(wochentageText([1, 3, 5])).toBe("Montag, Mittwoch und Freitag");
    expect(wochentageText([2])).toBe("Dienstag");
    expect(wochentageText([5, 6, 7])).toBe("Freitag bis Sonntag");
  });

  it("nennt die Bedingungen aus der Regel", () => {
    expect(firmenVorteilBedingungen(regel)).toBe("Montag bis Donnerstag, ab 15 Personen, mit Rechnung an die Firma");
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
  it("verlangt die Firma, sobald es den Vorteil gibt", () => {
    for (const anlass of FIRMEN_ANLAESSE) expect(firmaAbfrage({ ...gut, anlass }, regel), anlass).toBe("pflicht");
  });

  it("fragt sie freiwillig ab bei Firmenanlässen ohne Vorteil und bei der Weihnachtsfeier", () => {
    expect(firmaAbfrage({ ...gut, datum: "2026-10-23" }, regel)).toBe("freiwillig");
    expect(firmaAbfrage(gut, null)).toBe("freiwillig");
    expect(firmaAbfrage({ ...gut, anlass: "weihnachtsfeier" }, regel)).toBe("freiwillig");
  });

  it("fragt sie bei privaten Anlässen nicht ab", () => {
    expect(firmaAbfrage({ ...gut, anlass: "hochzeit" }, regel)).toBe(null);
    expect(firmaAbfrage({ ...gut, anlass: null }, regel)).toBe(null);
    expect(firmaAbfrage(undefined, regel)).toBe(null);
  });
});

describe("vorteilProzent", () => {
  it("gibt die Prozent der Regel, sobald Anlass, Tag und Personenzahl passen", () => {
    expect(vorteilProzent(gut, regel)).toBe(5);
    expect(vorteilProzent(gut, { ...regel, prozent: 8 })).toBe(8);
  });

  it("gibt keinen Vorteil am Freitag, bei der Weihnachtsfeier oder ausgeschaltet", () => {
    expect(vorteilProzent({ ...gut, datum: "2026-10-23", firma }, regel)).toBe(null);
    expect(vorteilProzent({ ...gut, anlass: "weihnachtsfeier", firma }, regel)).toBe(null);
    expect(vorteilProzent({ ...gut, firma }, null)).toBe(null);
  });
});

describe("mitFirmenVorteil", () => {
  const ergebnis = { speisenGesamt: 1200, lieferzuschlag: 25, gesamt: 1225 };

  it("zieht den Vorteil nur von den Speisen ab, nicht von der Lieferung", () => {
    expect(mitFirmenVorteil(ergebnis, 5)).toEqual({ ...ergebnis, gesamt: 1165, firmenVorteil: { prozent: 5, betrag: 60 } });
  });

  it("Beispiel aus Victors Test: 500 € Speisen, 40 € Anlieferung, 5 % → −25 €, 515 €", () => {
    expect(mitFirmenVorteil({ speisenGesamt: 500, lieferzuschlag: 40, gesamt: 540 }, 5)).toMatchObject({ gesamt: 515, firmenVorteil: { betrag: 25 } });
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

describe("pruefeFirmaEingabe — Rechnungsadresse in vier Feldern", () => {
  const eingabe = { name: "TEST Muster GmbH", strasse: "Hauptstraße", nr: "1a", plz: "16767", ort: "Leegebruch", ust_id: "" };
  const plzOrte = { "16767": ["Germendorf", "Leegebruch"] };

  it("setzt die Adresse so zusammen, wie sie gespeichert wird", () => {
    expect(pruefeFirmaEingabe(eingabe, plzOrte)).toEqual({ wert: { name: "TEST Muster GmbH", adresse: "Hauptstraße 1a\n16767 Leegebruch", ust_id: null } });
    expect(adresseAusFeldern({ strasse: " Am  Markt ", nr: "3", plz: "16767", ort: "Leegebruch" })).toBe("Am Markt 3\n16767 Leegebruch");
  });

  it("ist leer, wenn nichts eingetragen ist", () => {
    expect(pruefeFirmaEingabe({ name: "", strasse: "", nr: "", plz: "", ort: "", ust_id: "" }, plzOrte)).toEqual({ wert: null });
  });

  it("verlangt jedes Feld außer der Umsatzsteuer-ID", () => {
    expect(pruefeFirmaEingabe({ ...eingabe, strasse: "" }).fehler).toMatch(/Straße/);
    expect(pruefeFirmaEingabe({ ...eingabe, nr: " " }).fehler).toMatch(/Hausnummer/);
    expect(pruefeFirmaEingabe({ ...eingabe, plz: "1676" }).fehler).toMatch(/fünf Ziffern/);
    expect(pruefeFirmaEingabe({ ...eingabe, ort: "" }).fehler).toMatch(/Ort/);
  });

  it("lehnt eine Postleitzahl ab, die es nicht gibt, sobald die Liste geladen ist", () => {
    expect(pruefeFirmaEingabe({ ...eingabe, plz: "00000" }, plzOrte).fehler).toMatch(/gibt es nicht/);
    expect(pruefeFirmaEingabe({ ...eingabe, plz: "00000" }).wert).toBeTruthy();
  });
});
