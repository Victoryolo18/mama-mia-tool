import { describe, it, expect } from 'vitest';
import { baueAnfrage } from './anfrage.js';
import { berechneAngebot, aktiverStil } from './angebotspreis.js';
import { kundenMail, janaMail } from './mail.js';
import { lieferpreis } from './lieferung.js';
import { vorwahlAusLink } from './anlaesse.js';

/* Ein Buffet "Genuss" wie im Katalog: 1 Vorspeise, 2 Hauptgerichte, Brot inklusive, Fingerfood dazu. */
const gruppen = {
  vorspeise:    { slug: 'vorspeise',    label: 'Vorspeisen',    label_einzahl: 'Vorspeise',    aufpreis_plus_eins: 3.5, aufpreis_je_gericht: null },
  hauptgericht: { slug: 'hauptgericht', label: 'Hauptgerichte', label_einzahl: 'Hauptgericht', aufpreis_plus_eins: 9.5, aufpreis_je_gericht: null },
  fingerfood:   { slug: 'fingerfood',   label: 'Fingerfood',    label_einzahl: 'Häppchen',     aufpreis_plus_eins: 3.5, aufpreis_je_gericht: 3.5 },
  inklusiv:     { slug: 'inklusiv',     label: 'Inklusive',     label_einzahl: 'Inklusive',    aufpreis_plus_eins: null, aufpreis_je_gericht: null },
};
const gerichte = {
  suppe:  { id: 'suppe',  name: 'Soljanka',        gruppen: ['vorspeise'],    aufpreis_pro_person: null },
  gulasch:{ id: 'gulasch',name: 'Gulasch',         gruppen: ['hauptgericht'], aufpreis_pro_person: null },
  lachs:  { id: 'lachs',  name: 'Lachsfilet',      gruppen: ['hauptgericht'], aufpreis_pro_person: null },
  braten: { id: 'braten', name: 'Schweinebraten',  gruppen: ['hauptgericht'], aufpreis_pro_person: null },
  brot:   { id: 'brot',   name: 'Brot & Butter',   gruppen: ['inklusiv'],     aufpreis_pro_person: null },
  wrap:   { id: 'wrap',   name: 'Miniwraps',       gruppen: ['fingerfood'],   aufpreis_pro_person: null },
  burger: { id: 'burger', name: 'Miniburger',      gruppen: ['fingerfood'],   aufpreis_pro_person: 4.2 },
};
const bloecke = [
  { id: 'b-vor',  label: 'Vorspeisen',      typ: 'wahl',   gruppen: ['vorspeise'],    min_auswahl: 1, max_auswahl: 1, fix_gericht_id: null },
  { id: 'b-ff',   label: 'Fingerfood dazu', typ: 'zusatz', gruppen: ['fingerfood'],   min_auswahl: 0, max_auswahl: null, fix_gericht_id: null },
  { id: 'b-haupt',label: 'Hauptgerichte',   typ: 'wahl',   gruppen: ['hauptgericht'], min_auswahl: 2, max_auswahl: 2, fix_gericht_id: null },
  { id: 'b-brot', label: 'Brot & Butter',   typ: 'fix',    gruppen: ['inklusiv'],     min_auswahl: 0, max_auswahl: 0, fix_gericht_id: 'brot' },
];
const paket = { id: 'p-genuss', name: 'Genuss', preis_pro_person: 29.9 };
const essensart = { slug: 'buffet', label: 'Kalt-warmes Buffet' };
const stil = { slug: 'mediterran', label: 'Mediterran', zeigt_alles: false };

const eingabe = (mehr = {}) => ({
  name: 'TEST Erika', kontaktart: 'email', kontaktdaten: 'erika@example.org',
  gaeste: 30, datum: '2026-12-05', uhrzeit: '', plz: '16767', ortsteil: '', lieferung: 'nur_anlieferung',
  anlass: 'geburtstag', extras: ['Getränkeservice'], zusatzwuensche: 'Bitte ohne Nüsse', notizen: '',
  auswahl: { 'b-vor': ['suppe'], 'b-haupt': ['gulasch', 'lachs', 'braten'], 'b-ff': ['wrap', 'burger'] },
  plusEins: { 'b-haupt': true },
  ...mehr,
});

function anfrage(mehr = {}, lieferzuschlag = 25) {
  const data = eingabe(mehr);
  const ergebnis = berechneAngebot({ paket, bloecke, gruppen, gerichte, auswahl: data.auswahl, plusEins: data.plusEins, gaeste: data.gaeste, lieferzuschlag });
  return baueAnfrage({ requestNumber: 'MM-26-1234', data, essensart, paket, stil, bloecke, gerichte, ergebnis });
}

