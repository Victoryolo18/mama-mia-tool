import { describe, it, expect } from 'vitest';
import { berlinerDatum, highlightKaesten, mitHighlights } from './highlights.js';

const gericht = (id, name, extra = {}) => ({ id, name, aktiv: true, gruppen: ['hauptgericht'], stile: [], ...extra });
const kataloge = { gerichte: [gericht('g-gans', 'Gänsekeule'), gericht('g-ente', 'Entenkeule'), gericht('g-kloss', 'Klöße'), gericht('g-huhn', 'Hähnchen')] };
const weihnachten = { id: 'h-1', titel: 'Highlight', von: '2026-11-15', bis: '2026-12-26' };
const ostern = { id: 'h-2', titel: 'Ostern', von: '2027-03-20', bis: '2027-04-05' };
const verknuepfungen = [
  { highlight_id: 'h-1', gericht_id: 'g-gans', nur_im_zeitraum: true },
  { highlight_id: 'h-1', gericht_id: 'g-ente', nur_im_zeitraum: true },
  { highlight_id: 'h-1', gericht_id: 'g-kloss', nur_im_zeitraum: false },
];
const aktive = (k) => k.gerichte.filter((g) => g.aktiv).map((g) => g.name);

describe('mitHighlights', () => {
  it('zeigt ein Highlight vom ersten bis einschließlich zum letzten Tag', () => {
    for (const heute of ['2026-11-15', '2026-12-01', '2026-12-26']) {
      const k = mitHighlights(kataloge, { highlights: [weihnachten, ostern], verknuepfungen }, heute);
      expect(k.highlights.map((h) => h.id)).toEqual(['h-1']);
      expect(k.highlights[0].gerichte).toEqual(['g-gans', 'g-ente', 'g-kloss']);
    }
  });

  it('nimmt Gerichte, die es nur im Zeitraum gibt, davor und danach heraus, normale bleiben', () => {
    for (const heute of ['2026-11-14', '2026-12-27']) {
      const k = mitHighlights(kataloge, { highlights: [weihnachten], verknuepfungen }, heute);
      expect(k.highlights).toEqual([]);
      expect(aktive(k)).toEqual(['Klöße', 'Hähnchen']);
    }
    expect(aktive(mitHighlights(kataloge, { highlights: [weihnachten], verknuepfungen }, '2026-12-01'))).toHaveLength(4);
  });

  it('lässt ein Gericht da, das in einem anderen laufenden Highlight steht', () => {
    const k = mitHighlights(kataloge, {
      highlights: [weihnachten, { ...ostern, von: '2026-01-01', bis: '2026-11-20' }],
      verknuepfungen: [...verknuepfungen, { highlight_id: 'h-2', gericht_id: 'g-gans', nur_im_zeitraum: false }],
    }, '2026-11-01');
    expect(aktive(k)).toContain('Gänsekeule');
  });

  it('kommt ohne Highlights aus', () => {
    const k = mitHighlights(kataloge, {}, '2026-12-01');
    expect(k.highlights).toEqual([]);
    expect(aktive(k)).toHaveLength(4);
  });
});

describe('highlightKaesten', () => {
  it('stellt jedes Gericht in den ersten Kasten, in dem es steht, und nur Gerichte des Blocks', () => {
    const h1 = { id: 'h-1', gerichte: ['g-gans', 'g-kloss'] };
    const h2 = { id: 'h-2', gerichte: ['g-gans', 'g-ente'] };
    const { kaesten, ids } = highlightKaesten([h1, h2], kataloge.gerichte.slice(0, 2));
    expect(kaesten.map((k) => [k.highlight.id, k.gerichte.map((g) => g.id)])).toEqual([['h-1', ['g-gans']], ['h-2', ['g-ente']]]);
    expect([...ids]).toEqual(['g-gans', 'g-ente']);
  });

  it('zeigt keinen leeren Kasten', () => {
    expect(highlightKaesten([{ id: 'h-1', gerichte: ['g-gans'] }], [kataloge.gerichte[3]]).kaesten).toEqual([]);
  });
});

describe('berlinerDatum', () => {
  it('nimmt den Tag in Leegebruch, nicht den in UTC', () => {
    expect(berlinerDatum(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(berlinerDatum(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
    expect(berlinerDatum(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
  });
});
