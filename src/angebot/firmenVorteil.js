/* Firmen-Vorteil unter der Woche. Die Regeln stehen nur hier; Website und CRM nutzen eine Kopie dieser Datei
   (mama-mia-website/src/angebot/, mama-mia-crm/src/shared/).

   Wie viel, an welchen Tagen und ab wie vielen Personen stellt Jana im CRM ein (Tabelle `firmen_vorteil`,
   Migration 18); ausgeschaltet gibt es keinen Vorteil. Fest bleiben die Anlässe: nur die vier Firmenanlässe,
   nie die Weihnachtsfeier (Victor, 19.10.2026).

   Der Generator zieht den Vorteil ab, sobald Anlass, Tag und Personenzahl passen. Dann sind Firmenname und
   Rechnungsadresse Pflicht; ohne sie lässt sich die Anfrage nicht absenden. Jana sieht die Firma im CRM und
   kann den Vorteil dort herausnehmen, wenn die Angaben nicht stimmen. */
export const FIRMEN_ANLAESSE = ["firmenfeier", "seminar", "empfang", "eroeffnung"];

/* Bei diesen Anlässen fragt der Generator die Firma ab, ohne sie zu verlangen und ohne Vorteil:
   Eine Weihnachtsfeier ist oft auch privat oder im Verein. */
const FIRMA_FREIWILLIG = ["weihnachtsfeier"];

export const FIRMA_GRENZEN = { name: 120, adresse: 200, ust_id: 20 };

/** Grenzen der Einstellung im CRM; dieselben wie die Prüfungen der Tabelle in Migration 18. */
export const REGEL_GRENZEN = { prozent: { min: 1, max: 30 }, mindestpersonen: { min: 1, max: 250 } };

/* Wochentage wie in der Datenbank (isodow): 1 = Montag bis 7 = Sonntag. */
export const WOCHENTAGE = [
  { nr: 1, name: "Montag", kurz: "Mo" },
  { nr: 2, name: "Dienstag", kurz: "Di" },
  { nr: 3, name: "Mittwoch", kurz: "Mi" },
  { nr: 4, name: "Donnerstag", kurz: "Do" },
  { nr: 5, name: "Freitag", kurz: "Fr" },
  { nr: 6, name: "Samstag", kurz: "Sa" },
  { nr: 7, name: "Sonntag", kurz: "So" },
];

const cent = (euro) => Math.round(Number(euro) * 100);
const ganzeZahl = (wert) => (/^\s*\d+\s*$/.test(String(wert ?? "")) ? Number(wert) : NaN);

/** Prüft die Einstellung, wie Jana sie im CRM einträgt oder wie sie aus der Tabelle kommt.
    `{ wert: { aktiv, prozent, wochentage, mindestpersonen } }` oder `{ fehler }`. */
export function pruefeRegel(zeile) {
  const prozent = ganzeZahl(zeile?.prozent);
  const mindestpersonen = ganzeZahl(zeile?.mindestpersonen);
  const wochentage = [...new Set((zeile?.wochentage ?? []).map(Number))].sort((a, b) => a - b);
  const { prozent: p, mindestpersonen: m } = REGEL_GRENZEN;
  if (!(prozent >= p.min && prozent <= p.max)) return { fehler: `Bitte eine ganze Zahl von ${p.min} bis ${p.max} Prozent eintragen.` };
  if (wochentage.length === 0 || !wochentage.every((t) => WOCHENTAGE.some((w) => w.nr === t))) return { fehler: "Bitte mindestens einen Wochentag ankreuzen." };
  if (!(mindestpersonen >= m.min && mindestpersonen <= m.max)) return { fehler: `Bitte eine Personenzahl von ${m.min} bis ${m.max} eintragen.` };
  return { wert: { aktiv: zeile?.aktiv === true, prozent, wochentage, mindestpersonen } };
}

/** Die Regel, mit der gerechnet wird: null, wenn der Vorteil ausgeschaltet ist oder die Zeile nicht stimmt. */
export function regelAusZeile(zeile) {
  const { wert } = pruefeRegel(zeile);
  return wert?.aktiv ? wert : null;
}

