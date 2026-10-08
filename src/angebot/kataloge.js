/* Lädt die Kataloge nach Essensart und bringt sie in die Form, mit der angebotspreis.js rechnet. */

const GRENZE = 1000;

/** Setzt die rohen Tabellenzeilen zusammen. Ohne Datenbank, damit es prüfbar ist. */
export function baueKataloge({ essensarten, pakete, gruppen, bloecke, stile, gerichte, gerichtGruppen, gerichtStile }) {
  const jeGericht = (zeilen, feld) => {
    const karte = new Map();
    for (const z of zeilen) {
      if (!karte.has(z.gericht_id)) karte.set(z.gericht_id, []);
      karte.get(z.gericht_id).push(z[feld]);
    }
    return karte;
  };
  const gruppenJeGericht = jeGericht(gerichtGruppen, 'gruppe');
  const stileJeGericht = jeGericht(gerichtStile, 'stil');
  const nachReihenfolge = (a, b) => a.reihenfolge - b.reihenfolge || String(a.label ?? a.name).localeCompare(String(b.label ?? b.name), 'de');

  return {
    essensarten: [...essensarten].sort(nachReihenfolge),
    pakete: [...pakete].sort(nachReihenfolge),
    bloecke: [...bloecke].sort(nachReihenfolge),
    stile: [...stile].sort(nachReihenfolge),
    gruppen: Object.fromEntries(gruppen.map((g) => [g.slug, g])),
    gerichte: gerichte.map((g) => ({
      ...g,
      gruppen: gruppenJeGericht.get(g.id) ?? [],
      stile: stileJeGericht.get(g.id) ?? [],
    })),
  };
}

export async function ladeKataloge(supabase) {
  const abfragen = {
    essensarten: supabase.from('essensarten').select('slug, label, beschreibung, bild_url, mindestpersonen, reihenfolge').eq('aktiv', true).limit(GRENZE),
    pakete: supabase.from('pakete').select('id, essensart, name, preis_pro_person, reihenfolge').eq('aktiv', true).limit(GRENZE),
    gruppen: supabase.from('gruppen').select('slug, label, label_einzahl, aufpreis_plus_eins, aufpreis_je_gericht, reihenfolge').limit(GRENZE),
    bloecke: supabase.from('paket_gruppen').select('id, paket_id, label, gruppen, typ, min_auswahl, max_auswahl, fix_gericht_id, reihenfolge').eq('aktiv', true).limit(GRENZE),
    stile: supabase.from('stile').select('slug, essensart, label, beschreibung, bild_url, bild_url_1, bild_url_2, bild_url_3, zeigt_alles, reihenfolge').eq('aktiv', true).limit(GRENZE),
    gerichte: supabase.from('gerichte').select('id, name, vegetarisch, unterkategorie, aktiv, aufpreis_pro_person').eq('aktiv', true).limit(GRENZE),
    gerichtGruppen: supabase.from('gericht_gruppen').select('gericht_id, gruppe').limit(GRENZE),
    gerichtStile: supabase.from('gericht_stile').select('gericht_id, stil').limit(GRENZE),
  };
  const namen = Object.keys(abfragen);
  const antworten = await Promise.all(Object.values(abfragen));
  const zeilen = {};
  antworten.forEach(({ data, error }, i) => {
    if (error) throw new Error(`Katalog "${namen[i]}": ${error.message}`);
    // Eine volle Seite heißt: Es könnte mehr geben, als geladen wurde. Lieber abbrechen als still etwas weglassen.
    if (data.length >= GRENZE) throw new Error(`Katalog "${namen[i]}" hat ${GRENZE} oder mehr Zeilen; die Abfrage braucht Seiten.`);
    zeilen[namen[i]] = data;
  });
  return baueKataloge(zeilen);
}
