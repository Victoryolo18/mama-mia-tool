/* Lieferpreis nach Ort. Ohne React, ohne Datenbank.
   Dieselbe Berechnung wie im CRM — sie muss in beiden Programmen gleich rechnen. */

const UNBEKANNT = { zuschlag: null, rueckholungPreis: null, bekannt: false };

export const LIEFERARTEN = ["nur_anlieferung", "anlieferung_rueckholung", "lieferung"];

export const LIEFER_LABELS = {
  selbstabholung: "Selbstabholung",
  abholung: "Selbstabholung",
  nur_anlieferung: "Nur Anlieferung",
  anlieferung_rueckholung: "Anlieferung + Rückholung",
  lieferung: "Lieferung",
};

export const istLieferart = (lieferung) => LIEFERARTEN.includes(lieferung);

function zonePreis(zoneNr, lieferzonen) {
  const zone = (lieferzonen || []).find(z => z.reihenfolge === zoneNr && z.aktiv);
  if (!zone) return UNBEKANNT;
  return {
    zuschlag: Number(zone.zuschlag),
    rueckholungPreis: zone.rueckholung_preis != null ? Number(zone.rueckholung_preis) : null,
    bekannt: true,
  };
}

/* Welche Ortsteile liegen unter dieser Postleitzahl?
   `auswahlNoetig`: mehrere Orte — dann wird gefragt, auch wenn alle in
   derselben Zone liegen. Unter 16727 liegen Velten, Schwante, Bötzow und
   sieben weitere; Mama muss wissen, wohin sie faehrt.
   `mehrdeutig`: die Orte liegen in verschiedenen Zonen — dann haengt auch
   der Preis daran, und ohne Antwort darf keine Zahl genannt werden. */
export function getOrtsteile(plz, lieferorte) {
  if (!plz || plz.length !== 5 || !lieferorte?.length) {
    return { mehrdeutig: false, auswahlNoetig: false, orte: [] };
  }
  const treffer = lieferorte
    .filter(o => o.plz === plz && o.aktiv !== false)
    .sort((a, b) => a.ort.localeCompare(b.ort, "de"));
  const zonen = new Set(treffer.map(o => o.zone_nr));
  return { mehrdeutig: zonen.size > 1, auswahlNoetig: treffer.length > 1, orte: treffer };
}

/* Reihenfolge: genauer Ortsteil, dann eindeutige Postleitzahl, dann die
   alten PLZ-Listen. Der letzte Schritt ist Absicht — faellt ein Ort aus
   der Ortsliste heraus, bekommt der Kunde trotzdem einen Preis statt
   einer Sackgasse. */
export function getLieferzuschlag(plz, lieferzonen, lieferorte, ortsteil) {
  if (!plz || plz.length !== 5 || !lieferzonen?.length) return UNBEKANNT;

  if (ortsteil && lieferorte?.length) {
    const treffer = lieferorte.find(o => o.plz === plz && o.ort === ortsteil && o.aktiv !== false);
    if (treffer) return zonePreis(treffer.zone_nr, lieferzonen);
  }

  const { orte } = getOrtsteile(plz, lieferorte);
  if (orte.length) {
    const zonen = [...new Set(orte.map(o => o.zone_nr))];
    if (zonen.length === 1) return zonePreis(zonen[0], lieferzonen);
    return UNBEKANNT; // mehrdeutig: erst Ortsteil waehlen
  }

  const sorted = [...lieferzonen].filter(z => z.aktiv).sort((a, b) => a.reihenfolge - b.reihenfolge);
  for (const zone of sorted) {
    const match = zone.plz_liste?.includes(plz) ||
      (zone.plz_pattern && zone.plz_pattern.split(",").map(p => p.trim()).some(p => plz.startsWith(p)));
    if (match) return {
      zuschlag: Number(zone.zuschlag),
      rueckholungPreis: zone.rueckholung_preis != null ? Number(zone.rueckholung_preis) : null,
      bekannt: true,
    };
  }
  return UNBEKANNT;
}

/** Was kostet die gewählte Lieferart? Euro gesamt.
    Unbekannte Lieferzone bleibt unbekannt: null, nicht 0. Eine 0 heisst
    "Lieferung kostenlos" (Kerngebiet) — und genau das stand dadurch in
    Mamas Anfrageliste, obwohl der Kunde "auf Anfrage" gesehen hat.
    Aufgefallen an 16798 (Fuerstenberg) und 16565 (Lehnitz).
    @returns { info, zuschlag } — `info` wie getLieferzuschlag, `zuschlag` Zahl oder null */
export function lieferpreis({ lieferung, plz, ortsteil }, lieferzonen, lieferorte) {
  if (!istLieferart(lieferung)) {
    return { info: { zuschlag: 0, rueckholungPreis: 0, bekannt: true }, zuschlag: 0 };
  }
  const info = getLieferzuschlag(plz, lieferzonen, lieferorte, ortsteil);
  if (!info.bekannt) return { info, zuschlag: null };
  const zuschlag = lieferung === "anlieferung_rueckholung"
    ? (info.rueckholungPreis ?? info.zuschlag ?? 0)
    : (info.zuschlag ?? 0);
  return { info, zuschlag };
}
