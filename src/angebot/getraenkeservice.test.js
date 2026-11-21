// Prüfung 21.11.2026: Der Getränkeservice stand fest im Generator, nicht im Katalog. Das CRM fand deshalb
// keinen Steuersatz und rechnete ihn mit 7 % statt 19 %.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { zusatzwuenscheInSprache } from "./auswahlAnzeige.js";
import { texte } from "./texte.js";

const migration = fs.readFileSync("supabase/migrations/angebot_essensart_28_getraenkeservice_im_katalog.sql", "utf8");

describe("Getränkeservice kommt aus dem Katalog", () => {
  it("die Migration legt ihn mit 19 % und dem alten Label an, nur einmal", () => {
    expect(migration).toMatch(/select 'Getränkeservice', 'Drinks service', 'Напитки'/);
    expect(migration).toMatch(/true, 19\s*\nwhere not exists \(select 1 from public\.zusatzwuensche where label = 'Getränkeservice'\)/);
  });

  it("der Generator hat keine feste Option mehr", () => {
    const s = fs.readFileSync("src/angebot/SchrittExtras.jsx", "utf8");
    expect(s).not.toContain("Getränkeservice");
  });

  it("der Name in der Mail kommt aus dem Katalog", () => {
    const katalog = [{ label: "Getränkeservice", label_en: "Drinks service", label_ru: "Напитки" }];
    expect(zusatzwuenscheInSprache(["Getränkeservice"], katalog, texte("en"))).toEqual(["Drinks service"]);
    expect(zusatzwuenscheInSprache(["Getränkeservice"], katalog, texte("de"))).toEqual(["Getränkeservice"]);
  });
});
