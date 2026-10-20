/* Symbole für Fleisch, Fisch, Vegetarisch, Vegan und Glutenfrei, wie Lieferdienste sie zeigen (Victor, 20.10.2026):
   Keule, Fisch, ein Blatt, zwei Blätter, durchgestrichene Ähre, jeweils in einem dünnen Kreis.
   Gezeichnet in einem Raster von 24 × 24. `flaechen` werden in der Farbe gefüllt; `adern` sind helle Linien
   auf der Fläche (Blattadern, Fischauge), `striche` Linien in der Farbe (Knochen, Halm).
   `durchgestrichen` zieht eine Linie quer durch. Ohne React. Website und CRM nutzen Kopien dieser Datei. */

export const SYMBOLE = {
  fleisch: {
    farbe: "#5C2818",
    flaechen: [
      "M9.6 14.4C7.4 12.2 7.7 7.8 10.6 5 13.4 2.1 17.8 1.8 20 4c2.2 2.2 1.9 6.6-1 9.4-2.8 2.9-7.2 3.2-9.4 1z",
      "M3.2 18.6a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0z",
      "M5.4 20.8a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0z",
    ],
    striche: ["M10.6 13.4 5.6 18.4"],
    adern: [],
  },
  fisch: {
    farbe: "#4F7EA0",
    flaechen: [
      "M8 12c2.2-3.3 5-5 8-5 2.7 0 4.8 1.9 6 5-1.2 3.1-3.3 5-6 5-3 0-5.8-1.7-8-5z",
      "M8.8 12 2.5 7.5v9z",
    ],
    striche: [],
    adern: ["M17.6 11h.01"],
  },
  vegetarisch: {
    farbe: "#3D8B40",
    flaechen: ["M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"],
    striche: [],
    adern: ["M7 17 15.5 8.5"],
  },
  vegan: {
    farbe: "#3D8B40",
    flaechen: [
      "M11.4 20.5C5.8 19.4 3.4 13.9 4.4 6.3c6 1.6 8.3 7.1 7 14.2z",
      "M12.6 20.5c5.6-1.1 8-6.6 7-14.2-6 1.6-8.3 7.1-7 14.2z",
    ],
    striche: [],
    adern: ["M10.8 18.6 6.4 9.4", "M13.2 18.6l4.4-9.2"],
  },
  glutenfrei: {
    farbe: "#A8742A",
    flaechen: [
      "M12 7.6c-1.5-1.3-1.5-3.4 0-4.8 1.5 1.4 1.5 3.5 0 4.8z",
      "M11.6 10c-2.6-.2-4-1.9-3.8-4.4 2.6.2 4 1.9 3.8 4.4z",
      "M12.4 10c2.6-.2 4-1.9 3.8-4.4-2.6.2-4 1.9-3.8 4.4z",
      "M11.6 13.8c-2.6-.2-4-1.9-3.8-4.4 2.6.2 4 1.9 3.8 4.4z",
      "M12.4 13.8c2.6-.2 4-1.9 3.8-4.4-2.6.2-4 1.9-3.8 4.4z",
      "M11.6 17.6c-2.6-.2-4-1.9-3.8-4.4 2.6.2 4 1.9 3.8 4.4z",
      "M12.4 17.6c2.6-.2 4-1.9 3.8-4.4-2.6.2-4 1.9-3.8 4.4z",
    ],
    striche: ["M12 8v13"],
    adern: [],
    durchgestrichen: true,
  },
};

/** Das Symbol als SVG-Text (ohne React), z. B. für eine Vorschau oder ein Bild. `groesse` in Pixeln. */
export function symbolSvg(name, groesse = 20) {
  const s = SYMBOLE[name];
  const linie = (d, farbe, breite) => `<path d="${d}" stroke="${farbe}" stroke-width="${breite}" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${groesse}" height="${groesse}" viewBox="-3 -3 30 30">`
    + `<circle cx="12" cy="12" r="13.5" fill="#fff" stroke="${s.farbe}" stroke-width="1.6"/>`
    + s.flaechen.map((d) => `<path d="${d}" fill="${s.farbe}"/>`).join("")
    + s.striche.map((d) => linie(d, s.farbe, 2.2)).join("")
    + s.adern.map((d) => linie(d, "#fff", d.endsWith("h.01") ? 2.4 : 1.3)).join("")
    + (s.durchgestrichen ? linie("M4.5 4.5 19.5 19.5", "#fff", 3.6) + linie("M4.5 4.5 19.5 19.5", s.farbe, 1.8) : "")
    + "</svg>";
}
