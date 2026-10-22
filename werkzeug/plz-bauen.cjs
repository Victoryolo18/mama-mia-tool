// Baut plz-orte.json aus GeoNames DE.txt (CC BY 4.0). Aufruf: node plz-bauen.cjs <DE.txt> <ziel.json>
// Jede Postleitzahl aus der Liste gilt. Großkunden-Postleitzahlen (Firmen, Ämter, Kassen statt Orte)
// bekommen keinen Ort vorgeschlagen: Namen, die nach Firma oder Behörde aussehen, fallen weg.
const fs = require("fs");
const [quelle, ziel] = process.argv.slice(2);
const KEIN_ORT = /GmbH|mbH|\bAG\b|\bKG\b|\bSE\b|\beG\b|e\.\s?V\.|Bank|[Ss]parkasse|[Vv]ersicherung|Verlag|Vertrieb|[Vv]erwaltung|Postfach|Holding|Corporate|Audit|Finanzamt|Universität|[Kk]linik|Telekom|Ministerium|Stiftung|Zentrale|[Gg]esellschaft|Rundfunk|Lotterie|Versand|Behörde|Bundes|Landes|[Kk]asse|Agentur|Gericht|Schule|Krankenhaus|Direktion|Geschäftsstelle|Stadt |Gemeinde|Werk|Fabrik|Spedition|[Aa]mt\b|Amt |Institut|Center|Polizei|Dr\.|Brauerei|Steuerberater|Charit|Service|Gruppe|Niederlassung|Dienst|Pharma|Gewerkschaft|Labor|\bu\.|[&+(,\d]|[A-ZÄÖÜ]{3,}| - /;
const karte = new Map();
const grosskunde = new Set();
let zeilen = 0;
for (const zeile of fs.readFileSync(quelle, "utf8").split(/\r?\n/)) {
  if (!zeile.trim()) continue;
  const [land, plz, ort] = zeile.split("\t");
  if (land !== "DE" || !/^\d{5}$/.test(plz)) throw new Error("Unerwartete Zeile: " + zeile.slice(0, 80));
  zeilen++;
  if (!karte.has(plz)) karte.set(plz, new Set());
  const name = (ort ?? "").trim();
  if (KEIN_ORT.test(name) || name.split(/\s+/).length > 4) grosskunde.add(plz);
  else if (name) karte.get(plz).add(name);
}
const aus = {};
// Steht unter einer Postleitzahl eine Firma oder ein Amt, ist es eine Großkunden-Postleitzahl: kein Vorschlag.
for (const plz of [...karte.keys()].sort()) aus[plz] = grosskunde.has(plz) ? [] : [...karte.get(plz)].sort((a, b) => a.localeCompare(b, "de"));
fs.writeFileSync(ziel, JSON.stringify(aus));
const ohneOrt = Object.values(aus).filter((o) => o.length === 0).length;
console.log(`${zeilen} Zeilen, ${Object.keys(aus).length} Postleitzahlen, davon ${ohneOrt} ohne Ortsvorschlag, ${fs.statSync(ziel).size} Bytes`);
