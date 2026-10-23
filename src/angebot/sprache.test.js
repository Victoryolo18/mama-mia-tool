import { describe, it, expect } from "vitest";
import { katalogeInSprache, lokal, spracheAusLink } from "./sprache.js";
import { baueAnfrage } from "./anfrage.js";
import { kostform } from "./kostform.js";
import { paketMerkmale } from "./paketKarte.js";
import { texte } from "./texte.js";

const kataloge = {
  essensarten: [{ slug: "buffet", label: "Kalt-warmes Buffet", label_ru: "Буфет", label_en: null, beschreibung: null }],
  pakete: [{ id: "p1", essensart: "buffet", name: "Genuss", name_en: "Delight", name_ru: "Наслаждение", untertitel: "Die beliebteste Wahl", untertitel_ru: "Самый популярный выбор", hinweis: null, leistungen: ["Menüberatung"], leistungen_ru: ["Консультация по меню"], leistungen_en: [] }],
  bloecke: [{ id: "b1", paket_id: "p1", label: "Vorspeisen", label_ru: "Закуски", typ: "wahl", max_auswahl: 2 }],
  stile: [{ slug: "mediterran", essensart: "buffet", label: "Mediterran", label_ru: "Средиземноморская кухня", beschreibung: "Leicht" }],
  gruppen: { vorspeise: { slug: "vorspeise", label: "Vorspeisen", label_einzahl: "Vorspeise", label_einzahl_ru: "Закуска" } },
  gerichte: [{ id: "g1", name: "Lachs-Canapés", name_ru: "Канапе с лососем", vegetarisch: false }],
};

describe("Sprache aus dem Link", () => {
  it("liest en und ru, alles andere ist Deutsch", () => {
    expect(spracheAusLink("?lang=ru&essensart=buffet")).toBe("ru");
    expect(spracheAusLink("?lang=en")).toBe("en");
    expect(spracheAusLink("?lang=fr")).toBe("de");
    expect(spracheAusLink("")).toBe("de");
  });
});

describe("lokal: Übersetzung mit Rückfall auf Deutsch", () => {
  it("nimmt die Übersetzung, wenn es sie gibt", () => {
    expect(lokal(kataloge.pakete[0], "name", "ru")).toBe("Наслаждение");
  });
  it("fällt auf Deutsch zurück, wenn die Übersetzung fehlt oder leer ist", () => {
    expect(lokal(kataloge.essensarten[0], "label", "en")).toBe("Kalt-warmes Buffet");
    expect(lokal(kataloge.pakete[0], "hinweis", "ru")).toBe(null);
  });
  it("nimmt eine Liste nur, wenn sie so lang ist wie die deutsche", () => {
    expect(lokal(kataloge.pakete[0], "leistungen", "ru")).toEqual(["Консультация по меню"]);
    expect(lokal(kataloge.pakete[0], "leistungen", "en")).toEqual(["Menüberatung"]);
  });
});

describe("katalogeInSprache", () => {
  it("gibt für Deutsch denselben Katalog zurück", () => {
    expect(katalogeInSprache(kataloge, "de")).toBe(kataloge);
  });

  const ru = katalogeInSprache(kataloge, "ru");
  it("zeigt die Namen auf Russisch und hält das Deutsche daneben", () => {
    expect(ru.gerichte[0].name).toBe("Канапе с лососем");
    expect(ru.gerichte[0].name_de).toBe("Lachs-Canapés");
    expect(ru.gruppen.vorspeise.label_einzahl).toBe("Закуска");
    expect(ru.bloecke[0].label).toBe("Закуски");
  });
  it("lässt den deutschen Katalog unverändert (der wird gespeichert)", () => {
    expect(kataloge.gerichte[0].name).toBe("Lachs-Canapés");
    expect(kataloge.pakete[0].name).toBe("Genuss");
  });
  it("erkennt Fisch weiter am deutschen Namen", () => {
    expect(kostform(ru.gerichte[0])).toBe("fisch");
  });
});

describe("Paket-Karte in der Sprache", () => {
  it("baut die Zeilen mit den englischen Texten", () => {
    const bloecke = [{ typ: "wahl", label: "Starters", max_auswahl: 4 }, { typ: "zusatz", label: "Finger food on the side" }];
    expect(paketMerkmale(bloecke, { lieferung_inklusive: true, leistungen: [] }, texte("en")))
      .toEqual(["4× Starters", "Finger food (optional)", "Delivery included"]);
  });
  it("bleibt ohne Texte deutsch wie bisher", () => {
    expect(paketMerkmale([{ typ: "fix", label: "Herzhafte Platte" }])).toEqual(["Herzhafte Platte inklusive"]);
  });
});

describe("Sprache der Anfrage", () => {
  const ergebnis = { aufpreise: [], paketProPerson: 30, proPerson: 30, speisenGesamt: 300, lieferzuschlag: 0, gesamt: 300, firmenVorteil: null };
  const grund = {
    requestNumber: "MM-26-1234", data: { gaeste: 10, kontaktart: "email", kontaktdaten: "a@b.de", name: "TEST", auswahl: {}, plusEins: {}, extras: [] },
    essensart: { slug: "buffet", label: "Kalt-warmes Buffet" }, paket: { id: "p1", name: "Genuss" }, stil: null, bloecke: [], gerichte: {}, ergebnis,
  };
  it("speichert die Sprache des Kunden", () => {
    expect(baueAnfrage({ ...grund, sprache: "ru" }).sprache).toBe("ru");
  });
  it("ist ohne Angabe Deutsch", () => {
    expect(baueAnfrage(grund).sprache).toBe("de");
  });
});
