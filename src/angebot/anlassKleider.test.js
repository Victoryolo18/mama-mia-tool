import { describe, it, expect } from "vitest";
import { ANLASS_KLEIDER, kleidAusPfad } from "./anlassKleider.js";
import { ANLAESSE } from "./anlaesse.js";

const essensarten = [{ slug: "buffet" }, { slug: "fingerfood" }, { slug: "fruehstueck" }];

describe("kleidAusPfad", () => {
  it("erkennt den Anlass und nimmt die Essensart des Kleids", () => {
    const r = kleidAusPfad("/weihnachtsfeier", essensarten);
    expect(r.anlass).toBe("weihnachtsfeier");
    expect(r.essensart).toBe("buffet");
    expect(r.kleid.titel).toBe("Weihnachtsfeier");
  });

  it("nimmt die Essensart aus dem Pfad, auch mit Schrägstrich am Ende und Großbuchstaben", () => {
    expect(kleidAusPfad("/Weihnachtsfeier/fingerfood/", essensarten).essensart).toBe("fingerfood");
  });

  it("fällt bei unbekannter Essensart auf die des Kleids zurück", () => {
    expect(kleidAusPfad("/weihnachtsfeier/grillen", essensarten).essensart).toBe("buffet");
  });

  it("gibt null für die Startseite, unbekannte Anlässe und Namen aus dem Objekt-Prototyp", () => {
    for (const pfad of ["/", "", null, "/hochzeit", "/constructor", "/__proto__", "/liefergebiet-rohbau.html"]) {
      expect(kleidAusPfad(pfad, essensarten)).toBeNull();
    }
  });

  it("kennt jedes Kleid als Anlass des Generators und verweist auf eine bekannte Essensart", () => {
    for (const [slug, kleid] of Object.entries(ANLASS_KLEIDER)) {
      expect(ANLAESSE.some((a) => a.slug === slug)).toBe(true);
      expect(essensarten.some((e) => e.slug === kleid.essensart)).toBe(true);
      expect(kleid.bild).toMatch(/^\/anlass\/.+\.webp$/);
    }
  });
});
