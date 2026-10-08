import React, { useState } from "react";
import { C, S } from "../theme.js";
import {
  blockErfuellt, formatPreis, gerichteFuerBlock, maxAuswahl, plusEinsPreis, zusatzPreis,
} from "./angebotspreis.js";

/* Schritt "Gerichte": Stil-Kacheln oben, darunter die Blöcke des Pakets.
   Hält selbst keine Auswahl; die liegt beim Aufrufer, damit der Preis überall derselbe ist. */

const UNTERGRUPPEN = [
  ["suppen", "Suppen"], ["platten", "Platten"], ["haeppchen", "Häppchen"],
  ["fleisch", "Fleisch"], ["fisch", "Fisch"], ["auflauf", "Aufläufe"], ["vegetarisch_oder_pasta", "Vegetarisch & Pasta"],
];
const AB_SO_VIELEN_EINKLAPPEN = 6;

function Kostform({ gericht }) {
  const stil = { fontSize: 16, lineHeight: 1, marginRight: 5, flexShrink: 0 };
  if (gericht.vegetarisch) return <span title="Vegetarisch" style={stil}>🌱</span>;
  if (gericht.unterkategorie === "fisch") return <span title="Fisch" style={stil}>🐟</span>;
  return <span title="Fleisch" style={stil}>🍖</span>;
}

function nachUntergruppe(gerichte) {
  const teile = UNTERGRUPPEN
    .map(([key, label]) => ({ key, label, gerichte: gerichte.filter((g) => g.unterkategorie === key) }))
    .filter((t) => t.gerichte.length > 0);
  const rest = gerichte.filter((g) => !UNTERGRUPPEN.some(([key]) => key === g.unterkategorie));
  if (rest.length > 0) teile.push({ key: "", label: teile.length > 0 ? "Weitere" : "", gerichte: rest });
  return teile;
}

function Haken({ an, rund }) {
  if (rund) {
    return (
      <span style={{ ...S.menueRadio, ...(an ? S.menueRadioActive : {}) }}>
        {an && <span style={S.menueRadioInner} />}
      </span>
    );
  }
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 4, border: `2px solid ${an ? C.gold : C.border}`,
      background: an ? C.gold : "transparent", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.burgundy,
    }}>
      {an && "✓"}
    </span>
  );
}

function GerichtKnopf({ gericht, an, gesperrt, rund, preis, onClick }) {
  return (
    <button
      type="button"
      role={rund ? "radio" : "checkbox"}
      aria-checked={an}
      disabled={gesperrt}
      onClick={onClick}
      className="mm-btn-press"
      style={{
        ...S.menueWahlBtn,
        ...(an ? S.menueWahlBtnActive : {}),
        ...(gesperrt ? { opacity: 0.4, cursor: "not-allowed" } : {}),
      }}
    >
      <Haken an={an} rund={rund} />
      <span style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        <Kostform gericht={gericht} />
        {gericht.name}
      </span>
      {preis !== undefined && (
        <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>+ {formatPreis(preis)}</span>
      )}
    </button>
  );
}

