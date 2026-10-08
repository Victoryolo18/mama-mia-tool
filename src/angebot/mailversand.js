import { kundenMail, janaMail } from "./mail.js";

/* Verschickt die beiden Mails über die Edge Function `send-email` (dort liegt die Mengengrenze).
   Wirft bei einem Fehler; der Aufrufer meldet ihn, die Anfrage selbst ist dann schon gespeichert. */
export async function sendeMails(request) {
  const adresse = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

  async function senden(payload) {
    const res = await fetch(adresse, {
      method: "POST",
      headers: { "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Edge Function ${res.status}: ${txt}`);
    }
  }

  // Erst Jana: Scheitert die Bestätigung an den Kunden (etwa an einer vertippten Adresse), weiß sie trotzdem Bescheid.
  await senden({ to: "info@mama-mia-events.de", ...janaMail(request), type: "jana_notification" });
  // Bestätigung an den Kunden — nur wenn eine E-Mail-Adresse bekannt ist
  if (request.customer_email) {
    await senden({ to: request.customer_email, ...kundenMail(request), type: "customer_confirmation" });
  }
}
