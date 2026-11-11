import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALLERGENE, ALLERGEN_SCHLUESSEL, allergenKurz, erfasst, ordneAllergene, schalteAllergen } from "./allergene.js";

const sql = readFileSync(new URL("../../supabase/migrations/angebot_essensart_24_allergene.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("Allergene", () => {
  it("kennt die 14 Hauptallergene der LMIV mit den Buchstaben A bis N", () => {
    expect(ALLERGENE.map((a) => a.k).join("")).toBe("ABCDEFGHIJKLMN");
    expect(ALLERGENE.find((a) => a.k === "G").name).toBe("Milch");
  });

  it("die Datenbank lässt genau dieselben Buchstaben zu (Migration 24)", () => {
    const liste = sql.match(/array\[([^\]]+)\]::text\[\]/)[1].replace(/'/g, "").split(",");
    expect(liste).toEqual(ALLERGENE.map((a) => a.k));
    expect(sql).not.toMatch(/\b(grant|revoke|create policy|drop policy|alter policy)\b/i);
  });

  it("unterscheidet 'noch nicht erfasst' von 'keine Allergene'", () => {
    expect(ordneAllergene(null)).toBeNull();
    expect(ordneAllergene([])).toEqual([]);
    expect(allergenKurz(null)).toBe("");
    expect(allergenKurz([])).toBe("keine");
  });

  it("bereinigt: feste Reihenfolge, jeder Buchstabe einmal, Unbekanntes fällt weg", () => {
    expect(ordneAllergene(["g", "A", "G", "Z", " c "])).toEqual(["A", "C", "G"]);
    expect(allergenKurz(["G", "A"])).toBe("A, G");
  });

  it("schaltet einzelne Buchstaben ein und aus", () => {
    expect(schalteAllergen(null, "G")).toEqual(["G"]);
    expect(schalteAllergen(["A", "G"], "G")).toEqual(["A"]);
    expect(schalteAllergen(["G"], "A")).toEqual(["A", "G"]);
  });

  it("zählt, wie viele Gerichte schon erfasst sind", () => {
    expect(erfasst([{ allergene: null }, { allergene: [] }, { allergene: ["A"] }])).toEqual({ fertig: 2, gesamt: 3, offen: 1 });
  });

  it("schreibt den Schlüssel für die Fußnote", () => {
    expect(ALLERGEN_SCHLUESSEL.startsWith("A Gluten · B Krebstiere")).toBe(true);
    expect(ALLERGEN_SCHLUESSEL.endsWith("N Weichtiere")).toBe(true);
  });
});
