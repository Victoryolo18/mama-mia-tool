import { describe, it, expect } from 'vitest';
import { baueKataloge, ladeKataloge } from './kataloge.js';

const roh = {
  essensarten: [{ slug: 'fingerfood', label: 'Fingerfood', reihenfolge: 2 }, { slug: 'buffet', label: 'Buffet', reihenfolge: 1 }],
  pakete: [{ id: 'p2', name: 'Genuss', reihenfolge: 2 }, { id: 'p1', name: 'Klassisch', reihenfolge: 1 }],
  gruppen: [{ slug: 'vorspeise', label: 'Vorspeisen' }],
  bloecke: [{ id: 'b1', label: 'Vorspeisen', reihenfolge: 0 }],
  stile: [{ slug: 'mediterran', label: 'Mediterran', reihenfolge: 2 }, { slug: 'individuell', label: 'Individuell', reihenfolge: 0 }],
  gerichte: [{ id: 'g1', name: 'Draniki' }, { id: 'g2', name: 'Ohne Zuordnung' }],
  gerichtGruppen: [{ gericht_id: 'g1', gruppe: 'hauptgericht' }, { gericht_id: 'g1', gruppe: 'brunch_herzhaft' }],
  gerichtStile: [{ gericht_id: 'g1', stil: 'osteuropaeisch' }],
};

describe('baueKataloge', () => {
  const k = baueKataloge(roh);

  it('hängt jedem Gericht seine Gruppen und Stile an, auch mehrere', () => {
    expect(k.gerichte[0]).toMatchObject({ gruppen: ['hauptgericht', 'brunch_herzhaft'], stile: ['osteuropaeisch'] });
  });

  it('gibt Gerichten ohne Zuordnung leere Listen statt nichts', () => {
    expect(k.gerichte[1]).toMatchObject({ gruppen: [], stile: [] });
  });

  it('sortiert nach Reihenfolge, damit "Individuell" vorn steht', () => {
    expect(k.stile.map((s) => s.slug)).toEqual(['individuell', 'mediterran']);
    expect(k.essensarten.map((e) => e.slug)).toEqual(['buffet', 'fingerfood']);
    expect(k.pakete.map((p) => p.name)).toEqual(['Klassisch', 'Genuss']);
  });

  it('macht die Gruppen über ihren Namen greifbar', () => {
    expect(k.gruppen.vorspeise.label).toBe('Vorspeisen');
  });
});

describe('ladeKataloge', () => {
  const datenbank = (antwort) => {
    const kette = { select: () => kette, eq: () => kette, limit: () => Promise.resolve(antwort) };
    return { from: () => kette };
  };

  it('bricht mit dem Namen des Katalogs ab, wenn die Datenbank einen Fehler meldet', async () => {
    await expect(ladeKataloge(datenbank({ data: null, error: { message: 'kaputt' } }))).rejects.toThrow(/Katalog "essensarten": kaputt/);
  });

  it('bricht ab, statt still Gerichte wegzulassen, wenn eine Abfrage an ihre Grenze stößt', async () => {
    const voll = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    await expect(ladeKataloge(datenbank({ data: voll, error: null }))).rejects.toThrow(/braucht Seiten/);
  });
});
