import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/* Die Migration mehrsprachig_1 entsteht aus supabase/daten/katalog-uebersetzung.json (werkzeug/uebersetzung-sql.mjs).
   Wer eine von beiden von Hand ändert, ohne die andere nachzuziehen, macht diesen Test rot. */
const pfad = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const sql = readFileSync(pfad("supabase/migrations/mehrsprachig_1_katalog_und_sprache.sql"), "utf8");
const daten = JSON.parse(readFileSync(pfad("supabase/daten/katalog-uebersetzung.json"), "utf8"));

describe("Migration mehrsprachig_1 (I18N-2)", () => {
  it("ist genau das, was das Werkzeug aus der Übersetzungsdatei erzeugt", () => {
    const erzeugt = execFileSync(process.execPath, [pfad("werkzeug/uebersetzung-sql.mjs")], { encoding: "utf8" });
    expect(sql.replace(/\r\n/g, "\n")).toBe(erzeugt);
  });

  it("schreibt jedes Gericht auf Englisch und Russisch", () => {
    for (const [de, [en, ru]] of Object.entries(daten.gerichte)) {
      const zeile = `name_en = '${en.replace(/'/g, "''")}', name_ru = '${ru.replace(/'/g, "''")}' where name = '${de.replace(/'/g, "''")}';`;
      expect(sql, de).toContain(zeile);
    }
  });

  it("lässt für die Sprache der Anfrage nur de, en und ru zu, Vorgabe de", () => {
    expect(sql).toContain("add column if not exists sprache text not null default 'de'");
    expect(sql).toContain("check (sprache in ('de', 'en', 'ru'))");
  });

  it("enthält keinen Gedankenstrich", () => {
    expect(sql).not.toMatch(/[–—]/);
  });
});
