/* Rechenregeln für ein Angebot nach Essensart. Ohne React, ohne Datenbank.
   Generator und CRM rechnen mit derselben Datei (im CRM als Kopie mit denselben Tests).

   Begriffe (Tabellen aus der Migration angebot_essensart_1_kataloge.sql):
     Paket   = Zeile aus `pakete` (Preis pro Person)
     Block   = Zeile aus `paket_gruppen`: "3 Vorspeisen wählen", "Brötchen inklusive", "Fingerfood dazu"
     Gruppe  = Zeile aus `gruppen`: Topf von Gerichten mit Standard-Aufpreisen
     Gericht = Zeile aus `gerichte`, ergänzt um `gruppen` (Liste) und `stile` (Liste)

   Alle Beträge sind Euro pro Person, außer wo "gesamt" dransteht. Intern wird in Cent
   gerechnet, damit 3,50 + 4,20 nicht 7,699999 ergibt. */

const cent = (euro) => Math.round(Number(euro) * 100);
const euro = (c) => c / 100;
const istZahl = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

/** Preis für "+1" in einem Wahl-Block, oder null, wenn der Block kein "+1" anbietet. */
export function plusEinsPreis(block, gruppen) {
  if (block.typ !== 'wahl') return null;
  const preis = gruppen[block.gruppen[0]]?.aufpreis_plus_eins;
  return istZahl(preis) ? Number(preis) : null;
}

/** Aufpreis eines Gerichts in einem Zusatz-Block: eigener Preis des Gerichts, sonst der der Gruppe.
    null heißt: kein Preis hinterlegt, das Gericht darf dort nicht angeboten werden. */
export function zusatzPreis(block, gericht, gruppen) {
  if (block.typ !== 'zusatz') return null;
  if (istZahl(gericht.aufpreis_pro_person)) return Number(gericht.aufpreis_pro_person);
  const gruppe = block.gruppen.find((g) => gericht.gruppen.includes(g));
  const preis = gruppen[gruppe]?.aufpreis_je_gericht;
  return istZahl(preis) ? Number(preis) : null;
}

/** So viele Gerichte darf der Kunde in diesem Block wählen. Infinity = unbegrenzt (nur Zusatz). */
export function maxAuswahl(block, mitPlusEins = false) {
  if (block.typ === 'fix') return 0;
  if (block.max_auswahl === null || block.max_auswahl === undefined) return Infinity;
  return block.max_auswahl + (block.typ === 'wahl' && mitPlusEins ? 1 : 0);
}

/** Ist die Auswahl in diesem Block vollständig und zulässig? */
export function blockErfuellt(block, gewaehlt = [], mitPlusEins = false) {
  if (block.typ === 'fix') return true;
  const anzahl = gewaehlt.length;
  if (anzahl > maxAuswahl(block, mitPlusEins)) return false;
  if (block.typ === 'zusatz') return true;
  // Wer "+1" gebucht hat, muss das zusätzliche Gericht auch wählen, sonst zahlt er für nichts.
  return anzahl >= block.min_auswahl + (mitPlusEins ? 1 : 0);
}

/** Welche Gerichte zeigt ein Block an?
    - nur aktive Gerichte aus den Gruppen des Blocks
    - in Wahl-Blöcken gefiltert nach Stil; ohne Stil oder bei einem Stil mit `zeigt_alles` alle
    - schon gewählte Gerichte bleiben immer sichtbar, damit beim Stilwechsel nichts verschwindet
    - in Zusatz-Blöcken nur Gerichte mit hinterlegtem Aufpreis, und keine, die derselbe Kunde
      im selben Paket schon ohne Aufpreis wählen kann */
export function gerichteFuerBlock(block, alleGerichte, { stil = null, gewaehlt = [], gruppen = {}, wahlGruppen = [] } = {}) {
  if (block.typ === 'fix') return alleGerichte.filter((g) => g.id === block.fix_gericht_id);
  const filtern = block.typ === 'wahl' && stil && !stil.zeigt_alles;
  return alleGerichte
    .filter((g) => g.aktiv && g.gruppen.some((x) => block.gruppen.includes(x)))
    .filter((g) => {
      if (block.typ !== 'zusatz') return true;
      if (zusatzPreis(block, g, gruppen) === null) return false;
      return !g.gruppen.some((x) => wahlGruppen.includes(x));
    })
    .filter((g) => !filtern || g.stile.includes(stil.slug) || gewaehlt.includes(g.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Rechnet ein Angebot aus.
    @param paket          { preis_pro_person }
    @param bloecke        Blöcke des Pakets
    @param gruppen        Objekt slug → Gruppe
    @param gerichte       Objekt id → Gericht
    @param auswahl        Objekt Block-id → Liste gewählter Gericht-ids
    @param plusEins       Objekt Block-id → true, wenn "+1" gebucht
    @param gaeste         Anzahl Gäste
    @param lieferzuschlag Euro gesamt; null = noch unbekannt (dann ist `gesamt` eine Zwischensumme)
    @returns { paketProPerson, aufpreise[], aufpreisProPerson, proPerson, speisenGesamt,
               lieferzuschlag, gesamt, vollstaendig } */
export function berechneAngebot({ paket, bloecke, gruppen, gerichte, auswahl = {}, plusEins = {}, gaeste = 0, lieferzuschlag = null }) {
  if (!istZahl(paket?.preis_pro_person)) throw new Error('Paket ohne Preis');
  const personen = Math.max(0, Math.floor(Number(gaeste) || 0));
  const aufpreise = [];
  let vollstaendig = true;

  for (const block of bloecke) {
    const gewaehlt = auswahl[block.id] || [];
    const mitPlus = !!plusEins[block.id];

    if (mitPlus) {
      const preis = plusEinsPreis(block, gruppen);
      if (preis === null) throw new Error(`Block "${block.label}" bietet kein "+1" an`);
      aufpreise.push({ art: 'plus_eins', blockId: block.id, label: `+1 ${gruppen[block.gruppen[0]].label_einzahl}`, proPerson: preis });
    }

    if (block.typ === 'zusatz') {
      for (const id of gewaehlt) {
        const gericht = gerichte[id];
        const preis = gericht ? zusatzPreis(block, gericht, gruppen) : null;
        if (preis === null) throw new Error(`Für "${gericht?.name ?? id}" ist in "${block.label}" kein Aufpreis hinterlegt`);
        aufpreise.push({ art: 'zusatz', blockId: block.id, gerichtId: id, label: gericht.name, proPerson: preis });
      }
    }

    if (!blockErfuellt(block, gewaehlt, mitPlus)) vollstaendig = false;
  }

  const paketCent = cent(paket.preis_pro_person);
  const aufpreisCent = aufpreise.reduce((summe, a) => summe + cent(a.proPerson), 0);
  const speisenCent = (paketCent + aufpreisCent) * personen;
  const lieferCent = istZahl(lieferzuschlag) ? cent(lieferzuschlag) : null;

  return {
    paketProPerson: euro(paketCent),
    aufpreise,
    aufpreisProPerson: euro(aufpreisCent),
    proPerson: euro(paketCent + aufpreisCent),
    speisenGesamt: euro(speisenCent),
    lieferzuschlag: lieferCent === null ? null : euro(lieferCent),
    gesamt: euro(speisenCent + (lieferCent ?? 0)),
    vollstaendig,
  };
}

/** 12.5 → "12,50 €" */
export function formatPreis(betrag) {
  if (!istZahl(betrag)) return '—';
  return Number(betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
