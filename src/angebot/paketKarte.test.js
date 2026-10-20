import { describe, it, expect } from 'vitest';
import { paketMerkmale } from './paketKarte.js';

const bloecke = [
  { typ: 'zusatz', label: 'Fingerfood dazu' },
  { typ: 'wahl', label: 'Vorspeisen', max_auswahl: 4 },
  { typ: 'wahl', label: 'Desserts', max_auswahl: 3 },
];

describe('paketMerkmale — Zeilen der Paket-Karte', () => {
  it('nennt erst die Wahl, dann was es auf Wunsch gibt', () => {
    expect(paketMerkmale(bloecke)).toEqual(['4× Vorspeisen', '3× Desserts', 'Fingerfood dazu auf Wunsch']);
  });

  it('hängt bei Exklusiv Lieferung und Leistungen hinten an', () => {
    const exklusiv = { lieferung_inklusive: true, leistungen: ['Persönliche Menüberatung mit Jana'] };
    expect(paketMerkmale(bloecke.slice(1), exklusiv)).toEqual(['4× Vorspeisen', '3× Desserts', 'Lieferung inklusive', 'Persönliche Menüberatung mit Jana']);
  });

  it('zeigt bei den anderen Paketen keine Lieferzeile', () => {
    expect(paketMerkmale(bloecke, { lieferung_inklusive: false, leistungen: [] })).not.toContain('Lieferung inklusive');
  });
});
