// Feste Teile eines Pakets ("Inklusive") müssen in Zusammenfassung und Mails stehen.
// Fall 21.11.2026: Frühstück Genuss, Brötchen & Croissants und die Platte fehlten, Jana hat sie nicht geliefert.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { inklusiveAusSnapshot, inklusiveNamen } from "./inklusive.js";
import { janaMail, kundenMail } from "./mail.js";
import { kundenMailInSprache } from "./mailsMehrsprachig.js";
import { texte } from "./texte.js";

const bloecke = [
  { id: "b1", label: "Herzhaftes", typ: "fix", fix_gericht_id: "g1" },
  { id: "b2", label: "Gebäck", typ: "fix", fix_gericht_id: "g2" },
  { id: "b3", label: "Süßes", typ: "wahl", fix_gericht_id: null },
];
const gerichte = { g1: { name: "Käse-Wurst-Platte mit Gemüse und Brotkorb" }, g2: { name: "Brötchen & Croissants" }, g3: { name: "Quarkspeise" } };

const request = {
  request_number: "MM-26-0001", customer_name: "TEST", customer_email: "test@example.org", customer_phone: null,
  customer_contact_preference: "email", sprache: "de", paket: "Genuss", gaeste: 10, event_datum: "2026-11-21",
  plz: "16767", lieferung: "nur_anlieferung", gesamtpreis: 200, lieferzuschlag: 0,
  angebot_snapshot: {
    essensart: { slug: "fruehstueck", label: "Frühstück" }, paket: { name: "Genuss", preis_pro_person: 20 }, aufpreise: [], firmen_vorteil: null,
    bloecke: [
      { id: "b1", typ: "fix", gerichte: [{ id: "g1", name: "Käse-Wurst-Platte mit Gemüse und Brotkorb" }] },
      { id: "b2", typ: "fix", gerichte: [{ id: "g2", name: "Brötchen & Croissants" }] },
      { id: "b3", typ: "wahl", gerichte: [{ id: "g3", name: "Quarkspeise" }] },
    ],
  },
};

describe("inklusiveNamen und inklusiveAusSnapshot", () => {
  it("nehmen nur die festen Teile", () => {
    const erwartet = ["Käse-Wurst-Platte mit Gemüse und Brotkorb", "Brötchen & Croissants"];
    expect(inklusiveNamen(bloecke, gerichte)).toEqual(erwartet);
    expect(inklusiveAusSnapshot(request.angebot_snapshot)).toEqual(erwartet);
  });

  it("überstehen fehlende Daten", () => {
    expect(inklusiveNamen(undefined, gerichte)).toEqual([]);
    expect(inklusiveNamen(bloecke, {})).toEqual([]);
    expect(inklusiveAusSnapshot(null)).toEqual([]);
    expect(inklusiveAusSnapshot({ bloecke: [{ typ: "fix" }] })).toEqual([]);
  });
});

describe("Mails nennen die festen Teile", () => {
  it("Mail an Jana", () => {
    const { html } = janaMail(request);
    expect(html).toContain("Inklusive");
    expect(html).toContain("Brötchen &amp; Croissants");
    expect(html).toContain("Käse-Wurst-Platte");
  });

  it("Bestätigung an den Kunden auf Deutsch", () => {
    expect(kundenMail(request).html).toContain("Brötchen &amp; Croissants");
  });

  it("Bestätigung auf Englisch mit übersetzten Namen", () => {
    const { html } = kundenMailInSprache({ ...request, sprache: "en" }, {
      t: texte("en"), essensart: { label: "Breakfast" }, stil: null, paket: { name: "Delight" }, inklusive: ["Rolls & croissants"],
    });
    expect(html).toContain("Included");
    expect(html).toContain("Rolls &amp; croissants");
  });
});

describe("Zusammenfassung im Generator", () => {
  it("zeigt die festen Teile vor den gewählten Gerichten", () => {
    const s = fs.readFileSync("src/angebot/SchrittAnfrage.jsx", "utf8");
    expect(s).toMatch(/const auswahl = \[inklusive, \.\.\.gewaehltNachBlock\(/);
    const g = fs.readFileSync("src/MamaMiaAngebotsgenerator.jsx", "utf8");
    expect(g).toMatch(/inklusive: inklusiveNamen\(A\.bloecke, A\.gerichtKarte\)/);
  });
});
