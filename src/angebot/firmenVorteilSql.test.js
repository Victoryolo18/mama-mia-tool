import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FIRMA_GRENZEN, FIRMEN_ANLAESSE, REGEL_GRENZEN, WOCHENTAGE } from "./firmenVorteil.js";

/* Nur im Generator-Repo: Die Migrationen liegen hier, nicht in den Kopien von Website und CRM.
   Die Datenbank prüft den abgezogenen Vorteil mit eigenen Werten nach. Sie müssen zu dieser Datei passen. */
const migration = (name) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");

describe("Firmen-Vorteil in der Datenbank (Migration 18)", () => {
  const sql = migration("angebot_essensart_18_firmen_vorteil_einstellbar.sql");

  it("prüft dieselben Anlässe wie der Generator", () => {
    expect(sql).toContain(`array[${FIRMEN_ANLAESSE.map((a) => `'${a}'`).join(", ")}]`);
  });

  it("hat dieselben Grenzen für Prozent und Personen wie die Einstellung im CRM", () => {
    expect(sql).toContain(`check (prozent between ${REGEL_GRENZEN.prozent.min} and ${REGEL_GRENZEN.prozent.max})`);
    expect(sql).toContain(`check (mindestpersonen between ${REGEL_GRENZEN.mindestpersonen.min} and ${REGEL_GRENZEN.mindestpersonen.max})`);
  });

  it("zählt die Wochentage wie der Generator (isodow: 1 = Montag bis 7 = Sonntag)", () => {
    expect(sql).toContain(`wochentage <@ array[${WOCHENTAGE.map((w) => w.nr).join(", ")}]::smallint[]`);
    expect(sql).toContain("extract(isodow from new.event_datum::date)::smallint = any (v_regel.wochentage)");
  });

  it("rechnet den Abzug mit dem Prozentsatz der Anfrage, wenn er zur Regel passt", () => {
    expect(sql).toContain("and v_prozent = v_regel.prozent");
    expect(sql).toContain("v_cent := v_cent - round(v_cent * v_prozent / 100.0);");
  });
});

describe("Firmendaten in der Datenbank (Migration 17)", () => {
  const sql = migration("angebot_essensart_17_firmendaten.sql");

  it("nutzt dieselben Längengrenzen für die Firmendaten", () => {
    expect(sql).toContain(`char_length(firma_name), 0) <= ${FIRMA_GRENZEN.name}`);
    expect(sql).toContain(`char_length(firma_adresse), 0) <= ${FIRMA_GRENZEN.adresse}`);
    expect(sql).toContain(`char_length(firma_ust_id), 0) <= ${FIRMA_GRENZEN.ust_id}`);
  });
});
