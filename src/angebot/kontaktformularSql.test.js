import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../supabase/migrations/angebot_essensart_23_kontaktformular_felder.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("Kontaktformular-Felder in der Datenbank (Migration 23)", () => {
  it("begrenzt die neuen Spalten, die Unangemeldete füllen dürfen", () => {
    expect(sql).toContain("check (nachricht is null or char_length(nachricht) <= 5000)");
    expect(sql).toContain("check (budget_pro_person is null or (budget_pro_person > 0 and budget_pro_person <= 1000))");
    expect(sql).toContain("check (event_art is null or event_art in ('privat', 'geschaeftlich'))");
  });

  it("ändert keine Rechte und keine Regel für Unangemeldete", () => {
    expect(sql).not.toMatch(/\b(grant|revoke|create policy|drop policy|alter policy)\b/i);
  });

  it("verschiebt den Text nur bei Anfragen aus dem Kontaktformular", () => {
    const update = sql.slice(sql.indexOf("update public.requests"), sql.indexOf(";", sql.indexOf("update public.requests")));
    expect(update).toContain("where source = 'website_form'");
    expect(update).toContain("and nachricht is null");
  });
});
