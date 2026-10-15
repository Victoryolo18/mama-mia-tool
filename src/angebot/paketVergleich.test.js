import { describe, it, expect } from "vitest";
import { mehrAlsVorher, mehrText } from "./paketVergleich.js";

const block = (gruppe, label, max, typ = "wahl") => ({ gruppen: [gruppe], label, max_auswahl: max, typ });
const genuss = [block("vorspeise", "Vorspeisen", 3), block("hauptgericht", "Hauptgerichte", 2), block("beilage", "Beilagen", 3), block("dessert", "Dessert", 1), block("fingerfood", "Fingerfood dazu", null, "zusatz")];
const premium = [block("vorspeise", "Vorspeisen", 4), block("hauptgericht", "Hauptgerichte", 3), block("beilage", "Beilagen", 3), block("dessert", "Desserts", 2), block("fingerfood", "Fingerfood dazu", null, "zusatz")];
const klassisch = [block("vorspeise", "Vorspeise", 2), block("hauptgericht", "Hauptgericht", 1), block("beilage", "Beilagen", 2)];

describe("Paket gegen das vorige", () => {
  it("nennt, was Premium mehr hat als Genuss; gleich Viele und Zusatz-Blöcke nicht", () => {
    expect(mehrText("Genuss", mehrAlsVorher(premium, genuss))).toBe("Gegenüber Genuss: Vorspeisen 4 statt 3, Hauptgerichte 3 statt 2, Desserts 2 statt 1");
  });

  it("vergleicht über die Gruppe, nicht über den Namen, und sagt „dazu“ für Neues", () => {
    expect(mehrText("Klassisch", mehrAlsVorher(genuss, klassisch)))
      .toBe("Gegenüber Klassisch: Vorspeisen 3 statt 2, Hauptgerichte 2 statt 1, Beilagen 3 statt 2, Dessert dazu");
  });

  it("zeigt nichts beim ersten Paket oder ohne Unterschied", () => {
    expect(mehrText(null, mehrAlsVorher(genuss, []))).toBeNull();
    expect(mehrText("Genuss", mehrAlsVorher(genuss, genuss))).toBeNull();
  });
});
