import React from "react";
import { C, S } from "../theme.js";

/* Schritt "Extras": Zusatzwünsche aus der Datenbank, alle ohne festen Preis. */
export default function SchrittExtras({ data, update, next, schritt, zusatzwuensche }) {
  const selected = data.extras || [];
  const toggle = (label) => {
    const updated = selected.includes(label)
      ? selected.filter(x => x !== label)
      : [...selected, label];
    update("extras", updated);
  };
  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>{schritt} · Optional</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Noch etwas <em style={S.italic}>Besonderes</em>?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Diese Extras sind optional — Preise auf Anfrage.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" }}>
        {/* Statische Option: Getränkeservice */}
        {(() => {
          const checked = selected.includes('Getränkeservice');
          return (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 14, background: checked ? C.burgundy : C.cream, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all .2s" }}>
              <input type="checkbox" checked={checked} onChange={() => toggle('Getränkeservice')} style={{ marginTop: 3, accentColor: C.gold, width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: checked ? C.cream : C.ink, fontSize: 15 }}>Getränkeservice</div>
                <div style={{ fontSize: 13, color: checked ? C.gold : C.cappuccino, marginTop: 2 }}>Auf Anfrage — wir besprechen gemeinsam das passende Getränkeangebot für Ihren Anlass.</div>
                <div style={{ fontSize: 12, color: checked ? C.gold : C.cappuccino, marginTop: 4, fontStyle: 'italic' }}>Preis auf Anfrage</div>
              </div>
            </label>
          );
        })()}
        {zusatzwuensche.map(z => {
          const checked = selected.includes(z.label);
          return (
            <label key={z.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, background: checked ? C.burgundy : C.cream, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all .2s" }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(z.label)} style={{ marginTop: 3, accentColor: C.gold, width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: checked ? C.cream : C.ink, fontSize: 15 }}>{z.label}</div>
                {z.beschreibung && <div style={{ fontSize: 13, color: checked ? C.gold : C.cappuccino, marginTop: 2 }}>{z.beschreibung}</div>}
              </div>
            </label>
          );
        })}
        {zusatzwuensche.length === 0 && (
          <p style={{ color: C.cappuccino, textAlign: "center", padding: "20px 0" }}>Keine Extras verfügbar.</p>
        )}
      </div>
      <button onClick={next} className="mm-btn-press" style={{ ...S.primaryBtn, maxWidth: 400, margin: "32px auto 0", display: "block" }}>
        Weiter zur Anfrage →
      </button>
    </div>
  );
}
