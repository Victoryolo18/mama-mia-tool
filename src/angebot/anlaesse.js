/* Der Anlass ist seit dem Umbau nach Essensart eine freiwillige Angabe am Ende, kein Schritt mehr.
   Die Kürzel sind dieselben wie in den bisherigen Anfragen und im CRM. */
export const ANLAESSE = [
  { slug: "hochzeit",    label: "Hochzeit" },
  { slug: "geburtstag",  label: "Geburtstag" },
  { slug: "einschulung", label: "Einschulung" },
  { slug: "individuell", label: "Private Feier" },
  { slug: "firmenfeier", label: "Firmenfeier" },
  { slug: "jugendweihe", label: "Jugendweihe" },
  { slug: "konfirmation", label: "Konfirmation" },
  { slug: "kommunion", label: "Kommunion" },
  { slug: "taufe", label: "Taufe" },
  { slug: "jubilaeum", label: "Goldene Hochzeit und Jubiläum" },
  { slug: "trauerfeier", label: "Trauerfeier" },
  { slug: "sommerfest", label: "Sommerfest und Gartenparty" },
  { slug: "seminar", label: "Seminar und Schulung" },
  { slug: "weihnachtsfeier", label: "Weihnachtsfeier" },
  { slug: "eroeffnung", label: "Firmenjubiläum und Eröffnung" },
  { slug: "empfang", label: "Empfang und Business-Lunch" },
];

/* Vorauswahl Privat oder Firma (Victor, 12.11.2026), damit die Liste kürzer wird. Jeder Anlass gehört fest zu genau
   einer Seite: Weihnachtsfeier zu Firma, Sommerfest zu Privat. */
export const KUNDENARTEN = ["privat", "firma"];
const FIRMA = ["firmenfeier", "seminar", "weihnachtsfeier", "eroeffnung", "empfang"];

/** Privat oder Firma eines Anlasses; null bei unbekanntem Anlass. */
export const kundenartDesAnlasses = (slug) => (anlassLabel(slug) ? (FIRMA.includes(slug) ? "firma" : "privat") : null);

/** Die Anlässe zur gewählten Art, in der Reihenfolge von ANLAESSE. Ohne Art alle. */
export function anlaesseFuer(kundenart) {
  if (!KUNDENARTEN.includes(kundenart)) return ANLAESSE;
  return ANLAESSE.filter((a) => kundenartDesAnlasses(a.slug) === kundenart);
}

/** Privat oder Firma: die Wahl des Kunden, sonst aus dem Anlass (etwa aus einem Link); null, wenn noch offen. */
export function kundenartVon(data) {
  if (KUNDENARTEN.includes(data?.kundenart)) return data.kundenart;
  return kundenartDesAnlasses(data?.anlass);
}

export const anlassLabel = (slug) => ANLAESSE.find((a) => a.slug === slug)?.label ?? null;

/** Liest die Vorwahl aus dem Link. `?essensart=fingerfood` wählt die Essensart vor.
    Die bisherigen Links der Website (`?anlass=hochzeit`) füllen den freiwilligen Anlass;
    `?anlass=fruehstueck` war früher ein Anlass und ist jetzt die Essensart Frühstück.
    `?paket=<id>` (Paket-Karten der Website) wählt das Paket samt Essensart vor; der Generator beginnt dann bei den Gerichten.
    Unbekannte Werte werden ignoriert. */
export function vorwahlAusLink(suche, essensarten, pakete = []) {
  const params = new URLSearchParams(suche || "");
  const kennt = (slug) => essensarten.some((e) => e.slug === slug);
  const anlass = params.get("anlass");
  let essensart = params.get("essensart");
  if (!kennt(essensart)) essensart = anlass === "fruehstueck" && kennt("fruehstueck") ? "fruehstueck" : null;
  const paket = pakete.find((p) => p.id === params.get("paket") && kennt(p.essensart) && (!essensart || p.essensart === essensart)) ?? null;
  if (paket) essensart = paket.essensart;
  return { essensart, anlass: anlassLabel(anlass) ? anlass : null, paketId: paket?.id ?? null };
}
