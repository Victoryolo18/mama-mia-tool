import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ANLAESSE, kundenartDesAnlasses } from './anlaesse.js';

const sql = readFileSync(new URL('../../supabase/migrations/angebot_essensart_27_kundenart_alter_anfragen.sql', import.meta.url), 'utf8');

describe('Migration 27: bisherige Anfragen nach Privat oder Firma', () => {
  it('ordnet die Anlässe genauso zu wie der Generator', () => {
    const liste = sql.match(/when anlass in \(([^)]*)\) then 'geschaeftlich'/)[1].match(/'([a-z_]+)'/g).map((s) => s.slice(1, -1));
    const firma = ANLAESSE.map((a) => a.slug).filter((s) => kundenartDesAnlasses(s) === 'firma');
    expect([...liste].sort()).toEqual([...firma].sort());
  });

  it('ändert nur Anfragen ohne eigene Angabe', () => {
    expect(sql).toMatch(/where event_art is null/);
  });
});
