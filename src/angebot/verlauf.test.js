import { describe, it, expect } from "vitest";
import { schrittAusVerlauf, verlaufFuer } from "./verlauf.js";

describe("Verlauf", () => {
  it("liest den Schritt aus dem Eintrag", () => {
    expect(schrittAusVerlauf({ mmSchritt: 4 }, 1)).toBe(4);
  });
  it("ohne Schritt gilt der Start", () => {
    expect(schrittAusVerlauf(null, 3)).toBe(3);
    expect(schrittAusVerlauf({ anderes: 1 }, 2)).toBe(2);
    expect(schrittAusVerlauf({ mmSchritt: 0 }, 2)).toBe(2);
  });
  it("schreibt den Schritt, ohne Fremdes zu verlieren", () => {
    expect(verlaufFuer({ anderes: 1 }, 5)).toEqual({ anderes: 1, mmSchritt: 5 });
    expect(verlaufFuer(null, 2)).toEqual({ mmSchritt: 2 });
  });
});
