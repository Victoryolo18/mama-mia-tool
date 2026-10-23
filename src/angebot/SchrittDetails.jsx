import React, { useRef } from "react";
import { C, S } from "../theme.js";
import { getLieferzuschlag, getOrtsteile, istLieferart } from "./lieferung.js";
import { ANLAESSE } from "./anlaesse.js";
import { Betont, useTexte } from "./Sprache.jsx";

/* Ganzes Feld klickbar statt nur des winzigen nativen Kalender-/Uhr-Icons:
   Klick öffnet den Picker programmatisch über showPicker() (Fallback: .click()). */
function DateTimeField({ value, onChange, display, icon, type, min, hasValue }) {
  const inputRef = useRef(null);
  const openPicker = () => {
    if (!inputRef.current) return;
    if (inputRef.current.showPicker) {
      try { inputRef.current.showPicker(); } catch { inputRef.current.click(); }
    } else {
      inputRef.current.click();
    }
  };
  return (
    <div
      onClick={openPicker}
      style={{ ...S.input, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: hasValue ? C.ink : C.cappuccino, cursor: 'pointer', position: 'relative', userSelect: 'none' }}
    >
      <span>{display}</span>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%',
          boxSizing: 'border-box', cursor: 'pointer', zIndex: 1 }}
      />
    </div>
  );
}

/* Schritt "Details": Anlass, Gäste, Datum, Lieferung, Postleitzahl.
   Der Anlass ist Pflicht (Victor, 19.10.2026): Er entscheidet über den Firmen-Vorteil. */

/* Bis hierhin rechnet der Generator wie gewohnt. Die Website sagt "bis etwa 120 Gäste, größere Feiern
   auf Anfrage": Darüber bleibt der Preis ein Richtwert, Jana stimmt Menge und Ablauf persönlich ab. */
