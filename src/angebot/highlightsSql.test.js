import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const migration = (name) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const funktion = (sql) => sql.slice(sql.indexOf("create or replace function public.requests_preis_nachrechnen()"), sql.indexOf("\n$$;") + 4);

describe("Highlights und Aufpreis im Paket in der Datenbank (Migration 21)", () => {
  const sql = migration("angebot_essensart_21_highlights.sql");

  it("ändert an der Preisprüfung nur den Aufpreis im Paket, alles andere bleibt wie in Migration 18", () => {
    const neu = funktion(sql);
    const ende = "v_aufcent := v_aufcent + v_preis::bigint;\n";
    const zusatz = neu.slice(neu.indexOf("        -- Gericht mit Aufpreis im Paket"), neu.indexOf(ende) + ende.length);
    expect(zusatz).toContain("where g.aufpreis_im_paket > 0;");
    expect(neu.replace(zusatz, "")).toBe(funktion(migration("angebot_essensart_18_firmen_vorteil_einstellbar.sql")));
  });

  it("lässt die Funktion nur als Trigger laufen", () => {
    expect(sql).toContain("revoke execute on function public.requests_preis_nachrechnen() from public, anon, authenticated;");
  });

  it("gibt dem Generator nur Leserechte auf die Highlights", () => {
    expect(sql).toContain("revoke all on public.highlights, public.highlight_gerichte from anon;");
    expect(sql).toContain("grant select on public.highlights, public.highlight_gerichte to anon;");
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to anon/);
  });
});
