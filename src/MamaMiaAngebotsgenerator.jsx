import React, { useState, useEffect, useMemo, useRef } from "react";
import { reportError } from "./errorLog.js";
import { supabase } from "./supabase.js";
import { C, S } from "./theme.js";
import { ladeKataloge } from "./angebot/kataloge.js";
import { aktiverStil, berechneAngebot } from "./angebot/angebotspreis.js";
import { lieferpreis } from "./angebot/lieferung.js";
import { vorwahlAusLink } from "./angebot/anlaesse.js";
import { kleidAusPfad } from "./angebot/anlassKleider.js";
import { firmenAnlass, ladeFirmenVorteil, mitFirmenVorteil, vorteilProzent } from "./angebot/firmenVorteil.js";
import { baueAnfrage } from "./angebot/anfrage.js";
import { sendeAnfrageMails } from "./angebot/mailsMehrsprachig.js";
import { katalogeInSprache, spracheAusLink } from "./angebot/sprache.js";
import { texte } from "./angebot/texte.js";
import { Betont, SpracheKontext, useTexte } from "./angebot/Sprache.jsx";
import SchrittEssensart from "./angebot/SchrittEssensart.jsx";
import SchrittPaket from "./angebot/SchrittPaket.jsx";
import SchrittGerichte from "./angebot/SchrittGerichte.jsx";
import SchrittDetails from "./angebot/SchrittDetails.jsx";
import SchrittExtras from "./angebot/SchrittExtras.jsx";
import SchrittAnfrage from "./angebot/SchrittAnfrage.jsx";
import Preisleiste from "./angebot/Preisleiste.jsx";
import { OEFFNEN } from "./einwilligung.js";
import { blockAnker, ersterOffenerBlock } from "./angebot/fehlendes.js";
import { schrittAusVerlauf, verlaufFuer } from "./angebot/verlauf.js";

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
   Sprache: `?lang=en` oder `?lang=ru` zeigt alles auf Englisch bzw. Russisch (texte.js, sprache.js).
   Gespeichert und an Jana geschickt wird trotzdem der deutsche Katalog; die Anfrage merkt sich die Sprache.
   Aufruf mit Anlass-Pfad (`/weihnachtsfeier`, `/weihnachtsfeier/fingerfood`): Anlass und
   Essensart sind vorbelegt, der Schritt "Paket" trägt das Kleid des Anlasses (anlassKleider.js).
   ══════════════════════════════════════════════════════════════════ */

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

/* Startseite der Website in der Sprache des Kunden. */
const STARTSEITE = { de: "https://mama-mia-events.de/", en: "https://mama-mia-events.de/en/", ru: "https://mama-mia-events.de/ru/" };

