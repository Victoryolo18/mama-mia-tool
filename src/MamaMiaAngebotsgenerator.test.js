import { describe, it, expect } from 'vitest';
import { esc, getLieferzuschlag, formatEUR } from './MamaMiaAngebotsgenerator.jsx';

/* Kundeneingaben landen in den Benachrichtigungs-Mails an Jana. Ohne
   Maskierung koennte jemand ueber das oeffentliche Formular fremdes
   Markup einschleusen — z.B. einen gefaelschten Link, der echt aussieht. */
describe('esc — Kundeneingaben fuer E-Mails entschaerfen', () => {
  it('entschaerft spitze Klammern', () => {
    expect(esc('<b>fett</b>')).toBe('&lt;b&gt;fett&lt;/b&gt;');
  });

  it('entschaerft einen eingeschleusten Link', () => {
    // Entscheidend ist, dass kein echtes HTML-Tag uebrig bleibt: der Text
    // darf sichtbar dastehen, aber nicht mehr als anklickbarer Link wirken.
    const angriff = '<a href="http://boese.example">Jetzt zahlen</a>';
    const ergebnis = esc(angriff);
    expect(ergebnis).not.toMatch(/<[a-zA-Z/]/);
    expect(ergebnis).toContain('&lt;a');
  });

  it('entschaerft Anfuehrungszeichen', () => {
    expect(esc('Say "hi"')).toBe('Say &quot;hi&quot;');
    expect(esc("O'Brien")).toBe('O&#39;Brien');
  });

  it('maskiert das Und-Zeichen zuerst, damit nichts doppelt maskiert wird', () => {
    expect(esc('A & B')).toBe('A &amp; B');
    expect(esc('<')).toBe('&lt;');
  });

  it('laesst normale deutsche Namen unveraendert', () => {
    expect(esc('Jana Ketelhöhn')).toBe('Jana Ketelhöhn');
    expect(esc('Müller-Lüdenscheidt')).toBe('Müller-Lüdenscheidt');
  });

  it('macht aus fehlenden Werten leeren Text statt "null"', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

const zonen = [
  { reihenfolge: 1, aktiv: true,  zuschlag: 0,  rueckholung_preis: null, plz_liste: ['16767'], plz_pattern: null },
  { reihenfolge: 2, aktiv: true,  zuschlag: 25, rueckholung_preis: 40,   plz_liste: ['16515'], plz_pattern: '13,14' },
  { reihenfolge: 3, aktiv: false, zuschlag: 99, rueckholung_preis: 150,  plz_liste: ['99999'], plz_pattern: null },
];

/* Dieselbe Berechnung wie im CRM — sie muss in beiden Programmen gleich
   rechnen, sonst nennt der Generator dem Kunden einen anderen Preis als
   das CRM spaeter auf der Rechnung. */
describe('getLieferzuschlag (Generator)', () => {
  it('findet den Heimatort ohne Zuschlag', () => {
    expect(getLieferzuschlag('16767', zonen)).toEqual({ zuschlag: 0, rueckholungPreis: null, bekannt: true });
  });

  it('findet eine Zone ueber das PLZ-Muster', () => {
    expect(getLieferzuschlag('13355', zonen)).toEqual({ zuschlag: 25, rueckholungPreis: 40, bekannt: true });
  });

  it('ueberspringt deaktivierte Zonen', () => {
    expect(getLieferzuschlag('99999', zonen).bekannt).toBe(false);
  });

  it('meldet unbekannt ausserhalb aller Zonen (Preis auf Anfrage)', () => {
    expect(getLieferzuschlag('80331', zonen).bekannt).toBe(false);
  });

  it('stuerzt nicht ab, solange die Zonen noch laden', () => {
    expect(getLieferzuschlag('16767', undefined).bekannt).toBe(false);
    expect(getLieferzuschlag('16767', []).bekannt).toBe(false);
  });
});

describe('formatEUR (Generator)', () => {
  it('zeigt Preise als Euro an', () => {
    expect(formatEUR(1850)).toMatch(/€/);
  });

  it('behandelt 0 als gueltigen Preis', () => {
    expect(formatEUR(0)).toMatch(/0/);
  });
});
