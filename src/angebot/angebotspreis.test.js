import { describe, it, expect } from 'vitest';
import {
  berechneAngebot, blockErfuellt, formatPreis, gerichteFuerBlock, maxAuswahl, plusEinsPreis, zusatzPreis,
} from './angebotspreis.js';

/* Beispieldaten in der Form der Tabellen gruppen, paket_gruppen und gerichte.
   Preise wie im Test-Projekt am 08.10.2026. */
const gruppen = {
  vorspeise:    { label_einzahl: 'Vorspeise',    aufpreis_plus_eins: 3.5,  aufpreis_je_gericht: null },
  fingerfood:   { label_einzahl: 'Häppchen',     aufpreis_plus_eins: 3.5,  aufpreis_je_gericht: 3.5 },
  hauptgericht: { label_einzahl: 'Hauptgericht', aufpreis_plus_eins: 9.5,  aufpreis_je_gericht: null },
  dessert:      { label_einzahl: 'Dessert',      aufpreis_plus_eins: 4.2,  aufpreis_je_gericht: null },
  fruehstueck_herzhaft: { label_einzahl: 'Herzhaftes', aufpreis_plus_eins: null, aufpreis_je_gericht: null },
};

const vorspeisen = { id: 'b-vor',  label: 'Vorspeisen',      gruppen: ['vorspeise'],    typ: 'wahl',   min_auswahl: 3, max_auswahl: 3 };
const haupt      = { id: 'b-haupt', label: 'Hauptgerichte',  gruppen: ['hauptgericht'], typ: 'wahl',   min_auswahl: 2, max_auswahl: 2 };
const dessert    = { id: 'b-des',  label: 'Dessert',         gruppen: ['dessert'],      typ: 'wahl',   min_auswahl: 1, max_auswahl: 1 };
const fingerDazu = { id: 'b-ff',   label: 'Fingerfood dazu', gruppen: ['fingerfood'],   typ: 'zusatz', min_auswahl: 0, max_auswahl: null };
const brot       = { id: 'b-fix',  label: 'Brötchen',        gruppen: ['fruehstueck_herzhaft'], typ: 'fix', min_auswahl: 1, max_auswahl: 1, fix_gericht_id: 'g-brot' };
const bloecke = [vorspeisen, fingerDazu, haupt, dessert];

const gericht = (id, name, gr, extra = {}) => ({ id, name, aktiv: true, gruppen: gr, stile: [], aufpreis_pro_person: null, ...extra });
const liste = [
  gericht('g-suppe',   'Kürbissuppe',     ['vorspeise'], { stile: ['klassisch_deutsch'] }),
  gericht('g-mine',    'Minestrone',      ['vorspeise'], { stile: ['mediterran'] }),
  gericht('g-anti',    'Antipasti',       ['vorspeise'], { stile: ['mediterran'] }),
  gericht('g-alt',     'Altes Gericht',   ['vorspeise'], { aktiv: false, stile: ['mediterran'] }),
  gericht('g-burger',  'Mini-Burger',     ['fingerfood']),
  gericht('g-garnele', 'Garnelen-Spieße', ['fingerfood'], { aufpreis_pro_person: 5 }),
  gericht('g-platte',  'Käseplatte',      ['vorspeise', 'fingerfood']),
  gericht('g-lachs',   'Lachs',           ['hauptgericht']),
  gericht('g-brot',    'Brötchen',        ['fruehstueck_herzhaft']),
];
const gerichte = Object.fromEntries(liste.map((g) => [g.id, g]));
const genuss = { preis_pro_person: 30 };

const voll = { 'b-vor': ['g-suppe', 'g-mine', 'g-anti'], 'b-haupt': ['g-lachs', 'g-x'], 'b-des': ['g-y'] };

