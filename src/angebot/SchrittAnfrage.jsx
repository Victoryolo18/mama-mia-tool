import React, { useEffect, useState } from "react";
import { C, S } from "../theme.js";
import { formatPreis } from "./angebotspreis.js";
import { anlassLabel } from "./anlaesse.js";
import { LIEFER_LABELS, istLieferart } from "./lieferung.js";
import { FIRMA_GRENZEN, firmaAbfrage, pruefeFirmaEingabe } from "./firmenVorteil.js";
import { ladePlzOrte, orteZurPlz, ortZurPlz } from "./plzOrte.js";
import { reportError } from "../errorLog.js";
import { MWST_PROZENT, mwstAus } from "./mwst.js";
import { Betont, useTexte } from "./Sprache.jsx";
import { datumInSprache, firmaFehlerInSprache } from "./texte.js";
import { lokal } from "./sprache.js";

/* ── 📞 KONTAKT-METHODEN (Bezeichnung und Platzhalter in texte.js) ── */
export const KONTAKT_OPTIONEN = [
  { id: "telefon",  icon: "📞" },
  { id: "whatsapp", icon: "💬" },
  { id: "email",    icon: "✉️" },
];

/* Schritt "Anfrage": Zusammenfassung links, Kontakt rechts.
   Rechnet nichts selbst: `ergebnis` ist dasselbe Ergebnis, das auch gespeichert wird. */
