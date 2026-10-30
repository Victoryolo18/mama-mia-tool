/* Einwilligung der Besucher in Statistik (Microsoft Clarity) und Google-Bewertungen (Elfsight). Ohne React.

   Dasselbe Cookie und dasselbe Format wie die Website (mama-mia-website, src/inhalte/einwilligung.ts):
   Es gilt für die ganze Domain mama-mia-events.de. Wer auf der Website schon akzeptiert oder abgelehnt hat,
   wird im Generator nicht noch einmal gefragt, und umgekehrt. Gespeichert wird nur die Entscheidung, ohne
   Kennung (§ 25 Abs. 2 Nr. 2 TDDDG). einwilligung.test.js vergleicht die Werte mit der Website, wenn das Repo
   daneben liegt; ändert sich dort etwas, hier mitziehen. Im Generator gibt es kein Elfsight; „Akzeptieren“
   gilt trotzdem für beides, weil das Banner beide Dienste nennt und die Website die Wahl übernimmt. */

export const COOKIE = "mm_einwilligung";
/** Steigt, wenn sich Dienste oder Banner-Text ändern. Eine ältere Entscheidung gilt dann nicht mehr. */
export const VERSION = 1;
/** Nach einem halben Jahr fragt das Banner neu. */
export const LAUFZEIT_TAGE = 180;
/** Projekt-ID von Microsoft Clarity. Öffentlich, steht ohnehin im ausgelieferten Skript. */
export const CLARITY_ID = "z5qcpwav8h";

/** `v=1&s=1&b=0&t=2026-10-30` */
export function alsText(stand) {
  return `v=${VERSION}&s=${stand.statistik ? 1 : 0}&b=${stand.bewertungen ? 1 : 0}&t=${stand.datum}`;
}

/** Liest den Cookie-Wert. `null`, wenn es keine gültige Entscheidung zur aktuellen Version gibt. */
export function ausText(text) {
  if (!text) return null;
  const w = new URLSearchParams(text);
  if (w.get("v") !== String(VERSION)) return null;
  const s = w.get("s");
  const b = w.get("b");
  const t = w.get("t") ?? "";
  if (!/^[01]$/.test(s ?? "") || !/^[01]$/.test(b ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return { statistik: s === "1", bewertungen: b === "1", datum: t };
}

/** Wert des Einwilligungs-Cookies aus `document.cookie`. */
export function ausCookies(cookies) {
  const eintrag = (cookies || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  return ausText(eintrag ? decodeURIComponent(eintrag.slice(COOKIE.length + 1)) : null);
}

/** Auf mama-mia-events.de und allen Unteradressen gemeinsam, sonst (Vorschau, lokal) nur für die Adresse selbst. */
export function cookieDomain(host) {
  return host === "mama-mia-events.de" || host.endsWith(".mama-mia-events.de") ? "; Domain=mama-mia-events.de" : "";
}

/** Vollständige Cookie-Zeile zum Setzen. */
export function cookieZeile(stand, host, sicher) {
  return `${COOKIE}=${encodeURIComponent(alsText(stand))}; Max-Age=${LAUFZEIT_TAGE * 86400}; Path=/; SameSite=Lax${cookieDomain(host)}${sicher ? "; Secure" : ""}`;
}

/** Ereignis auf `window`: öffnet das Banner mit den Kästchen (Link „Cookie-Einstellungen“ im Fuß). */
export const OEFFNEN = "mm-einwilligung-oeffnen";

/** Heutiges Datum als JJJJ-MM-TT. */
export const heute = (d = new Date()) => d.toISOString().slice(0, 10);

/* Ab hier nur im Browser. */

let claritygeladen = false;

export const aktuell = () => ausCookies(document.cookie);

/** Speichert die Entscheidung und gibt den neuen Stand zurück. */
export function speichere(wahl) {
  const stand = { statistik: !!wahl.statistik, bewertungen: !!wahl.bewertungen, datum: heute() };
  document.cookie = cookieZeile(stand, location.hostname, location.protocol === "https:");
  return stand;
}

/** Lädt Clarity. Nur aufrufen, wenn für die Statistik eingewilligt ist. Werbe-Speicher bleibt aus. */
export function ladeClarity() {
  if (!CLARITY_ID || claritygeladen) return;
  claritygeladen = true;
  window.clarity = window.clarity || function (...args) { (window.clarity.q = window.clarity.q || []).push(args); };
  const skript = document.createElement("script");
  skript.async = true;
  skript.src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`;
  document.head.append(skript);
  window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
}

/** Widerruf der Statistik: Clarity stoppen und seine Cookies löschen, für die Adresse und die ganze Domain. */
export function entferneClarity() {
  window.clarity?.("consent", false);
  const domain = cookieDomain(location.hostname);
  for (const c of ["_clck", "_clsk"]) {
    document.cookie = `${c}=; Max-Age=0; Path=/`;
    if (domain) document.cookie = `${c}=; Max-Age=0; Path=/${domain}`;
  }
}
