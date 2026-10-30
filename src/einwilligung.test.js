// Einwilligung (Cookie mm_einwilligung) gemeinsam mit der Website: Format, Domain, Banner und Clarity-Maskierung.
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { alsText, ausText, ausCookies, cookieDomain, cookieZeile, COOKIE, VERSION, LAUFZEIT_TAGE, CLARITY_ID } from "./einwilligung.js";
import Einwilligung from "./Einwilligung.jsx";
import { SpracheKontext } from "./angebot/Sprache.jsx";
import { texte } from "./angebot/texte.js";

const stand = { statistik: true, bewertungen: false, datum: "2026-10-30" };

describe("Speicherformat", () => {
  it("liest zurück, was es schreibt, auch aus document.cookie", () => {
    expect(ausText(alsText(stand))).toEqual(stand);
    expect(ausCookies(`a=1; ${COOKIE}=${encodeURIComponent(alsText(stand))}; b=2`)).toEqual(stand);
  });

  it("andere Version oder kaputte Werte gelten nicht: dann fragt das Banner", () => {
    expect(ausText(`v=${VERSION + 1}&s=1&b=1&t=2026-10-30`)).toBeNull();
    expect(ausText(`v=${VERSION}&s=ja&b=1&t=2026-10-30`)).toBeNull();
    expect(ausText(`v=${VERSION}&s=1&b=1`)).toBeNull();
    expect(ausCookies("")).toBeNull();
    expect(ausCookies(undefined)).toBeNull();
  });

  it("ohne Kennung, nur Wahl, Version und Datum", () => {
    expect(alsText(stand)).toBe(`v=${VERSION}&s=1&b=0&t=2026-10-30`);
  });

  it("gilt für Website und Generator gemeinsam, in der Vorschau nur für die eigene Adresse", () => {
    expect(cookieDomain("angebot.mama-mia-events.de")).toBe("; Domain=mama-mia-events.de");
    expect(cookieDomain("mama-mia-events.de")).toBe("; Domain=mama-mia-events.de");
    expect(cookieDomain("mama-mia-tool-git-x-victors-projects-e75dd39c.vercel.app")).toBe("");
    expect(cookieDomain("boese-mama-mia-events.de")).toBe("");
  });

  it("ein halbes Jahr, nur über HTTPS, nicht an fremde Seiten", () => {
    const z = cookieZeile(stand, "angebot.mama-mia-events.de", true);
    expect(z).toContain("Max-Age=15552000");
    expect(z).toContain("SameSite=Lax");
    expect(z).toContain("; Secure");
    expect(z).toContain("; Domain=mama-mia-events.de");
  });
});

// Liegt die Website daneben, müssen Cookie, Version, Laufzeit, Format und Clarity-Projekt gleich sein.
const WEBSITE = "../mama-mia-website/src/inhalte/einwilligung.ts";
describe.skipIf(!fs.existsSync(WEBSITE))("gleich wie die Website", () => {
  const w = fs.existsSync(WEBSITE) ? fs.readFileSync(WEBSITE, "utf8") : "";
  it("dieselben Werte", () => {
    expect(w).toContain(`export const COOKIE = "${COOKIE}";`);
    expect(w).toContain(`export const VERSION = ${VERSION};`);
    expect(w).toContain(`export const LAUFZEIT_TAGE = ${LAUFZEIT_TAGE};`);
    expect(w).toContain(`export const CLARITY_ID = "${CLARITY_ID}";`);
    expect(w).toContain("return `v=${VERSION}&s=${stand.statistik ? 1 : 0}&b=${stand.bewertungen ? 1 : 0}&t=${stand.datum}`;");
  });
});

describe("Banner", () => {
  afterEach(() => {
    delete globalThis.document;
  });
  const zeige = (cookie) => {
    globalThis.document = { cookie };
    return renderToStaticMarkup(
      React.createElement(SpracheKontext.Provider, { value: texte("de") },
        React.createElement(Einwilligung)),
    );
  };

  it("erscheint nur ohne Entscheidung; wer auf der Website schon entschieden hat, sieht es nicht", () => {
    expect(zeige("")).toContain("data-einwilligung");
    expect(zeige(`${COOKIE}=${encodeURIComponent("v=1&s=0&b=0&t=2026-10-30")}`)).toBe("");
    expect(zeige(`${COOKIE}=${encodeURIComponent("v=1&s=1&b=1&t=2026-10-30")}`)).toBe("");
  });

  it("Ablehnen und Akzeptieren auf der ersten Ebene, gleich groß; Ablehnen nur umrandet und lesbar", () => {
    const html = zeige("");
    const knopf = (name) => html.match(new RegExp(`<button type="button" data-einwilligung-knopf="${name}" style="([^"]+)">([^<]+)<`));
    const nein = knopf("nein");
    const ja = knopf("ja");
    expect(nein[2]).toBe("Ablehnen");
    expect(ja[2]).toBe("Akzeptieren");
    const groesse = (stil) => stil.match(/flex:[^;]+;min-height:[^;]+;padding:[^;]+/)[0];
    expect(groesse(nein[1])).toBe(groesse(ja[1]));
    expect(nein[1]).toContain("color:#5C2818");
    expect(nein[1]).toContain("box-shadow:inset 0 0 0 1.5px #5C2818");
  });

  it("nennt Clarity, Elfsight und die Datenschutzerklärung", () => {
    const html = zeige("");
    expect(html).toContain("Microsoft Clarity");
    expect(html).toContain("Elfsight");
    expect(html).toContain('href="https://mama-mia-events.de/datenschutz"');
  });
});

describe("Generator", () => {
  it("Clarity steht nicht fest in der Seite, nur im Code hinter der Einwilligung", () => {
    expect(fs.readFileSync("index.html", "utf8")).not.toContain("clarity");
  });

  it("Zusammenfassung und Kontaktdaten sind für Clarity ausgeblendet", () => {
    const s = fs.readFileSync("src/angebot/SchrittAnfrage.jsx", "utf8");
    expect(s).toMatch(/className="mm-summary-card" data-clarity-mask="True"/);
    expect(s).toMatch(/className="mm-form-card" data-clarity-mask="True"/);
  });

  it("„Cookie-Einstellungen“ steht im Fuß, das Banner steht neben dem Generator", () => {
    expect(fs.readFileSync("src/MamaMiaAngebotsgenerator.jsx", "utf8")).toContain(
      "data-einwilligung-oeffnen onClick={() => window.dispatchEvent(new Event(OEFFNEN))} style={S.footerKnopf}>{t.cookieBanner.fussLink}</button>",
    );
    expect(fs.readFileSync("src/main.jsx", "utf8")).toContain("<Einwilligung />");
  });
});
