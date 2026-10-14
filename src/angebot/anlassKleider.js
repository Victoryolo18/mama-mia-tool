/* Paketseite je Anlass: Unter `angebot.mama-mia-events.de/<anlass>` trägt der Schritt "Paket" das Kleid
   des Anlasses (Bild, Überschrift, Schmuck). Die Seite wird nicht bei Google aufgenommen (noindex in
   index.html); gefunden wird die Anlass-Seite der Website, die hierher verlinkt.
   Ein neuer Anlass ist ein neuer Eintrag hier und ein Bild unter public/anlass/. */
export const ANLASS_KLEIDER = {
  weihnachtsfeier: {
    titel: "Weihnachtsfeier",
    unterzeile: "Festlich essen mit dem ganzen Team. Ich liefere ins Büro oder in Ihren Raum und baue alles auf.",
    bild: "/anlass/weihnachtsfeier.webp",
    schmuck: "/anlass/advent-ranke-hell.svg",
    essensart: "buffet",
  },
};

/** Liest Anlass und Essensart aus dem Pfad: `/weihnachtsfeier` oder `/weihnachtsfeier/fingerfood`.
    Nur Anlässe mit Kleid zählen; eine unbekannte Essensart fällt auf die des Kleids zurück. */
export function kleidAusPfad(pfad, essensarten) {
  const [anlass, art] = String(pfad || "").split("/").filter(Boolean).map((t) => decodeURIComponent(t).toLowerCase());
  if (!anlass || !Object.hasOwn(ANLASS_KLEIDER, anlass)) return null;
  const kleid = ANLASS_KLEIDER[anlass];
  const kennt = (slug) => essensarten.some((e) => e.slug === slug);
  const essensart = kennt(art) ? art : kennt(kleid.essensart) ? kleid.essensart : null;
  return { anlass, essensart, kleid };
}