const GROSSE_FEIER_AB = 120;
const HOECHSTENS = 250;
export default function SchrittDetails({ data, update, next, schritt, mindestpersonen = 8, dbLieferzonen = [], dbLieferorte = [] }) {
  const t = useTexte();
  /* Der Ortsteil bestimmt nur den Lieferpreis. Wer selbst abholt, soll
     nicht danach gefragt werden — und schon gar nicht daran haengenbleiben. */
  const istLieferungGewaehlt = istLieferart(data.lieferung);
  const ortsteilInfo = istLieferungGewaehlt
    ? getOrtsteile(data.plz, dbLieferorte)
    : { mehrdeutig: false, auswahlNoetig: false, orte: [] };
  const ortsteilNoetig = ortsteilInfo.auswahlNoetig && !data.ortsteil;
  const gaesteNum = Number(data.gaeste);
  const gaesteError = data.gaeste !== '' && data.gaeste !== null
    ? gaesteNum < mindestpersonen ? t.mindestbestellung(mindestpersonen)
    : gaesteNum > HOECHSTENS ? t.zuGross
    : null
    : null;
  const gaesteValid = data.gaeste !== '' && data.gaeste !== null && gaesteNum >= mindestpersonen && gaesteNum <= HOECHSTENS;
  const canContinue = !!data.anlass && gaesteValid && data.datum && data.plz && data.lieferung && !ortsteilNoetig;

  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>{schritt}</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          <Betont text={t.detailsTitel} />
        </h1>
      </div>

      <div style={S.formCard}>
        {/* Anlass */}
        <div style={S.field}>
          <label style={S.label} htmlFor="mm-anlass">{t.anlassFrage}</label>
          <select
            id="mm-anlass"
            value={data.anlass || ""}
            onChange={e => update("anlass", e.target.value || null)}
            style={{ ...S.input, cursor: "pointer", color: data.anlass ? C.ink : C.cappuccino }}
            className="mm-input"
          >
            <option value="">{t.bitteAuswaehlen}</option>
            {ANLAESSE.map(a => <option key={a.slug} value={a.slug}>{t.anlass[a.slug] ?? a.label}</option>)}
          </select>
        </div>

        {/* Gästezahl */}
        <div style={S.field}>
          <label style={S.label}>{t.gaesteFrage}</label>
          <input
            type="number"
            min={mindestpersonen}
            max={HOECHSTENS}
            value={data.gaeste ?? ''}
            onChange={e => update("gaeste", e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={t.gaestePlatzhalter}
            style={{ ...S.input, ...(gaesteError ? { borderColor: '#C0392B' } : {}) }}
            className="mm-input"
          />
          {gaesteError
            ? <div style={{ fontSize: 12, color: '#C0392B', marginTop: 4 }}>{gaesteError}</div>
            : gaesteNum > GROSSE_FEIER_AB
              ? <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 4 }}>{t.grosseFeier(GROSSE_FEIER_AB)}</div>
              : <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 4 }}>{t.mindestbestellung(mindestpersonen)}</div>
          }
        </div>

        {/* Datum */}
        <div style={S.field}>
          <label style={S.label}>{t.datumFrage}</label>
          <DateTimeField
            value={data.datum}
            onChange={e => update("datum", e.target.value)}
            display={data.datum ? data.datum.split('-').reverse().join('.') : t.datumFormat}
            icon="📅"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            hasValue={!!data.datum}
          />
        </div>

        {/* Uhrzeit */}
        <div style={S.field}>
          <label style={S.label}>{t.zeitFrage} <span style={{ fontWeight: 400, color: C.cappuccino, fontSize: 13 }}>{t.optionalKlammer}</span></label>
          <DateTimeField
            value={data.uhrzeit}
            onChange={e => update("uhrzeit", e.target.value)}
            display={data.uhrzeit ? t.uhrzeit(data.uhrzeit) : t.zeitFormat}
            icon="🕐"
            type="time"
            hasValue={!!data.uhrzeit}
          />
        </div>

        {/* Lieferung / Abholung */}
        <div style={S.field}>
          <label style={S.label}>{t.erhaltenFrage}</label>
          {(() => {
            const isDelivMode = istLieferart(data.lieferung);
            const zoneInfo = isDelivMode && data.plz?.length === 5
              ? getLieferzuschlag(data.plz, dbLieferzonen, dbLieferorte, data.ortsteil)
              : { zuschlag: null, rueckholungPreis: null, bekannt: false };
            const fmtPreis = (p) => p != null ? (p === 0 ? t.kostenlos : t.plusEuro(p)) : t.preisAufAnfrage;
            if (!isDelivMode) {
              return (
                <div style={S.toggleGroup}>
                  <button type="button" onClick={() => update("lieferung", "selbstabholung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(data.lieferung === "selbstabholung" ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>{t.liefer.selbstabholung}</div>
                    <div style={S.toggleDesc}>{t.selbstabholungDesc}</div>
                  </button>
                  <button type="button" onClick={() => update("lieferung", "nur_anlieferung")} className="mm-btn-press"
                    style={S.toggleBtn}>
                    <div style={S.toggleLabel}>{t.liefer.lieferung}</div>
                    <div style={S.toggleDesc}>{t.lieferungDesc}</div>
                  </button>
                </div>
              );
            }
            return (
              <div>
                <button type="button" onClick={() => update("lieferung", "selbstabholung")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.cappuccino, fontFamily: "inherit", padding: "0 0 10px", display: "flex", alignItems: "center", gap: 4 }}>
                  {t.zurueckAuswahl}
                </button>
                <div style={S.toggleGroup}>
                  <button type="button"
                    onClick={() => update("lieferung", "nur_anlieferung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(["nur_anlieferung", "lieferung"].includes(data.lieferung) ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>{t.lieferSymbol.nur_anlieferung} {t.liefer.nur_anlieferung}</div>
                    <div style={S.toggleDesc}>{zoneInfo.bekannt ? fmtPreis(zoneInfo.zuschlag) : t.plzFuerPreis}</div>
                  </button>
                  <button type="button"
                    onClick={() => update("lieferung", "anlieferung_rueckholung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(data.lieferung === "anlieferung_rueckholung" ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>{t.lieferSymbol.anlieferung_rueckholung} {t.liefer.anlieferung_rueckholung}</div>
                    <div style={S.toggleDesc}>{zoneInfo.bekannt ? fmtPreis(zoneInfo.rueckholungPreis) : t.plzFuerPreis}</div>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* PLZ */}
        <div style={S.field}>
          <label style={S.label}>{t.plzFrage}</label>
          <input
            type="text"
            value={data.plz}
            onChange={e => { update("plz", e.target.value); if (data.ortsteil) update("ortsteil", ""); }}
            placeholder={t.plzPlatzhalter}
            maxLength={5}
            style={S.input}
            className="mm-input"
          />
        </div>

        {/* Ortsteil — sobald unter der Postleitzahl mehrere Orte liegen.
            Ohne diese Frage wuerde Germendorf so viel zahlen wie
            Wensickendorf, obwohl die Fahrt viermal so lange dauert. */}
        {ortsteilInfo.auswahlNoetig && (
          <div style={S.field}>
            <label style={S.label}>{t.ortsteil}</label>
            <select
              value={data.ortsteil || ""}
              onChange={e => update("ortsteil", e.target.value)}
              style={{ ...S.input, cursor: "pointer" }}
              className="mm-input"
            >
              <option value="">{t.bitteAuswaehlen}</option>
              {ortsteilInfo.orte.map(o => (
                <option key={o.id || o.ort} value={o.ort}>{o.ort}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={next}
          disabled={!canContinue}
          className="mm-btn-press"
          style={{
            ...S.primaryBtn,
            ...(canContinue ? {} : S.btnDisabled),
            marginTop: 12,
          }}
        >
          {t.weiterExtras}
        </button>
      </div>
    </div>
  );
}