describe('berechneAngebot', () => {
  it('rechnet ein Paket ohne Extras: Preis mal Gäste plus Lieferung', () => {
    const e = berechneAngebot({ paket: genuss, bloecke, gruppen, gerichte, auswahl: voll, gaeste: 40, lieferzuschlag: 15 });
    expect(e.proPerson).toBe(30);
    expect(e.speisenGesamt).toBe(1200);
    expect(e.gesamt).toBe(1215);
    expect(e.aufpreise).toEqual([]);
    expect(e.vollstaendig).toBe(true);
  });

  it('rechnet "+1" mit dem Preis der Gruppe', () => {
    const e = berechneAngebot({
      paket: genuss, bloecke, gruppen, gerichte, gaeste: 10,
      auswahl: { ...voll, 'b-des': ['g-y', 'g-z'] }, plusEins: { 'b-des': true },
    });
    expect(e.aufpreisProPerson).toBe(4.2);
    expect(e.proPerson).toBe(34.2);
    expect(e.speisenGesamt).toBe(342);
    expect(e.aufpreise[0]).toMatchObject({ art: 'plus_eins', label: '+1 Dessert', proPerson: 4.2 });
  });

  it('rechnet "Fingerfood dazu" je Häppchen, mit eigenem Preis des Gerichts vor dem der Gruppe', () => {
    const e = berechneAngebot({
      paket: genuss, bloecke, gruppen, gerichte, gaeste: 20,
      auswahl: { ...voll, 'b-ff': ['g-burger', 'g-garnele'] },
    });
    expect(e.aufpreise.map((a) => [a.label, a.proPerson])).toEqual([['Mini-Burger', 3.5], ['Garnelen-Spieße', 5]]);
    expect(e.aufpreisProPerson).toBe(8.5);
    expect(e.speisenGesamt).toBe(770);
  });

  it('addiert krumme Beträge ohne Rundungsfehler', () => {
    const e = berechneAngebot({
      paket: genuss, bloecke, gruppen, gerichte, gaeste: 3,
      auswahl: { ...voll, 'b-vor': ['g-suppe', 'g-mine', 'g-anti', 'g-w'], 'b-des': ['g-y', 'g-z'] },
      plusEins: { 'b-vor': true, 'b-des': true },
    });
    expect(e.aufpreisProPerson).toBe(7.7);
    expect(e.proPerson).toBe(37.7);
    expect(e.speisenGesamt).toBe(113.1);
  });

  it('rechnet in Cent: 19,99 € mal 3 Gäste sind 59,97 €, nicht 59,96999', () => {
    const e = berechneAngebot({ paket: { preis_pro_person: 19.99 }, bloecke, gruppen, gerichte, auswahl: voll, gaeste: 3, lieferzuschlag: 0.1 });
    expect(e.paketProPerson).toBe(19.99);
    expect(e.speisenGesamt).toBe(59.97);
    expect(e.gesamt).toBe(60.07);
  });

  it('weist ohne bekannte Lieferung eine Zwischensumme aus und lässt den Zuschlag offen', () => {
    const e = berechneAngebot({ paket: genuss, bloecke, gruppen, gerichte, auswahl: voll, gaeste: 10, lieferzuschlag: null });
    expect(e.lieferzuschlag).toBeNull();
    expect(e.gesamt).toBe(300);
  });

  it('unterscheidet Lieferung 0 € von unbekannt', () => {
    const e = berechneAngebot({ paket: genuss, bloecke, gruppen, gerichte, auswahl: voll, gaeste: 10, lieferzuschlag: 0 });
    expect(e.lieferzuschlag).toBe(0);
  });

  it('meldet eine unvollständige Auswahl, rechnet aber trotzdem', () => {
    const e = berechneAngebot({ paket: genuss, bloecke, gruppen, gerichte, auswahl: { 'b-vor': ['g-suppe'] }, gaeste: 10 });
    expect(e.vollstaendig).toBe(false);
    expect(e.speisenGesamt).toBe(300);
  });

  it('bricht ab, statt ein Häppchen ohne hinterlegten Aufpreis kostenlos dazuzugeben', () => {
    const ohnePreis = { ...gruppen, fingerfood: { ...gruppen.fingerfood, aufpreis_je_gericht: null } };
    expect(() => berechneAngebot({
      paket: genuss, bloecke, gruppen: ohnePreis, gerichte, gaeste: 10, auswahl: { ...voll, 'b-ff': ['g-burger'] },
    })).toThrow(/kein Aufpreis/);
  });

  it('bricht ab bei "+1" in einem Block, der das nicht anbietet', () => {
    expect(() => berechneAngebot({
      paket: genuss, bloecke, gruppen, gerichte, gaeste: 10, auswahl: voll, plusEins: { 'b-ff': true },
    })).toThrow(/kein "\+1"/);
  });

  it('bricht ab bei einem Paket ohne Preis', () => {
    expect(() => berechneAngebot({ paket: { preis_pro_person: null }, bloecke, gruppen, gerichte })).toThrow(/ohne Preis/);
  });

  it('rechnet mit Preisen, die als Text aus der Datenbank kommen', () => {
    const e = berechneAngebot({ paket: { preis_pro_person: '30.00' }, bloecke, gruppen, gerichte, auswahl: voll, gaeste: 2 });
    expect(e.speisenGesamt).toBe(60);
  });
});

