import React from "react";
import { C, S } from "../theme.js";
import { formatPreis } from "./angebotspreis.js";
import { firmenVorteilBedingungen } from "./firmenVorteil.js";
import { paketMerkmale } from "./paketKarte.js";
import { Betont, useTexte } from "./Sprache.jsx";
import { vorteilBedingungenInSprache } from "./texte.js";

/* Schritt "Paket": die Pakete der gewählten Essensart, dahinter ihr Essensbild. */


/* Mit `kleid` (Aufruf über einen Anlass-Pfad) zeigt der Kopf Bild, Überschrift und Schmuck des Anlasses. */
export default function SchrittPaket({ essensart, pakete, bloecke, gewaehlt, onWahl, schritt, kleid, vorteil }) {
  const t = useTexte();
  const bild = kleid?.bild ?? essensart.bild_url;
  const mitBild = !!bild;
  return (
    <div className="mm-fade">
      <div
        style={mitBild ? {
          ...S.heroBlock,
          marginBottom: 0,
          padding: kleid ? "64px 24px 128px" : "48px 24px 120px",
          borderRadius: 24,
          backgroundImage: `linear-gradient(180deg, rgba(28,16,8,.45) 0%, rgba(28,16,8,.72) 100%), url(${bild})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : S.heroBlock}
      >
        <div style={S.heroEyebrow}>{schritt} · {essensart.label}</div>
        {kleid ? (
          <>
            <h1 style={{ ...S.heroTitle, color: C.cream }} className="mm-hero-title">
              {kleid.ueberschrift[0]} <em style={S.italic}>{kleid.ueberschrift[1]}</em>
            </h1>
            {kleid.schmuck && (
              <img src={kleid.schmuck} alt="" aria-hidden="true" style={{ display: "block", width: 180, maxWidth: "60%", height: "auto", margin: "4px auto 12px" }} />
            )}
            <p style={{ ...S.heroSub, color: C.cream }} className="mm-hero-sub">
              {kleid.unterzeile} {t.paketNachKleid}
            </p>
            {vorteil && (
              <p style={{ ...S.heroSub, color: C.gold, fontSize: 14, fontWeight: 600, margin: "16px auto 0", maxWidth: 520, padding: "10px 14px", borderRadius: 12, background: "rgba(28,16,8,.62)" }}>
                {t.firmenVorteil(vorteil.prozent, vorteilBedingungenInSprache(vorteil, t, firmenVorteilBedingungen))}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 style={{ ...S.heroTitle, ...(mitBild ? { color: C.cream } : {}) }} className="mm-hero-title">
              <Betont text={t.paketTitel} />
            </h1>
            <p style={{ ...S.heroSub, ...(mitBild ? { color: C.cream } : {}) }} className="mm-hero-sub">
              {t.paketSub}
            </p>
          </>
        )}
      </div>

      <div
        style={{ ...S.grid, gridTemplateColumns: `repeat(${pakete.length > 3 ? 4 : 3}, 1fr)`, gap: 20, ...(mitBild ? { marginTop: -80, padding: "0 16px" } : {}) }}
        className={`${pakete.length > 3 ? "mm-grid-4" : "mm-grid-3"} mm-paket-grid`}
      >
        {pakete.map((p, i) => {
          const hervor = !!p.hervorgehoben;
          const merkmale = paketMerkmale(bloecke.filter((b) => b.paket_id === p.id), p, t);
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
                <span style={S.paketPriceUnit}>{t.proPerson}</span>
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
                {t.paketWaehlen(p.name)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
