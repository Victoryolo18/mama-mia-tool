/* Paketseite je Anlass: Unter `angebot.mama-mia-events.de/<anlass>` trägt der Schritt "Paket" das Kleid
   des Anlasses (Bild, Überschrift, Schmuck). Die Seite wird nicht bei Google aufgenommen (noindex in
   index.html); gefunden wird die Anlass-Seite der Website, die hierher verlinkt.
   Ein neuer Anlass ist ein neuer Eintrag hier und ein Bild unter public/anlass/ (Quelle in QUELLEN.md).

   ueberschrift: [Anfang, betontes Wort], weil "Ihre Hochzeit", aber "Ihr Geburtstag".
   essensart:    Vorgabe, wenn der Link keine nennt (die Empfehlung der Anlass-Seite auf der Website).
   schmuck:      Ranke aus dem passenden Saison-Kleid der Website, oder null. */
const RANKE = {
  advent: "/anlass/advent-ranke-hell.svg",
  fruehling: "/anlass/fruehling-ranke-hell.svg",
  sommer: "/anlass/sommer-ranke-hell.svg",
};

export const ANLASS_KLEIDER = {
  weihnachtsfeier: {
    titel: "Weihnachtsfeier",
    ueberschrift: ["Ihre", "Weihnachtsfeier"],
    unterzeile: "Festlich essen mit dem ganzen Team. Ich liefere ins Büro oder in Ihren Raum und baue alles auf.",
    bild: "/anlass/weihnachtsfeier.webp",
    schmuck: RANKE.advent,
    essensart: "buffet",
  },
  firmenfeier: {
    titel: "Firmenfeier",
    ueberschrift: ["Ihre", "Firmenfeier"],
    unterzeile: "Vom Frühstück für zwölf Kollegen bis zum Buffet für die ganze Belegschaft. Pünktlich geliefert, der Aufbau ist immer inklusive.",
    bild: "/anlass/firmenfeier.webp",
    schmuck: null,
    essensart: "buffet",
  },
  hochzeit: {
    titel: "Hochzeit",
    ueberschrift: ["Ihre", "Hochzeit"],
    unterzeile: "Vom Fingerfood-Empfang bis zum Abendbuffet, frisch gekocht in meiner Küche in Leegebruch und zu Ihrer Feier geliefert.",
    bild: "/anlass/hochzeit.webp",
    schmuck: RANKE.fruehling,
    essensart: "buffet",
  },
  geburtstag: {
    titel: "Geburtstag",
    ueberschrift: ["Ihr", "Geburtstag"],
    unterzeile: "Ob runder Geburtstag im Saal oder Gartenfeier im kleinen Kreis: Sie feiern, ich kümmere mich ums Essen.",
    bild: "/anlass/geburtstag.webp",
    schmuck: null,
    essensart: "buffet",
  },
  einschulung: {
    titel: "Einschulung",
    ueberschrift: ["Ihre", "Einschulung"],
    unterzeile: "Für den Nachmittag mit der ganzen Familie. Ich liefere alles fertig zubereitet, damit Sie den Tag mit Ihrem Kind verbringen.",
    bild: "/anlass/einschulung.webp",
    schmuck: RANKE.sommer,
    essensart: "fingerfood",
  },
  individuell: {
    titel: "Private Feier",
    ueberschrift: ["Ihre private", "Feier"],
    unterzeile: "Jubiläum, Gartenfest, Vereinsabend oder einfach ein guter Grund: Sie stellen das Essen zusammen, ich liefere es.",
    bild: "/anlass/individuell.webp",
    schmuck: null,
    essensart: "buffet",
  },
  jugendweihe: {
    titel: "Jugendweihe",
    ueberschrift: ["Ihre", "Jugendweihe"],
    unterzeile: "Nach der Feierstunde kommt die Familie zusammen. Ich liefere das Essen fertig angerichtet, damit Sie bei Ihrem Kind sind.",
    bild: "/anlass/jugendweihe.webp",
    schmuck: RANKE.fruehling,
    essensart: "buffet",
  },
  konfirmation: {
    titel: "Konfirmation",
    ueberschrift: ["Ihre", "Konfirmation"],
    unterzeile: "Wenn Sie aus der Kirche kommen, steht das Essen für Familie und Paten bereit.",
    bild: "/anlass/konfirmation.webp",
    schmuck: RANKE.fruehling,
    essensart: "buffet",
  },
  kommunion: {
    titel: "Kommunion",
    ueberschrift: ["Ihre", "Kommunion"],
    unterzeile: "Ein Festessen für den Tag, an dem Ihr Kind im Mittelpunkt steht, fertig angerichtet geliefert. Auch zur Firmung.",
    bild: "/anlass/kommunion.webp",
    schmuck: RANKE.fruehling,
    essensart: "buffet",
  },
  taufe: {
    titel: "Taufe",
    ueberschrift: ["Ihre", "Taufe"],
    unterzeile: "Für die kleine Runde mit Paten, Großeltern und den engsten Freunden. Ich liefere schon ab acht Personen.",
    bild: "/anlass/taufe.webp",
    schmuck: RANKE.fruehling,
    essensart: "fruehstueck",
  },
  jubilaeum: {
    titel: "Goldene Hochzeit und Jubiläum",
    ueberschrift: ["Ihr", "Jubiläum"],
    unterzeile: "Fünfzig gemeinsame Jahre oder ein Familienjubiläum: ein gutes Essen in Ruhe, frisch gekocht und dorthin gebracht, wo Sie feiern.",
    bild: "/anlass/jubilaeum.webp",
    schmuck: null,
    essensart: "buffet",
  },
  trauerfeier: {
    titel: "Trauerfeier",
    ueberschrift: ["Essen zur", "Trauerfeier"],
    unterzeile: "Für das Beisammensein nach der Beisetzung. Ich kümmere mich ruhig und zuverlässig um das Essen, damit Sie eine Sorge weniger haben.",
    bild: "/anlass/trauerfeier.webp",
    schmuck: null,
    essensart: "fingerfood",
  },
  sommerfest: {
    titel: "Sommerfest und Gartenparty",
    ueberschrift: ["Ihr", "Sommerfest"],
    unterzeile: "Im Garten, im Verein oder auf dem Hof: Buffets und Fingerfood, die sich draußen gut essen lassen.",
    bild: "/anlass/sommerfest.webp",
    schmuck: RANKE.sommer,
    essensart: "buffet",
  },
  seminar: {
    titel: "Seminar und Schulung",
    ueberschrift: ["Ihr", "Seminar"],
    unterzeile: "Gutes Essen zur richtigen Zeit, vom Frühstück bis zum Mittag, für Seminare, Schulungen und Workshops.",
    bild: "/anlass/seminar.webp",
    schmuck: null,
    essensart: "fruehstueck",
  },
  eroeffnung: {
    titel: "Firmenjubiläum und Eröffnung",
    ueberschrift: ["Ihr", "Firmenjubiläum"],
    unterzeile: "Wenn Ihr Unternehmen Gäste empfängt, ist das Essen Teil Ihres Auftritts. Ich sorge dafür, dass es frisch ist und gut aussieht.",
    bild: "/anlass/eroeffnung.webp",
    schmuck: null,
    essensart: "fingerfood",
  },
  empfang: {
    titel: "Empfang und Business-Lunch",
    ueberschrift: ["Ihr", "Empfang"],
    unterzeile: "Fingerfood und Lunch für Besprechungen und Empfänge, die einen guten Eindruck machen und den Ablauf nicht stören.",
    bild: "/anlass/empfang.webp",
    schmuck: null,
    essensart: "fingerfood",
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
