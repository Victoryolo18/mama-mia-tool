import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Google-Bewertung für das Abzeichen der Website (Migration website_1). Die Funktion ist für Unangemeldete offen,
   deshalb müssen ihre Grenzen und Rechte genau so stehen. */
const sql = readFileSync(new URL("../../supabase/migrations/website_1_google_bewertung.sql", import.meta.url), "utf8");

describe("Google-Bewertung in der Datenbank", () => {
  it("Unangemeldete lesen nur; ändern geht nur über die Funktion", () => {
    expect(sql).toContain("alter table public.google_bewertung enable row level security;");
    expect(sql).toContain("revoke all on public.google_bewertung from anon, authenticated;");
    expect(sql).toContain("grant select on public.google_bewertung to anon, authenticated;");
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*google_bewertung/);
  });

  it("die Funktion läuft gehärtet und nur mit ausdrücklichem Recht", () => {
    expect(sql).toContain("security definer\nset search_path = ''");
    expect(sql).toContain("revoke all on function public.melde_google_bewertung(numeric, integer) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.melde_google_bewertung(numeric, integer) to anon, authenticated;");
  });

  it("nimmt nur mehr Bewertungen an, höchstens 2 neue je Tag, Note 1 bis 5 und höchstens 0,2 daneben", () => {
    expect(sql).toContain("if p_anzahl <= v_zeile.anzahl or p_anzahl > v_basis + 2 then");
    expect(sql).toContain("if p_note < 1 or p_note > 5 or abs(round(p_note, 1) - v_zeile.note) > 0.2 then");
  });
});
