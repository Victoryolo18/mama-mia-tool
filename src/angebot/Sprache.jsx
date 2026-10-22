import React, { createContext, useContext } from "react";
import { S } from "../theme.js";
import { texte } from "./texte.js";

/* Die Texte der gewählten Sprache für alle Schritte (texte.js). Ohne Anbieter gilt Deutsch. */
export const SpracheKontext = createContext(texte("de"));
export const useTexte = () => useContext(SpracheKontext);

/** Setzt *Wort* kursiv wie die Überschriften des Generators und **Wort** fett. */
export function Betont({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map((teil, i) =>
    teil.startsWith("**") ? <strong key={i}>{teil.slice(2, -2)}</strong>
    : teil.startsWith("*") ? <em key={i} style={S.italic}>{teil.slice(1, -1)}</em>
    : <React.Fragment key={i}>{teil}</React.Fragment>);
}
