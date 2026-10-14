/* Firmen-Vorteil unter der Woche. Die Regeln stehen nur hier; die Website liest dieselbe Datei
   (Kopie in mama-mia-website/src/angebot/) für ihre Texte.

   Der Generator zieht den Vorteil NIE selbst ab. Er sagt nur, dass er möglich ist; Jana prüft die Firma
   und zieht ihn im Angebot ab. Deshalb ändert diese Datei keinen Preis.
   Stand: Vorschlag vom 14.10.2026, von Victor noch zu bestätigen. */
export const FIRMEN_VORTEIL = {
  prozent: 5,
  wochentage: [1, 2, 3, 4], // Montag bis Donnerstag (Date.getDay: 0 = Sonntag)
  mindestpersonen: 15,
  anlaesse: ["firmenfeier", "seminar", "empfang", "eroeffnung"],
};

const TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

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

/** Sind alle Bedingungen erfüllt, die der Generator prüfen kann? Ob es wirklich eine Firma ist
    (Rechnung an die Firma), prüft Jana. `datum` im Format JJJJ-MM-TT wie im Datumsfeld. */
export function firmenVorteilMoeglich({ anlass, datum, gaeste }) {
  if (!firmenAnlass(anlass)) return false;
  if (!(Number(gaeste) >= FIRMEN_VORTEIL.mindestpersonen)) return false;
  const teile = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum || ""));
  if (!teile) return false;
  const tag = new Date(Number(teile[1]), Number(teile[2]) - 1, Number(teile[3]));
  if (Number.isNaN(tag.getTime()) || tag.getDate() !== Number(teile[3])) return false;
  return FIRMEN_VORTEIL.wochentage.includes(tag.getDay());
}

/** Die Bedingungen in einem Satzteil, für Paketseite, Anfrage und Website. */
export function firmenVorteilBedingungen() {
  return `${wochentageText()}, für Firmen auf Rechnung, ab ${FIRMEN_VORTEIL.mindestpersonen} Personen`;
}
