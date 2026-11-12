import { describe, it, expect } from 'vitest';
import { ANLAESSE, anlaesseFuer, kundenartVon } from './anlaesse.js';
import { FIRMEN_ANLAESSE, firmaAbfrage } from './firmenVorteil.js';

describe('Anlass mit Vorauswahl Privat oder Firma', () => {
  const slugs = (art) => anlaesseFuer(art).map((a) => a.slug);

  it('zeigt Firmen nur Firmenanlässe, dazu Sommerfest und Weihnachtsfeier', () => {
    expect(slugs('firma')).toEqual(['firmenfeier', 'sommerfest', 'seminar', 'weihnachtsfeier', 'eroeffnung', 'empfang']);
  });

  it('zeigt privat keinen der Firmenanlässe mit Firmen-Vorteil', () => {
    expect(slugs('privat').some((s) => FIRMEN_ANLAESSE.includes(s))).toBe(false);
    expect(slugs('privat')).toContain('hochzeit');
    expect(slugs('privat')).toContain('weihnachtsfeier');
  });

  it('verliert keinen Anlass: jeder steht in mindestens einer Liste', () => {
    const beide = new Set([...slugs('privat'), ...slugs('firma')]);
    expect(ANLAESSE.every((a) => beide.has(a.slug))).toBe(true);
    expect(slugs(null)).toHaveLength(ANLAESSE.length);
  });

  it('nimmt die Wahl des Kunden, sonst leitet es sie aus dem Anlass ab', () => {
    expect(kundenartVon({ kundenart: 'firma', anlass: 'weihnachtsfeier' })).toBe('firma');
    expect(kundenartVon({ anlass: 'seminar' })).toBe('firma');
    expect(kundenartVon({ anlass: 'weihnachtsfeier' })).toBe('privat');
    expect(kundenartVon({ anlass: null })).toBeNull();
    expect(kundenartVon({ anlass: 'gibtsnicht' })).toBeNull();
  });

  it('fragt bei Firma die Firmendaten freiwillig ab, auch beim Sommerfest', () => {
    expect(firmaAbfrage({ anlass: 'sommerfest', kundenart: 'firma' }, null)).toBe('freiwillig');
    expect(firmaAbfrage({ anlass: 'sommerfest', kundenart: 'privat' }, null)).toBeNull();
  });
});
