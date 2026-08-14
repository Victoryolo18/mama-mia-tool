// ═══════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: send-email
// Versendet E-Mails über Resend
//
// ABSICHERUNG (2026-08-14):
// Vorher nahm diese Funktion Empfänger, Betreff und Inhalt ungeprüft vom
// Browser entgegen. Da der anon-Key öffentlich im Seitenquelltext steht,
// konnte damit jeder beliebige E-Mails über die Mama-Mia-Adresse
// verschicken (offener Mail-Verteiler). Jetzt gilt:
//   1. Empfänger muss entweder die interne Adresse sein ODER zu einer
//      echten Anfrage in der Datenbank gehören
//   2. Nur ein Empfänger pro Aufruf (keine Verteilerlisten mehr)
//   3. Nur die eigenen Webseiten dürfen die Funktion aufrufen
//   4. Längenbegrenzung für Betreff und Inhalt
// Am Aussehen und Ablauf der E-Mails ändert sich nichts.
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FROM_EMAIL = "Mama Mia Catering <noreply@mama-mia-events.de>";
const REPLY_TO = "info@mama-mia-events.de";

// Diese Adresse darf immer angeschrieben werden (Benachrichtigung an Jana).
const INTERNAL_RECIPIENT = "info@mama-mia-events.de";

// Nur diese Seiten dürfen die Funktion aufrufen.
const ALLOWED_ORIGINS = [
  "https://angebot.mama-mia-events.de",
  "https://mama-mia-tool.vercel.app",
  "https://mama-mia-crm.vercel.app",
  "http://localhost:3000",
  "http://localhost:3050",
];

const MAX_SUBJECT_LEN = 300;
const MAX_HTML_LEN = 100_000;

function corsHeadersFor(origin: string | null) {
  const erlaubt = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": erlaubt,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Prüft, ob die Adresse zu einer echten Anfrage gehört.
// Schlägt die Prüfung fehl, wird NICHT verschickt (im Zweifel blockieren) —
// die interne Benachrichtigung an Jana ist davon nicht betroffen, die läuft
// über INTERNAL_RECIPIENT ohne Datenbankabfrage.
async function gehoertZuEchterAnfrage(email: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("DB-Prüfung nicht möglich: SUPABASE_URL/SERVICE_ROLE_KEY fehlen");
    return false;
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/requests`
      + `?customer_email=eq.${encodeURIComponent(email)}&select=id&limit=1`;
    const res = await fetch(url, {
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      console.error("DB-Prüfung fehlgeschlagen:", res.status, await res.text());
      return false;
    }
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.error("DB-Prüfung Ausnahme:", err);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = corsHeadersFor(origin);
  const json = (obj: unknown, status: number) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, subject, html, type = "general" } = body;

    if (!to || !subject || !html) {
      return json({ error: "Missing required fields: to, subject, html" }, 400);
    }

    // (2) Nur ein Empfänger — keine Verteilerlisten.
    if (typeof to !== "string") {
      console.warn("Abgelehnt: mehrere Empfänger angefragt");
      return json({ error: "Only a single recipient is allowed" }, 400);
    }

    if (typeof subject !== "string" || typeof html !== "string") {
      return json({ error: "subject and html must be strings" }, 400);
    }

    // (4) Längenbegrenzung.
    if (subject.length > MAX_SUBJECT_LEN || html.length > MAX_HTML_LEN) {
      console.warn("Abgelehnt: Betreff oder Inhalt zu lang");
      return json({ error: "subject or html too long" }, 400);
    }

    // (1) Empfänger muss die interne Adresse sein oder zu einer echten
    //     Anfrage gehören. Das ist der eigentliche Missbrauchsschutz.
    const empfaenger = to.trim().toLowerCase();
    const istIntern = empfaenger === INTERNAL_RECIPIENT.toLowerCase();

    if (!istIntern) {
      const bekannt = await gehoertZuEchterAnfrage(empfaenger);
      if (!bekannt) {
        console.warn("Abgelehnt: Empfänger gehört zu keiner Anfrage");
        return json({ error: "Recipient not permitted" }, 403);
      }
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [empfaenger],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", data);
      return json({ error: data.message || "Resend API error", details: data }, 500);
    }

    return json({ success: true, id: data.id, type }, 200);

  } catch (err) {
    console.error("Function error:", err);
    return json({ error: err.message }, 500);
  }
});