function StilLeiste({ stile, gewaehlt, onWahl }) {
  return (
    <div className="mm-stil-leiste" role="radiogroup" aria-label="Stil wählen">
      {stile.map((s) => {
        const an = s.slug === gewaehlt.slug;
        return (
          <button
            key={s.slug}
            type="button"
            role="radio"
            aria-checked={an}
            onClick={() => onWahl(s.slug)}
            className="mm-stil mm-btn-press"
            style={{
              background: C.white,
              border: `3px solid ${an ? C.gold : C.border}`,
              boxShadow: an ? `0 6px 18px ${C.gold}55` : "0 2px 8px rgba(28,16,8,.04)",
              borderRadius: 14, padding: 0, overflow: "hidden", cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", position: "relative", transition: "all .2s",
            }}
          >
            <span style={{
              display: "block", width: "100%", aspectRatio: "4 / 3",
              backgroundColor: C.creamSoft,
              backgroundImage: s.bild_url ? `url(${s.bild_url})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            {an && (
              <span aria-hidden="true" style={{
                position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%",
                background: C.gold, color: C.burgundy, fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✓</span>
            )}
            <span style={{
              padding: "8px 6px", fontSize: 12, lineHeight: 1.25, textAlign: "center", width: "100%",
              fontWeight: an ? 700 : 600, color: an ? C.burgundy : C.inkSoft,
            }}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SchrittGerichte({
  paket, bloecke, gruppen, stile, gerichte,
  stilSlug, onStil, auswahl, onAuswahl, plusEins, onPlusEins,
}) {
  const [offen, setOffen] = useState({});
  const stil = stile.find((s) => s.slug === stilSlug) ?? stile.find((s) => s.zeigt_alles) ?? null;
  const wahlGruppen = bloecke.filter((b) => b.typ === "wahl").flatMap((b) => b.gruppen);
  const feste = bloecke.filter((b) => b.typ === "fix");

  const setzen = (block, ids) => onAuswahl({ ...auswahl, [block.id]: ids });
  const umschalten = (block, id, max) => {
    const jetzt = auswahl[block.id] ?? [];
    if (jetzt.includes(id)) return setzen(block, jetzt.filter((x) => x !== id));
    if (max === 1) return setzen(block, [id]);
    if (jetzt.length < max) setzen(block, [...jetzt, id]);
  };
  const plusUmschalten = (block) => {
    const an = !plusEins[block.id];
    onPlusEins({ ...plusEins, [block.id]: an });
    // "+1" zurücknehmen heißt auch: das überzählige Gericht fällt wieder heraus.
    if (!an) setzen(block, (auswahl[block.id] ?? []).slice(0, block.max_auswahl));
  };

  const stimmung = stil ? [stil.bild_url_1, stil.bild_url_2, stil.bild_url_3].filter(Boolean) : [];

  return (
    <div className="mm-fade">
      <style>{`
        .mm-dish-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .mm-stil-leiste { display: grid; grid-template-columns: repeat(auto-fit, minmax(78px, 1fr)); gap: 8px; max-width: 720px; margin: 0 auto 14px; }
        @media (max-width: 640px) {
          .mm-dish-grid { grid-template-columns: 1fr !important; }
          .mm-stil-leiste { display: flex; overflow-x: auto; scroll-snap-type: x proximity; padding: 4px 20px 12px; margin: 0 -20px 6px; -webkit-overflow-scrolling: touch; }
          .mm-stil { flex: 0 0 108px; scroll-snap-align: start; }
        }
      `}</style>

      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>{paket.name} · {formatPreis(paket.preis_pro_person)} pro Person</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Ihr <em style={S.italic}>Menü</em>
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          {stile.length > 1
            ? "Wählen Sie eine Richtung oder stellen Sie frei zusammen."
            : "Stellen Sie Ihre Lieblings-Komponenten zusammen."}
        </p>
      </div>

      {stile.length > 1 && stil && (
        <>
          <StilLeiste stile={stile} gewaehlt={stil} onWahl={onStil} />
          <p style={{ textAlign: "center", fontSize: 14, color: C.cappuccino, margin: "0 auto 22px", maxWidth: 720, minHeight: 20 }}>
            {stil.beschreibung}
          </p>
        </>
      )}

      {stimmung.length > 0 && (
        <div style={S.menueBilder}>
          {stimmung.map((url) => (
            <div key={url} style={{ ...S.menueBild, backgroundImage: `url(${url})` }} />
          ))}
        </div>
      )}

      <div style={S.menueCard}>
        <div style={S.menueCardTitle}>Ihre Komponenten</div>

        {feste.length > 0 && (
          <div style={{ ...S.menueKategorie, borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4CAF50", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
              Inklusive
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {feste.map((block) => {
                const gericht = gerichte.find((g) => g.id === block.fix_gericht_id);
                return (
                  <div key={block.id} style={{
                    display: "flex", alignItems: "center", gap: 10, background: C.creamSoft,
                    border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
                  }}>
                    <span style={{ color: "#4CAF50", fontSize: 16, flexShrink: 0, fontWeight: 700 }}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.inkSoft }}>{block.label}</div>
                      {gericht && gericht.name !== block.label && (
                        <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 2 }}>{gericht.name}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {bloecke.filter((b) => b.typ !== "fix").map((block) => {
          const gewaehlt = auswahl[block.id] ?? [];
          const mitPlus = !!plusEins[block.id];
          const liste = gerichteFuerBlock(block, gerichte, { stil, gewaehlt, gruppen, wahlGruppen });
          if (liste.length === 0) return null;
          const max = maxAuswahl(block, mitPlus);
          const erfuellt = blockErfuellt(block, gewaehlt, mitPlus);
          const zusatz = block.typ === "zusatz";
          const rund = max === 1;
          const plusPreis = plusEinsPreis(block, gruppen);
          const eingeklappt = zusatz && liste.length > AB_SO_VIELEN_EINKLAPPEN && !offen[block.id];
          const summe = zusatz
            ? gewaehlt.reduce((s, id) => s + Math.round((zusatzPreis(block, gerichte.find((g) => g.id === id), gruppen) ?? 0) * 100), 0) / 100
            : 0;
          const abPreis = zusatz ? Math.min(...liste.map((g) => zusatzPreis(block, g, gruppen))) : null;
          const fehlen = Math.max(0, block.min_auswahl + (mitPlus ? 1 : 0) - gewaehlt.length);

          return (
            <div
              key={block.id}
              role="group"
              aria-label={block.label}
              style={{
                ...S.menueKategorie,
                ...(zusatz ? { borderTop: `2px dashed ${C.border}`, borderBottom: `2px dashed ${C.border}`, padding: "18px 0", margin: "24px 0" } : {}),
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ ...S.menueKatLabel, marginBottom: 4 }}>{block.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: zusatz ? C.cappuccino : erfuellt ? "#4CAF50" : C.gold }}>
                  {zusatz
                    ? (gewaehlt.length > 0 ? `${gewaehlt.length} gewählt · + ${formatPreis(summe)} p. P.` : "Optional")
                    : rund
                      ? (erfuellt ? "✓ Ausgewählt" : "Bitte wählen")
                      : `${gewaehlt.length} von ${max} ausgewählt`}
                </div>
              </div>

              {zusatz ? (
                <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>
                  {liste.length === 1
                    ? `Auf Wunsch dazu, ${formatPreis(abPreis)} pro Person.`
                    : `Auf Wunsch dazu${Number.isFinite(max) ? (max === 1 ? " (eines)" : ` (bis zu ${max})`) : ""}, ${liste.some((g) => zusatzPreis(block, g, gruppen) !== abPreis) ? "ab " : "je "}${formatPreis(abPreis)} pro Person.`}
                </div>
              ) : !erfuellt && (
                <div style={{ fontSize: 12, color: C.cappuccino, marginBottom: 6 }}>
                  {gewaehlt.length > max
                    ? "Bitte ein Gericht abwählen."
                    : fehlen === 1 ? "Bitte noch ein Gericht wählen." : `Bitte noch ${fehlen} Gerichte wählen.`}
                </div>
              )}

              {eingeklappt ? (
                <button
                  type="button"
                  onClick={() => setOffen({ ...offen, [block.id]: true })}
                  className="mm-btn-press"
                  style={{ background: "transparent", border: `1.5px solid ${C.gold}`, color: C.burgundy, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
                >
                  {gewaehlt.length > 0 ? "Auswahl ändern" : `Alle ${liste.length} ansehen`} ▾
                </button>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {(zusatz ? [{ key: "", label: "", gerichte: liste }] : nachUntergruppe(liste)).map((teil, i, alle) => (
                    <div key={teil.key}>
                      {alle.length > 1 && teil.label && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.cappuccino, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>
                          {teil.label}
                        </div>
                      )}
                      <div className="mm-dish-grid">
                        {teil.gerichte.map((g) => {
                          const an = gewaehlt.includes(g.id);
                          return (
                            <GerichtKnopf
                              key={g.id}
                              gericht={g}
                              an={an}
                              rund={rund && !zusatz}
                              gesperrt={!an && !rund && gewaehlt.length >= max}
                              preis={zusatz ? zusatzPreis(block, g, gruppen) : undefined}
                              onClick={() => umschalten(block, g.id, max)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {zusatz && liste.length > AB_SO_VIELEN_EINKLAPPEN && (
                    <button
                      type="button"
                      onClick={() => setOffen({ ...offen, [block.id]: false })}
                      style={{ marginTop: 10, fontSize: 12, color: C.cappuccino, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
                    >
                      Liste einklappen ▴
                    </button>
                  )}
                </div>
              )}

              {eingeklappt && gewaehlt.length > 0 && (
                <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 8 }}>
                  {gewaehlt.map((id) => gerichte.find((g) => g.id === id)?.name).filter(Boolean).join(", ")}
                </div>
              )}

              {plusPreis !== null && !mitPlus && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>Optional</div>
                  <button
                    type="button"
                    onClick={() => plusUmschalten(block)}
                    className="mm-btn-press"
                    style={{ background: "transparent", border: `1.5px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    + 1 {gruppen[block.gruppen[0]].label_einzahl} · {formatPreis(plusPreis)} p. P.
                  </button>
                </div>
              )}
              {plusPreis !== null && mitPlus && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.gold, fontStyle: "italic" }}>
                  ✓ +1 {gruppen[block.gruppen[0]].label_einzahl} ({formatPreis(plusPreis)} p. P.) hinzugefügt
                  <button
                    type="button"
                    onClick={() => plusUmschalten(block)}
                    style={{ marginLeft: 8, fontSize: 11, color: C.cappuccino, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
                  >
                    entfernen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