export default function MamaMiaAngebotsgenerator() {
  /* ── Sprache: steht mit dem Link fest ── */
  const sprache = useMemo(() => spracheAusLink(window.location.search), []);
  const t = useMemo(() => texte(sprache), [sprache]);
  const SCHRITTE = t.schritte;
  useEffect(() => {
    document.documentElement.lang = sprache;
    if (sprache !== "de") document.title = `${t.seitenTitel} · Mama Mia Events & Catering`;
  }, [sprache, t]);

  /* ── State ── */
  const [step, setStep] = useState(1);
  const startRef = useRef(1);
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
    firma: { name: "", strasse: "", nr: "", plz: "", ort: "", ust_id: "" },
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
  const [kleid,            setKleid]            = useState(null);
  // Firmen-Vorteil, wie Jana ihn im CRM eingestellt hat; null: ausgeschaltet oder nicht geladen.
  const [regel,            setRegel]            = useState(null);

  /* ── Beim Start: Kataloge, Lieferzonen, Zusatzwünsche; danach die Vorwahl aus dem Link ── */
  useEffect(() => {
    let aktuell = true;
    // Ohne Regel gibt es keinen Firmen-Vorteil; das Angebot funktioniert trotzdem.
    ladeFirmenVorteil(supabase)
      .then((r) => { if (aktuell) setRegel(r); })
      .catch((e) => reportError("firmen_vorteil_laden", e));
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
      const ausPfad = kleidAusPfad(window.location.pathname, kat.essensarten);
      const vorwahl = ausPfad ?? vorwahlAusLink(window.location.search, kat.essensarten, kat.pakete);
      if (ausPfad) {
        const kleidInSprache = { ...ausPfad.kleid, ...(sprache !== "de" ? t.kleid[ausPfad.anlass] : {}) };
        setKleid(kleidInSprache);
        document.title = `${kleidInSprache.titel} · ${t.angebot} · Mama Mia Events & Catering`;
      }
      setData(d => ({ ...d, essensart: vorwahl.essensart, anlass: vorwahl.anlass, paketId: vorwahl.paketId ?? null }));
      const start = vorwahl.paketId ? 3 : vorwahl.essensart ? 2 : 1;
      startRef.current = start;
      setStep(start);
      window.history.replaceState(verlaufFuer(window.history.state, start), "");
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
  /* Jeder Schritt hat einen Eintrag im Browserverlauf (GEN-28): Die Zurück-Taste des Browsers geht einen
     Schritt zurück statt aus dem Generator heraus, und der Pfeil oben macht dasselbe. */
  const next = () => {
    const n = Math.min(step + 1, SCHRITTE.length);
    if (n === step) return;
    window.history.pushState(verlaufFuer(window.history.state, n), "");
    setStep(n);
  };
  const prev = () => {
    if (step > startRef.current) return window.history.back();
    // Vor dem Schritt, mit dem der Link begann, gibt es keinen Eintrag: Der Start rückt mit.
    const n = Math.max(step - 1, 1);
    startRef.current = n;
    window.history.replaceState(verlaufFuer(window.history.state, n), "");
    setStep(n);
  };
  useEffect(() => {
    const zurueck = (e) => setStep(schrittAusVerlauf(e.state, startRef.current));
    window.addEventListener("popstate", zurueck);
    return () => window.removeEventListener("popstate", zurueck);
  }, []);

  /* "Auswahl vervollständigen" springt zum ersten Teil, in dem noch etwas fehlt (GEN-28). */
  const weiterOderFehlendes = () => {
    if (ergebnis.vollstaendig) return next();
    const offen = ersterOffenerBlock(bloecke, data.auswahl, data.plusEins);
    if (offen) document.getElementById(blockAnker(offen))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const schritt = t.schritt(step, SCHRITTE.length);

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

  /* ── Abgeleitet aus Katalog und Auswahl ──
     Zweimal dasselbe: `kataloge` auf Deutsch zum Rechnen und Speichern, `anzeige` in der Sprache des Kunden.
     Beide haben dieselben IDs; für Deutsch ist `anzeige` derselbe Katalog. */
  const anzeige = useMemo(() => katalogeInSprache(kataloge, sprache), [kataloge, sprache]);
  const auswahlAus = (kat) => {
    if (!kat) return { essensart: null, paket: null, pakete: [], bloecke: [], stile: [], gerichtKarte: {}, stil: null };
    const stile = kat.stile.filter(s => s.essensart === data.essensart);
    return {
      essensart: kat.essensarten.find(e => e.slug === data.essensart) ?? null,
      paket: kat.pakete.find(p => p.id === data.paketId && p.essensart === data.essensart) ?? null,
      pakete: kat.pakete.filter(p => p.essensart === data.essensart),
      bloecke: kat.bloecke.filter(b => b.paket_id === data.paketId),
      stile,
      gerichtKarte: Object.fromEntries(kat.gerichte.map(g => [g.id, g])),
      stil: aktiverStil(stile, data.stil),
    };
  };
  const { essensart, paket, bloecke, gerichtKarte, stil } = useMemo(() => auswahlAus(kataloge), [kataloge, data.essensart, data.paketId, data.stil]);
  const A = useMemo(() => auswahlAus(anzeige), [anzeige, data.essensart, data.paketId, data.stil]);

  /* Ein Preis für alle Schritte: Was hier herauskommt, zeigt die Leiste, die Zusammenfassung
     und die Mail, und genau das wird gespeichert. */
  const liefer = lieferpreis(data, dbLieferzonen, dbLieferorte, paket);
  // Der Firmen-Vorteil ist schon abgezogen, sobald Anlass, Tag und Personenzahl zur Regel passen.
  const rechne = (kat, a) => mitFirmenVorteil(berechneAngebot({
    paket: a.paket, bloecke: a.bloecke, gruppen: kat.gruppen, gerichte: a.gerichtKarte,
    auswahl: data.auswahl, plusEins: data.plusEins, gaeste: data.gaeste, lieferzuschlag: liefer.zuschlag,
  }), vorteilProzent(data, regel));
  const ergebnis = paket ? rechne(kataloge, { paket, bloecke, gerichtKarte }) : null;
  // Dieselben Zahlen, nur die Bezeichnungen der Aufpreise in der Sprache des Kunden.
  const ergebnisAnzeige = paket ? (anzeige === kataloge ? ergebnis : rechne(anzeige, A)) : null;

  /* ── Submit (Supabase + E-Mail) ── */
  async function handleSubmit() {
    setSubmitting(true);
    setSendeFehler(false);

    try {
      const { data: requestNumber, error: numErr } = await supabase.rpc("generate_request_number");
      if (numErr) throw numErr;

      const anfrage = baueAnfrage({ requestNumber, data, essensart, paket, stil, bloecke, gerichte: gerichtKarte, ergebnis, lieferungInklusive: liefer.inklusive, sprache });
      const { error: insertErr } = await supabase.from("requests").insert(anfrage);
      if (insertErr) throw insertErr;
      setAngebotsId(requestNumber);

      // E-Mails versenden (Fehler hier blockieren das Submit nicht: die Anfrage ist gespeichert)
      try {
        await sendeAnfrageMails(anfrage, { t, essensart: A.essensart, stil: A.stil, paket: A.paket, aufpreise: ergebnisAnzeige.aufpreise });
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
        {t.ladeFehler}{" "}
        <a href="tel:01739344723" style={{ color: C.burgundy, fontWeight: 700 }}>0173 9344723</a>.
      </p>
    </div>
  );

  if (!kataloge) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", color: "#A88968", fontSize: 18 }}>
      {t.laden}
    </div>
  );

  /* Ohne Essensart gibt es keine Pakete, ohne Paket keine Gerichte. */
  const sichtbar = !essensart ? 1 : !paket ? Math.min(step, 2) : step;

  return (
    <SpracheKontext.Provider value={t}>
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
        @media (max-width: 960px) {
          .mm-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .mm-grid-2 { grid-template-columns: 1fr !important; }
          .mm-grid-3, .mm-grid-4 { grid-template-columns: 1fr !important; }
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
              {t.zurueck}
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
          <SuccessScreen angebotsId={angebotsId} kontaktart={data.kontaktart} startseite={STARTSEITE[sprache]} />
        ) : (
          <>
            {sichtbar === 1 && (
              <SchrittEssensart
                essensarten={anzeige.essensarten}
                gewaehlt={data.essensart}
                onWahl={waehleEssensart}
                schritt={schritt}
              />
            )}
            {sichtbar === 2 && (
              <SchrittPaket
                essensart={A.essensart}
                pakete={A.pakete}
                bloecke={anzeige.bloecke}
                gewaehlt={data.paketId}
                onWahl={waehlePaket}
                schritt={schritt}
                kleid={kleid}
                vorteil={kleid && firmenAnlass(data.anlass) ? regel : null}
              />
            )}
            {sichtbar === 3 && (
              <SchrittGerichte
                paket={A.paket}
                bloecke={A.bloecke}
                gruppen={anzeige.gruppen}
                stile={A.stile}
                gerichte={anzeige.gerichte}
                stilSlug={data.stil}
                onStil={(slug) => update("stil", slug)}
                auswahl={data.auswahl}
                onAuswahl={(auswahl) => update("auswahl", auswahl)}
                plusEins={data.plusEins}
                onPlusEins={(plusEins) => update("plusEins", plusEins)}
                schritt={schritt}
              >
                <div style={{ ...S.menueKategorie, marginTop: 24, paddingTop: 24, borderTop: `2px dashed ${C.border}` }}>
                  <label style={S.menueKatLabel} htmlFor="mm-anmerkungen">{t.anmerkungenOptional}</label>
                  <textarea
                    id="mm-anmerkungen"
                    value={data.zusatzwuensche}
                    onChange={e => update("zusatzwuensche", e.target.value)}
                    placeholder={t.anmerkungenPlatzhalter}
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
                essensart={A.essensart}
                paket={A.paket}
                stil={A.stil}
                bloecke={A.bloecke}
                gerichte={A.gerichtKarte}
                ergebnis={ergebnisAnzeige}
                lieferInfo={liefer.info}
                sendeFehler={sendeFehler}
                regel={regel}
                zusatzwuensche={dbZusatzwuensche}
              />
            )}
          </>
        )}
      </main>

      {!submitted && sichtbar === 3 && (
        <Preisleiste paket={A.paket} ergebnis={ergebnisAnzeige} onWeiter={weiterOderFehlendes} />
      )}

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerText}>
          © {new Date().getFullYear()} Mama Mia Events &amp; Catering · Jana Ketelhohn · Leegebruch
          {' · '}
          <a href="https://mama-mia-events.de/impressum" target="_blank" rel="noopener noreferrer" style={S.footerLink}>{t.impressum}</a>
          {' · '}
          <a href="https://mama-mia-events.de/agb" target="_blank" rel="noopener noreferrer" style={S.footerLink}>{t.agb}</a>
          {' · '}
          <a href="https://mama-mia-events.de/datenschutz" target="_blank" rel="noopener noreferrer" style={S.footerLink}>{t.datenschutz}</a>
          {t.rechtDeutsch && ` ${t.rechtDeutsch}`}
          {' · '}
          <button type="button" data-einwilligung-oeffnen onClick={() => window.dispatchEvent(new Event(OEFFNEN))} style={S.footerKnopf}>{t.cookieBanner.fussLink}</button>
        </div>
      </footer>
    </div>
    </SpracheKontext.Provider>
  );
}

/* ════════════════════════════════════════════════════════════════
   ERFOLGSSEITE
   ══════════════════════════════════════════════════════════════════ */
function SuccessScreen({ angebotsId, kontaktart, startseite }) {
  const t = useTexte();
  return (
    <div className="mm-fade" style={S.successWrap}>
      <div style={S.successCard}>
        <div style={S.successIcon}>✓</div>
        <h1 style={S.successTitle}>
          <em style={S.italic}>{t.erfolgTitel}</em>
        </h1>
        <p style={S.successText}>
          <Betont text={t.erfolgText(t.kontakt[kontaktart]?.label)} />
        </p>

        <div style={S.successIdBox}>
          <div style={S.successIdLabel}>{t.anfrageNummer}</div>
          <div style={S.successIdNumber}>{angebotsId}</div>
        </div>

        <p style={S.successFooter}>
          {t.gruss}<br />
          <em style={S.italic}>Jana Ketelhohn</em>
        </p>

        <a href={startseite} style={S.successBackLink}>{t.zurStartseite}</a>
      </div>
    </div>
  );
}
