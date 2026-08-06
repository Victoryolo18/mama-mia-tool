import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Meldet einen Fehler ins gemeinsame error_log (nur technischer Kontext,
 * niemals Kundendaten). Darf selbst NIE werfen — jeder Aufruf muss aus
 * einem catch-Block heraus sicher sein, ohne neue Fehler zu riskieren.
 *
 * @param {string} context - z.B. "submit_request", "send_email"
 * @param {unknown} error - das gefangene Error-Objekt
 * @param {object} [metadata] - zusätzlicher technischer Kontext (keine PII!)
 */
export function reportError(context, error, metadata) {
  try {
    console.error(`[${context}]`, error);
    supabase
      .from("error_log")
      .insert({
        app: "generator",
        context,
        message: error?.message ? String(error.message) : String(error),
        stack: error?.stack ? String(error.stack) : null,
        metadata: metadata || null,
      })
      .then(() => {}, () => {});
  } catch {
    // fail-open: Fehler-Meldung darf nie selbst einen Fehler werfen
  }
}
