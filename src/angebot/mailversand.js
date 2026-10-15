import { kundenMail, janaMail } from "./mail.js";

/* Verschickt Mails über die Edge Function `send-email` (dort liegt die Mengengrenze).
   Wirft bei einem Fehler; der Aufrufer meldet ihn, die Anfrage selbst ist dann schon gespeichert. */
export async function sendeMail(payload) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edge Function ${res.status}: ${txt}`);
  }
}

/** Die beiden Mails nach einer Anfrage aus dem Generator. */
export async function sendeMails(request) {
  // Erst Jana: Scheitert die Bestätigung an den Kunden (etwa an einer vertippten Adresse), weiß sie trotzdem Bescheid.
  await sendeMail({ to: "info@mama-mia-events.de", ...janaMail(request), type: "jana_notification" });
  // Bestätigung an den Kunden — nur wenn eine E-Mail-Adresse bekannt ist
  if (request.customer_email) {
    await sendeMail({ to: request.customer_email, ...kundenMail(request), type: "customer_confirmation" });
  }
}
