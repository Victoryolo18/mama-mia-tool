import { describe, it, expect } from "vitest";
import { MWST_PROZENT, mwstAus } from "./mwst.js";

describe("mwstAus", () => {
  it("rechnet 7 % aus dem Bruttopreis heraus", () => {
    expect(MWST_PROZENT).toBe(7);
    expect(mwstAus(107)).toEqual({ netto: 100, mwst: 7 });
    expect(mwstAus(1165)).toEqual({ netto: 1088.79, mwst: 76.21 });
  });

  it("Netto und Steuer ergeben immer den Bruttopreis", () => {
    for (const brutto of [0.01, 9.99, 333.33, 1234.56]) {
      const { netto, mwst } = mwstAus(brutto);
      expect(Math.round((netto + mwst) * 100)).toBe(Math.round(brutto * 100));
    }
  });

  it("gibt null für keine Zahl", () => {
    expect(mwstAus("abc")).toEqual({ netto: null, mwst: null });
  });
});
