import { describe, it, expect, vi, afterEach } from "vitest";
import { kundenMailInSprache, sendeAnfrageMails } from "./mailsMehrsprachig.js";
import { texte } from "./texte.js";

const request = {
  request_number: "MM-26-1234", customer_name: "<b>Anna</b>", customer_email: "anna@example.de", customer_phone: null,
  customer_contact_preference: "email", sprache: "ru", anlass: "geburtstag", paket: "Genuss", gaeste: 22,
  event_datum: "2026-12-05", plz: "16767", lieferung: "nur_anlieferung", gesamtpreis: 726, lieferzuschlag: 0,
  angebot_snapshot: { essensart: { slug: "buffet", label: "Kalt-warmes Buffet" }, paket: { name: "Genuss", preis_pro_person: 33 }, aufpreise: [], firmen_vorteil: null },
};
const anzeige = (sprache) => ({
  t: texte(sprache),
  essensart: { label: sprache === "ru" ? "Буфет с холодными и горячими блюдами" : "Hot & cold buffet" },
  stil: null,
  paket: { name: sprache === "ru" ? "Наслаждение" : "Delight" },
  aufpreise: [{ label: sprache === "ru" ? "Канапе с лососем" : "Salmon canapés", proPerson: 4 }],
});

describe("Bestätigung an den Kunden in seiner Sprache", () => {
  it("schreibt Russisch mit den übersetzten Namen", () => {
    const { subject, html } = kundenMailInSprache(request, anzeige("ru"));
    expect(subject).toBe("Ваша заявка в Mama Mia (MM-26-1234)");
    expect(html).toContain("Наслаждение");
    expect(html).toContain("Канапе с лососем");
    expect(html).toContain("22 человека");
    expect(html).toContain("День рождения");
    expect(html).not.toContain("Genuss");
  });

  it("schreibt Englisch", () => {
    const { subject, html } = kundenMailInSprache(request, anzeige("en"));
    expect(subject).toBe("Your request at Mama Mia (MM-26-1234)");
    expect(html).toContain("Delight");
    expect(html).toContain("22 people");
  });

  it("maskiert den Namen des Kunden", () => {
    const { html } = kundenMailInSprache(request, anzeige("en"));
    expect(html).not.toContain("<b>Anna</b>");
    expect(html).toContain("&lt;b&gt;Anna&lt;/b&gt;");
  });
});

describe("Versand", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("schickt Jana die deutsche Mail mit der Sprache und dem Kunden die russische", async () => {
    const gesendet = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, { body }) => { gesendet.push(JSON.parse(body)); return { ok: true }; }));
    await sendeAnfrageMails(request, anzeige("ru"));
    expect(gesendet.map((m) => m.to)).toEqual(["info@mama-mia-events.de", "anna@example.de"]);
    expect(gesendet[0].html).toContain("Neue Anfrage");
    expect(gesendet[0].html).toContain("Russisch (hat auf Russisch angefragt)");
    expect(gesendet[0].html).toContain("Genuss");
    expect(gesendet[1].subject).toBe("Ваша заявка в Mama Mia (MM-26-1234)");
  });

  it("schickt auf Deutsch die bisherige Bestätigung und keine Sprachzeile", async () => {
    const gesendet = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, { body }) => { gesendet.push(JSON.parse(body)); return { ok: true }; }));
    await sendeAnfrageMails({ ...request, sprache: "de" }, anzeige("de"));
    expect(gesendet[0].html).not.toContain("Sprache");
    expect(gesendet[1].subject).toBe("Ihre Anfrage bei Mama Mia (MM-26-1234)");
  });
});

describe("Bestätigung in der Sprache: Gerichte, Uhrzeit, Zusatzwünsche (Prüfung 21.11.2026)", () => {
  it("nennt gewählte Gerichte, Uhrzeit, Zusatzwünsche und offene Lieferung", () => {
    const r = { ...request, event_uhrzeit: "17:30:00", lieferzuschlag: null };
    const { html } = kundenMailInSprache(r, {
      ...anzeige("en"), gerichte: [{ label: "Main courses", namen: ["Goulash"] }], zusatzwuensche: ["Drinks service"],
    });
    expect(html).toContain("Main courses");
    expect(html).toContain("Goulash");
    expect(html).toContain("17:30");
    expect(html).toContain("Additional requests");
    expect(html).toContain("Drinks service");
    expect(html).toContain("plus delivery fee");
  });
});

describe("Exklusiv: Lieferknöpfe zeigen inklusive", () => {
  it("SchrittDetails zeigt bei Lieferung inklusive keinen Zonenpreis", async () => {
    const fs = await import("node:fs");
    const s = fs.readFileSync("src/angebot/SchrittDetails.jsx", "utf8");
    expect(s).toMatch(/const fmtPreis = \(p\) => paket\?\.lieferung_inklusive \? t\.inklusiveKlein/);
    const g = fs.readFileSync("src/MamaMiaAngebotsgenerator.jsx", "utf8");
    expect(g).toMatch(/dbLieferorte=\{dbLieferorte\}\s*paket=\{A\.paket\}/);
  });
});
