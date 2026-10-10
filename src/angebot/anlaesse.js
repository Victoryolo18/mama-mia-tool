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

export const anlassLabel = (slug) => ANLAESSE.find((a) => a.slug === slug)?.label ?? null;

/** Liest die Vorwahl aus dem Link. `?essensart=fingerfood` wählt die Essensart vor.
    Die bisherigen Links der Website (`?anlass=hochzeit`) füllen den freiwilligen Anlass;
    `?anlass=fruehstueck` war früher ein Anlass und ist jetzt die Essensart Frühstück.
    Unbekannte Werte werden ignoriert. */
export function vorwahlAusLink(suche, essensarten) {
  const params = new URLSearchParams(suche || "");
  const kennt = (slug) => essensarten.some((e) => e.slug === slug);
  const anlass = params.get("anlass");
  let essensart = params.get("essensart");
  if (!kennt(essensart)) essensart = anlass === "fruehstueck" && kennt("fruehstueck") ? "fruehstueck" : null;
  return { essensart, anlass: anlassLabel(anlass) ? anlass : null };
}
