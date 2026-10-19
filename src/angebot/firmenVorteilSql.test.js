import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FIRMA_GRENZEN, FIRMEN_VORTEIL } from "./firmenVorteil.js";

/* Nur im Generator-Repo: Die Migration liegt hier, nicht in den Kopien von Website und CRM. */
describe("Preisprüfung in der Datenbank (Migration 17)", () => {
  // Die Datenbank prüft den abgezogenen Vorteil mit eigenen Werten nach. Sie müssen zu dieser Datei passen.
  const sql = readFileSync(new URL("../../supabase/migrations/angebot_essensart_17_firmendaten.sql", import.meta.url), "utf8");

  it("nutzt dieselben Prozent, Wochentage, Mindestpersonen und Anlässe", () => {
    expect(sql).toContain(`(s->'firmen_vorteil'->>'prozent')::numeric = ${FIRMEN_VORTEIL.prozent}`);
    expect(sql).toContain(`round(v_cent * ${FIRMEN_VORTEIL.prozent} / 100.0)`);
    expect(sql).toContain(`in (${FIRMEN_VORTEIL.wochentage.join(", ")})`); // isodow: 1 = Montag wie getDay
    expect(sql).toContain(`>= ${FIRMEN_VORTEIL.mindestpersonen}`);
    expect(sql).toContain(`array[${FIRMEN_VORTEIL.anlaesse.map((a) => `'${a}'`).join(", ")}]`);
  });

  it("nutzt dieselben Längengrenzen für die Firmendaten", () => {
    expect(sql).toContain(`char_length(firma_name), 0) <= ${FIRMA_GRENZEN.name}`);
    expect(sql).toContain(`char_length(firma_adresse), 0) <= ${FIRMA_GRENZEN.adresse}`);
    expect(sql).toContain(`char_length(firma_ust_id), 0) <= ${FIRMA_GRENZEN.ust_id}`);
  });
});
