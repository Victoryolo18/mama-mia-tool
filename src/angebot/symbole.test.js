import { describe, it, expect } from "vitest";
import { SYMBOLE, symbolSvg } from "./symbole.js";
import { KOSTFORMEN } from "./kostform.js";
import { AUF_ANFRAGE } from "./ernaehrung.js";

describe("Symbole", () => {
  it("gibt es für jede Kostform und für vegan und glutenfrei", () => {
    for (const { slug } of [...KOSTFORMEN, ...AUF_ANFRAGE]) expect(SYMBOLE[slug], slug).toBeTruthy();
  });

  it("zeichnet jedes Symbol im Kreis in seiner Farbe, Glutenfrei durchgestrichen", () => {
    for (const name of Object.keys(SYMBOLE)) {
      const svg = symbolSvg(name, 18);
      expect(svg).toMatch(/^<svg[^>]*width="18"/);
      expect(svg).toContain(`<circle cx="12" cy="12" r="13.5" fill="#fff" stroke="${SYMBOLE[name].farbe}"`);
    }
    expect(symbolSvg("glutenfrei")).toContain("M4.5 4.5 19.5 19.5");
    expect(symbolSvg("vegetarisch")).not.toContain("M4.5 4.5 19.5 19.5");
  });
});
