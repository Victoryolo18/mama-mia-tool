/* Mails nach einer Anfrage aus dem Generator, mit Sprache (I18N-3).

   Jana bekommt immer die deutsche Mail aus mail.js; dort steht die Sprache des Kunden als eigene Zeile.
   Der Kunde bekommt die Bestätigung in seiner Sprache: auf Deutsch wie bisher aus mail.js, auf Englisch
   und Russisch von hier, mit den Namen aus dem übersetzten Katalog. Ohne React, ohne Datenbank. */

import { esc, janaMail, kundenMail } from "./mail.js";
import { sendeMail } from "./mailversand.js";
import { formatPreis } from "./angebotspreis.js";
import { MWST_PROZENT } from "./mwst.js";
import { datumInSprache } from "./texte.js";

const zeile = (label, wert) => `<p style="margin: 4px 0;"><strong>${label}:</strong> ${wert}</p>`;

/** Bestätigung an den Kunden auf Englisch oder Russisch.
    `anzeige`: { t, essensart, stil, paket, aufpreise } in der Sprache des Kunden (aus dem Generator). */
export function kundenMailInSprache(request, { t, essensart, stil, paket, aufpreise = [] }) {
  const m = t.mail;
  const snapshot = request.angebot_snapshot ?? {};
  const vorteil = snapshot.firmen_vorteil;
  const firma = [request.firma_name, request.firma_adresse].filter(Boolean).map((x) => esc(String(x).replace(/\s*\n\s*/g, ", "))).join(", ");
  const extras = aufpreise.map((a) => `${esc(a.label)} (+ ${formatPreis(a.proPerson)} ${t.pP})`).join(", ");
  const anlass = request.anlass ? t.anlass[request.anlass] : null;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1008;">
      <div style="text-align: center; padding: 32px 0; border-bottom: 2px solid #E8DCC4;">
        <h1 style="font-family: Georgia, serif; font-size: 32px; color: #C9A84C; font-style: italic; margin: 0;">Mama Mia</h1>
        <p style="color: #A88968; margin: 4px 0 0; letter-spacing: 2px; text-transform: uppercase; font-size: 11px;">Events &amp; Catering</p>
      </div>
      <h2 style="color: #5C2818; font-family: Georgia, serif;">${m.danke}</h2>
      <p>${m.anrede(esc(request.customer_name))}</p>
      <p>${m.eingegangen(`<strong>${esc(request.request_number)}</strong>`)}</p>
      <div style="background: #FEF8E0; border-left: 4px solid #C9A84C; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
        <h3 style="margin: 0 0 12px; color: #5C2818;">${t.ihreAnfrage}</h3>
        ${zeile(t.zeile.essensart, esc(essensart?.label))}
        ${stil ? zeile(t.zeile.stil, esc(stil.label)) : ""}
        ${zeile(t.zeile.paket, `${esc(paket?.name)} (${formatPreis(snapshot.paket?.preis_pro_person)} ${t.pP})`)}
        ${extras ? zeile(t.extras, extras) : ""}
        ${anlass ? zeile(t.zeile.anlass, esc(anlass)) : ""}
        ${zeile(t.zeile.datum, datumInSprache(request.event_datum, t))}
        ${zeile(t.zeile.gaeste, t.personen(request.gaeste))}
        ${request.firma_name ? zeile(m.rechnungAn, firma) : ""}
        ${vorteil ? zeile(m.vorteil, m.vorteilText(vorteil.prozent, formatPreis(vorteil.betrag))) : ""}
        ${snapshot.lieferung_inklusive ? zeile(m.lieferung, m.lieferungInklusive(esc(paket?.name))) : ""}
        ${zeile(m.preis, m.preisText(formatPreis(request.gesamtpreis), MWST_PROZENT))}
      </div>
      <p>${m.rueckfragen}<br>
      📞 <a href="tel:01739344723" style="color: #5C2818;">0173 9344723</a><br>
      ✉️ <a href="mailto:info@mama-mia-events.de" style="color: #5C2818;">info@mama-mia-events.de</a></p>
      <p style="margin-top: 32px;">${m.gruesse}<br><em style="color: #C9A84C; font-family: Georgia, serif;">Jana Ketelhohn</em></p>
      <div style="border-top: 1px solid #E8DCC4; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #A88968; text-align: center;">
        Mama Mia Events &amp; Catering · Eichenallee 20, 16767 Leegebruch
      </div>
    </div>
  `;
  return { subject: m.betreff(request.request_number), html };
}

/** Erst Jana (deutsch), dann die Bestätigung an den Kunden, falls er eine E-Mail-Adresse angegeben hat. */
export async function sendeAnfrageMails(request, anzeige) {
  await sendeMail({ to: "info@mama-mia-events.de", ...janaMail(request), type: "jana_notification" });
  if (!request.customer_email) return;
  const mail = anzeige.t.sprache === "de" ? kundenMail(request) : kundenMailInSprache(request, anzeige);
  await sendeMail({ to: request.customer_email, ...mail, type: "customer_confirmation" });
}