describe('baueAnfrage — was gespeichert wird', () => {
  it('speichert Essensart, Stil und den freiwilligen Anlass', () => {
    expect(anfrage()).toMatchObject({ essensart: 'buffet', stil: 'mediterran', thema: 'Mediterran', anlass: 'geburtstag', paket: 'Genuss' });
  });

  it('lässt den Anlass leer, wenn der Kunde keinen nennt', () => {
    expect(anfrage({ anlass: '' }).anlass).toBeNull();
  });

  it('speichert denselben Gesamtpreis, den die Rechnung ergibt: (29,90 + 9,50 + 3,50 + 4,20) × 30 + 25', () => {
    const a = anfrage();
    expect(a.gesamtpreis).toBe(1438);
    expect(a.angebot_snapshot.gesamt).toBe(1438);
    expect(a.angebot_snapshot.pro_person).toBe(47.1);
  });

  it('füllt die bisherigen Preisspalten so, wie das CRM sie liest: Paket ohne Aufpreise, Aufpreise getrennt', () => {
    const a = anfrage();
    expect(a.preis_pro_person).toBe(29.9);
    expect(a.speisenpreis).toBe(897);
    expect(a.menue_auswahl._upgrades).toEqual({ Hauptgerichte: 9.5, Miniwraps: 3.5, Miniburger: 4.2 });
    // So rechnet das CRM nach: Speisen + Aufpreise × Gäste + Lieferung
    const aufpreise = Object.values(a.menue_auswahl._upgrades).reduce((s, p) => s + p * 100, 0) * a.gaeste / 100;
    expect(a.speisenpreis + aufpreise + a.lieferzuschlag).toBe(a.gesamtpreis);
  });

  it('speichert Gerichte im bisherigen Format: eines als Text, mehrere als Liste, feste gar nicht', () => {
    const m = anfrage().menue_auswahl;
    expect(m.Vorspeisen).toBe('Soljanka');
    expect(m.Hauptgerichte).toEqual(['Gulasch', 'Lachsfilet', 'Schweinebraten']);
    expect(m['Fingerfood dazu']).toEqual(['Miniwraps', 'Miniburger']);
    expect(m).not.toHaveProperty('Brot & Butter');
  });

  it('lässt _upgrades weg, wenn nichts dazugebucht ist', () => {
    const a = anfrage({ auswahl: { 'b-vor': ['suppe'], 'b-haupt': ['gulasch', 'lachs'] }, plusEins: {} });
    expect(a.menue_auswahl).toEqual({ Vorspeisen: 'Soljanka', Hauptgerichte: ['Gulasch', 'Lachsfilet'] });
    expect(a.gesamtpreis).toBe(922);
  });

  it('hält im Snapshot fest, was der Kunde gesehen hat: Paketpreis, jeden Aufpreis, jedes Gericht samt Inklusive', () => {
    const s = anfrage().angebot_snapshot;
    expect(s.paket).toEqual({ id: 'p-genuss', name: 'Genuss', preis_pro_person: 29.9 });
    expect(s.aufpreise).toEqual([
      { art: 'zusatz', label: 'Miniwraps', pro_person: 3.5, block_id: 'b-ff', gericht_id: 'wrap' },
      { art: 'zusatz', label: 'Miniburger', pro_person: 4.2, block_id: 'b-ff', gericht_id: 'burger' },
      { art: 'plus_eins', label: '+1 Hauptgericht', pro_person: 9.5, block_id: 'b-haupt', gericht_id: null },
    ]);
    expect(s.bloecke.find((b) => b.id === 'b-brot').gerichte).toEqual([{ id: 'brot', name: 'Brot & Butter' }]);
    expect(s.bloecke.find((b) => b.id === 'b-haupt')).toMatchObject({ plus_eins: true, gerichte: [{ id: 'gulasch', name: 'Gulasch' }, { id: 'lachs', name: 'Lachsfilet' }, { id: 'braten', name: 'Schweinebraten' }] });
  });

  it('speichert eine unbekannte Lieferzone als leer, nicht als 0', () => {
    const a = anfrage({}, null);
    expect(a.lieferzuschlag).toBeNull();
    expect(a.gesamtpreis).toBe(1413);
  });

  it('trennt Telefon und E-Mail nach der gewählten Kontaktart', () => {
    expect(anfrage()).toMatchObject({ customer_email: 'erika@example.org', customer_phone: null });
    expect(anfrage({ kontaktart: 'whatsapp', kontaktdaten: '0176 1234567' })).toMatchObject({ customer_email: null, customer_phone: '0176 1234567' });
  });

  it('hängt Extras und Anmerkung zeilenweise zusammen', () => {
    expect(anfrage().zusatzwuensche).toBe('Getränkeservice\nBitte ohne Nüsse');
    expect(anfrage({ extras: [], zusatzwuensche: '' }).zusatzwuensche).toBeNull();
  });
});

