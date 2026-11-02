import { describe, it, expect } from "vitest";
import { schrittAusVerlauf, verlaufFuer, vonDerWebsite } from "./verlauf.js";

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

describe("vonDerWebsite", () => {
  it("erkennt die Website, auch mit www und nur als Ursprung", () => {
    expect(vonDerWebsite("https://mama-mia-events.de/")).toBe(true);
    expect(vonDerWebsite("https://mama-mia-events.de/buffet")).toBe(true);
    expect(vonDerWebsite("https://www.mama-mia-events.de/ru/")).toBe(true);
  });

  it("zählt den Generator selbst, fremde Seiten und nichts nicht als Website", () => {
    expect(vonDerWebsite("https://angebot.mama-mia-events.de/")).toBe(false);
    expect(vonDerWebsite("https://www.google.com/")).toBe(false);
    expect(vonDerWebsite("https://mama-mia-events.de.example.com/")).toBe(false);
    expect(vonDerWebsite("")).toBe(false);
    expect(vonDerWebsite(undefined)).toBe(false);
  });
});
