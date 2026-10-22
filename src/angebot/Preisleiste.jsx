import React from "react";
import { C, S } from "../theme.js";
import { formatPreis } from "./angebotspreis.js";

/* Leiste am unteren Rand des Schritts "Gerichte": Preis pro Person läuft mit, daneben geht es weiter. */
export default function Preisleiste({ paket, ergebnis, onWeiter }) {
  return (
    <div className="mm-leiste" style={{ background: C.white, borderTop: `1px solid ${C.border}`, boxShadow: "0 -6px 20px rgba(28,16,8,.08)", padding: "12px 20px" }}>
      <div className="mm-leiste-innen" style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }} aria-live="polite">
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.burgundy, lineHeight: 1.1 }}>
            {formatPreis(ergebnis.proPerson)} <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: C.cappuccino }}>pro Person</span>
          </div>
          <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 2 }}>
            {ergebnis.aufpreisProPerson > 0
              ? `${paket.name} ${formatPreis(ergebnis.paketProPerson)} + Extras ${formatPreis(ergebnis.aufpreisProPerson)}`
              : `Paket ${paket.name}`}
          </div>
        </div>
        <button
          type="button"
          disabled={!ergebnis.vollstaendig}
          onClick={onWeiter}
          className="mm-btn-press"
          style={{ ...S.primaryBtn, ...(ergebnis.vollstaendig ? {} : S.btnDisabled), width: "auto", flex: "1 1 220px", padding: "14px 20px" }}
        >
          {ergebnis.vollstaendig ? "Weiter →" : "Auswahl vervollständigen"}
        </button>
      </div>
    </div>
  );
}
