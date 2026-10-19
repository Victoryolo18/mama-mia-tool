/* Mehrwertsteuer in den Preisen. Alle Preise in Katalog, Generator und CRM sind Bruttopreise.
   Website und CRM nutzen eine Kopie dieser Datei (mama-mia-website/src/angebot/, mama-mia-crm/src/shared/).

   Jana rechnet 7 % ab: Lieferung von Speisen (BWA 2026). Bedient sie einmal mit eigenem Personal vor Ort,
   gelten für diesen Auftrag 19 %; das klärt sie mit ihrem Steuerbüro, der Generator kennt nur 7 %. */
export const MWST_PROZENT = 7;

/** Teilt einen Bruttobetrag in Netto und Steuer, auf den Cent gerundet. Netto + Steuer = Brutto. */
export function mwstAus(brutto) {
  const bruttoCent = Math.round(Number(brutto) * 100);
  if (!Number.isFinite(bruttoCent)) return { netto: null, mwst: null };
  const nettoCent = Math.round((bruttoCent * 100) / (100 + MWST_PROZENT));
  return { netto: nettoCent / 100, mwst: (bruttoCent - nettoCent) / 100 };
}
