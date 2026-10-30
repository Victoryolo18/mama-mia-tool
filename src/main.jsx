import React from "react";
import ReactDOM from "react-dom/client";
import MamaMiaAngebotsgenerator from "./MamaMiaAngebotsgenerator.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Ansichtsrahmen from "./vorschau/Ansichtsrahmen.jsx";
import Einwilligung from "./Einwilligung.jsx";
import { SpracheKontext } from "./angebot/Sprache.jsx";
import { spracheAusLink } from "./angebot/sprache.js";
import { texte } from "./angebot/texte.js";

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
document.head.appendChild(style);

// Breiten-Umschalter: nur in der Vorschau, nicht im Rahmen selbst und nicht auf schmalen Geräten.
const mitUmschalter = __VORSCHAU__ && window.self === window.top && window.innerWidth >= 800;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {mitUmschalter ? (
        <Ansichtsrahmen><MamaMiaAngebotsgenerator /></Ansichtsrahmen>
      ) : (
        <MamaMiaAngebotsgenerator />
      )}
      {/* Banner neben dem Generator: auch beim Laden und bei Fehlern da. */}
      <SpracheKontext.Provider value={texte(spracheAusLink(window.location.search))}>
        <Einwilligung />
      </SpracheKontext.Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
