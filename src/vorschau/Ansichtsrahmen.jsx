import React, { useState } from "react";

/* Nur in der Vercel-Vorschau (siehe vite.config.js): kleine Leiste zum Umschalten der Breite.
   Bei Desktop, Tablet und Handy läuft der Generator in einem Rahmen dieser Breite; ein Wechsel
   zwischen den dreien behält den Stand. "Voll" zeigt ihn wieder ohne Rahmen. Live gibt es das nicht. */

const ANSICHTEN = [
  { breite: null, label: "Voll" },
  { breite: 1200, label: "Desktop 1200" },
  { breite: 768,  label: "Tablet 768" },
  { breite: 390,  label: "Handy 390" },
];

export default function Ansichtsrahmen({ children }) {
  const [breite, setBreite] = useState(null);

  const leiste = (
    <div style={{
      position: "fixed", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
      display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(28,16,8,.88)",
      fontFamily: "system-ui, sans-serif", boxShadow: "0 2px 10px rgba(0,0,0,.3)",
    }}>
      {ANSICHTEN.map((a) => (
        <button
          key={a.label}
          type="button"
          aria-pressed={breite === a.breite}
          onClick={() => setBreite(a.breite)}
          style={{
            border: "none", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: breite === a.breite ? "#C9A84C" : "transparent", color: breite === a.breite ? "#1C1008" : "#fff",
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );

  if (breite === null) return <>{children}{leiste}</>;

  return (
    <div style={{ minHeight: "100vh", background: "#3a3a3a", display: "flex", justifyContent: "center", paddingTop: 44 }}>
      <iframe
        title="Vorschau"
        src={window.location.pathname + window.location.search}
        style={{ width: breite, maxWidth: "100%", height: "calc(100vh - 44px)", border: "none", background: "#fff" }}
      />
      {leiste}
    </div>
  );
}