describe('blockErfuellt und maxAuswahl', () => {
  it('verlangt in einem Wahl-Block die volle Anzahl', () => {
    expect(blockErfuellt(vorspeisen, ['a', 'b'])).toBe(false);
    expect(blockErfuellt(vorspeisen, ['a', 'b', 'c'])).toBe(true);
    expect(blockErfuellt(vorspeisen, ['a', 'b', 'c', 'd'])).toBe(false);
  });

  it('verlangt mit "+1" auch das zusätzliche Gericht', () => {
    expect(maxAuswahl(vorspeisen, true)).toBe(4);
    expect(blockErfuellt(vorspeisen, ['a', 'b', 'c'], true)).toBe(false);
    expect(blockErfuellt(vorspeisen, ['a', 'b', 'c', 'd'], true)).toBe(true);
  });

  it('lässt einen Zusatz-Block leer zu und begrenzt ihn nur, wenn eine Grenze gesetzt ist', () => {
    expect(blockErfuellt(fingerDazu, [])).toBe(true);
    expect(maxAuswahl(fingerDazu)).toBe(Infinity);
    const brunch = { ...fingerDazu, max_auswahl: 1 };
    expect(blockErfuellt(brunch, ['a'])).toBe(true);
    expect(blockErfuellt(brunch, ['a', 'b'])).toBe(false);
  });

  it('wertet einen festen Block immer als erfüllt', () => {
    expect(blockErfuellt(brot, [])).toBe(true);
  });
});

describe('plusEinsPreis und zusatzPreis', () => {
  it('bietet "+1" nur in Wahl-Blöcken mit hinterlegtem Preis an', () => {
    expect(plusEinsPreis(dessert, gruppen)).toBe(4.2);
    expect(plusEinsPreis(fingerDazu, gruppen)).toBeNull();
    expect(plusEinsPreis({ ...dessert, gruppen: ['fruehstueck_herzhaft'] }, gruppen)).toBeNull();
  });

  it('nimmt einen Aufpreis von 0 € ernst (kostenlose Zugabe ist erlaubt, wenn Jana sie so einträgt)', () => {
    expect(zusatzPreis(fingerDazu, { ...gerichte['g-burger'], aufpreis_pro_person: 0 }, gruppen)).toBe(0);
  });
});

describe('gerichteFuerBlock', () => {
  const namen = (block, optionen) => gerichteFuerBlock(block, liste, { gruppen, ...optionen }).map((g) => g.name);

  it('zeigt ohne Stil alle aktiven Gerichte der Gruppe, alphabetisch', () => {
    expect(namen(vorspeisen)).toEqual(['Antipasti', 'Käseplatte', 'Kürbissuppe', 'Minestrone']);
  });

  it('filtert nach Stil', () => {
    expect(namen(vorspeisen, { stil: { slug: 'mediterran', zeigt_alles: false } })).toEqual(['Antipasti', 'Minestrone']);
  });

  it('zeigt bei "Individuell" alles', () => {
    expect(namen(vorspeisen, { stil: { slug: 'individuell', zeigt_alles: true } })).toHaveLength(4);
  });

  it('behält schon gewählte Gerichte beim Stilwechsel in der Liste', () => {
    expect(namen(vorspeisen, { stil: { slug: 'mediterran', zeigt_alles: false }, gewaehlt: ['g-suppe'] }))
      .toEqual(['Antipasti', 'Kürbissuppe', 'Minestrone']);
  });

  it('zeigt inaktive Gerichte nie', () => {
    expect(namen(vorspeisen, { stil: { slug: 'mediterran', zeigt_alles: false } })).not.toContain('Altes Gericht');
  });

  it('filtert "Fingerfood dazu" nicht nach Stil', () => {
    expect(namen(fingerDazu, { stil: { slug: 'mediterran', zeigt_alles: false } })).toEqual(['Garnelen-Spieße', 'Käseplatte', 'Mini-Burger']);
  });

  it('bietet in "Fingerfood dazu" nichts gegen Aufpreis an, was im selben Paket ohne Aufpreis wählbar ist', () => {
    expect(namen(fingerDazu, { wahlGruppen: ['vorspeise', 'hauptgericht'] })).toEqual(['Garnelen-Spieße', 'Mini-Burger']);
  });

  it('zeigt in einem festen Block genau das eine Gericht', () => {
    expect(namen(brot)).toEqual(['Brötchen']);
  });
});

describe('formatPreis', () => {
  it('schreibt Beträge mit zwei Nachkommastellen und Komma', () => {
    expect(formatPreis(3.5).replace(/\s/g, ' ')).toBe('3,50 €');
    expect(formatPreis(1215.5).replace(/\s/g, ' ')).toBe('1.215,50 €');
  });

  it('lässt bei glatten Beträgen die Nachkommastellen weg', () => {
    expect(formatPreis(25).replace(/\s/g, ' ')).toBe('25 €');
    expect(formatPreis(1215).replace(/\s/g, ' ')).toBe('1.215 €');
    expect(formatPreis(0).replace(/\s/g, ' ')).toBe('0 €');
    expect(formatPreis(24.9).replace(/\s/g, ' ')).toBe('24,90 €');
  });

  it('zeigt einen Strich, wenn kein Betrag da ist', () => {
    expect(formatPreis(null)).toBe('—');
  });
});
