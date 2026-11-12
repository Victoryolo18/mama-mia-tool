import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Die Datenbank prüft den Preis jeder Anfrage aus dem Generator nach. Seit dem Abrunden auf volle Euro
   muss sie den abgerundeten Betrag gelten lassen, aber keinen höheren. */
const sql = readFileSync(new URL("../../supabase/migrations/angebot_essensart_26_gesamtpreis_abgerundet.sql", import.meta.url), "utf8");

describe("Preisprüfung mit abgerundetem Gesamtpreis (Migration 26)", () => {
  it("lässt den genauen und den auf volle Euro abgerundeten Betrag gelten", () => {
    expect(sql).toContain("v_soll := v_cent + round(coalesce(new.lieferzuschlag, 0) * 100);");
    expect(sql).toContain("if v_ist <> v_soll and v_ist <> v_soll - (v_soll % 100) then");
  });

  it("ersetzt nur die Funktion und läuft in einer Transaktion", () => {
    expect(sql).toMatch(/^begin;$/m);
    expect(sql).toMatch(/^commit;$/m);
    expect(sql).toContain("create or replace function public.requests_preis_nachrechnen()");
    expect(sql).toContain("revoke execute on function public.requests_preis_nachrechnen() from public, anon, authenticated;");
  });
});
