import React from "react";
import ReactDOM from "react-dom/client";
import MamaMiaAngebotsgenerator from "./MamaMiaAngebotsgenerator.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
document.head.appendChild(style);

// Klick-Prototyp für den neuen Schritt "Gerichte" (GEN-3): nur mit ?prototyp=gerichte, sonst der Generator wie bisher.
const PrototypGerichte = React.lazy(() => import("./prototyp/PrototypGerichte.jsx"));
const prototyp = new URLSearchParams(window.location.search).get("prototyp") === "gerichte";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {prototyp ? (
        <React.Suspense fallback={null}>
          <PrototypGerichte />
        </React.Suspense>
      ) : (
        <MamaMiaAngebotsgenerator />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
