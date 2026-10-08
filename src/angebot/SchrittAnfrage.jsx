import React from "react";
import { C, S } from "../theme.js";
import { formatPreis } from "./angebotspreis.js";
import { ANLAESSE } from "./anlaesse.js";
import { LIEFER_LABELS, istLieferart } from "./lieferung.js";

/* ── 📞 KONTAKT-METHODEN ── */
export const KONTAKT_OPTIONEN = [
  { id: "telefon",  label: "Telefon",  icon: "📞", placeholder: "z.B. 0176 12345678" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬", placeholder: "z.B. 0176 12345678" },
  { id: "email",    label: "E-Mail",   icon: "✉️", placeholder: "ihre@email.de" },
];

/* Schritt "Anfrage": Zusammenfassung links, Kontakt rechts.
   Rechnet nichts selbst: `ergebnis` ist dasselbe Ergebnis, das auch gespeichert wird. */
export default function SchrittAnfrage({ data, update, onSubmit, submitting, schritt, essensart, paket, stil, bloecke, gerichte, ergebnis, lieferInfo, sendeFehler }) {
  const canSubmit = data.name.trim().length >= 2 && data.kontaktdaten.trim().length >= 5;
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
          <em style={S.italic}>Fast geschafft!</em>
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Wie darf ich mich bei Ihnen melden?
        </p>
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: "1.1fr 1fr", gap: 24 }} className="mm-grid-2">
        {/* Linke Seite: Zusammenfassung */}
        <div style={S.summaryCard} className="mm-summary-card">
          <div style={S.summaryTitle}>Ihre Anfrage</div>

          <SummaryRow label="Essensart" value={essensart.label} />
          {stil && <SummaryRow label="Stil" value={stil.label} />}
          <SummaryRow label="Paket"    value={paket.name} />
          <SummaryRow label="Gäste"    value={`${data.gaeste} Personen`} />
          <SummaryRow label="Datum"    value={data.datum ? new Date(data.datum).toLocaleDateString("de-DE", { day:"2-digit", month:"long", year:"numeric" }) : "—"} />
          {data.uhrzeit && <SummaryRow label="Lieferzeit" value={`${data.uhrzeit} Uhr`} />}
          <SummaryRow label="Ort"      value={`${data.plz} (${LIEFER_LABELS[data.lieferung] || data.lieferung})`} />

          {/* Menü-Auswahl */}
          {auswahl.length > 0 && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>Ihre Auswahl</div>
              {auswahl.map((b) => <SummaryRow key={b.id} label={b.label} value={b.namen.join(", ")} />)}
            </>
          )}

          {/* Extras / Zusatzwünsche aus DB */}
          {data.extras && data.extras.length > 0 && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>Extras <span style={{ fontSize: 11, color: C.cappuccino, fontWeight: 400 }}>(Preis auf Anfrage)</span></div>
              {data.extras.map(e => (
                <div key={e} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0" }}>
                  <span style={{ color: C.gold, flexShrink: 0 }}>+</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.cream }}>{e}</span>
                </div>
              ))}
            </>
          )}

          {/* Freie Anmerkungen */}
          {data.zusatzwuensche && data.zusatzwuensche.trim() && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>Anmerkungen</div>
              <div style={S.summaryNotiz}>{data.zusatzwuensche}</div>
            </>
          )}

          <div style={S.summaryDivider} />

          {/* Aufschlüsselung: Speisen + Aufpreise + Lieferung */}
          <div style={S.summaryBreakdown}>
            <div style={S.summaryBreakdownRow}>
              <span style={S.summaryBreakdownLabel}>
                Speisen ({formatPreis(ergebnis.paketProPerson)} × {data.gaeste})
              </span>
              <span style={S.summaryBreakdownValue}>{formatPreis(malGaeste(ergebnis.paketProPerson))}</span>
            </div>
            {ergebnis.aufpreise.map((a) => (
              <div key={`${a.blockId}-${a.gerichtId ?? "plus"}`} style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>{a.label} ({formatPreis(a.proPerson)} × {data.gaeste})</span>
                <span style={S.summaryBreakdownValue}>{formatPreis(malGaeste(a.proPerson))}</span>
              </div>
            ))}
            {istLieferung && (
              <div style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>{LIEFER_LABELS[data.lieferung] || "Lieferung"}</span>
                <span style={S.summaryBreakdownValue}>
                  {lieferzoneUnbekannt
                    ? "auf Anfrage"
                    : ergebnis.lieferzuschlag === 0
                      ? "kostenlos"
                      : formatPreis(ergebnis.lieferzuschlag)
                  }
                </span>
              </div>
            )}
          </div>

          <div style={S.summaryPriceRow}>
            <div>
              <div style={S.summaryPriceLabel}>Geschätzter Gesamtpreis</div>
              {lieferzoneUnbekannt && (
                <div style={S.summaryPriceSmall}>zzgl. Liefergebühr</div>
              )}
            </div>
            <div style={S.summaryPriceBig}>{formatPreis(ergebnis.gesamt)}</div>
          </div>

          <div style={S.summaryNote}>
            * Unverbindliche Schätzung. Endpreis nach individueller Beratung.
            Eigene Zusatzwünsche oder besondere Komponenten können den Preis leicht beeinflussen.
          </div>
        </div>

        {/* Rechte Seite: Kontaktformular */}
        <div style={S.formCard} className="mm-form-card">
          {/* Name */}
          <div style={S.field}>
            <label style={S.label}>Ihr Name <span style={{ color: C.gold, fontSize: 11 }}>*</span></label>
            <input
              type="text"
              value={data.name}
              onChange={e => update("name", e.target.value)}
              placeholder="Vor- und Nachname"
              maxLength={100}
              style={S.input}
              className="mm-input"
            />
          </div>

          {/* Kontaktart */}
          <div style={S.field}>
            <label style={S.label}>Wie möchten Sie kontaktiert werden?</label>
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
                    <div style={S.kontaktLabel}>{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kontaktdaten */}
          <div style={S.field}>
            <label style={S.label}>
              {KONTAKT_OPTIONEN.find(k => k.id === data.kontaktart)?.label}
            </label>
            <input
              type={data.kontaktart === "email" ? "email" : "tel"}
              value={data.kontaktdaten}
              onChange={e => update("kontaktdaten", e.target.value)}
              placeholder={KONTAKT_OPTIONEN.find(k => k.id === data.kontaktart)?.placeholder}
              maxLength={150}
              style={S.input}
              className="mm-input"
            />
          </div>

          {/* Anlass — freiwillig */}
          <div style={S.field}>
            <label style={S.label} htmlFor="mm-anlass">Anlass <span style={{ fontWeight: 400, color: C.cappuccino, fontSize: 13 }}>— optional</span></label>
            <select
              id="mm-anlass"
              value={data.anlass || ""}
              onChange={e => update("anlass", e.target.value || null)}
              style={{ ...S.input, cursor: "pointer" }}
              className="mm-input"
            >
              <option value="">Keine Angabe</option>
              {ANLAESSE.map(a => <option key={a.slug} value={a.slug}>{a.label}</option>)}
            </select>
          </div>

          {/* Notizen */}
          <div style={S.field}>
            <label style={S.label}>Anmerkungen (optional)</label>
            <textarea
              value={data.notizen}
              onChange={e => update("notizen", e.target.value)}
              placeholder="Wünsche, Allergien, besondere Anlässe…"
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
            {submitting ? "Wird gesendet..." : "Anfrage absenden →"}
          </button>

          {sendeFehler && (
            <div role="alert" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, border: "1.5px solid #C0392B", color: "#C0392B", fontSize: 14, lineHeight: 1.45 }}>
              Ihre Anfrage konnte nicht gesendet werden. Ihre Angaben sind noch da — bitte versuchen Sie es in einem Moment noch einmal.
              Klappt es weiterhin nicht, erreichen Sie mich unter <a href="tel:01739344723" style={{ color: "#C0392B", fontWeight: 700 }}>0173 9344723</a>.
            </div>
          )}

          <div style={S.privacyNote}>
            Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten zur Bearbeitung Ihrer Anfrage zu.
            Es entstehen keine Kosten und keine Verpflichtungen.
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
