import React, { useEffect, useMemo, useState } from "react";
import { C, S } from "../theme.js";
import { supabase } from "../supabase.js";
import { reportError } from "../errorLog.js";
import { ladeKataloge } from "../angebot/kataloge.js";
import { berechneAngebot, formatPreis } from "../angebot/angebotspreis.js";
import SchrittGerichte from "../angebot/SchrittGerichte.jsx";

/* Klick-Prototyp für den Schritt "Gerichte" (GEN-3). Aufruf: ?prototyp=gerichte
   Liest die Kataloge, speichert nichts. Wird mit GEN-4 durch den echten Ablauf ersetzt. */

const GAESTE = [10, 20, 30, 50, 80];

function Wahlknopf({ an, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={an}
      onClick={onClick}
      className="mm-btn-press"
      style={{
        background: an ? C.burgundy : C.white, color: an ? C.gold : C.inkSoft,
        border: `1.5px solid ${an ? C.burgundy : C.border}`, borderRadius: 999,
        padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export default function PrototypGerichte() {
  const [kataloge, setKataloge] = useState(null);
  const [fehler, setFehler] = useState(false);
  const [essensart, setEssensart] = useState(null);
  const [paketName, setPaketName] = useState("Genuss");
  const [gaeste, setGaeste] = useState(30);
  const [stilSlug, setStilSlug] = useState(null);
  const [auswahl, setAuswahl] = useState({});
  const [plusEins, setPlusEins] = useState({});
  const [gezeigt, setGezeigt] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    ladeKataloge(supabase)
      .then((k) => { setKataloge(k); setEssensart(k.essensarten[0]?.slug ?? null); })
      .catch((e) => { reportError("prototyp_kataloge_laden", e); setFehler(true); });
  }, []);

  const paket = kataloge?.pakete.find((p) => p.essensart === essensart && p.name === paketName)
    ?? kataloge?.pakete.find((p) => p.essensart === essensart) ?? null;
  const bloecke = useMemo(() => (kataloge && paket ? kataloge.bloecke.filter((b) => b.paket_id === paket.id) : []), [kataloge, paket]);
  const stile = useMemo(() => (kataloge ? kataloge.stile.filter((s) => s.essensart === essensart) : []), [kataloge, essensart]);
  const gerichtKarte = useMemo(() => Object.fromEntries((kataloge?.gerichte ?? []).map((g) => [g.id, g])), [kataloge]);

  const wechseln = (neu) => { neu(); setAuswahl({}); setPlusEins({}); setGezeigt(false); };

  if (fehler) {
    return (
      <div style={{ ...S.root, alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 18, color: C.burgundy, maxWidth: 420 }}>
          Die Gerichte konnten nicht geladen werden. Bitte laden Sie die Seite neu. Wenn es dann noch nicht geht, ist die Verbindung zur Datenbank gestört.
        </p>
      </div>
    );
  }
  if (!kataloge || !paket) {
    return <div style={{ ...S.root, alignItems: "center", justifyContent: "center", color: C.cappuccino, fontSize: 18 }}>Lade Menü …</div>;
  }

  const ergebnis = berechneAngebot({ paket, bloecke, gruppen: kataloge.gruppen, gerichte: gerichtKarte, auswahl, plusEins, gaeste });

  return (
    <div style={S.root}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .mm-fade { animation: fadeUp .5s ease-out backwards; }
        .mm-btn-press:active { transform: scale(.97); }
        .mm-leiste { position: sticky; bottom: 0; z-index: 10; }
        @media (max-width: 640px) {
          .mm-hero-title { font-size: 36px !important; } .mm-hero-sub { font-size: 16px !important; }
          .mm-leiste-innen { flex-wrap: nowrap !important; gap: 10px !important; }
          .mm-leiste-innen > div { flex: 0 0 auto !important; }
          .mm-leiste-innen > button { flex: 1 1 auto !important; padding: 12px 10px !important; font-size: 14px !important; }
        }
      `}</style>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={S.logoMain}>Mama Mia</span>
            <span style={S.logoSub}>Events & Catering</span>
          </div>
        </div>
      </header>

      <div style={{ background: C.burgundy, color: C.cream, fontSize: 13, padding: "8px 20px", textAlign: "center" }}>
        Klick-Prototyp · Gerichte aus der Test-Datenbank · es wird nichts gespeichert
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {kataloge.essensarten.map((e) => (
            <Wahlknopf key={e.slug} an={e.slug === essensart} onClick={() => wechseln(() => { setEssensart(e.slug); setStilSlug(null); })}>{e.label}</Wahlknopf>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {kataloge.pakete.filter((p) => p.essensart === essensart).map((p) => (
            <Wahlknopf key={p.id} an={p.id === paket.id} onClick={() => wechseln(() => setPaketName(p.name))}>{p.name}</Wahlknopf>
          ))}
          <label style={{ fontSize: 13, color: C.inkSoft, marginLeft: "auto" }}>
            Gäste{" "}
            <select value={gaeste} onChange={(e) => setGaeste(Number(e.target.value))} style={{ fontFamily: "inherit", fontSize: 13, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white }}>
              {GAESTE.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </div>

      <main style={{ ...S.main, paddingTop: 28, paddingBottom: 24 }}>
        <SchrittGerichte
          key={paket.id}
          paket={paket}
          bloecke={bloecke}
          gruppen={kataloge.gruppen}
          stile={stile}
          gerichte={kataloge.gerichte}
          stilSlug={stilSlug}
          onStil={setStilSlug}
          auswahl={auswahl}
          onAuswahl={setAuswahl}
          plusEins={plusEins}
          onPlusEins={setPlusEins}
        />

        {gezeigt && (
          <div style={{ ...S.menueCard, marginTop: 20 }} aria-live="polite">
            <div style={S.menueCardTitle}>Das würde in der Anfrage stehen</div>
            {bloecke.map((b) => {
              const namen = b.typ === "fix"
                ? [gerichtKarte[b.fix_gericht_id]?.name]
                : (auswahl[b.id] ?? []).map((id) => gerichtKarte[id]?.name);
              if (namen.filter(Boolean).length === 0) return null;
              return (
                <p key={b.id} style={{ margin: "0 0 8px", fontSize: 14, color: C.ink }}>
                  <strong>{b.label}{plusEins[b.id] ? " (+1)" : ""}:</strong> {namen.filter(Boolean).join(", ")}
                </p>
              );
            })}
            <p style={{ margin: "14px 0 0", fontSize: 14, color: C.inkSoft }}>
              {gaeste} Gäste × {formatPreis(ergebnis.proPerson)} = <strong>{formatPreis(ergebnis.speisenGesamt)}</strong> zzgl. Lieferung
            </p>
          </div>
        )}
      </main>

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
            onClick={() => setGezeigt(true)}
            className="mm-btn-press"
            style={{ ...S.primaryBtn, ...(ergebnis.vollstaendig ? {} : S.btnDisabled), width: "auto", flex: "1 1 220px", padding: "14px 20px" }}
          >
            {ergebnis.vollstaendig ? "Weiter →" : "Auswahl vervollständigen"}
          </button>
        </div>
      </div>
    </div>
  );
}
