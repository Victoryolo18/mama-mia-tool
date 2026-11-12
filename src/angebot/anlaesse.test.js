import { describe, it, expect } from 'vitest';
import { ANLAESSE, anlaesseFuer, kundenartDesAnlasses, kundenartVon } from './anlaesse.js';
import { FIRMEN_ANLAESSE, firmaAbfrage } from './firmenVorteil.js';

describe('Anlass mit Vorauswahl Privat oder Firma', () => {
  const slugs = (art) => anlaesseFuer(art).map((a) => a.slug);

  it('zeigt Firmen nur Firmenanlässe, mit Weihnachtsfeier', () => {
    expect(slugs('firma')).toEqual(['firmenfeier', 'seminar', 'weihnachtsfeier', 'eroeffnung', 'empfang']);
  });

  it('zeigt privat keinen der Firmenanlässe mit Firmen-Vorteil', () => {
    expect(slugs('privat').some((s) => FIRMEN_ANLAESSE.includes(s))).toBe(false);
    expect(slugs('privat')).toContain('hochzeit');
    expect(slugs('privat')).toContain('sommerfest');
    expect(slugs('privat')).toContain('individuell');
  });

  it('ordnet jeden Anlass genau einer Seite zu', () => {
    const alle = [...slugs('privat'), ...slugs('firma')];
    expect(alle).toHaveLength(ANLAESSE.length);
    expect(new Set(alle).size).toBe(ANLAESSE.length);
    expect(kundenartDesAnlasses('weihnachtsfeier')).toBe('firma');
    expect(kundenartDesAnlasses('sommerfest')).toBe('privat');
    expect(kundenartDesAnlasses('gibtsnicht')).toBeNull();
    expect(slugs(null)).toHaveLength(ANLAESSE.length);
  });

  it('nimmt die Wahl des Kunden, sonst leitet es sie aus dem Anlass ab', () => {
    expect(kundenartVon({ kundenart: 'privat', anlass: null })).toBe('privat');
    expect(kundenartVon({ anlass: 'seminar' })).toBe('firma');
    expect(kundenartVon({ anlass: 'weihnachtsfeier' })).toBe('firma');
    expect(kundenartVon({ anlass: 'sommerfest' })).toBe('privat');
    expect(kundenartVon({ anlass: null })).toBeNull();
    expect(kundenartVon({ anlass: 'gibtsnicht' })).toBeNull();
  });

  it('fragt bei Firma die Firmendaten ab, bei Privat nicht', () => {
    expect(firmaAbfrage({ anlass: 'weihnachtsfeier', kundenart: 'firma' }, null)).not.toBeNull();
    expect(firmaAbfrage({ anlass: 'sommerfest', kundenart: 'privat' }, null)).toBeNull();
  });
});