/** Lädt die Regel aus der Datenbank (Tabelle `firmen_vorteil`). Wirft bei einem Fehler. */
export async function ladeFirmenVorteil(supabase) {
  const { data, error } = await supabase.from("firmen_vorteil").select("aktiv, prozent, wochentage, mindestpersonen").eq("id", 1).limit(1);
  if (error) throw new Error(`Firmen-Vorteil: ${error.message}`);
  return regelAusZeile(data?.[0]);
}

/** "Montag bis Donnerstag" bei einer lückenlosen Folge, sonst "Montag, Mittwoch und Freitag". */
export function wochentageText(tage) {
  const sortiert = [...tage].sort((a, b) => a - b);
  const name = (nr) => WOCHENTAGE.find((w) => w.nr === nr)?.name ?? "";
  const lueckenlos = sortiert.every((t, i) => i === 0 || t === sortiert[i - 1] + 1);
  if (sortiert.length > 2 && lueckenlos) return `${name(sortiert[0])} bis ${name(sortiert.at(-1))}`;
  const namen = sortiert.map(name);
  return namen.length > 1 ? `${namen.slice(0, -1).join(", ")} und ${namen.at(-1)}` : namen.join("");
}

/** Gilt der Anlass als Firmenanlass, für den es den Vorteil geben kann? */
export const firmenAnlass = (anlass) => FIRMEN_ANLAESSE.includes(anlass);

/** Wochentag eines Datums im Format JJJJ-MM-TT (1 = Montag bis 7 = Sonntag); null bei einem ungültigen Datum. */
export function wochentag(datum) {
  const teile = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum || ""));
  if (!teile) return null;
  const tag = new Date(Number(teile[1]), Number(teile[2]) - 1, Number(teile[3]));
  if (Number.isNaN(tag.getTime()) || tag.getDate() !== Number(teile[3]) || tag.getMonth() !== Number(teile[2]) - 1) return null;
  return tag.getDay() || 7;
}

/** Passen Anlass, Tag und Personenzahl zur Regel? `regel` aus regelAusZeile; null heißt: kein Vorteil. */
export function firmenVorteilMoeglich({ anlass, datum, gaeste }, regel) {
  if (!regel || !firmenAnlass(anlass)) return false;
  if (!(Number(gaeste) >= regel.mindestpersonen)) return false;
  return regel.wochentage.includes(wochentag(datum));
}

/** Fragt der Generator die Firma ab? "pflicht", sobald es den Vorteil gibt; "freiwillig" bei den übrigen
    Firmenanlässen und der Weihnachtsfeier; sonst null. */
export function firmaAbfrage(data, regel) {
  if (firmenVorteilMoeglich(data ?? {}, regel)) return "pflicht";
  if (firmenAnlass(data?.anlass) || FIRMA_FREIWILLIG.includes(data?.anlass)) return "freiwillig";
  return null;
}

/** Prüft die Firmendaten. Leer ist `{ wert: null }`; sonst `{ wert }` oder `{ fehler }`.
    Die Rechnungsadresse braucht eine Postleitzahl, damit eine Rechnung an die Firma gehen kann. */
export function pruefeFirma(firma) {
  const name = String(firma?.name ?? "").trim().replace(/\s+/g, " ");
  const adresse = String(firma?.adresse ?? "").trim().replace(/[ \t]+/g, " ");
  const ust = String(firma?.ust_id ?? "").replace(/\s+/g, "").toUpperCase();
  if (!name && !adresse && !ust) return { wert: null };
  if (name.length < 2) return { fehler: "Bitte den Namen der Firma angeben." };
  if (name.length > FIRMA_GRENZEN.name) return { fehler: `Der Firmenname ist zu lang (höchstens ${FIRMA_GRENZEN.name} Zeichen).` };
  if (!/\d{5}/.test(adresse)) return { fehler: "Bitte die Rechnungsadresse mit Straße, Postleitzahl und Ort angeben." };
  if (adresse.length > FIRMA_GRENZEN.adresse) return { fehler: `Die Rechnungsadresse ist zu lang (höchstens ${FIRMA_GRENZEN.adresse} Zeichen).` };
  if (ust && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(ust)) return { fehler: "Die Umsatzsteuer-ID sieht nicht richtig aus, etwa DE123456789. Sie können das Feld auch leer lassen." };
  return { wert: { name, adresse, ust_id: ust || null } };
}

