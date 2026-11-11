import { describe, it, expect } from "vitest";
import { schrittAusVerlauf, sprungPlan, verlaufFuer, vonDerWebsite } from "./verlauf.js";

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

describe("sprungPlan", () => {
  it("geht so viele Einträge zurück, wie Schritte dazwischen liegen", () => {
    expect(sprungPlan(2, 5, 1)).toEqual({ zurueck: 3, ersetzen: null });
    expect(sprungPlan(1, 2, 1)).toEqual({ zurueck: 1, ersetzen: null });
  });
  it("vor dem Start des Links: zurück bis zum Start, dort den Zielschritt eintragen", () => {
    expect(sprungPlan(1, 5, 3)).toEqual({ zurueck: 2, ersetzen: 1 });
    expect(sprungPlan(2, 3, 3)).toEqual({ zurueck: 0, ersetzen: 2 });
  });
  it("springt nie nach vorn, nicht auf den eigenen Schritt und nicht ins Leere", () => {
    expect(sprungPlan(5, 5, 1)).toBeNull();
    expect(sprungPlan(6, 5, 1)).toBeNull();
    expect(sprungPlan(0, 5, 1)).toBeNull();
    expect(sprungPlan(undefined, 5, 1)).toBeNull();
  });
});
