import React, { useState, useEffect, useMemo } from "react";
import { reportError } from "./errorLog.js";
import { supabase } from "./supabase.js";
import { C, S } from "./theme.js";
import { ladeKataloge } from "./angebot/kataloge.js";
import { aktiverStil, berechneAngebot } from "./angebot/angebotspreis.js";
import { lieferpreis } from "./angebot/lieferung.js";
import { vorwahlAusLink } from "./angebot/anlaesse.js";
import { baueAnfrage } from "./angebot/anfrage.js";
import { sendeMails } from "./angebot/mailversand.js";
import SchrittEssensart from "./angebot/SchrittEssensart.jsx";
import SchrittPaket from "./angebot/SchrittPaket.jsx";
import SchrittGerichte from "./angebot/SchrittGerichte.jsx";
import SchrittDetails from "./angebot/SchrittDetails.jsx";
import SchrittExtras from "./angebot/SchrittExtras.jsx";
import SchrittAnfrage, { KONTAKT_OPTIONEN } from "./angebot/SchrittAnfrage.jsx";
import Preisleiste from "./angebot/Preisleiste.jsx";

/* ════════════════════════════════════════════════════════════════
   MAMA MIA EVENTS & CATERING — ANGEBOTSGENERATOR
   ════════════════════════════════════════════════════════════════

   Ablauf: Essensart → Paket → Gerichte → Details → Extras → Anfrage.
   Diese Datei hält den Zustand und führt durch die Schritte. Die Schritte,
   das Rechnen und das Speichern liegen unter `src/angebot/`.

   Pakete, Preise, Gerichte, Stile und Aufpreise kommen aus der Datenbank
   (Kataloge nach Essensart) und werden im CRM gepflegt.

   Aufruf von der Website: `?essensart=buffet | fingerfood | fruehstueck`
   wählt die Essensart vor und überspringt den ersten Schritt.
   ══════════════════════════════════════════════════════════════════ */

const SCHRITTE = ["Essensart", "Paket", "Menü", "Details", "Extras", "Anfrage"];
const GRENZE_ORTE = 1000;

/* Lieferzonen, Orte und Zusatzwünsche. Fällt eine der drei Listen aus, läuft der Generator
   weiter: ohne Zonen heißt der Lieferpreis "auf Anfrage", ohne Ortsliste rechnen die alten
   PLZ-Listen — lieber ein grober Preis als gar keiner. Der Ausfall wird gemeldet. */
async function ladeListe(name, abfrage) {
  const { data, error } = await abfrage;
  if (error) {
    reportError(`laden_${name}`, error);
    return [];
  }
  return data || [];
}