export default function SchrittAnfrage({ data, update, onSubmit, submitting, schritt, essensart, paket, stil, bloecke, gerichte, ergebnis, lieferInfo, sendeFehler, regel = null, zusatzwuensche = [] }) {
  const t = useTexte();
  // Extras sind mit dem deutschen Namen gemerkt; angezeigt werden sie in der Sprache des Kunden.
  const extrasAnzeige = Object.fromEntries(zusatzwuensche.map((z) => [z.label, lokal(z, "label", t.sprache)]));
  // Gibt es den Firmen-Vorteil, ist die Firma Pflicht; bei anderen Firmenanlässen und der Weihnachtsfeier freiwillig.
  // Eingetipptes muss stimmen.
  const firmaArt = firmaAbfrage(data, regel);
  // Die Postleitzahlen kommen erst, wenn die Firmenfelder erscheinen; bis dahin gilt: fünf Ziffern.
  const [plzOrte, setPlzOrte] = useState(null);
  useEffect(() => {
    if (!firmaArt) return undefined;
    let aktuell = true;
    ladePlzOrte().then((k) => { if (aktuell) setPlzOrte(k); }).catch((e) => reportError("plz_orte_laden", e));
    return () => { aktuell = false; };
  }, [!!firmaArt]);
  const firmaPruefung = firmaArt ? pruefeFirmaEingabe(data.firma, plzOrte) : { wert: null };
  const firmaBegonnen = ["name", "strasse", "nr", "plz", "ort", "ust_id"].some((n) => String(data.firma[n] ?? "").trim());
  const firmaOk = !firmaPruefung.fehler && (firmaArt !== "pflicht" || !!firmaPruefung.wert);
  const canSubmit = data.name.trim().length >= 2 && data.kontaktdaten.trim().length >= 5 && firmaOk;
  const setFirma = (feld, wert) => update("firma", { ...data.firma, [feld]: wert });
  // Postleitzahl eintippen: Gibt es genau einen Ort, steht er im Feld; bei mehreren wählt der Kunde.
  const setPlz = (plz) => {
    const ort = ortZurPlz(plzOrte, plz, data.firma.ort);
    update("firma", { ...data.firma, plz, ...(ort !== undefined ? { ort } : {}) });
  };
  const orte = orteZurPlz(plzOrte, data.firma.plz) ?? [];
  // Mehrere Orte zur PLZ: Die Liste geht unter dem Feld von selbst auf, bis ein Ort gewählt ist (Victor, 20.10.2026).
  const [ortListeZu, setOrtListeZu] = useState(false);
  const ortGewaehlt = orte.includes(String(data.firma.ort ?? "").trim());
  const ortListe = orte.length > 1 && !ortGewaehlt && !ortListeZu
    ? orte.filter((o) => o.toLowerCase().startsWith(String(data.firma.ort ?? "").trim().toLowerCase()))
    : [];
  const steuer = mwstAus(ergebnis.gesamt);
  const istLieferung = istLieferart(data.lieferung);
  const lieferzoneUnbekannt = istLieferung && !lieferInfo.bekannt;
  const gaeste = Number(data.gaeste) || 0;
  const malGaeste = (proPerson) => Math.round(proPerson * 100) * gaeste / 100;
  const auswahl = bloecke
    .filter((b) => b.typ !== "fix")
    .map((b) => ({ id: b.id, label: b.label, namen: (data.auswahl[b.id] ?? []).map((id) => gerichte[id]?.name).filter(Boolean) }))
    .filter((b) => b.namen.length > 0);

  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>{schritt}</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          <Betont text={t.fastGeschafft} />
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          {t.wieMelden}
        </p>
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: "1.1fr 1fr", gap: 24 }} className="mm-grid-2">
        {/* Linke Seite: Zusammenfassung */}
        <div style={S.summaryCard} className="mm-summary-card">
          <div style={S.summaryTitle}>{t.ihreAnfrage}</div>

          <SummaryRow label={t.zeile.essensart} value={essensart.label} />
          {stil && <SummaryRow label={t.zeile.stil} value={stil.label} />}
          <SummaryRow label={t.zeile.paket} value={paket.name} />
          {anlassLabel(data.anlass) && <SummaryRow label={t.zeile.anlass} value={t.anlass[data.anlass] ?? anlassLabel(data.anlass)} />}
          <SummaryRow label={t.zeile.gaeste} value={t.personen(Number(data.gaeste) || 0)} />
          <SummaryRow label={t.zeile.datum} value={datumInSprache(data.datum, t)} />
          {data.uhrzeit && <SummaryRow label={t.zeile.lieferzeit} value={t.uhrzeit(data.uhrzeit)} />}
          <SummaryRow label={t.zeile.ort} value={`${data.plz} (${t.liefer[data.lieferung] || LIEFER_LABELS[data.lieferung] || data.lieferung})`} />

          {/* Menü-Auswahl */}
          {auswahl.length > 0 && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>{t.ihreAuswahl}</div>
              {/* Je Rubrik eine Zeile mit dem Namen, darunter ein Gericht pro Zeile: Nebeneinander
                  brachen lange Gerichtnamen auf dem Handy mitten im Namen um. */}
              {auswahl.map((b) => (
                <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.cream}15` }}>
                  <div style={{ ...S.summaryLabel, marginBottom: 4 }}>{b.label}</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {b.namen.map((name) => (
                      <li key={name} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "2px 0", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                        <span style={{ color: C.gold, flexShrink: 0 }} aria-hidden="true">•</span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {/* Extras / Zusatzwünsche aus DB */}
          {data.extras && data.extras.length > 0 && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>{t.extras} <span style={{ fontSize: 11, color: C.cappuccino, fontWeight: 400 }}>{t.preisAufAnfrageKlammer}</span></div>
              {data.extras.map(e => (
                <div key={e} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0" }}>
                  <span style={{ color: C.gold, flexShrink: 0 }}>+</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.cream }}>{e === "Getränkeservice" ? t.getraenke : (extrasAnzeige[e] ?? e)}</span>
                </div>
              ))}
            </>
          )}

          {/* Freie Anmerkungen */}
          {data.zusatzwuensche && data.zusatzwuensche.trim() && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>{t.anmerkungen}</div>
              <div style={S.summaryNotiz}>{data.zusatzwuensche}</div>
            </>
          )}

          <div style={S.summaryDivider} />

          {/* Aufschlüsselung: Speisen + Aufpreise + Lieferung */}
          <div style={S.summaryBreakdown}>
            <div style={S.summaryBreakdownRow}>
              <span style={S.summaryBreakdownLabel}>
                {t.speisen(formatPreis(ergebnis.paketProPerson), data.gaeste)}
              </span>
              <span style={S.summaryBreakdownValue}>{formatPreis(malGaeste(ergebnis.paketProPerson))}</span>
            </div>
            {ergebnis.aufpreise.map((a) => (
              <div key={`${a.blockId}-${a.gerichtId ?? "plus"}`} style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>{t.malGaeste(a.label, formatPreis(a.proPerson), data.gaeste)}</span>
                <span style={S.summaryBreakdownValue}>{formatPreis(malGaeste(a.proPerson))}</span>
              </div>
            ))}
            {istLieferung && (
              <div style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>{t.liefer[data.lieferung] || t.liefer.lieferung}</span>
                <span style={S.summaryBreakdownValue}>
                  {lieferzoneUnbekannt
                    ? t.aufAnfrage
                    : ergebnis.lieferzuschlag === 0
                      ? (paket.lieferung_inklusive ? t.inklusiveKlein : t.kostenlos)
                      : formatPreis(ergebnis.lieferzuschlag)
                  }
                </span>
              </div>
            )}
            {/* Unter der Lieferung, damit man sieht: Der Gesamtpreis darunter ist schon reduziert. */}
            {ergebnis.firmenVorteil && (
              <div style={S.summaryBreakdownRow}>
                <span style={{ ...S.summaryBreakdownLabel, color: C.gold, opacity: 1, fontWeight: 700 }}>{t.vorteilZeile(ergebnis.firmenVorteil.prozent)}</span>
                <span style={{ ...S.summaryBreakdownValue, color: C.gold, fontWeight: 700 }}>−{formatPreis(ergebnis.firmenVorteil.betrag)}</span>
              </div>
            )}
          </div>

          <div style={S.summaryPriceRow}>
            <div>
              <div style={S.summaryPriceLabel}>{t.gesamtpreis}</div>
              {lieferzoneUnbekannt && (
                <div style={S.summaryPriceSmall}>{t.zzglLieferung}</div>
              )}
              <div style={S.summaryPriceSmall}>{t.mwst(MWST_PROZENT, formatPreis(steuer.mwst))}</div>
              {firmaArt && <div style={S.summaryPriceSmall}>{t.netto(formatPreis(steuer.netto))}</div>}
            </div>
            <div style={S.summaryPriceBig}>{formatPreis(ergebnis.gesamt)}</div>
          </div>

          <div style={S.summaryNote}>
            {t.schaetzung}
          </div>

        </div>

        {/* Rechte Seite: Kontaktformular */}
        <div style={S.formCard} className="mm-form-card">
          {/* Name */}
          <div style={S.field}>
            <label style={S.label}>{t.ihrName} <span style={{ color: C.gold, fontSize: 11 }}>*</span></label>
            <input
              type="text"
              value={data.name}
              onChange={e => update("name", e.target.value)}
              placeholder={t.namePlatzhalter}
              maxLength={100}
              style={S.input}
              className="mm-input"
            />
          </div>

          {/* Kontaktart */}
          <div style={S.field}>
            <label style={S.label}>{t.kontaktFrage}</label>
            <div style={S.kontaktGroup}>
              {KONTAKT_OPTIONEN.map(opt => {
                const active = data.kontaktart === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("kontaktart", opt.id)}
                    className="mm-btn-press"
                    style={{ ...S.kontaktBtn, ...(active ? S.kontaktBtnActive : {}) }}
                  >
                    <div style={S.kontaktIcon}>{opt.icon}</div>
                    <div style={S.kontaktLabel}>{t.kontakt[opt.id].label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kontaktdaten */}
          <div style={S.field}>
            <label style={S.label}>
              {t.kontakt[data.kontaktart]?.label}
            </label>
            <input
              type={data.kontaktart === "email" ? "email" : "tel"}
              value={data.kontaktdaten}
              onChange={e => update("kontaktdaten", e.target.value)}
              placeholder={t.kontakt[data.kontaktart]?.platzhalter}
              maxLength={150}
              style={S.input}
              className="mm-input"
            />
          </div>

          {/* Firma: Pflicht, sobald es den Firmen-Vorteil gibt; sonst bei Firmenanlässen und der Weihnachtsfeier freiwillig. */}
          {firmaArt && (
            <fieldset style={{ ...S.field, border: "none", padding: 0, margin: 0 }}>
              <legend style={{ ...S.label, padding: 0 }}>
                {t.rechnungFirma}{" "}
                {firmaArt === "pflicht"
                  ? <span style={{ color: C.gold, fontSize: 11 }}>*</span>
                  : <span style={{ fontWeight: 400, color: C.cappuccino, fontSize: 13 }}>{t.optionalKlammer}</span>}
              </legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="text"
                  aria-label={t.firmenname}
                  value={data.firma.name}
                  onChange={(e) => setFirma("name", e.target.value)}
                  placeholder={t.firmenname}
                  autoComplete="organization"
                  maxLength={FIRMA_GRENZEN.name}
                  style={S.input}
                  className="mm-input"
                />
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 76px", gap: 8 }}>
                  <input
                    type="text"
                    aria-label={t.strasse}
                    value={data.firma.strasse}
                    onChange={(e) => setFirma("strasse", e.target.value)}
                    placeholder={t.strasse}
                    autoComplete="address-line1"
                    maxLength={120}
                    style={{ ...S.input, minWidth: 0 }}
                    className="mm-input"
                  />
                  <input
                    type="text"
                    aria-label={t.hausnummer}
                    value={data.firma.nr}
                    onChange={(e) => setFirma("nr", e.target.value)}
                    placeholder={t.nr}
                    maxLength={10}
                    style={{ ...S.input, minWidth: 0 }}
                    className="mm-input"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={t.postleitzahl}
                    value={data.firma.plz}
                    onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder={t.plz}
                    autoComplete="postal-code"
                    style={{ ...S.input, minWidth: 0 }}
                    className="mm-input"
                  />
                  <div style={{ position: "relative", minWidth: 0 }}>
                    <input
                      type="text"
                      aria-label={t.ort}
                      value={data.firma.ort}
                      onChange={(e) => { setOrtListeZu(false); setFirma("ort", e.target.value); }}
                      onFocus={() => setOrtListeZu(false)}
                      onKeyDown={(e) => { if (e.key === "Escape") setOrtListeZu(true); }}
                      placeholder={t.ort}
                      autoComplete="address-level2"
                      maxLength={60}
                      aria-expanded={ortListe.length > 0}
                      aria-controls="mm-firma-orte"
                      style={{ ...S.input, width: "100%", minWidth: 0 }}
                      className="mm-input"
                    />
                    {ortListe.length > 0 && (
                      <ul id="mm-firma-orte" role="listbox" aria-label={t.orteZurPlz} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, listStyle: "none", margin: 0, padding: 4, background: C.white, border: `1.5px solid ${C.gold}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(28,16,8,.15)", maxHeight: 220, overflowY: "auto" }}>
                        {ortListe.map((o) => (
                          <li key={o} role="option" aria-selected="false">
                            <button type="button" onClick={() => { setFirma("ort", o); setOrtListeZu(true); }} className="mm-btn-press"
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderRadius: 8, background: "transparent", font: "inherit", fontSize: 15, color: C.ink, cursor: "pointer" }}>
                              {o}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  aria-label={t.ustIdAria}
                  value={data.firma.ust_id}
                  onChange={(e) => setFirma("ust_id", e.target.value)}
                  placeholder={t.ustId}
                  maxLength={FIRMA_GRENZEN.ust_id}
                  style={S.input}
                  className="mm-input"
                />
              </div>
              {firmaPruefung.fehler && firmaBegonnen && (
                <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6, lineHeight: 1.45 }}>{firmaFehlerInSprache(firmaPruefung.fehler, t)}</div>
              )}
            </fieldset>
          )}

          {/* Notizen */}
          <div style={S.field}>
            <label style={S.label}>{t.anmerkungenOptional}</label>
            <textarea
              value={data.notizen}
              onChange={e => update("notizen", e.target.value)}
              placeholder={t.notizPlatzhalter}
              rows={3}
              maxLength={2000}
              style={{ ...S.input, resize: "vertical", fontFamily: "inherit" }}
              className="mm-input"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="mm-btn-press"
            style={{
              ...S.primaryBtn,
              ...(canSubmit && !submitting ? {} : S.btnDisabled),
            }}
          >
            {submitting ? t.wirdGesendet : t.absenden}
          </button>

          {sendeFehler && (
            <div role="alert" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, border: "1.5px solid #C0392B", color: "#C0392B", fontSize: 14, lineHeight: 1.45 }}>
              {t.sendeFehler} <a href="tel:01739344723" style={{ color: "#C0392B", fontWeight: 700 }}>0173 9344723</a>.
            </div>
          )}

          <div style={S.privacyNote}>
            {t.einwilligung}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hilfs-Komponente: Summary-Zeile ── */
function SummaryRow({ label, value }) {
  return (
    <div style={S.summaryRow}>
      <span style={S.summaryLabel}>{label}</span>
      <span style={S.summaryValue}>{value || "—"}</span>
    </div>
  );
}
