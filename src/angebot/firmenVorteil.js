/* Firmen-Vorteil unter der Woche. Die Regeln stehen nur hier; Website und CRM nutzen eine Kopie dieser Datei
   (mama-mia-website/src/angebot/, mama-mia-crm/src/shared/).

   Der Generator zieht den Vorteil direkt im Preis ab, sobald die Bedingungen erfüllt sind und der Kunde
   seine Firmendaten angegeben hat. Ohne Firmendaten gibt es keinen Abzug. Jana sieht die Firma im CRM und
   kann den Vorteil dort herausnehmen, wenn die Angaben nicht stimmen.
   Stand: von Victor am 19.10.2026 bestätigt (5 %, Montag bis Donnerstag, ab 15 Personen). */
export const FIRMEN_VORTEIL = {
  prozent: 5,
  wochentage: [1, 2, 3, 4], // Montag bis Donnerstag (Date.getDay: 0 = Sonntag)
  mindestpersonen: 15,
  anlaesse: ["firmenfeier", "seminar", "empfang", "eroeffnung"],
};

/* Bei diesen Anlässen fragt der Generator die Firma ab, ohne sie zu verlangen: Eine Weihnachtsfeier ist
   oft auch privat oder im Verein (Victor, 19.10.2026). Bei den Anlässen mit Vorteil ist sie Pflicht. */
const FIRMA_FREIWILLIG = ["weihnachtsfeier"];

export const FIRMA_GRENZEN = { name: 120, adresse: 200, ust_id: 20 };

const TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const cent = (euro) => Math.round(Number(euro) * 100);

/** "Montag bis Donnerstag" bei einer lückenlosen Folge, sonst "Montag, Mittwoch und Freitag". */
export function wochentageText(tage = FIRMEN_VORTEIL.wochentage) {
  const sortiert = [...tage].sort((a, b) => a - b);
  const lueckenlos = sortiert.every((t, i) => i === 0 || t === sortiert[i - 1] + 1);
  if (sortiert.length > 2 && lueckenlos) return `${TAGE[sortiert[0]]} bis ${TAGE[sortiert.at(-1)]}`;
  const namen = sortiert.map((t) => TAGE[t]);
  return namen.length > 1 ? `${namen.slice(0, -1).join(", ")} und ${namen.at(-1)}` : namen.join("");
}

/** Gilt der Anlass als Firmenanlass mit Vorteil? */
export const firmenAnlass = (anlass) => FIRMEN_VORTEIL.anlaesse.includes(anlass);

/** Fragt der Generator bei diesem Anlass die Firma ab? "pflicht", "freiwillig" oder null. */
export function firmaAbfrage(anlass) {
  if (firmenAnlass(anlass)) return "pflicht";
  if (FIRMA_FREIWILLIG.includes(anlass)) return "freiwillig";
  return null;
}

/** Sind alle Bedingungen erfüllt, die nicht an der Firma hängen? `datum` im Format JJJJ-MM-TT wie im Datumsfeld. */
export function firmenVorteilMoeglich({ anlass, datum, gaeste }) {
  if (!firmenAnlass(anlass)) return false;
  if (!(Number(gaeste) >= FIRMEN_VORTEIL.mindestpersonen)) return false;
  const teile = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum || ""));
  if (!teile) return false;
  const tag = new Date(Number(teile[1]), Number(teile[2]) - 1, Number(teile[3]));
  if (Number.isNaN(tag.getTime()) || tag.getDate() !== Number(teile[3])) return false;
  return FIRMEN_VORTEIL.wochentage.includes(tag.getDay());
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

/** Wie viel Prozent abgezogen werden: alle Bedingungen erfüllt und gültige Firmendaten, sonst null. */
export function vorteilProzent(data) {
  return firmenVorteilMoeglich(data) && pruefeFirma(data?.firma).wert ? FIRMEN_VORTEIL.prozent : null;
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
export function firmenVorteilBedingungen() {
  return `${wochentageText()}, ab ${FIRMEN_VORTEIL.mindestpersonen} Personen, mit Rechnung an die Firma`;
}
