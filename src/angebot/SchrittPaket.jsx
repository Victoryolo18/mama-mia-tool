import React from "react";
import { C, S } from "../theme.js";
import { formatPreis } from "./angebotspreis.js";

/* Schritt "Paket": die Pakete der gewählten Essensart, dahinter ihr Essensbild. */

/** Was ein Paket enthält, als Zeilen für die Karte: erst die Wahl, dann Inklusive, dann was es auf Wunsch dazu gibt. */
export function paketMerkmale(bloecke) {
  const text = (b) => b.typ === "fix" ? `${b.label} inklusive`
    : b.typ === "zusatz" ? `${b.label} auf Wunsch`
    : `${b.max_auswahl}× ${b.label}`;
  return ["wahl", "fix", "zusatz"].flatMap((typ) => bloecke.filter((b) => b.typ === typ).map(text));
}

export default function SchrittPaket({ essensart, pakete, bloecke, gewaehlt, onWahl, schritt }) {
  const mitBild = !!essensart.bild_url;
  return (
    <div className="mm-fade">
      <div
        style={mitBild ? {
          ...S.heroBlock,
          marginBottom: 0,
          padding: "48px 24px 120px",
          borderRadius: 24,
          backgroundImage: `linear-gradient(180deg, rgba(28,16,8,.45) 0%, rgba(28,16,8,.72) 100%), url(${essensart.bild_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : S.heroBlock}
      >
        <div style={S.heroEyebrow}>{schritt} · {essensart.label}</div>
        <h1 style={{ ...S.heroTitle, ...(mitBild ? { color: C.cream } : {}) }} className="mm-hero-title">
          Welches <em style={S.italic}>Paket</em> passt zu Ihnen?
        </h1>
        <p style={{ ...S.heroSub, ...(mitBild ? { color: C.cream } : {}) }} className="mm-hero-sub">
          Alle Pakete sind individuell anpassbar — ein guter Ausgangspunkt.
        </p>
      </div>

      <div
        style={{ ...S.grid, gridTemplateColumns: "repeat(3, 1fr)", gap: 20, ...(mitBild ? { marginTop: -80, padding: "0 16px" } : {}) }}
        className="mm-grid-3 mm-paket-grid"
      >
        {pakete.map((p, i) => {
          const hervor = !!p.hervorgehoben;
          const merkmale = paketMerkmale(bloecke.filter((b) => b.paket_id === p.id));
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={gewaehlt === p.id}
              onClick={() => onWahl(p.id)}
              className="mm-card-hover mm-btn-press mm-fade"
              style={{
                ...S.paketCard,
                ...(hervor ? S.paketCardFeatured : {}),
                ...(gewaehlt === p.id ? S.paketCardActive : {}),
                animationDelay: `${i * 80}ms`,
              }}
            >
              {p.hinweis && (
                <div style={{
                  ...S.paketBadge,
                  background: hervor ? C.gold : C.cappuccino,
                  color: hervor ? C.burgundy : C.white,
                }}>
                  {p.hinweis}
                </div>
              )}
              <div style={{ ...S.paketName, color: hervor ? C.gold : C.burgundy }}>
                {p.name}
              </div>
              {p.untertitel && <div style={S.paketTagline}>{p.untertitel}</div>}

              <div style={S.paketPriceWrap}>
                <span style={S.paketPrice}>{formatPreis(p.preis_pro_person)}</span>
                <span style={S.paketPriceUnit}>pro Person</span>
              </div>

              <div style={S.divider} />

              <ul style={S.paketFeatures}>
                {merkmale.map((m) => (
                  <li key={m} style={S.paketFeatureItem}>
                    <span style={S.checkmark}>✓</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>

              <div style={{
                ...S.paketCta,
                background: hervor ? C.gold : C.burgundy,
                color: hervor ? C.burgundy : C.cream,
              }}>
                {p.name} wählen →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
