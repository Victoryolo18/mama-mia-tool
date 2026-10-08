/* Texte der beiden Mails nach einer Anfrage: Bestätigung an den Kunden, Benachrichtigung an Jana.
   Ohne React, ohne Datenbank. Gebaut aus dem Datensatz, der auch gespeichert wird (anfrage.js). */

import { formatPreis } from "./angebotspreis.js";
import { anlassLabel } from "./anlaesse.js";
import { LIEFER_LABELS, istLieferart } from "./lieferung.js";

// Kundeneingaben (Name, Kontakt, Freitext) landen in HTML-Mails. Ohne
// Maskierung koennte jemand ueber das Formular fremdes Markup in die
// Benachrichtigungs-Mail schmuggeln (z.B. gefaelschte Links).
export function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const datumText = (datum) => datum
  ? new Date(datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
  : "Datum offen";

const zeile = (label, wert) => `<p style="margin: 4px 0;"><strong>${label}:</strong> ${wert}</p>`;

/* Gerichtnamen und Bezeichnungen kommen aus dem Katalog, den Jana pflegt. Maskiert werden sie trotzdem. */
function angebotZeilen(request) {
  const s = request.angebot_snapshot;
  const anlass = anlassLabel(request.anlass);
  const aufpreise = s.aufpreise.map((a) => `${esc(a.label)} (+ ${formatPreis(a.pro_person)} p. P.)`).join(", ");
  return [
    zeile("Essensart", esc(s.essensart.label)),
    s.stil ? zeile("Stil", esc(s.stil.label)) : "",
    zeile("Paket", `${esc(s.paket.name)} (${formatPreis(s.paket.preis_pro_person)} p. P.)`),
    aufpreise ? zeile("Extras", aufpreise) : "",
    anlass ? zeile("Anlass", esc(anlass)) : "",
  ].join("");
}

/** Bestätigung an den Kunden. */
export function kundenMail(request) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1008;">
      <div style="text-align: center; padding: 32px 0; border-bottom: 2px solid #E8DCC4;">
        <h1 style="font-family: Georgia, serif; font-size: 32px; color: #C9A84C; font-style: italic; margin: 0;">Mama Mia</h1>
        <p style="color: #A88968; margin: 4px 0 0; letter-spacing: 2px; text-transform: uppercase; font-size: 11px;">Events &amp; Catering</p>
      </div>
      <h2 style="color: #5C2818; font-family: Georgia, serif;">Vielen Dank für Ihre Anfrage!</h2>
      <p>Liebe/r ${esc(request.customer_name) || "Gast"},</p>
      <p>Ihre Anfrage <strong>${esc(request.request_number)}</strong> ist bei mir eingegangen. Ich melde mich innerhalb von <strong>24 Stunden</strong> persönlich bei Ihnen.</p>
      <div style="background: #FEF8E0; border-left: 4px solid #C9A84C; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
        <h3 style="margin: 0 0 12px; color: #5C2818;">Ihre Anfrage</h3>
        ${angebotZeilen(request)}
        ${zeile("Datum", datumText(request.event_datum))}
        ${zeile("Gäste", `${request.gaeste} Personen`)}
      </div>
      <p>Bei Rückfragen erreichen Sie mich unter:<br>
      📞 <a href="tel:01739344723" style="color: #5C2818;">0173 9344723</a><br>
      ✉️ <a href="mailto:info@mama-mia-events.de" style="color: #5C2818;">info@mama-mia-events.de</a></p>
      <p style="margin-top: 32px;">Herzliche Grüße,<br><em style="color: #C9A84C; font-family: Georgia, serif;">Jana Ketelhohn</em></p>
      <div style="border-top: 1px solid #E8DCC4; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #A88968; text-align: center;">
        Mama Mia Events &amp; Catering · Eichenallee 20, 16767 Leegebruch
      </div>
    </div>
  `;
  return { subject: `Ihre Anfrage bei Mama Mia (${request.request_number})`, html };
}

/** Benachrichtigung an Jana. `jetzt` nur für Tests einstellbar. */
export function janaMail(request, jetzt = new Date()) {
  const alleExtras = (request.zusatzwuensche || "").split("\n").filter(Boolean);
  const hatGetraenkeservice = alleExtras.includes("Getränkeservice");
  const sonstigeZusatzwuensche = alleExtras.filter((e) => e !== "Getränkeservice").join("\n");
  const kontaktInfo = request.customer_email
    ? `E-Mail: <a href="mailto:${encodeURIComponent(request.customer_email)}">${esc(request.customer_email)}</a>`
    : `Telefon: <a href="tel:${encodeURIComponent(request.customer_phone)}">${esc(request.customer_phone)}</a>`;
  const lieferungOffen = request.lieferzuschlag == null && istLieferart(request.lieferung);

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1008;">
      <h2 style="color: #5C2818;">🔔 Neue Anfrage über die Webseite</h2>
      <p><strong>${esc(request.request_number)}</strong> · ${jetzt.toLocaleString("de-DE")}</p>
      <div style="background: #FEF8E0; padding: 16px 20px; margin: 16px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px; color: #5C2818;">Kunde</h3>
        ${zeile("Name", esc(request.customer_name) || "—")}
        ${zeile("Bevorzugt", esc(request.customer_contact_preference))}
        <p style="margin: 4px 0;">${kontaktInfo}</p>
      </div>
      <div style="background: #FEF8E0; padding: 16px 20px; margin: 16px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px; color: #5C2818;">Event</h3>
        ${angebotZeilen(request)}
        ${zeile("Gäste", request.gaeste)}
        ${zeile("Datum", datumText(request.event_datum))}
        ${zeile("Ort", `${esc(request.plz) || "—"}${request.ortsteil ? ` ${esc(request.ortsteil)}` : ""} (${LIEFER_LABELS[request.lieferung] || esc(request.lieferung)})`)}
        ${zeile("Geschätzter Preis", `${formatPreis(request.gesamtpreis)}${lieferungOffen ? ' <span style="color: #B00020;">(zzgl. Lieferung — PLZ nicht im Liefergebiet hinterlegt, Preis auf Anfrage)</span>' : ""}`)}
        ${hatGetraenkeservice ? zeile("Getränkeservice", "Ja") : ""}
      </div>
      ${sonstigeZusatzwuensche ? `
      <div style="background: #FFF3E0; border-left: 4px solid #E07B00; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
        <strong>Zusatzwünsche:</strong> ${esc(sonstigeZusatzwuensche)}
      </div>` : ""}
      <p style="margin-top: 32px; font-size: 13px; color: #A88968;">
        Direkt im CRM ansehen: <a href="https://mama-mia-crm.vercel.app/anfragen" style="color: #5C2818;">CRM öffnen</a> (neueste Anfrage steht oben)
      </p>
    </div>
  `;
  const betreff = `🔔 Neue Anfrage: ${String(request.customer_name || "Anonym").slice(0, 60)} — ${request.angebot_snapshot.essensart.label} ${request.paket}`;
  return { subject: betreff, html };
}
