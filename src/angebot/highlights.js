/* Highlights: Kästen, die Jana im CRM mit Titel, Zeitraum und Gerichten anlegt (Migration angebot_essensart_21).
   Ohne React, ohne Datenbank. Ein Gericht in einem laufenden Highlight steht oben im Block, in den es gehört,
   und nicht noch einmal in der Liste darunter. Gerichte mit `nur_im_zeitraum` (Gänsekeule) gibt es außerhalb
   ihres Zeitraums gar nicht. */

const GRENZE = 1000;

/** Heutiges Datum in Leegebruch als "JJJJ-MM-TT", egal in welcher Zeitzone der Browser steht. */
export function berlinerDatum(jetzt = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(jetzt);
}

/** Kataloge mit den Highlights von `heute`: `highlights` sind die laufenden mit ihren Gericht-ids,
    Gerichte, die nur im Zeitraum eines Highlights angeboten werden und heute in keinem laufenden stehen, sind inaktiv. */
export function mitHighlights(kataloge, { highlights = [], verknuepfungen = [] }, heute) {
  const laeuft = (h) => h.von <= heute && heute <= h.bis;
  const laufende = highlights
    .filter(laeuft)
    .sort((a, b) => a.von.localeCompare(b.von) || String(a.titel).localeCompare(String(b.titel), 'de'))
    .map((h) => ({ ...h, gerichte: verknuepfungen.filter((v) => v.highlight_id === h.id).map((v) => v.gericht_id) }));
  const heuteDa = new Set(laufende.flatMap((h) => h.gerichte));
  const nurImZeitraum = new Set(verknuepfungen.filter((v) => v.nur_im_zeitraum).map((v) => v.gericht_id));
  return {
    ...kataloge,
    highlights: laufende,
    gerichte: kataloge.gerichte.map((g) => (nurImZeitraum.has(g.id) && !heuteDa.has(g.id) ? { ...g, aktiv: false } : g)),
  };
}

/** Teilt die Gerichte eines Blocks auf die laufenden Highlights auf. Steht ein Gericht in zweien, zählt das erste.
    @returns { kaesten: [{ highlight, gerichte }], ids: Set der Gerichte in einem Kasten } */
export function highlightKaesten(highlights = [], gerichteDesBlocks) {
  const ids = new Set();
  const kaesten = [];
  for (const highlight of highlights) {
    const gerichte = gerichteDesBlocks.filter((g) => highlight.gerichte.includes(g.id) && !ids.has(g.id));
    gerichte.forEach((g) => ids.add(g.id));
    if (gerichte.length > 0) kaesten.push({ highlight, gerichte });
  }
  return { kaesten, ids };
}

/** Lädt Highlights und ihre Gerichte. Alle, auch abgelaufene: Sonst tauchte ein Gericht, das nur im Zeitraum eines
    vergangenen Highlights angeboten wird, wieder auf. */
export async function ladeHighlights(supabase) {
  const [h, v] = await Promise.all([
    supabase.from('highlights').select('id, titel, titel_en, titel_ru, von, bis').limit(GRENZE),
    supabase.from('highlight_gerichte').select('highlight_id, gericht_id, nur_im_zeitraum').limit(GRENZE),
  ]);
  for (const [name, antwort] of [['highlights', h], ['highlight_gerichte', v]]) {
    if (antwort.error) throw new Error(`Katalog "${name}": ${antwort.error.message}`);
    if (antwort.data.length >= GRENZE) throw new Error(`Katalog "${name}" hat ${GRENZE} oder mehr Zeilen; die Abfrage braucht Seiten.`);
  }
  return { highlights: h.data, verknuepfungen: v.data };
}
