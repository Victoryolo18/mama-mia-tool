/* Baut den Datensatz, den der Generator in `requests` anlegt. Ohne React, ohne Datenbank.

   Zwei Formen stehen nebeneinander, mit Absicht:
   - `angebot_snapshot` hält fest, was der Kunde gesehen hat: Paket, Preise, Aufpreise, Gerichte.
   - Die bisherigen Spalten (`menue_auswahl`, `preis_pro_person`, `speisenpreis`, `gesamtpreis`)
     werden wie bisher gefüllt, damit das CRM jede neue Anfrage ohne Umbau richtig anzeigt.
     Dort gilt: `preis_pro_person` und `speisenpreis` sind das Paket OHNE Aufpreise; die Aufpreise
     stehen pro Person in `menue_auswahl._upgrades`; `gesamtpreis` enthält alles samt Lieferung. */

import { maxAuswahl } from "./angebotspreis.js";

const cent = (euro) => Math.round(Number(euro) * 100);

export function baueAnfrage({ requestNumber, data, essensart, paket, stil, bloecke, gerichte, ergebnis }) {
  const personen = Math.max(0, Math.floor(Number(data.gaeste) || 0));
  const name = (id) => gerichte[id]?.name;

  const jeLabel = new Map();
  const snapshotBloecke = [];
  for (const block of bloecke) {
    const mitPlus = !!data.plusEins?.[block.id];
    const ids = block.typ === "fix" ? [block.fix_gericht_id] : (data.auswahl?.[block.id] ?? []);
    const gewaehlt = ids.filter((id) => name(id)).map((id) => ({ id, name: name(id) }));
    snapshotBloecke.push({ id: block.id, label: block.label, typ: block.typ, plus_eins: mitPlus, gerichte: gewaehlt });

    // Feste Bestandteile standen noch nie in `menue_auswahl`; sie stehen im Snapshot.
    if (block.typ === "fix" || gewaehlt.length === 0) continue;
    // Wie bisher: ein einzelnes Gericht als Text, mehrere als Liste. Zwei Blöcke mit gleichem Namen werden eine Liste.
    if (jeLabel.has(block.label)) jeLabel.get(block.label).einzeln = false;
    else jeLabel.set(block.label, { namen: [], einzeln: maxAuswahl(block, mitPlus) === 1 });
    jeLabel.get(block.label).namen.push(...gewaehlt.map((g) => g.name));
  }
  const menue = Object.fromEntries([...jeLabel].map(([label, e]) => [label, e.einzeln ? e.namen[0] : e.namen]));

  const upgrades = {};
  for (const a of ergebnis.aufpreise) {
    const schluessel = a.art === "plus_eins" ? bloecke.find((b) => b.id === a.blockId)?.label ?? a.label : a.label;
    upgrades[schluessel] = (cent(upgrades[schluessel] ?? 0) + cent(a.proPerson)) / 100;
  }
  if (Object.keys(upgrades).length > 0) menue._upgrades = upgrades;

  return {
    request_number: requestNumber,
    source: "generator",
    status: "neu",
    customer_name: data.name || null,
    customer_phone: data.kontaktart !== "email" ? data.kontaktdaten : null,
    customer_email: data.kontaktart === "email" ? data.kontaktdaten : null,
    customer_contact_preference: data.kontaktart,
    essensart: essensart.slug,
    stil: stil?.slug ?? null,
    anlass: data.anlass || null,
    thema: stil?.label ?? null,
    paket: paket.name,
    gaeste: personen,
    event_datum: data.datum || null,
    event_uhrzeit: data.uhrzeit || null,
    plz: data.plz || null,
    ortsteil: data.ortsteil || null,
    lieferung: data.lieferung,
    menue_auswahl: menue,
    zusatzwuensche: [
      ...(data.extras || []),
      ...(data.zusatzwuensche ? [data.zusatzwuensche] : []),
    ].join("\n") || null,
    interne_notiz: data.notizen || null,
    preis_pro_person: ergebnis.paketProPerson,
    speisenpreis: (cent(ergebnis.paketProPerson) * personen) / 100,
    lieferzuschlag: ergebnis.lieferzuschlag,
    gesamtpreis: ergebnis.gesamt,
    angebot_snapshot: {
      version: 1,
      essensart: { slug: essensart.slug, label: essensart.label },
      stil: stil ? { slug: stil.slug, label: stil.label } : null,
      paket: { id: paket.id, name: paket.name, preis_pro_person: ergebnis.paketProPerson },
      gaeste: personen,
      bloecke: snapshotBloecke,
      aufpreise: ergebnis.aufpreise.map((a) => ({
        art: a.art, label: a.label, pro_person: a.proPerson, block_id: a.blockId, gericht_id: a.gerichtId ?? null,
      })),
      pro_person: ergebnis.proPerson,
      speisen_gesamt: ergebnis.speisenGesamt,
      lieferzuschlag: ergebnis.lieferzuschlag,
      gesamt: ergebnis.gesamt,
    },
  };
}
