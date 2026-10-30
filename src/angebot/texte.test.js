import { describe, it, expect } from "vitest";
import { TEXTE, ruZahl, texte, wochentageInSprache, firmaFehlerInSprache } from "./texte.js";
import { ANLAESSE } from "./anlaesse.js";
import { ANLASS_KLEIDER } from "./anlassKleider.js";
import { pruefeFirmaEingabe } from "./firmenVorteil.js";

/* Ruft jede Funktion mit Beispielwerten auf und sammelt alle Texte, auch verschachtelte. */
function alleTexte(wert) {
  if (typeof wert === "string") return [wert];
  if (typeof wert === "function") {
    const beispiel = ["3", "4", "Ж", "12 €"];
    return alleTexte(wert(...beispiel.slice(0, wert.length)));
  }
  if (Array.isArray(wert)) return wert.flatMap(alleTexte);
  // wochentagsSpanne braucht echte Wochentage als Eingabe; sie prüft der Test „Zahlen und Wochentage“.
  if (wert && typeof wert === "object") return Object.entries(wert).filter(([k]) => k !== "wochentagsSpanne").flatMap(([, v]) => alleTexte(v));
  return [];
}

const schluessel = (o) => Object.keys(o).sort();

describe("Wörterbuch des Generators", () => {
  it.each(["en", "ru"])("%s hat jeden deutschen Schlüssel", (sprache) => {
    for (const k of Object.keys(TEXTE.de)) expect(TEXTE[sprache], k).toHaveProperty(k);
  });

  it("Englisch und Russisch haben dieselben Schlüssel, auch verschachtelt", () => {
    expect(schluessel(TEXTE.en)).toEqual(schluessel(TEXTE.ru));
    for (const k of Object.keys(TEXTE.en)) {
      if (TEXTE.en[k] && typeof TEXTE.en[k] === "object" && !Array.isArray(TEXTE.en[k])) expect(schluessel(TEXTE.ru[k]), k).toEqual(schluessel(TEXTE.en[k]));
    }
  });

  it.each(["en", "ru"])("%s nennt jeden Anlass und hat für jeden Anlass ein Kleid", (sprache) => {
    for (const a of ANLAESSE) expect(TEXTE[sprache].anlass[a.slug], a.slug).toBeTruthy();
    for (const slug of Object.keys(ANLASS_KLEIDER)) {
      const k = TEXTE[sprache].kleid[slug];
      expect(k?.ueberschrift, slug).toHaveLength(2);
      expect(k.titel && k.unterzeile, slug).toBeTruthy();
    }
  });

  it.each(["de", "en", "ru"])("%s: kein leerer Text und kein Gedankenstrich", (sprache) => {
    for (const text of alleTexte(TEXTE[sprache])) {
      expect(text, JSON.stringify(text)).not.toMatch(/[–—]/);
    }
  });

  it("Russisch enthält keine lateinischen Wörter außer Namen und Beispielen", () => {
    // Cookie-Banner: Dienst- und Firmennamen sowie „cookie“ und „IP“ stehen wie auf der russischen Website.
    const erlaubt = /Mama Mia|WhatsApp|DE123456789|vash@email\.de|HH|MM|<\/?strong>|Microsoft Clarity|Microsoft|Elfsight|Google|[Cc]ookies?|IP/g;
    for (const text of alleTexte(TEXTE.ru)) {
      expect(text.replace(erlaubt, ""), text).not.toMatch(/[A-Za-z]{2,}/);
    }
  });

  it("übersetzt jede Fehlermeldung der Firmenprüfung ohne Zahl", () => {
    const meldungen = [
      pruefeFirmaEingabe({ name: "A" }).fehler,
      pruefeFirmaEingabe({ name: "Firma" }).fehler,
      pruefeFirmaEingabe({ name: "Firma", strasse: "Weg" }).fehler,
      pruefeFirmaEingabe({ name: "Firma", strasse: "Weg", nr: "1" }).fehler,
      pruefeFirmaEingabe({ name: "Firma", strasse: "Weg", nr: "1", plz: "16767" }).fehler,
      pruefeFirmaEingabe({ name: "Firma", strasse: "Weg", nr: "1", plz: "16767", ort: "Leegebruch", ust_id: "xx" }).fehler,
      pruefeFirmaEingabe({ name: "Firma", strasse: "Weg", nr: "1", plz: "99999", ort: "X" }, {}).fehler,
    ];
    for (const m of meldungen) {
      expect(m).toBeTruthy();
      expect(firmaFehlerInSprache(m, texte("ru")), m).not.toBe(m);
      expect(firmaFehlerInSprache(m, texte("en")), m).not.toBe(m);
    }
  });
});

describe("Zahlen und Wochentage", () => {
  it("setzt die russische Mehrzahl", () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => ruZahl(n, ["гость", "гостя", "гостей"])))
      .toEqual(["гость", "гостя", "гостей", "гостей", "гость", "гостя", "гостей"]);
  });

  it("nennt die Wochentage des Firmen-Vorteils in jeder Sprache", () => {
    expect(wochentageInSprache([1, 2, 3, 4], texte("en"))).toBe("Monday to Thursday");
    expect(wochentageInSprache([1, 2, 3, 4], texte("ru"))).toBe("с понедельника по четверг");
    expect(wochentageInSprache([1, 3], texte("ru"))).toBe("понедельник и среда");
  });
});
