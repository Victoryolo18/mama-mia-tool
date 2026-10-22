import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
    for (const pfad of ["/", "", null, "/grillfest", "/constructor", "/__proto__", "/liefergebiet-rohbau.html"]) {
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

describe("ANLASS_KLEIDER", () => {
  const datei = (pfad) => join(import.meta.dirname, "../../public", pfad);

  it("hat für jeden Anlass des Generators ein Kleid", () => {
    expect(ANLAESSE.map((a) => a.slug).filter((slug) => !ANLASS_KLEIDER[slug])).toEqual([]);
  });

  it("zeigt nur Bilder und Ranken, die es unter public/ gibt", () => {
    for (const [slug, kleid] of Object.entries(ANLASS_KLEIDER)) {
      expect(existsSync(datei(kleid.bild)), `${slug}: ${kleid.bild}`).toBe(true);
      if (kleid.schmuck) expect(existsSync(datei(kleid.schmuck)), `${slug}: ${kleid.schmuck}`).toBe(true);
    }
  });

  it("nennt jedes Bild in QUELLEN.md", () => {
    const quellen = readFileSync(datei("/anlass/QUELLEN.md"), "utf8");
    for (const kleid of Object.values(ANLASS_KLEIDER)) expect(quellen).toContain(kleid.bild.split("/").pop());
  });

  it("hat eine zweiteilige Überschrift und Texte ohne Gedankenstriche", () => {
    for (const [slug, kleid] of Object.entries(ANLASS_KLEIDER)) {
      expect(kleid.ueberschrift, slug).toHaveLength(2);
      expect(`${kleid.ueberschrift.join(" ")} ${kleid.unterzeile}`, slug).not.toMatch(/[–—]| - /);
    }
  });

  it("zeigt bei der Trauerfeier keinen Schmuck", () => {
    expect(ANLASS_KLEIDER.trauerfeier.schmuck).toBeNull();
  });
});