export default function MamaMiaAngebotsgenerator() {
  /* ── State ── */
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    essensart: null,
    paketId: null,
    stil: null,
    auswahl: {},
    plusEins: {},
    gaeste: '',
    datum: "",
    uhrzeit: "",
    plz: "",
    ortsteil: "",
    lieferung: "",
    extras: [],
    zusatzwuensche: "",
    kontaktart: "whatsapp",
    kontaktdaten: "",
    name: "",
    notizen: "",
    anlass: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendeFehler, setSendeFehler] = useState(false);
  const [angebotsId, setAngebotsId] = useState(null);

  /* ── DB-State ── */
  const [kataloge,         setKataloge]         = useState(null);
  const [ladeFehler,       setLadeFehler]       = useState(false);
  const [dbLieferzonen,    setDbLieferzonen]    = useState([]);
  const [dbLieferorte,     setDbLieferorte]     = useState([]);
  const [dbZusatzwuensche, setDbZusatzwuensche] = useState([]);

  /* ── Fonts laden ── */
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  /* ── Beim Start: Kataloge, Lieferzonen, Zusatzwünsche; danach die Vorwahl aus dem Link ── */
  useEffect(() => {
    let aktuell = true;
    async function init() {
      const [kat, zonen, orte, zusatz] = await Promise.all([
        ladeKataloge(supabase),
        ladeListe("lieferzonen", supabase.from("lieferzonen").select("*").eq("aktiv", true).order("reihenfolge").limit(100)),
        ladeListe("lieferorte", supabase.from("lieferorte").select("*").eq("aktiv", true).limit(GRENZE_ORTE)),
        ladeListe("zusatzwuensche", supabase.from("zusatzwuensche").select("*").eq("aktiv", true).order("reihenfolge").limit(100)),
      ]);
      if (!aktuell) return;
      if (orte.length >= GRENZE_ORTE) reportError("laden_lieferorte", new Error(`Ortsliste hat ${GRENZE_ORTE} oder mehr Zeilen; die Abfrage braucht Seiten.`));
      setDbLieferzonen(zonen);
      setDbLieferorte(orte);
      setDbZusatzwuensche(zusatz);
      const vorwahl = vorwahlAusLink(window.location.search, kat.essensarten);
      setData(d => ({ ...d, essensart: vorwahl.essensart, anlass: vorwahl.anlass }));
      if (vorwahl.essensart) setStep(2);
      setKataloge(kat);
    }
    init().catch((e) => {
      reportError("kataloge_laden", e);
      if (aktuell) setLadeFehler(true);
    });
    return () => { aktuell = false; };
  }, []);

  /* Jeder Schritt beginnt oben: Die Gerichte-Seite ist lang, die Stil-Kacheln stehen an ihrem Anfang. */
  useEffect(() => { window.scrollTo(0, 0); }, [step, submitted]);

  /* ── Helper ── */
  const update = (key, value) => setData(d => ({ ...d, [key]: value }));
  const next = () => setStep(s => Math.min(s + 1, SCHRITTE.length));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const schritt = `Schritt ${step} von ${SCHRITTE.length}`;

  /* Die Blöcke gehören zum Paket, die Pakete zur Essensart: Wer wechselt, wählt die Gerichte neu.
     Derselbe Klick noch einmal lässt die Auswahl stehen. */
  const waehleEssensart = (slug) => {
    setData(d => d.essensart === slug ? d : { ...d, essensart: slug, paketId: null, stil: null, auswahl: {}, plusEins: {} });
    setTimeout(next, 200);
  };
  const waehlePaket = (id) => {
    setData(d => d.paketId === id ? d : { ...d, paketId: id, auswahl: {}, plusEins: {} });
    setTimeout(next, 250);
  };

  /* ── Abgeleitet aus Katalog und Auswahl ── */
  const essensart = kataloge?.essensarten.find(e => e.slug === data.essensart) ?? null;
  const paket = kataloge?.pakete.find(p => p.id === data.paketId && p.essensart === data.essensart) ?? null;
  const pakete = useMemo(() => (kataloge?.pakete ?? []).filter(p => p.essensart === data.essensart), [kataloge, data.essensart]);
  const bloecke = useMemo(() => (kataloge?.bloecke ?? []).filter(b => b.paket_id === data.paketId), [kataloge, data.paketId]);
  const stile = useMemo(() => (kataloge?.stile ?? []).filter(s => s.essensart === data.essensart), [kataloge, data.essensart]);
  const gerichtKarte = useMemo(() => Object.fromEntries((kataloge?.gerichte ?? []).map(g => [g.id, g])), [kataloge]);
  const stil = aktiverStil(stile, data.stil);

  /* Ein Preis für alle Schritte: Was hier herauskommt, zeigt die Leiste, die Zusammenfassung
     und die Mail, und genau das wird gespeichert. */
  const liefer = lieferpreis(data, dbLieferzonen, dbLieferorte);
  const ergebnis = paket
    ? berechneAngebot({
        paket, bloecke, gruppen: kataloge.gruppen, gerichte: gerichtKarte,
        auswahl: data.auswahl, plusEins: data.plusEins, gaeste: data.gaeste, lieferzuschlag: liefer.zuschlag,
      })
    : null;

  /* ── Submit (Supabase + E-Mail) ── */
  async function handleSubmit() {
    setSubmitting(true);
    setSendeFehler(false);

    try {
      const { data: requestNumber, error: numErr } = await supabase.rpc("generate_request_number");
      if (numErr) throw numErr;

      const anfrage = baueAnfrage({ requestNumber, data, essensart, paket, stil, bloecke, gerichte: gerichtKarte, ergebnis });
      const { error: insertErr } = await supabase.from("requests").insert(anfrage);
      if (insertErr) throw insertErr;
      setAngebotsId(requestNumber);

      // E-Mails versenden (Fehler hier blockieren das Submit nicht: die Anfrage ist gespeichert)
      try {
        await sendeMails(anfrage);
      } catch (emailErr) {
        reportError("send_email", emailErr, { request_number: requestNumber });
      }

      setSubmitted(true);
    } catch (err) {
      reportError("submit_request", err, { code: err.code, hint: err.hint });
      setSendeFehler(true);
    } finally {
      setSubmitting(false);
    }
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  if (ladeFehler) return (
    <div style={{ ...S.root, alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <p style={{ fontSize: 18, color: C.burgundy, maxWidth: 460, lineHeight: 1.5 }}>
        Das Angebot konnte gerade nicht geladen werden. Bitte laden Sie die Seite neu.
        Klappt es weiterhin nicht, erreichen Sie mich unter{" "}
        <a href="tel:01739344723" style={{ color: C.burgundy, fontWeight: 700 }}>0173 9344723</a>.
      </p>
    </div>
  );

  if (!kataloge) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", color: "#A88968", fontSize: 18 }}>
      Lade Mama Mia …
    </div>
  );

  /* Ohne Essensart gibt es keine Pakete, ohne Paket keine Gerichte. */
  const sichtbar = !essensart ? 1 : !paket ? Math.min(step, 2) : step;

  return (
    <div style={S.root}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mm-fade { animation: fadeUp .5s ease-out backwards; }
        .mm-card-hover { transition: all .25s cubic-bezier(.2,.8,.2,1); }
        .mm-card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(92,40,24,.15); }
        .mm-btn-press:active { transform: scale(.97); }
        .mm-input:focus { outline: none; border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.gold}33; }
        .mm-leiste { position: sticky; bottom: 0; z-index: 10; }
        @media (min-width: 641px) {
          .mm-summary-card { position: sticky; top: 100px; }
        }
        @media (max-width: 640px) {
          .mm-grid-2 { grid-template-columns: 1fr !important; }
          .mm-grid-3 { grid-template-columns: 1fr !important; }
          .mm-paket-grid { padding: 0 !important; }
          .mm-hero-title { font-size: 36px !important; }
          .mm-hero-sub   { font-size: 16px !important; }
          .mm-stepper    { font-size: 11px !important; }
          .mm-summary-card { order: 1; }
          .mm-form-card    { order: 2; }
          .mm-leiste-innen { flex-wrap: nowrap !important; gap: 10px !important; }
          .mm-leiste-innen > div { flex: 0 0 auto !important; }
          .mm-leiste-innen > button { flex: 1 1 auto !important; padding: 12px 10px !important; font-size: 14px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={S.logoMain}>Mama Mia</span>
            <span style={S.logoSub}>Events & Catering</span>
          </div>
          {!submitted && sichtbar > 1 && (
            <button onClick={prev} style={S.backBtn} className="mm-btn-press">
              ← Zurück
            </button>
          )}
        </div>
      </header>

      {/* Stepper */}
      {!submitted && (
        <div style={S.stepperWrap}>
          <div style={S.stepper} className="mm-stepper">
            {SCHRITTE.map((label, i) => {
              const num = i + 1;
              const active = sichtbar === num;
              const done   = sichtbar > num;
              return (
                <div key={label} style={S.stepItem}>
                  <div style={{
                    ...S.stepCircle,
                    ...(active ? S.stepCircleActive : {}),
                    ...(done   ? S.stepCircleDone   : {}),
                  }}>
                    {done ? "✓" : num}
                  </div>
                  <div style={{
                    ...S.stepLabel,
                    color: active ? C.burgundy : C.cappuccino,
                    fontWeight: active ? 700 : 500,
                  }}>{label}</div>
                  {i < SCHRITTE.length - 1 && (
                    <div style={{
                      ...S.stepLine,
                      background: done ? C.gold : C.border,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <main style={S.main}>
        {submitted ? (
          <SuccessScreen angebotsId={angebotsId} kontaktart={data.kontaktart} />
        ) : (
          <>
            {sichtbar === 1 && (
              <SchrittEssensart
                essensarten={kataloge.essensarten}
                gewaehlt={data.essensart}
                onWahl={waehleEssensart}
                schritt={schritt}
              />
            )}
            {sichtbar === 2 && (
              <SchrittPaket
                essensart={essensart}
                pakete={pakete}
                bloecke={kataloge.bloecke}
                gewaehlt={data.paketId}
                onWahl={waehlePaket}
                schritt={schritt}
              />
            )}
            {sichtbar === 3 && (
              <SchrittGerichte
                paket={paket}
                bloecke={bloecke}
                gruppen={kataloge.gruppen}
                stile={stile}
                gerichte={kataloge.gerichte}
                stilSlug={data.stil}
                onStil={(slug) => update("stil", slug)}
                auswahl={data.auswahl}
                onAuswahl={(auswahl) => update("auswahl", auswahl)}
                plusEins={data.plusEins}
                onPlusEins={(plusEins) => update("plusEins", plusEins)}
                schritt={schritt}
              >
                <div style={{ ...S.menueKategorie, marginTop: 24, paddingTop: 24, borderTop: `2px dashed ${C.border}` }}>
                  <label style={S.menueKatLabel} htmlFor="mm-anmerkungen">Anmerkungen (optional)</label>
                  <textarea
                    id="mm-anmerkungen"
                    value={data.zusatzwuensche}
                    onChange={e => update("zusatzwuensche", e.target.value)}
                    placeholder="Allergien, Vegetarier, besondere Wünsche…"
                    rows={3}
                    maxLength={2000}
                    style={{ ...S.input, resize: "vertical", fontFamily: "inherit", marginTop: 8 }}
                    className="mm-input"
                  />
                </div>
              </SchrittGerichte>
            )}
            {sichtbar === 4 && (
              <SchrittDetails
                data={data}
                update={update}
                next={next}
                schritt={schritt}
                mindestpersonen={essensart.mindestpersonen ?? 8}
                dbLieferzonen={dbLieferzonen}
                dbLieferorte={dbLieferorte}
              />
            )}
            {sichtbar === 5 && (
              <SchrittExtras
                data={data}
                update={update}
                next={next}
                schritt={schritt}
                zusatzwuensche={dbZusatzwuensche}
              />
            )}
            {sichtbar === 6 && (
              <SchrittAnfrage
                data={data}
                update={update}
                onSubmit={handleSubmit}
                submitting={submitting}
                schritt={schritt}
                essensart={essensart}
                paket={paket}
                stil={stil}
                bloecke={bloecke}
                gerichte={gerichtKarte}
                ergebnis={ergebnis}
                lieferInfo={liefer.info}
                sendeFehler={sendeFehler}
              />
            )}
          </>
        )}
      </main>

      {!submitted && sichtbar === 3 && (
        <Preisleiste paket={paket} ergebnis={ergebnis} onWeiter={next} />
      )}

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerText}>
          © {new Date().getFullYear()} Mama Mia Events &amp; Catering · Jana Ketelhohn · Leegebruch
          {' · '}
          <a href="https://mama-mia-events.de/impressum" target="_blank" rel="noopener noreferrer" style={S.footerLink}>Impressum</a>
          {' · '}
          <a href="https://mama-mia-events.de/agb" target="_blank" rel="noopener noreferrer" style={S.footerLink}>AGB</a>
          {' · '}
          <a href="https://mama-mia-events.de/datenschutz" target="_blank" rel="noopener noreferrer" style={S.footerLink}>Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ERFOLGSSEITE
   ══════════════════════════════════════════════════════════════════ */
function SuccessScreen({ angebotsId, kontaktart }) {
  const kontaktLabel = KONTAKT_OPTIONEN.find(k => k.id === kontaktart)?.label;
  return (
    <div className="mm-fade" style={S.successWrap}>
      <div style={S.successCard}>
        <div style={S.successIcon}>✓</div>
        <h1 style={S.successTitle}>
          <em style={S.italic}>Vielen Dank!</em>
        </h1>
        <p style={S.successText}>
          Ihre Anfrage ist bei mir eingegangen. Ich melde mich innerhalb von <strong>24 Stunden</strong> persönlich
          per <strong>{kontaktLabel}</strong> bei Ihnen.
        </p>

        <div style={S.successIdBox}>
          <div style={S.successIdLabel}>Ihre Anfrage-Nummer</div>
          <div style={S.successIdNumber}>{angebotsId}</div>
        </div>

        <p style={S.successFooter}>
          Mit Vorfreude auf Ihr Event,<br />
          <em style={S.italic}>Jana Ketelhohn</em>
        </p>

        <a href="/" style={S.successBackLink}>← Zurück zur Startseite</a>
      </div>
    </div>
  );
}