/** Die Rechnungsadresse aus den vier Feldern des Generators, so wie sie gespeichert wird: "Straße Nr\nPLZ Ort". */
export function adresseAusFeldern({ strasse, nr, plz, ort } = {}) {
  const zeile = (...teile) => teile.map((t) => String(t ?? "").trim().replace(/\s+/g, " ")).filter(Boolean).join(" ");
  return [zeile(strasse, nr), zeile(plz, ort)].filter(Boolean).join("\n");
}

/** Firmendaten aus dem Generator (Name, Straße, Nr., PLZ, Ort, USt-ID) → `{ wert: { name, adresse, ust_id } }`,
    `{ wert: null }` (leer) oder `{ fehler }`. `plzOrte` ist die Liste aus plzOrte.js; ohne sie (noch nicht
    geladen) wird nur geprüft, dass die Postleitzahl fünf Ziffern hat. */
export function pruefeFirmaEingabe(eingabe, plzOrte = null) {
  const feld = (name) => String(eingabe?.[name] ?? "").trim();
  if (!["name", "strasse", "nr", "plz", "ort", "ust_id"].some((n) => feld(n))) return { wert: null };
  if (feld("name").length < 2) return { fehler: "Bitte den Namen der Firma angeben." };
  if (!feld("strasse")) return { fehler: "Bitte die Straße angeben." };
  if (!feld("nr")) return { fehler: "Bitte die Hausnummer angeben." };
  if (!/^\d{5}$/.test(feld("plz"))) return { fehler: "Bitte eine Postleitzahl mit fünf Ziffern angeben." };
  if (plzOrte && !Object.hasOwn(plzOrte, feld("plz"))) return { fehler: "Diese Postleitzahl gibt es nicht. Bitte prüfen." };
  if (!feld("ort")) return { fehler: "Bitte den Ort angeben." };
  return pruefeFirma({ name: feld("name"), adresse: adresseAusFeldern(eingabe), ust_id: feld("ust_id") });
}

/** Wie viel Prozent abgezogen werden: die Prozent der Regel, wenn Anlass, Tag und Personenzahl passen, sonst null.
    Die Firmendaten sind dann Pflicht (firmaAbfrage), der Abzug hängt nicht an ihnen. */
export function vorteilProzent(data, regel) {
  return firmenVorteilMoeglich(data ?? {}, regel) ? regel.prozent : null;
}

/** Zieht den Vorteil vom Ergebnis aus `berechneAngebot` ab: nur auf die Speisen, nicht auf die Lieferung.
    Gibt das Ergebnis mit `firmenVorteil: { prozent, betrag }` (oder null) und dem verringerten `gesamt` zurück. */
export function mitFirmenVorteil(ergebnis, prozent) {
  if (!ergebnis) return ergebnis;
  if (!(Number(prozent) > 0)) return { ...ergebnis, firmenVorteil: null };
  const abzugCent = Math.round((cent(ergebnis.speisenGesamt) * Number(prozent)) / 100);
  return {
    ...ergebnis,
    firmenVorteil: { prozent: Number(prozent), betrag: abzugCent / 100 },
    gesamt: (cent(ergebnis.gesamt) - abzugCent) / 100,
  };
}

/** Die Bedingungen in einem Satzteil, für Paketseite, Anfrage und Website. */
export function firmenVorteilBedingungen(regel) {
  return `${wochentageText(regel.wochentage)}, ab ${regel.mindestpersonen} Personen, mit Rechnung an die Firma`;
}
