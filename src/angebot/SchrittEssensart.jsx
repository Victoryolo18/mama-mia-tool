import React from "react";
import { S } from "../theme.js";

/* Schritt "Essensart": Buffet, Fingerfood oder Frühstück. Karten wie bisher beim Anlass. */
export default function SchrittEssensart({ essensarten, gewaehlt, onWahl, schritt }) {
  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>{schritt}</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Was darf es <em style={S.italic}>sein</em>?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Wählen Sie aus, wofür Sie ein Angebot wünschen.
        </p>
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: "repeat(3, 1fr)" }} className="mm-grid-3">
        {essensarten.map((e, i) => (
          <button
            key={e.slug}
            type="button"
            aria-pressed={gewaehlt === e.slug}
            onClick={() => onWahl(e.slug)}
            className="mm-card-hover mm-btn-press mm-fade"
            style={{
              ...S.anlassCard,
              ...(gewaehlt === e.slug ? S.anlassCardActive : {}),
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div style={{
              ...S.anlassImage,
              backgroundImage: `linear-gradient(180deg, rgba(28,16,8,0) 40%, rgba(28,16,8,.65) 100%)${e.bild_url ? `, url(${e.bild_url})` : ""}`,
            }} />
            <div style={{ ...S.anlassContent, textAlign: "center" }}>
              <div style={{ ...S.anlassLabel, marginBottom: e.beschreibung ? 4 : 0 }}>{e.label}</div>
              {e.beschreibung && <div style={S.anlassDesc}>{e.beschreibung}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
