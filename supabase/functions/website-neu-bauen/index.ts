// ═══════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: website-neu-bauen
// Stößt einen Neubau der Website auf Vercel an (Deploy Hook), damit eine
// Stelle, die Jana im CRM ändert, auf /jobs erscheint (WEB-30).
//
// Wer darf: nur die eingeloggte CRM-Nutzerin. Der öffentliche anon-Key
// reicht nicht; die Funktion fragt bei Supabase Auth nach, wem das
// mitgeschickte Token gehört.
// Geheimnis: die Adresse des Deploy Hooks steht nur im Umgebungswert
// WEBSITE_DEPLOY_HOOK der Funktion, nie im Browser und nie im Repo.
// Mengengrenze: höchstens ein Neubau je Minute (Vercel baut ohnehin der
// Reihe nach); weitere Aufrufe in der Minute antworten mit 200 und
// "schon unterwegs", ohne erneut zu bauen.
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const DEPLOY_HOOK = Deno.env.get("WEBSITE_DEPLOY_HOOK");

const ALLOWED_ORIGINS = [
  "https://crm.mama-mia-events.de",
  "https://mama-mia-crm.vercel.app",
  "https://angebot.mama-mia-events.de",
  "http://localhost:3000",
  "http://localhost:3050",
];
const VORSCHAU = /^https:\/\/mama-mia-(tool|crm)-[a-z0-9-]+-victors-projects-e75dd39c\.vercel\.app$/;
const erlaubterUrsprung = (origin: string | null) => !!origin && (ALLOWED_ORIGINS.includes(origin) || VORSCHAU.test(origin));

// Hält nur, solange dieselbe Instanz läuft. Das genügt: Es geht um Doppelklicks, nicht um Angriffe.
let letzterNeubau = 0;

function corsHeadersFor(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": erlaubterUrsprung(origin) ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function istEingeloggt(authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith("Bearer ") || !SUPABASE_URL || !ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
    if (!res.ok) return false;
    const nutzer = await res.json();
    return typeof nutzer?.id === "string" && nutzer?.role === "authenticated";
  } catch (err) {
    console.error("Prüfung des Logins fehlgeschlagen:", err);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = corsHeadersFor(origin);
  const json = (obj: unknown, status: number) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405);
  if (!erlaubterUrsprung(origin)) return json({ error: "Nicht erlaubt." }, 403);
  if (!(await istEingeloggt(req.headers.get("authorization")))) return json({ error: "Bitte im CRM anmelden." }, 401);
  if (!DEPLOY_HOOK) {
    console.error("WEBSITE_DEPLOY_HOOK fehlt");
    return json({ error: "Neubau ist nicht eingerichtet." }, 503);
  }

  if (Date.now() - letzterNeubau < 60_000) return json({ ok: true, hinweis: "schon unterwegs" }, 200);

  try {
    const res = await fetch(DEPLOY_HOOK, { method: "POST" });
    if (!res.ok) {
      console.error("Deploy Hook antwortet mit", res.status);
      return json({ error: "Neubau konnte nicht angestoßen werden." }, 502);
    }
    letzterNeubau = Date.now();
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Deploy Hook Ausnahme:", err);
    return json({ error: "Neubau konnte nicht angestoßen werden." }, 502);
  }
});