describe('Mails nach der Anfrage', () => {
  it('nennt dem Kunden Essensart, Paket mit Preis und jeden Aufpreis', () => {
    const { subject, html } = kundenMail(anfrage());
    expect(subject).toContain('MM-26-1234');
    expect(html).toContain('Kalt-warmes Buffet');
    expect(html).toMatch(/Genuss \(29,90\s€ p\. P\.\)/);
    expect(html).toMatch(/\+1 Hauptgericht \(\+ 9,50\s€ p\. P\.\)/);
    expect(html).toMatch(/Miniburger \(\+ 4,20\s€ p\. P\.\)/);
    expect(html).toContain('Geburtstag');
  });

  it('lässt die Zeilen Extras und Anlass weg, wenn es keine gibt', () => {
    const { html } = kundenMail(anfrage({ anlass: '', auswahl: { 'b-vor': ['suppe'], 'b-haupt': ['gulasch', 'lachs'] }, plusEins: {} }));
    expect(html).not.toContain('Extras:');
    expect(html).not.toContain('Anlass:');
  });

  it('nennt Jana Essensart und Paket im Betreff und den Preis mit Cent', () => {
    const { subject, html } = janaMail(anfrage(), new Date('2026-10-08T12:00:00'));
    expect(subject).toBe('🔔 Neue Anfrage: TEST Erika — Kalt-warmes Buffet Genuss');
    expect(html).toMatch(/1\.438,00\s€/);
    expect(html).toContain('Mediterran');
    expect(html).toContain('Getränkeservice');
  });

  it('warnt Jana, wenn der Lieferpreis offen ist', () => {
    expect(janaMail(anfrage({}, null)).html).toContain('zzgl. Lieferung');
    expect(janaMail(anfrage()).html).not.toContain('zzgl. Lieferung');
  });

  it('entschärft Kundeneingaben in beiden Mails', () => {
    const boese = anfrage({ name: '<a href="http://boese.example">Jetzt zahlen</a>', zusatzwuensche: '<img src=x onerror=alert(1)>' });
    for (const html of [kundenMail(boese).html, janaMail(boese).html]) {
      expect(html).not.toContain('<a href="http://boese.example">');
      expect(html).not.toContain('<img src=x');
    }
  });
});

describe('lieferpreis — was die gewählte Lieferart kostet', () => {
  const zonen = [
    { reihenfolge: 1, aktiv: true, zuschlag: 0,  rueckholung_preis: 20, plz_liste: ['16767'], plz_pattern: null },
    { reihenfolge: 2, aktiv: true, zuschlag: 25, rueckholung_preis: 40, plz_liste: ['16515'], plz_pattern: null },
  ];

  it('kostet bei Selbstabholung nichts, auch ohne Postleitzahl', () => {
    expect(lieferpreis({ lieferung: 'selbstabholung', plz: '' }, zonen, []).zuschlag).toBe(0);
  });

  it('nimmt bei Anlieferung den Zuschlag der Zone', () => {
    expect(lieferpreis({ lieferung: 'nur_anlieferung', plz: '16515' }, zonen, []).zuschlag).toBe(25);
  });

  it('nimmt bei Anlieferung mit Rückholung den Rückholpreis', () => {
    expect(lieferpreis({ lieferung: 'anlieferung_rueckholung', plz: '16515' }, zonen, []).zuschlag).toBe(40);
  });

  it('meldet außerhalb des Liefergebiets "unbekannt" statt 0', () => {
    const r = lieferpreis({ lieferung: 'nur_anlieferung', plz: '80331' }, zonen, []);
    expect(r.zuschlag).toBeNull();
    expect(r.info.bekannt).toBe(false);
  });
});

describe('Vorwahl aus dem Link', () => {
  const essensarten = [{ slug: 'buffet' }, { slug: 'fingerfood' }, { slug: 'fruehstueck' }];

  it('wählt die Essensart aus ?essensart= vor', () => {
    expect(vorwahlAusLink('?essensart=fingerfood', essensarten)).toEqual({ essensart: 'fingerfood', anlass: null });
  });

  it('ignoriert eine Essensart, die es nicht gibt', () => {
    expect(vorwahlAusLink('?essensart=grill', essensarten).essensart).toBeNull();
  });

  it('übernimmt die bisherigen Anlass-Links der Website als freiwilligen Anlass', () => {
    expect(vorwahlAusLink('?anlass=hochzeit', essensarten)).toEqual({ essensart: null, anlass: 'hochzeit' });
  });

  it('führt den alten Link ?anlass=fruehstueck zur Essensart Frühstück', () => {
    expect(vorwahlAusLink('?anlass=fruehstueck', essensarten)).toEqual({ essensart: 'fruehstueck', anlass: null });
  });

  it('kommt ohne Angaben im Link zurecht', () => {
    expect(vorwahlAusLink('', essensarten)).toEqual({ essensart: null, anlass: null });
  });
});

describe('aktiverStil', () => {
  const stile = [{ slug: 'individuell', zeigt_alles: true }, { slug: 'mediterran', zeigt_alles: false }];

  it('nimmt "Individuell", solange nichts gewählt ist', () => {
    expect(aktiverStil(stile, null).slug).toBe('individuell');
  });

  it('nimmt den gewählten Stil', () => {
    expect(aktiverStil(stile, 'mediterran').slug).toBe('mediterran');
  });

  it('gibt nichts zurück, wenn die Essensart keine Stile hat', () => {
    expect(aktiverStil([], null)).toBeNull();
  });
});
