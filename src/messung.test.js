// Messung für Clarity: meldet nur mit geladenem Clarity (nach Einwilligung) und stört den Generator nie.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { EREIGNIS, melde } from "./messung.js";

describe("melde", () => {
  it("meldet das Ereignis an Clarity, wenn Clarity geladen ist", () => {
    const aufrufe = [];
    const fenster = { clarity: (...args) => aufrufe.push(args) };
    expect(melde(EREIGNIS.schritt(3), fenster)).toBe(true);
    expect(melde(EREIGNIS.gesendet, fenster)).toBe(true);
    expect(aufrufe).toEqual([["event", "schritt_3"], ["event", "anfrage_gesendet"]]);
  });

  it("ohne Einwilligung (kein window.clarity) wird nichts gemeldet", () => {
    expect(melde(EREIGNIS.schritt(1), {})).toBe(false);
    expect(melde(EREIGNIS.schritt(1), undefined)).toBe(false);
  });

  it("ein Fehler in Clarity bricht den Generator nicht ab", () => {
    const fenster = { clarity: () => { throw new Error("kaputt"); } };
    expect(() => melde(EREIGNIS.fehler, fenster)).not.toThrow();
    expect(melde(EREIGNIS.fehler, fenster)).toBe(false);
  });
});

describe("Generator meldet Schritte und Absenden", () => {
  const s = fs.readFileSync("src/MamaMiaAngebotsgenerator.jsx", "utf8");

  it("jeden Schritt erst nach dem Laden der Kataloge", () => {
    expect(s).toMatch(/if \(kataloge && !submitted\) melde\(EREIGNIS\.schritt\(step\)\)/);
  });

  it("das Absenden und den Fehler beim Absenden", () => {
    expect(s).toMatch(/if \(submitted\) melde\(EREIGNIS\.gesendet\)/);
    expect(s).toMatch(/if \(sendeFehler\) melde\(EREIGNIS\.fehler\)/);
  });
});
