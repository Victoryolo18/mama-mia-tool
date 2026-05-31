import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

/* ════════════════════════════════════════════════════════════════
   MAMA MIA EVENTS & CATERING — ANGEBOTSGENERATOR
   ════════════════════════════════════════════════════════════════
   
   📌 KONFIGURATION (alles hier oben anpassbar):
   - PREISE pro Anlass / Paket
   - THEMEN pro Anlass
   - ANLÄSSE mit Beschreibung & Bildern
   - SUPABASE-Anbindung (Phase 2)
   
   Hosting: Vercel (kostenlos)
   Aufruf via Framer:  ?anlass=hochzeit  oder  ?anlass=geburtstag  etc.
   ══════════════════════════════════════════════════════════════════ */

/* ── 🔌 SUPABASE CLIENT ── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ── 🎨 FARBPALETTE ── */
const C = {
  cream:     "#FAF7F2",   // Hintergrund hell
  creamSoft: "#FEF8E0",   // Hintergrund ganz weich
  burgundy:  "#5C2818",   // Primär dunkel
  burgundyDark: "#3D1812",
  gold:      "#C9A84C",   // Akzent / Buttons
  goldSoft:  "#E0C77A",
  cappuccino:"#A88968",   // Mittelton
  ink:       "#1C1008",   // Haupttext dunkel
  inkSoft:   "#3D2817",
  border:    "#E8DCC4",
  white:     "#FFFFFF",
};

/* ── 📋 ANLÄSSE ── */
const ANLAESSE = {
  hochzeit: {
    label: "Hochzeit",
    icon: "💍",
    subtitle: "Ihr schönster Tag",
    description: "Vom Sektempfang bis zum Mitternachtssnack",
    image: "https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Hochzeit-Thema.jpg",
  },
  geburtstag: {
    label: "Geburtstag",
    icon: "🎂",
    subtitle: "Feiern Sie sich",
    description: "Vom kleinen Familienkreis bis zur großen Feier",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
  },
  einschulung: {
    label: "Einschulung",
    icon: "🎒",
    subtitle: "Großer Tag, kleine Helden",
    description: "Festliches Buffet für die ganze Familie",
    image: "https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Einschulung-Thema.jpg",
  },
  individuell: {
    label: "Private Feier",
    icon: "✨",
    subtitle: "Ihr besonderer Anlass",
    description: "Taufe, Konfirmation, Jugendweihe, Jubiläum & mehr",
    image: "https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Private_Feier-Thema.jpg",
  },
  firmenfeier: {
    label: "Firmenfeier",
    icon: "🏢",
    subtitle: "Geschäftlich genießen",
    description: "Vom Business-Lunch bis zum Sommerfest",
    image: "https://jypugzjdoluvmawkwewl.supabase.co/storage/v1/object/public/Themenbilder/Firmenfeier-Thema.jpg",
  },
  fruehstueck: {
    label: "Frühstück & Brunch",
    icon: "☕",
    subtitle: "Der genussvolle Start",
    description: "Kreative Frühstücksideen, herzhaft & süß",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
  },
};

/* ── 🚚 LIEFERZONEN — aus Supabase geladen, Matching per plz_liste + plz_pattern ── */
function getLieferzuschlag(plz, lieferzonen) {
  if (!plz || plz.length !== 5 || !lieferzonen?.length) return { zuschlag: null, rueckholungPreis: null, bekannt: false };
  const sorted = [...lieferzonen].filter(z => z.aktiv).sort((a, b) => a.reihenfolge - b.reihenfolge);
  for (const zone of sorted) {
    const match = zone.plz_liste?.includes(plz) ||
      (zone.plz_pattern && zone.plz_pattern.split(",").map(p => p.trim()).some(p => plz.startsWith(p)));
    if (match) return {
      zuschlag: Number(zone.zuschlag),
      rueckholungPreis: zone.rueckholung_preis != null ? Number(zone.rueckholung_preis) : null,
      bekannt: true,
    };
  }
  return { zuschlag: null, rueckholungPreis: null, bekannt: false };
}

/* ── 📦 PAKETE ── */
const PAKETE = [
  {
    id: "Klassisch",
    name: "Klassisch",
    tagline: "Schmackhaft & solide",
    features: [
      "1 Hauptgericht",
      "1 Beilage zur Wahl",
      "1 Salat zur Wahl",
      "Brot & Butter inklusive",
    ],
    badge: null,
  },
  {
    id: "Genuss",
    name: "Genuss",
    tagline: "Die beliebteste Wahl",
    features: [
      "1 Vorspeise zur Wahl",
      "2 Hauptgerichte",
      "1 Beilage zur Wahl",
      "1 Dessert zur Wahl",
      "Brot, Butter & Aufstriche",
    ],
    badge: "Meistgebucht",
  },
  {
    id: "Premium",
    name: "Premium",
    tagline: "Das volle Erlebnis",
    features: [
      "Suppe oder Vorspeise",
      "2 Hauptgerichte premium",
      "2 Beilagen zur Wahl",
      "Dessert-Variation",
      "Brot, Butter, Aufstriche & Antipasti",
      "Persönliche Wunsch-Beratung",
    ],
    badge: "Premium",
  },
];

/* ── 👥 GÄSTEZAHL OPTIONEN ── */
const GAESTE_OPTIONEN = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200];

/* ── 📞 KONTAKT-METHODEN ── */
const KONTAKT_OPTIONEN = [
  { id: "telefon",  label: "Telefon",  icon: "📞", placeholder: "z.B. 0176 12345678" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬", placeholder: "z.B. 0176 12345678" },
  { id: "email",    label: "E-Mail",   icon: "✉️", placeholder: "ihre@email.de" },
];

/* ── 🚚 LIEFERUNG ── */
const LIEFERUNG = [
  { id: "abholung", label: "Selbstabholung", desc: "Ich hole das Catering selbst ab" },
  { id: "lieferung", label: "Lieferung",     desc: "Bitte zu meiner Adresse liefern" },
];

const UPGRADE_PREISE = {
  vorspeise:    { preis: 3.50, singular: 'Vorspeise' },
  hauptgericht: { preis: 9.50, singular: 'Hauptgericht' },
  hauptspeise:  { preis: 9.50, singular: 'Hauptgericht' },
  beilage:      { preis: 3.50, singular: 'Beilage' },
  dessert:      { preis: 4.20, singular: 'Dessert' },
};

/* ── ⚙️ AIRTABLE-KONFIGURATION ── */
// TODO: Hier später eintragen sobald Airtable eingerichtet:
const AIRTABLE_CONFIG = {
  baseId:    "DEIN_BASE_ID",       // z.B. "appXXXXXXXXXXXXXX"
  tableName: "Anfragen",
  apiKey:    "DEIN_PERSONAL_TOKEN", // Personal Access Token von Airtable
  enabled:   false,                 // erst auf true setzen wenn alles eingerichtet
};

/* ════════════════════════════════════════════════════════════════
   HILFSFUNKTIONEN
   ══════════════════════════════════════════════════════════════════ */

function getUrlParam(name) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function formatEUR(n) {
  return n?.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }) ?? "—";
}

function generateAngebotsId() {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `MM-${yy}-${random}`;
}

async function sendToAirtable(data) {
  if (!AIRTABLE_CONFIG.enabled) {
    console.log("📋 Airtable disabled — Daten würden gesendet:", data);
    return { success: true, simulated: true };
  }
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableName}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_CONFIG.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: data }),
      }
    );
    if (!response.ok) throw new Error("Airtable error");
    return { success: true };
  } catch (e) {
    console.error("Airtable Fehler:", e);
    return { success: false, error: e.message };
  }
}

/* ════════════════════════════════════════════════════════════════
   HAUPT-KOMPONENTE
   ══════════════════════════════════════════════════════════════════ */

export default function MamaMiaAngebotsgenerator() {
  /* ── State ── */
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    anlass: getUrlParam("anlass") || null,
    thema: null,
    gaeste: '',
    datum: "",
    plz: "",
    lieferung: "",
    paket: null,
    menue_auswahl: {},
    extras: [],
    zusatzwuensche: "",
    kontaktart: "whatsapp",
    kontaktdaten: "",
    name: "",
    notizen: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [angebotsId, setAngebotsId] = useState(null);

  /* ── DB-State ── */
  const [dbThemen,          setDbThemen]          = useState({});
  const [dbLieferzonen,     setDbLieferzonen]     = useState([]);
  const [dbPreise,          setDbPreise]          = useState({});
  const [dbMenuData,        setDbMenuData]        = useState(null);
  const [dbZusatzwuensche,  setDbZusatzwuensche]  = useState([]);
  const [dbPaketFeatures,   setDbPaketFeatures]   = useState({});
  const [appLoading,        setAppLoading]        = useState(true);
  const [menuLoading,       setMenuLoading]       = useState(false);
  const [upgrades,          setUpgrades]          = useState({});

  /* ── Fonts laden ── */
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  /* ── Initial load: Themen + Lieferzonen ── */
  useEffect(() => {
    async function init() {
      const [{ data: themenRows }, { data: lieferRows }, { data: zusatzRows }] = await Promise.all([
        supabase.from("themen").select("*").eq("aktiv", true).order("anlass").order("reihenfolge"),
        supabase.from("lieferzonen").select("*").eq("aktiv", true).order("reihenfolge"),
        supabase.from("zusatzwuensche").select("*").eq("aktiv", true).order("reihenfolge"),
      ]);
      const byAnlass = {};
      for (const t of (themenRows || [])) {
        if (!byAnlass[t.anlass]) byAnlass[t.anlass] = [];
        byAnlass[t.anlass].push({ id: t.slug, name: t.label, desc: t.beschreibung, image: t.bild_url, images: [t.bild_url_1, t.bild_url_2, t.bild_url_3].filter(Boolean) });
      }
      setDbThemen(byAnlass);
      setDbLieferzonen(lieferRows || []);
      setDbZusatzwuensche(zusatzRows || []);
      setAppLoading(false);
    }
    init();
  }, []);

  /* ── Preise laden wenn Anlass + Thema gewählt ── */
  useEffect(() => {
    if (!data.anlass || !data.thema) { setDbPreise({}); return; }
    supabase
      .from("paket_konfiguration")
      .select("paket, preis_pro_person")
      .eq("anlass", data.anlass)
      .eq("theme_slug", data.thema)
      .eq("aktiv", true)
      .then(({ data: rows }) => {
        const map = {};
        for (const r of (rows || [])) map[r.paket] = Number(r.preis_pro_person);
        setDbPreise(map);
      });
  }, [data.anlass, data.thema]);

  /* ── Paket-Features laden wenn Anlass + Thema gewählt ── */
  useEffect(() => {
    if (!data.anlass || !data.thema) { setDbPaketFeatures({}); return; }
    async function loadFeatures() {
      const paketNames = ["Klassisch", "Genuss", "Premium"];
      const results = await Promise.all(paketNames.map(async paket => {
        const { data: konf } = await supabase
          .from("paket_konfiguration").select("id")
          .eq("anlass", data.anlass).eq("theme_slug", data.thema).eq("paket", paket).limit(1);
        if (!konf?.length) return [paket, []];
        const { data: slots } = await supabase
          .from("paket_slots").select("label, kategorie, min_auswahl, max_auswahl, typ")
          .eq("paket_konfiguration_id", konf[0].id).eq("aktiv", true).order("reihenfolge");
        const merged = {};
        const mergedOrder = [];
        for (const s of (slots || [])) {
          const key = s.typ === 'fix' ? `_fix_${mergedOrder.length}` : (s.kategorie || s.label);
          if (!merged[key]) { merged[key] = { ...s }; mergedOrder.push(key); }
          else {
            merged[key].max_auswahl = (merged[key].max_auswahl || 1) + (s.max_auswahl || 1);
            if (!s.label?.toLowerCase().includes('salat') && merged[key].label?.toLowerCase().includes('salat'))
              merged[key].label = s.label;
          }
        }
        return [paket, mergedOrder.map(k => merged[k])];
      }));
      setDbPaketFeatures(Object.fromEntries(results));
    }
    loadFeatures();
  }, [data.anlass, data.thema]);


  /* ── Menü laden wenn Anlass + Thema + Paket gewählt ── */
  useEffect(() => {
    if (!data.anlass || !data.thema || !data.paket) { setDbMenuData(null); return; }
    async function loadMenu() {
      setMenuLoading(true);
      const { data: konf } = await supabase
        .from("paket_konfiguration")
        .select("id")
        .eq("anlass", data.anlass)
        .eq("theme_slug", data.thema)
        .eq("paket", data.paket)
        .limit(1);
      if (!konf?.length) { setDbMenuData(null); setMenuLoading(false); return; }
      const { data: slots } = await supabase
        .from("paket_slots")
        .select("id, label, kategorie, typ, min_auswahl, max_auswahl, reihenfolge, slot_gerichte(reihenfolge, gericht:gerichte(id, name, vegetarisch, unterkategorie, kategorie))")
        .eq("paket_konfiguration_id", konf[0].id)
        .eq("aktiv", true)
        .order("reihenfolge");
      if (slots) {
        const katMap = {};
        const katOrder = [];
        for (const slot of slots) {
          const key = slot.typ === 'fix' ? `_fix_${katOrder.length}` : (slot.kategorie || slot.label);
          const dishes = (slot.slot_gerichte || [])
            .sort((a, b) => a.reihenfolge - b.reihenfolge)
            .map(sg => {
              const u = sg.gericht.unterkategorie;
              const k = sg.gericht.kategorie;
              return {
                id: sg.gericht.id,
                name: sg.gericht.name,
                vegetarisch: sg.gericht.vegetarisch,
                unterkategorie: Array.isArray(u) ? (u[0] || "") : (u || ""),
                gruppe: Array.isArray(k) ? (k[0] || "") : (k || ""),
              };
            });
          if (!katMap[key]) {
            katMap[key] = { typ: slot.typ, label: slot.label, kategorie: slot.kategorie, min_auswahl: slot.min_auswahl, max_auswahl: slot.max_auswahl, dishes };
            katOrder.push(key);
          } else {
            katMap[key].min_auswahl = (katMap[key].min_auswahl || 1) + (slot.min_auswahl || 1);
            katMap[key].max_auswahl = (katMap[key].max_auswahl || 1) + (slot.max_auswahl || 1);
            if (katMap[key].max_auswahl > 1) katMap[key].typ = 'wahl_mehrfach';
            const existingIds = new Set(katMap[key].dishes.map(d => d.id));
            katMap[key].dishes.push(...dishes.filter(d => !existingIds.has(d.id)));
          }
        }
        const kategorien = katOrder.map(k => katMap[k]);
        const thema = (dbThemen[data.anlass] || []).find(t => t.id === data.thema);
        setDbMenuData({ bilder: thema?.images || [], kategorien });
      }
      setMenuLoading(false);
    }
    loadMenu();
  }, [data.anlass, data.thema, data.paket, dbThemen]);

  useEffect(() => { setUpgrades({}); }, [data.paket, data.thema]);

  /* ── Wenn Anlass aus URL kommt, springe zu Schritt 2 ── */
  useEffect(() => {
    if (data.anlass && ANLAESSE[data.anlass] && step === 1) {
      setStep(2);
    }
  }, []);

  /* ── Helper ── */
  const update = (key, value) => setData(d => ({ ...d, [key]: value }));
  const next = () => setStep(s => Math.min(s + 1, 7));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const preisProPerson = (data.anlass && data.paket && dbPreise[data.paket]) || 0;
  const speisenPreis = preisProPerson * data.gaeste;
  const isDelivery = ["nur_anlieferung", "anlieferung_rueckholung", "lieferung"].includes(data.lieferung);
  const lieferInfo = isDelivery
    ? getLieferzuschlag(data.plz, dbLieferzonen)
    : { zuschlag: 0, rueckholungPreis: 0, bekannt: true };
  const lieferzuschlag = data.lieferung === "anlieferung_rueckholung"
    ? (lieferInfo.rueckholungPreis ?? lieferInfo.zuschlag ?? 0)
    : (lieferInfo.zuschlag ?? 0);
  const upgradeSummeProPerson = Object.values(upgrades).reduce((s, p) => s + p, 0);
  const gesamtpreis = speisenPreis + lieferzuschlag + upgradeSummeProPerson * (data.gaeste || 0);

  /* ── Submit (Supabase + E-Mail) ── */
  async function handleSubmit() {
    setSubmitting(true);

    try {
      // 1) Request Number aus DB-Funktion holen
      const { data: numData, error: numErr } = await supabase.rpc("generate_request_number");
      if (numErr) throw numErr;
      const requestNumber = numData;
      setAngebotsId(requestNumber);

      // 2) Aktuelle Pakete-Version laden (für Snapshot)
      const { data: paketeVersion } = await supabase
        .from("pakete_versionen")
        .select("id, pakete_data")
        .order("gueltig_ab", { ascending: false })
        .limit(1)
        .single();

      // 3) Anfrage in Datenbank speichern
      const insertData = {
        request_number: requestNumber,
        source: "generator",
        status: "neu",
        customer_name: data.name || null,
        customer_phone: data.kontaktart !== "email" ? data.kontaktdaten : null,
        customer_email: data.kontaktart === "email" ? data.kontaktdaten : null,
        customer_contact_preference: data.kontaktart,
        anlass: data.anlass,
        thema: (dbThemen[data.anlass] || []).find(t => t.id === data.thema)?.name || null,
        paket: data.paket,
        gaeste: data.gaeste,
        event_datum: data.datum || null,
        plz: data.plz || null,
        lieferung: data.lieferung,
        menue_auswahl: { ...(data.menue_auswahl || {}), ...(Object.keys(upgrades).length ? { _upgrades: upgrades } : {}) },
        zusatzwuensche: [
          ...(data.extras || []),
          ...(data.zusatzwuensche ? [data.zusatzwuensche] : []),
        ].join("\n") || null,
        interne_notiz: data.notizen || null,
        preis_pro_person: preisProPerson,
        speisenpreis: speisenPreis,
        lieferzuschlag: lieferzuschlag,
        gesamtpreis: gesamtpreis,
        pakete_version_id: paketeVersion?.id || null,
        pakete_snapshot: paketeVersion?.pakete_data || null,
      };

      const { data: savedRequest, error: insertErr } = await supabase
        .from("requests")
        .insert(insertData)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 4) E-Mails versenden (Fehler hier blockieren das Submit nicht)
      try {
        await sendNotificationEmails(savedRequest);
      } catch (emailErr) {
        console.error("E-Mail-Versand fehlgeschlagen:", emailErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit-Fehler:", err);
      alert("Es gab ein Problem beim Senden Ihrer Anfrage. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt unter info@mama-mia-events.de");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── E-Mail-Helper ── */
  async function sendNotificationEmails(request) {
    const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    const AUTH   = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    console.log("[email] sendNotificationEmails aufgerufen, URL:", FN_URL);

    async function callEdgeFn(payload) {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Authorization": AUTH, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Edge Function ${res.status}: ${txt}`);
      }
      return res;
    }

    const anlassLabel = ANLAESSE[request.anlass]?.label || request.anlass;
    const datumFormatted = request.event_datum
      ? new Date(request.event_datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
      : "Datum offen";

    // E-Mail an Kunden (Bestätigung) — nur wenn E-Mail bekannt
    if (request.customer_email) {
      const customerHtml = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1008;">
          <div style="text-align: center; padding: 32px 0; border-bottom: 2px solid #E8DCC4;">
            <h1 style="font-family: Georgia, serif; font-size: 32px; color: #C9A84C; font-style: italic; margin: 0;">Mama Mia</h1>
            <p style="color: #A88968; margin: 4px 0 0; letter-spacing: 2px; text-transform: uppercase; font-size: 11px;">Events &amp; Catering</p>
          </div>
          <h2 style="color: #5C2818; font-family: Georgia, serif;">Vielen Dank für Ihre Anfrage!</h2>
          <p>Liebe/r ${request.customer_name || "Gast"},</p>
          <p>Ihre Anfrage <strong>${request.request_number}</strong> ist bei mir eingegangen. Ich melde mich innerhalb von <strong>24 Stunden</strong> persönlich bei Ihnen.</p>
          <div style="background: #FEF8E0; border-left: 4px solid #C9A84C; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
            <h3 style="margin: 0 0 12px; color: #5C2818;">Ihre Anfrage</h3>
            <p style="margin: 4px 0;"><strong>Anlass:</strong> ${anlassLabel}</p>
            <p style="margin: 4px 0;"><strong>Datum:</strong> ${datumFormatted}</p>
            <p style="margin: 4px 0;"><strong>Gäste:</strong> ${request.gaeste} Personen</p>
            <p style="margin: 4px 0;"><strong>Paket:</strong> ${request.paket}</p>
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
      console.log("[email] Sende Kundenbestätigung an:", request.customer_email);
      await callEdgeFn({ to: request.customer_email, subject: `Ihre Anfrage bei Mama Mia (${request.request_number})`, html: customerHtml, type: "customer_confirmation" });
    }

    // E-Mail an Jana (Benachrichtigung)
    const alleExtras = (request.zusatzwuensche || '').split('\n').filter(Boolean);
    const hatGetraenkeservice = alleExtras.includes('Getränkeservice');
    const sonstigeZusatzwuensche = alleExtras.filter(e => e !== 'Getränkeservice').join('\n');
    const kontaktInfo = request.customer_email
      ? `E-Mail: <a href="mailto:${request.customer_email}">${request.customer_email}</a>`
      : `Telefon: <a href="tel:${request.customer_phone}">${request.customer_phone}</a>`;

    const janaHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1008;">
        <h2 style="color: #5C2818;">🔔 Neue Anfrage über die Webseite</h2>
        <p><strong>${request.request_number}</strong> · ${new Date().toLocaleString("de-DE")}</p>
        <div style="background: #FEF8E0; padding: 16px 20px; margin: 16px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 12px; color: #5C2818;">Kunde</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${request.customer_name || "—"}</p>
          <p style="margin: 4px 0;"><strong>Bevorzugt:</strong> ${request.customer_contact_preference}</p>
          <p style="margin: 4px 0;">${kontaktInfo}</p>
        </div>
        <div style="background: #FEF8E0; padding: 16px 20px; margin: 16px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 12px; color: #5C2818;">Event</h3>
          <p style="margin: 4px 0;"><strong>Anlass:</strong> ${anlassLabel} (${request.thema || "—"})</p>
          <p style="margin: 4px 0;"><strong>Paket:</strong> ${request.paket}</p>
          <p style="margin: 4px 0;"><strong>Gäste:</strong> ${request.gaeste}</p>
          <p style="margin: 4px 0;"><strong>Datum:</strong> ${datumFormatted}</p>
          <p style="margin: 4px 0;"><strong>Ort:</strong> ${request.plz || "—"} (${({ selbstabholung: "Selbstabholung", abholung: "Selbstabholung", nur_anlieferung: "Nur Anlieferung", anlieferung_rueckholung: "Anlieferung + Rückholung", lieferung: "Lieferung" })[request.lieferung] || request.lieferung})</p>
          <p style="margin: 4px 0;"><strong>Geschätzter Preis:</strong> ${request.gesamtpreis} €</p>
          ${request.menue_auswahl?._upgrades && Object.keys(request.menue_auswahl._upgrades).length ? `<p style="margin: 4px 0;"><strong>Upgrades:</strong> ${Object.entries(request.menue_auswahl._upgrades).map(([k,v]) => `+1 ${k} (${Number(v).toFixed(2).replace('.',',')} € p.P.)`).join(', ')}</p>` : ''}
          ${hatGetraenkeservice ? '<p style="margin: 4px 0;"><strong>Getränkeservice:</strong> Ja</p>' : ''}
        </div>
        ${sonstigeZusatzwuensche ? `
        <div style="background: #FFF3E0; border-left: 4px solid #E07B00; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
          <strong>Zusatzwünsche:</strong> ${sonstigeZusatzwuensche}
        </div>` : ""}
        <p style="margin-top: 32px; font-size: 13px; color: #A88968;">
          Direkt im CRM ansehen: <a href="https://mama-mia-crm.vercel.app/anfragen/${request.id}" style="color: #5C2818;">CRM öffnen</a>
        </p>
      </div>
    `;
    console.log("[email] Sende Benachrichtigung an info@mama-mia-events.de");
    await callEdgeFn({ to: "info@mama-mia-events.de", subject: `🔔 Neue Anfrage: ${request.customer_name || "Anonym"} — ${anlassLabel}`, html: janaHtml, type: "jana_notification" });
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  if (appLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", fontFamily: "'DM Sans', sans-serif", color: "#A88968", fontSize: 18 }}>
      Lade Mama Mia …
    </div>
  );

  return (
    <div style={S.root}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .mm-fade { animation: fadeUp .5s ease-out backwards; }
        .mm-card-hover { transition: all .25s cubic-bezier(.2,.8,.2,1); }
        .mm-card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(92,40,24,.15); }
        .mm-btn-press:active { transform: scale(.97); }
        .mm-input:focus { outline: none; border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.gold}33; }
        @media (min-width: 641px) {
          .mm-summary-card { position: sticky; top: 100px; }
        }
        @media (max-width: 640px) {
          .mm-grid-2 { grid-template-columns: 1fr !important; }
          .mm-grid-3 { grid-template-columns: 1fr !important; }
          .mm-hero-title { font-size: 36px !important; }
          .mm-hero-sub   { font-size: 16px !important; }
          .mm-stepper    { font-size: 11px !important; }
          .mm-summary-card { order: 1; }
          .mm-form-card    { order: 2; }
        }
      `}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={S.logoMain}>Mama Mia</span>
            <span style={S.logoSub}>Events & Catering</span>
          </div>
          {!submitted && step > 1 && (
            <button onClick={prev} style={S.backBtn} className="mm-btn-press">
              ← Zurück
            </button>
          )}
        </div>
      </header>

      {/* Stepper */}
      {!submitted && (
        <div style={S.stepperWrap}>
          <div style={S.stepper} className="mm-stepper">
            {["Anlass", "Thema", "Paket", "Menü", "Details", "Extras", "Anfrage"].map((label, i) => {
              const num = i + 1;
              const active = step === num;
              const done   = step > num;
              return (
                <div key={label} style={S.stepItem}>
                  <div style={{
                    ...S.stepCircle,
                    ...(active ? S.stepCircleActive : {}),
                    ...(done   ? S.stepCircleDone   : {}),
                  }}>
                    {done ? "✓" : num}
                  </div>
                  <div style={{
                    ...S.stepLabel,
                    color: active ? C.burgundy : done ? C.cappuccino : C.cappuccino,
                    fontWeight: active ? 700 : 500,
                  }}>{label}</div>
                  {i < 6 && (
                    <div style={{
                      ...S.stepLine,
                      background: done ? C.gold : C.border,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <main style={S.main}>
        {submitted ? (
          <SuccessScreen angebotsId={angebotsId} kontaktart={data.kontaktart} />
        ) : (
          <>
            {step === 1 && <Step1Anlass data={data} update={update} next={next} />}
            {step === 2 && <Step2Thema  data={data} update={update} next={next} themen={dbThemen} />}
            {step === 3 && <Step4Paket  data={data} update={update} next={next} preise={dbPreise} paketFeatures={dbPaketFeatures} />}
            {step === 4 && (
              <Step5Menue
                data={data}
                update={update}
                next={next}
                menuData={dbMenuData}
                menuLoading={menuLoading}
                upgrades={upgrades}
                setUpgrades={setUpgrades}
              />
            )}
            {step === 5 && <Step3Details data={data} update={update} next={next} dbLieferzonen={dbLieferzonen} />}
            {step === 6 && (
              <Step6Extras
                data={data}
                update={update}
                next={next}
                zusatzwuensche={dbZusatzwuensche}
              />
            )}
            {step === 7 && (
              <Step7Anfrage
                data={data}
                update={update}
                onSubmit={handleSubmit}
                submitting={submitting}
                preisProPerson={preisProPerson}
                speisenPreis={speisenPreis}
                lieferzuschlag={lieferzuschlag}
                lieferInfo={lieferInfo}
                gesamtpreis={gesamtpreis}
                dbThemen={dbThemen}
                upgrades={upgrades}
                upgradeSummeProPerson={upgradeSummeProPerson}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerText}>
          © {new Date().getFullYear()} Mama Mia Events &amp; Catering · Jana Ketelhohn · Leegebruch
          {' · '}
          <a href="https://mama-mia-events.de/impressum" target="_blank" rel="noopener noreferrer" style={S.footerLink}>Impressum</a>
          {' · '}
          <a href="https://mama-mia-events.de/agb" target="_blank" rel="noopener noreferrer" style={S.footerLink}>AGB</a>
          {' · '}
          <a href="https://mama-mia-events.de/datenschutz" target="_blank" rel="noopener noreferrer" style={S.footerLink}>Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 1 — ANLASS
   ══════════════════════════════════════════════════════════════════ */
function Step1Anlass({ data, update, next }) {
  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 1 von 7</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Welcher <em style={S.italic}>Anlass</em> darf es sein?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Wählen Sie aus, wofür Sie ein Angebot wünschen.
        </p>
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: "repeat(3, 1fr)" }} className="mm-grid-3">
        {Object.entries(ANLAESSE).map(([key, anl], i) => {
          const selected = data.anlass === key;
          return (
            <button
              key={key}
              onClick={() => { update("anlass", key); setTimeout(next, 200); }}
              className="mm-card-hover mm-btn-press mm-fade"
              style={{
                ...S.anlassCard,
                ...(selected ? S.anlassCardActive : {}),
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div style={{
                ...S.anlassImage,
                backgroundImage: `linear-gradient(180deg, rgba(28,16,8,0) 40%, rgba(28,16,8,.65) 100%), url(${anl.image})`,
              }}>
              </div>
              <div style={S.anlassContent}>
                <div style={S.anlassLabel}>{anl.label}</div>
                <div style={S.anlassSubtitle}>{anl.subtitle}</div>
                <div style={S.anlassDesc}>{anl.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 2 — THEMA
   ══════════════════════════════════════════════════════════════════ */
function Step2Thema({ data, update, next, themen: allThemen }) {
  const rawThemen = (allThemen || {})[data.anlass] || [];
  // "individuell" always last
  const themen = [
    ...rawThemen.filter(t => t.id !== "individuell"),
    ...rawThemen.filter(t => t.id === "individuell"),
  ];
  const anlass = ANLAESSE[data.anlass];
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80";

  return (
    <div className="mm-fade">
      <style>{`
        .mm-thema-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        @media (max-width: 640px) { .mm-thema-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 2 von 7 · {anlass?.label}</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Welches <em style={S.italic}>Thema</em> passt zu Ihrem Anlass?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Jedes Thema lässt sich auf Ihre Wünsche anpassen.
        </p>
      </div>

      <div className="mm-thema-grid">
        {themen.map((t, i) => {
          const selected = data.thema === t.id;
          const imgUrl = t.image || FALLBACK_IMG;
          const isIndividuell = t.id === "individuell";
          return (
            <button
              key={t.id}
              onClick={() => { update("thema", t.id); setTimeout(next, 200); }}
              className="mm-card-hover mm-btn-press mm-fade"
              style={{
                ...S.themaCard,
                ...(selected ? S.themaCardActive : {}),
                ...(isIndividuell && !selected ? { border: `2px dashed ${C.border}`, opacity: 0.85 } : {}),
                animationDelay: `${i * 80}ms`,
                minHeight: 240,
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{
                height: 140,
                backgroundImage: `linear-gradient(180deg, rgba(28,16,8,0) 40%, rgba(28,16,8,.7) 100%), url(${imgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                flexShrink: 0,
              }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: selected ? C.gold : C.burgundy, lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: C.cappuccino, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
                <div style={{ marginTop: "auto", paddingTop: 8, fontSize: 13, fontWeight: 600, color: selected ? C.gold : C.cappuccino }}>
                  {selected ? "✓ Ausgewählt" : "Wählen →"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 3 — DETAILS (Gäste, Datum, PLZ, Lieferung)
   ══════════════════════════════════════════════════════════════════ */
function Step3Details({ data, update, next, dbLieferzonen = [] }) {
  const gaesteNum = Number(data.gaeste);
  const gaesteError = data.gaeste !== '' && data.gaeste !== null
    ? gaesteNum < 8 ? "Mindestbestellung ab 8 Personen"
    : gaesteNum > 250 ? "Bitte kontaktieren Sie uns direkt für Großveranstaltungen"
    : null
    : null;
  const gaesteValid = data.gaeste !== '' && data.gaeste !== null && gaesteNum >= 8 && gaesteNum <= 250;
  const canContinue = gaesteValid && data.datum && data.plz && data.lieferung;

  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 5 von 7</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Erzählen Sie uns mehr über Ihr <em style={S.italic}>Event</em>
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Mit diesen Angaben kann ich Ihr Angebot präzise gestalten.
        </p>
      </div>

      <div style={S.formCard}>
        {/* Gästezahl */}
        <div style={S.field}>
          <label style={S.label}>👥 Wie viele Gäste erwarten Sie?</label>
          <input
            type="number"
            min="8"
            max="250"
            value={data.gaeste ?? ''}
            onChange={e => update("gaeste", e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="z.B. 25"
            style={{ ...S.input, ...(gaesteError ? { borderColor: '#C0392B' } : {}) }}
            className="mm-input"
          />
          {gaesteError
            ? <div style={{ fontSize: 12, color: '#C0392B', marginTop: 4 }}>{gaesteError}</div>
            : <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 4 }}>Mindestbestellung ab 8 Personen</div>
          }
        </div>

        {/* Datum */}
        <div style={S.field}>
          <label style={S.label}>📅 Wunschdatum</label>
          <input
            type="date"
            lang="de"
            value={data.datum}
            onChange={e => update("datum", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            style={S.input}
            className="mm-input"
          />
        </div>

        {/* Lieferung / Abholung */}
        <div style={S.field}>
          <label style={S.label}>🚚 Wie möchten Sie das Catering erhalten?</label>
          {(() => {
            const isDelivMode = ["nur_anlieferung", "anlieferung_rueckholung", "lieferung"].includes(data.lieferung);
            const zoneInfo = isDelivMode && data.plz?.length === 5
              ? getLieferzuschlag(data.plz, dbLieferzonen)
              : { zuschlag: null, rueckholungPreis: null, bekannt: false };
            const fmtPreis = (p) => p != null ? (p === 0 ? "kostenlos" : `+${p} €`) : "Preis auf Anfrage";
            if (!isDelivMode) {
              return (
                <div style={S.toggleGroup}>
                  <button type="button" onClick={() => update("lieferung", "selbstabholung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(data.lieferung === "selbstabholung" ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>Selbstabholung</div>
                    <div style={S.toggleDesc}>Ich hole das Catering selbst ab</div>
                  </button>
                  <button type="button" onClick={() => update("lieferung", "nur_anlieferung")} className="mm-btn-press"
                    style={S.toggleBtn}>
                    <div style={S.toggleLabel}>Lieferung</div>
                    <div style={S.toggleDesc}>Bitte zu meiner Adresse liefern</div>
                  </button>
                </div>
              );
            }
            return (
              <div>
                <button type="button" onClick={() => update("lieferung", "selbstabholung")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.cappuccino, fontFamily: "inherit", padding: "0 0 10px", display: "flex", alignItems: "center", gap: 4 }}>
                  ← Zurück zur Auswahl
                </button>
                <div style={S.toggleGroup}>
                  <button type="button"
                    onClick={() => update("lieferung", "nur_anlieferung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(["nur_anlieferung", "lieferung"].includes(data.lieferung) ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>📦 Nur Anlieferung</div>
                    <div style={S.toggleDesc}>{zoneInfo.bekannt ? fmtPreis(zoneInfo.zuschlag) : "PLZ eingeben für Preis"}</div>
                  </button>
                  <button type="button"
                    onClick={() => update("lieferung", "anlieferung_rueckholung")} className="mm-btn-press"
                    style={{ ...S.toggleBtn, ...(data.lieferung === "anlieferung_rueckholung" ? S.toggleBtnActive : {}) }}>
                    <div style={S.toggleLabel}>🔄 Anlieferung + Rückholung</div>
                    <div style={S.toggleDesc}>{zoneInfo.bekannt ? fmtPreis(zoneInfo.rueckholungPreis) : "PLZ eingeben für Preis"}</div>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* PLZ */}
        <div style={S.field}>
          <label style={S.label}>
            📍 Postleitzahl {["nur_anlieferung", "anlieferung_rueckholung", "lieferung"].includes(data.lieferung) ? "des Veranstaltungsorts" : "(zur Orientierung)"}
          </label>
          <input
            type="text"
            value={data.plz}
            onChange={e => update("plz", e.target.value)}
            placeholder="z.B. 16767"
            maxLength={5}
            style={S.input}
            className="mm-input"
          />
        </div>

        <button
          onClick={next}
          disabled={!canContinue}
          className="mm-btn-press"
          style={{
            ...S.primaryBtn,
            ...(canContinue ? {} : S.btnDisabled),
            marginTop: 12,
          }}
        >
          Weiter zum Paket →
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 4 — PAKET
   ══════════════════════════════════════════════════════════════════ */
const SLOT_SORT_ORDER = ['vorspeise', 'hauptgericht', 'beilage', 'salat', 'dessert'];
function slotSortKey(slot) {
  const l = (slot.label || '').toLowerCase();
  const idx = SLOT_SORT_ORDER.findIndex(k => l.includes(k));
  if (idx !== -1) return idx;
  if (slot.typ === 'fix') return SLOT_SORT_ORDER.length;
  return SLOT_SORT_ORDER.length + 1;
}

function slotFeatureText(slot) {
  const max = slot.max_auswahl || 1;
  return `${max}× ${slot.label}`;
}

function Step4Paket({ data, update, next, preise, paketFeatures }) {
  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 3 von 7</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Welches <em style={S.italic}>Paket</em> passt zu Ihnen?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Alle Pakete sind individuell anpassbar — ein guter Ausgangspunkt.
        </p>
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="mm-grid-3">
        {PAKETE.map((p, i) => {
          const preis = preise?.[p.id] || 0;
          const selected = data.paket === p.id;
          const isMittelpaket = p.id === "Genuss";
          const isFruehstueck = data.anlass === 'fruehstueck';
          const _slots = paketFeatures?.[p.id] || [];
          const dbFeatures = [..._slots]
            .sort((a, b) => slotSortKey(a) - slotSortKey(b))
            .filter(s => !s.label?.toLowerCase().includes('salat'))
            .map(slot => {
              if (isFruehstueck) {
                if (slot.typ === 'fix') return `${slot.label} inklusive`;
                const max = slot.max_auswahl || 1;
                return `${max}× ${slot.label} nach Wahl`;
              }
              return slotFeatureText(slot);
            })
            .filter(Boolean);
          const featureList = dbFeatures.length > 0 ? dbFeatures : p.features;
          return (
            <button
              key={p.id}
              onClick={() => { update("paket", p.id); setTimeout(next, 250); }}
              className="mm-card-hover mm-btn-press mm-fade"
              style={{
                ...S.paketCard,
                ...(isMittelpaket ? S.paketCardFeatured : {}),
                ...(selected ? S.paketCardActive : {}),
                animationDelay: `${i * 80}ms`,
              }}
            >
              {p.badge && (
                <div style={{
                  ...S.paketBadge,
                  background: isMittelpaket ? C.gold : C.cappuccino,
                  color: isMittelpaket ? C.burgundy : C.white,
                }}>
                  {p.badge}
                </div>
              )}
              <div style={{ ...S.paketName, color: isMittelpaket ? C.gold : C.burgundy }}>
                {p.name}
              </div>
              <div style={S.paketTagline}>{p.tagline}</div>

              <div style={S.paketPriceWrap}>
                <span style={S.paketPrice}>{formatEUR(preis)}</span>
                <span style={S.paketPriceUnit}>pro Person</span>
              </div>

              <div style={S.divider} />

              <ul style={S.paketFeatures}>
                {featureList.map((f, idx) => (
                  <li key={idx} style={S.paketFeatureItem}>
                    <span style={S.checkmark}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div style={{
                ...S.paketCta,
                background: isMittelpaket ? C.gold : C.burgundy,
                color: isMittelpaket ? C.burgundy : C.cream,
              }}>
                {p.name} wählen →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 5 — ANFRAGE
   ══════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════
   SCHRITT 5 — MENÜ ANPASSEN (NEU!)
   Stimmungsbilder + auswählbare Komponenten + Zusatzwünsche
   ══════════════════════════════════════════════════════════════════ */
function DietIcon({ dish }) {
  const sub = (dish.unterkategorie || "").toLowerCase().trim();
  if (dish.vegetarisch) return <span title="Vegetarisch" style={{ fontSize: 16, lineHeight: 1, marginRight: 5, flexShrink: 0 }}>🌱</span>;
  if (sub === "fisch") return <span title="Fisch" style={{ fontSize: 16, lineHeight: 1, marginRight: 5, flexShrink: 0 }}>🐟</span>;
  return <span title="Fleisch" style={{ fontSize: 16, lineHeight: 1, marginRight: 5, flexShrink: 0 }}>🍖</span>;
}

const UNTERKATEGORIE_LABELS = { salat: 'Salate', salate: 'Salate', suppe: 'Suppen', suppen: 'Suppen', häppchen: 'Häppchen', auflauf: 'Aufläufe', aufläufe: 'Aufläufe', fruehstueck_suess: 'Süßes & Gebäck', fruehstueck_glas: 'Im Glas' };

function groupByUnterkategorie(dishes) {
  const groups = [];
  const seen = {};
  for (const d of dishes) {
    const key = (d.unterkategorie || d.gruppe || "").toLowerCase().trim();
    if (!seen[key]) { seen[key] = true; groups.push({ key, items: [] }); }
    groups.find(g => g.key === key).items.push(d);
  }
  const multiGroup = groups.length > 1;
  return { groups, multiGroup };
}

function Step5Menue({ data, update, next, menuData, menuLoading, upgrades = {}, setUpgrades }) {
  if (menuLoading) return (
    <div className="mm-fade" style={{ textAlign: "center", padding: "60px 20px", color: "#A88968", fontFamily: "'DM Sans', sans-serif", fontSize: 18 }}>
      Lade Menü …
    </div>
  );

  if (!menuData) {
    return (
      <div className="mm-fade">
        <div style={S.heroBlock}>
          <h1 style={S.heroTitle} className="mm-hero-title">
            <em style={S.italic}>Fast geschafft</em>
          </h1>
          <p style={S.heroSub} className="mm-hero-sub">
            Ich erstelle Ihr Menü individuell nach unserer Beratung.
          </p>
        </div>
        <button onClick={next} className="mm-btn-press" style={{ ...S.primaryBtn, maxWidth: 400, margin: "0 auto", display: "block" }}>
          Weiter zu Extras →
        </button>
      </div>
    );
  }

  const auswahl = data.menue_auswahl || {};

  const getSelected = (label) => auswahl[label] || (auswahl[label] === undefined ? [] : auswahl[label]);
  const getSelectedArr = (label) => {
    const v = auswahl[label];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  };

  const setEinzel = (label, name) => update("menue_auswahl", { ...auswahl, [label]: name });
  const toggleMehrfach = (label, name, max) => {
    const cur = getSelectedArr(label);
    const next = cur.includes(name) ? cur.filter(x => x !== name) : (cur.length < max ? [...cur, name] : cur);
    update("menue_auswahl", { ...auswahl, [label]: next });
  };

  const wahlSlots = menuData.kategorien.filter(k => k.typ !== "fix");
  const alleGewaehlt = wahlSlots.every(k => {
    const kMax = k.max_auswahl || 1;
    const min = (k.min_auswahl > 1) ? k.min_auswahl : kMax;
    const effectiveMax = (k.max_auswahl || 1) + (upgrades[k.label] ? 1 : 0);
    if (effectiveMax > 1) return getSelectedArr(k.label).length >= min;
    return !!auswahl[k.label];
  });

  return (
    <div className="mm-fade">
      <style>{`
        .mm-dish-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        @media (max-width: 640px) { .mm-dish-grid { grid-template-columns: 1fr !important; } }
        .mm-sticky-btn { position: sticky; bottom: 16px; z-index: 10; }
        @media (min-width: 641px) { .mm-sticky-btn { position: static; } }
      `}</style>

      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 4 von 7 · {data.paket}</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Ihr <em style={S.italic}>Menü</em>
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Stellen Sie Ihre Lieblings-Komponenten zusammen.
        </p>
      </div>

      {menuData.bilder.length > 0 && (
        <div style={S.menueBilder}>
          {menuData.bilder.map((url, i) => (
            <div key={i} style={{ ...S.menueBild, backgroundImage: `url(${url})`, animationDelay: `${i * 100}ms` }} className="mm-fade" />
          ))}
        </div>
      )}

      <div style={S.menueCard}>
        <div style={S.menueCardTitle}>Ihre Komponenten</div>

        {/* INKLUSIVE-Sektion: fix-Slots bei Frühstück */}
        {data.anlass === 'fruehstueck' && menuData.kategorien.some(k => k.typ === 'fix' && k.dishes?.length > 0) && (
          <div style={{ ...S.menueKategorie, borderBottom: `1px solid ${C.border}`, paddingBottom: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4CAF50', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              Inklusive
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {menuData.kategorien
                .filter(k => k.typ === 'fix' && k.dishes?.length > 0)
                .map((kat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: C.creamSoft, border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: '10px 14px', opacity: 0.8,
                  }}>
                    <span style={{ color: '#4CAF50', fontSize: 16, flexShrink: 0, fontWeight: 700 }}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.cappuccino }}>{kat.label}</div>
                      {kat.dishes.map(d => d.name).filter(n => n !== kat.label).join(', ') && (
                        <div style={{ fontSize: 12, color: C.cappuccino, opacity: 0.8, marginTop: 2 }}>
                          {kat.dishes.map(d => d.name).filter(n => n !== kat.label).join(', ')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px', flexShrink: 0 }}>
                      Inklusive
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {menuData.kategorien.map((kat, i) => {
          if (!kat.dishes || kat.dishes.length === 0) return null;
          if (data.anlass === 'fruehstueck' && kat.typ === 'fix') return null;
          const max = kat.max_auswahl ?? 1;
          const min = (kat.min_auswahl > 1) ? kat.min_auswahl : max;
          const effectiveMax = max + (upgrades[kat.label] ? 1 : 0);
          const isMulti = effectiveMax > 1;
          const selectedArr = getSelectedArr(kat.label);
          const selectedCount = selectedArr.length;
          const satisfied = isMulti ? selectedCount >= min : !!auswahl[kat.label];
          const upgradeInfo = UPGRADE_PREISE[(kat.kategorie || '').toLowerCase()];
          const alreadyUpgraded = !!upgrades[kat.label];
          const { groups, multiGroup } = groupByUnterkategorie(kat.dishes || []);

          return (
            <div key={i} style={S.menueKategorie}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={S.menueKatLabel}>{kat.label}</div>
                {kat.typ !== "fix" && (
                  <div style={{ fontSize: 12, color: satisfied ? "#4CAF50" : C.gold, fontWeight: 700 }}>
                    {isMulti
                      ? `${selectedCount} von ${effectiveMax} ausgewählt`
                      : (auswahl[kat.label] ? "✓ Ausgewählt" : "Bitte wählen")}
                  </div>
                )}
              </div>
              {kat.typ !== "fix" && !satisfied && (
                <div style={{ fontSize: 12, color: C.cappuccino, marginTop: 2, marginBottom: 6 }}>
                  {isMulti
                    ? `Bitte wählen Sie ${min === max ? `genau ${min}` : `${min}–${max}`} ${min === 1 ? "Gericht" : "Gerichte"}`
                    : "Bitte ein Gericht auswählen"}
                </div>
              )}

              {kat.typ === "fix" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {(kat.dishes || []).map((d, di) => (
                    <div key={di} style={S.menueFixItem}>
                      <span style={S.menueFixCheck}>✓</span>
                      <DietIcon dish={d} />
                      <span>{d.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {groups.map(({ key, items }) => (
                    <div key={key}>
                      {multiGroup && key && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.cappuccino, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>
                          {UNTERKATEGORIE_LABELS[key] || key}
                        </div>
                      )}
                      <div className="mm-dish-grid">
                        {items.map(dish => {
                          const isSelected = isMulti
                            ? selectedArr.includes(dish.name)
                            : auswahl[kat.label] === dish.name;
                          const isDisabled = isMulti && !isSelected && selectedCount >= effectiveMax;
                          return (
                            <button
                              key={dish.id}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => isMulti
                                ? toggleMehrfach(kat.label, dish.name, effectiveMax)
                                : setEinzel(kat.label, dish.name)
                              }
                              className="mm-btn-press"
                              style={{
                                ...S.menueWahlBtn,
                                ...(isSelected ? S.menueWahlBtnActive : {}),
                                ...(isDisabled ? { opacity: 0.4, cursor: "not-allowed" } : {}),
                                textAlign: "left",
                                alignItems: "center",
                              }}
                            >
                              {isMulti ? (
                                <span style={{
                                  width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? C.gold : C.border}`,
                                  background: isSelected ? C.gold : "transparent", flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.burgundy,
                                }}>
                                  {isSelected && "✓"}
                                </span>
                              ) : (
                                <span style={{ ...S.menueRadio, ...(isSelected ? S.menueRadioActive : {}) }}>
                                  {isSelected && <span style={S.menueRadioInner} />}
                                </span>
                              )}
                              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <DietIcon dish={dish} />
                                {dish.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {kat.typ !== "fix" && upgradeInfo && !alreadyUpgraded && data.anlass !== 'fruehstueck' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Optional</div>
                  <button
                    type="button"
                    onClick={() => setUpgrades(prev => ({ ...prev, [kat.label]: upgradeInfo.preis }))}
                    className="mm-btn-press"
                    style={{ background: 'transparent', border: `1.5px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + 1 {upgradeInfo.singular} · {upgradeInfo.preis.toFixed(2).replace('.', ',')} € p.P.
                  </button>
                </div>
              )}
              {kat.typ !== "fix" && alreadyUpgraded && upgradeInfo && data.anlass !== 'fruehstueck' && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.gold, fontStyle: 'italic' }}>
                  ✓ +1 {upgradeInfo.singular} ({upgradeInfo.preis.toFixed(2).replace('.', ',')} € p.P.) hinzugefügt
                  <button
                    type="button"
                    onClick={() => setUpgrades(prev => { const n = { ...prev }; delete n[kat.label]; return n; })}
                    style={{ marginLeft: 8, fontSize: 11, color: C.cappuccino, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                  >
                    entfernen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {data.anlass === 'fruehstueck' && ['Genuss', 'Premium'].includes(data.paket) && (
          <div style={{ ...S.menueKategorie, borderTop: `2px dashed ${C.border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={S.menueKatLabel}>Lachs-Upgrade</div>
            {!upgrades['Lachs-Upgrade'] ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>Optional</div>
                <button
                  type="button"
                  onClick={() => setUpgrades(prev => ({ ...prev, 'Lachs-Upgrade': 3.50 }))}
                  className="mm-btn-press"
                  style={{ background: 'transparent', border: `1.5px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.5 }}
                >
                  <div>+ Lachs-Upgrade · 3,50 € p.P.</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 3, opacity: 0.85 }}>Räucherlachs auf den Platten &amp; hausgemachte Eierkuchenlachsröllchen</div>
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: C.gold, fontStyle: 'italic' }}>
                ✓ Lachs-Upgrade (3,50 € p.P.) hinzugefügt
                <button
                  type="button"
                  onClick={() => setUpgrades(prev => { const n = { ...prev }; delete n['Lachs-Upgrade']; return n; })}
                  style={{ marginLeft: 8, fontSize: 11, color: C.cappuccino, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                >
                  entfernen
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ ...S.menueKategorie, marginTop: 24, paddingTop: 24, borderTop: `2px dashed ${C.border}` }}>
          <div style={S.menueKatLabel}>Anmerkungen (optional)</div>
          <textarea
            value={data.zusatzwuensche}
            onChange={e => update("zusatzwuensche", e.target.value)}
            placeholder="Allergien, Vegetarier, besondere Wünsche…"
            rows={3}
            style={{ ...S.input, resize: "vertical", fontFamily: "inherit", marginTop: 8 }}
            className="mm-input"
          />
        </div>

        <div className="mm-sticky-btn" style={{ marginTop: 24 }}>
          <button
            onClick={next}
            disabled={!alleGewaehlt}
            className="mm-btn-press"
            style={{ ...S.primaryBtn, ...(alleGewaehlt ? {} : S.btnDisabled), width: "100%" }}
          >
            {alleGewaehlt ? "Weiter zu Extras →" : "Bitte alle Pflichtfelder auswählen"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 6 — EXTRAS / ZUSATZWÜNSCHE
   ══════════════════════════════════════════════════════════════════ */
function Step6Extras({ data, update, next, zusatzwuensche }) {
  const selected = data.extras || [];
  const toggle = (label) => {
    const updated = selected.includes(label)
      ? selected.filter(x => x !== label)
      : [...selected, label];
    update("extras", updated);
  };
  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 6 von 7 · Optional</div>
        <h1 style={S.heroTitle} className="mm-hero-title">
          Noch etwas <em style={S.italic}>Besonderes</em>?
        </h1>
        <p style={S.heroSub} className="mm-hero-sub">
          Diese Extras sind optional — Preise auf Anfrage.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" }}>
        {/* Statische Option: Getränkeservice */}
        {(() => {
          const checked = selected.includes('Getränkeservice');
          return (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 14, background: checked ? C.burgundy : C.cream, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all .2s" }}>
              <input type="checkbox" checked={checked} onChange={() => toggle('Getränkeservice')} style={{ marginTop: 3, accentColor: C.gold, width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: checked ? C.cream : C.ink, fontSize: 15 }}>Getränkeservice</div>
                <div style={{ fontSize: 13, color: checked ? C.gold : C.cappuccino, marginTop: 2 }}>Auf Anfrage — wir besprechen gemeinsam das passende Getränkeangebot für Ihren Anlass.</div>
                <div style={{ fontSize: 12, color: checked ? C.gold : C.cappuccino, marginTop: 4, fontStyle: 'italic' }}>Preis auf Anfrage</div>
              </div>
            </label>
          );
        })()}
        {zusatzwuensche.map(z => {
          const checked = selected.includes(z.label);
          return (
            <label key={z.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, background: checked ? C.burgundy : C.cream, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all .2s" }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(z.label)} style={{ marginTop: 3, accentColor: C.gold, width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: checked ? C.cream : C.ink, fontSize: 15 }}>{z.label}</div>
                {z.beschreibung && <div style={{ fontSize: 13, color: checked ? C.gold : C.cappuccino, marginTop: 2 }}>{z.beschreibung}</div>}
              </div>
            </label>
          );
        })}
        {zusatzwuensche.length === 0 && (
          <p style={{ color: C.cappuccino, textAlign: "center", padding: "20px 0" }}>Keine Extras verfügbar.</p>
        )}
      </div>
      <button onClick={next} className="mm-btn-press" style={{ ...S.primaryBtn, maxWidth: 400, margin: "32px auto 0", display: "block" }}>
        Weiter zur Anfrage →
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCHRITT 7 — ANFRAGE
   ══════════════════════════════════════════════════════════════════ */
function Step7Anfrage({ data, update, onSubmit, submitting, preisProPerson, speisenPreis, lieferzuschlag, lieferInfo, gesamtpreis, dbThemen, upgrades = {}, upgradeSummeProPerson = 0 }) {
  const canSubmit = data.name.trim().length >= 2 && data.kontaktdaten.trim().length >= 5;
  const istLieferung = ["lieferung", "nur_anlieferung", "anlieferung_rueckholung"].includes(data.lieferung);
  const lieferzoneUnbekannt = istLieferung && !lieferInfo.bekannt;
  const LIEFER_LABELS = { selbstabholung: "Selbstabholung", abholung: "Selbstabholung", nur_anlieferung: "Nur Anlieferung", anlieferung_rueckholung: "Anlieferung + Rückholung", lieferung: "Lieferung" };

  return (
    <div className="mm-fade">
      <div style={S.heroBlock}>
        <div style={S.heroEyebrow}>Schritt 7 von 7</div>
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

          <SummaryRow label="Anlass"   value={ANLAESSE[data.anlass]?.label} />
          <SummaryRow label="Thema"    value={(dbThemen[data.anlass] || []).find(t => t.id === data.thema)?.name} />
          <SummaryRow label="Gäste"    value={`${data.gaeste} Personen`} />
          <SummaryRow label="Datum"    value={data.datum ? new Date(data.datum).toLocaleDateString("de-DE", { day:"2-digit", month:"long", year:"numeric" }) : "—"} />
          <SummaryRow label="Ort"      value={`${data.plz} (${LIEFER_LABELS[data.lieferung] || data.lieferung})`} />
          <SummaryRow label="Paket"    value={data.paket} />

          {/* Menü-Auswahl */}
          {data.menue_auswahl && Object.keys(data.menue_auswahl).length > 0 && (
            <>
              <div style={S.summarySubDivider} />
              <div style={S.summarySubTitle}>Ihre Auswahl</div>
              {Object.entries(data.menue_auswahl).map(([label, value]) => {
                const display = Array.isArray(value) ? value.join(", ") : value;
                if (!display) return null;
                return <SummaryRow key={label} label={label} value={display} />;
              })}
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

          {/* Aufschlüsselung: Speisen + Lieferung */}
          <div style={S.summaryBreakdown}>
            <div style={S.summaryBreakdownRow}>
              <span style={S.summaryBreakdownLabel}>
                Speisen ({formatEUR(preisProPerson)} × {data.gaeste})
              </span>
              <span style={S.summaryBreakdownValue}>{formatEUR(speisenPreis)}</span>
            </div>
            {upgradeSummeProPerson > 0 && (
              <div style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>Upgrades ({Object.keys(upgrades).join(', ')})</span>
                <span style={S.summaryBreakdownValue}>{formatEUR(upgradeSummeProPerson * (data.gaeste || 0))}</span>
              </div>
            )}
            {istLieferung && (
              <div style={S.summaryBreakdownRow}>
                <span style={S.summaryBreakdownLabel}>{LIEFER_LABELS[data.lieferung] || "Lieferung"}</span>
                <span style={S.summaryBreakdownValue}>
                  {lieferzoneUnbekannt
                    ? "auf Anfrage"
                    : lieferzuschlag === 0
                      ? "kostenlos"
                      : formatEUR(lieferzuschlag)
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
            <div style={S.summaryPriceBig}>{formatEUR(gesamtpreis)}</div>
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
              style={S.input}
              className="mm-input"
            />
          </div>

          {/* Notizen */}
          <div style={S.field}>
            <label style={S.label}>Anmerkungen (optional)</label>
            <textarea
              value={data.notizen}
              onChange={e => update("notizen", e.target.value)}
              placeholder="Wünsche, Allergien, besondere Anlässe…"
              rows={3}
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

          <div style={S.privacyNote}>
            Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten zur Bearbeitung Ihrer Anfrage zu.
            Es entstehen keine Kosten und keine Verpflichtungen.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ERFOLGSSEITE
   ══════════════════════════════════════════════════════════════════ */
function SuccessScreen({ angebotsId, kontaktart }) {
  const kontaktLabel = KONTAKT_OPTIONEN.find(k => k.id === kontaktart)?.label;
  return (
    <div className="mm-fade" style={S.successWrap}>
      <div style={S.successCard}>
        <div style={S.successIcon}>✓</div>
        <h1 style={S.successTitle}>
          <em style={S.italic}>Vielen Dank!</em>
        </h1>
        <p style={S.successText}>
          Ihre Anfrage ist bei mir eingegangen. Ich melde mich innerhalb von <strong>24 Stunden</strong> persönlich
          per <strong>{kontaktLabel}</strong> bei Ihnen.
        </p>

        <div style={S.successIdBox}>
          <div style={S.successIdLabel}>Ihre Anfrage-Nummer</div>
          <div style={S.successIdNumber}>{angebotsId}</div>
        </div>

        <p style={S.successFooter}>
          Mit Vorfreude auf Ihr Event,<br />
          <em style={S.italic}>Jana Ketelhohn</em>
        </p>

        <a href="/" style={S.successBackLink}>← Zurück zur Startseite</a>
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

/* ════════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════════ */
const S = {
  /* Root & Layout */
  root: {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${C.creamSoft} 0%, ${C.cream} 60%)`,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    color: C.ink,
    display: "flex",
    flexDirection: "column",
  },

  /* Header */
  header: {
    background: C.burgundy,
    padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(28,16,8,.08)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
  logoMain: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 700,
    color: C.gold,
    fontStyle: "italic",
    letterSpacing: ".5px",
  },
  logoSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: C.cream,
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginTop: 2,
    opacity: .8,
  },
  backBtn: {
    background: "transparent",
    border: `1.5px solid ${C.gold}`,
    color: C.gold,
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .2s",
  },

  /* Stepper */
  stepperWrap: {
    background: C.cream,
    padding: "20px 16px",
    borderBottom: `1px solid ${C.border}`,
  },
  stepper: {
    maxWidth: 800,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: C.cream,
    border: `2px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: C.cappuccino,
    transition: "all .3s",
    zIndex: 2,
    position: "relative",
  },
  stepCircleActive: {
    background: C.burgundy,
    borderColor: C.burgundy,
    color: C.gold,
    transform: "scale(1.15)",
    boxShadow: `0 0 0 4px ${C.gold}33`,
  },
  stepCircleDone: {
    background: C.gold,
    borderColor: C.gold,
    color: C.burgundy,
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 6,
    letterSpacing: ".5px",
    textTransform: "uppercase",
    transition: "color .3s",
  },
  stepLine: {
    position: "absolute",
    top: 16,
    left: "60%",
    right: "-40%",
    height: 2,
    transition: "background .4s",
    zIndex: 1,
  },

  /* Main */
  main: {
    flex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    width: "100%",
    padding: "40px 20px 60px",
  },

  /* Hero Block */
  heroBlock: {
    textAlign: "center",
    marginBottom: 40,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: "3px",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 48,
    fontWeight: 600,
    color: C.burgundy,
    margin: "0 0 16px",
    lineHeight: 1.15,
    letterSpacing: "-.5px",
  },
  italic: {
    fontStyle: "italic",
    color: C.gold,
    fontWeight: 400,
  },
  heroSub: {
    fontSize: 18,
    color: C.inkSoft,
    margin: 0,
    lineHeight: 1.5,
    maxWidth: 560,
    marginInline: "auto",
  },

  /* Grids */
  grid: {
    display: "grid",
    gap: 16,
  },

  /* Step 1: Anlass-Karten */
  anlassCard: {
    background: C.white,
    border: `2px solid ${C.border}`,
    borderRadius: 20,
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    padding: 0,
    boxShadow: "0 2px 8px rgba(28,16,8,.04)",
    display: "flex",
    flexDirection: "column",
  },
  anlassCardActive: {
    borderColor: C.gold,
    boxShadow: `0 8px 24px ${C.gold}40`,
    transform: "translateY(-4px)",
  },
  anlassImage: {
    height: 160,
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 12,
  },
  anlassIconBig: {
    fontSize: 48,
    filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))",
  },
  anlassContent: { padding: "20px 22px 22px" },
  anlassLabel: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: C.burgundy,
    marginBottom: 4,
  },
  anlassSubtitle: {
    fontSize: 12,
    color: C.gold,
    fontWeight: 600,
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  anlassDesc: {
    fontSize: 14,
    color: C.inkSoft,
    lineHeight: 1.5,
  },

  /* Step 2: Thema-Karten */
  themaCard: {
    background: C.white,
    border: `2px solid ${C.border}`,
    borderRadius: 20,
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    position: "relative",
    boxShadow: "0 2px 8px rgba(28,16,8,.04)",
    minHeight: 360,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  themaCardActive: {
    borderColor: C.gold,
    boxShadow: `0 8px 24px ${C.gold}40`,
  },
  themaImage: {
    height: 160,
    backgroundSize: "cover",
    backgroundPosition: "center",
    flexShrink: 0,
  },
  themaContent: {
    padding: "20px 24px 24px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  themaNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 64,
    fontWeight: 700,
    color: C.gold,
    fontStyle: "italic",
    lineHeight: 1,
    opacity: .35,
    marginBottom: 12,
  },
  themaNumberSmall: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 14,
    fontWeight: 600,
    color: C.gold,
    fontStyle: "italic",
    letterSpacing: "1px",
    marginBottom: 6,
  },
  themaName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: C.burgundy,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  themaDesc: {
    fontSize: 14,
    color: C.inkSoft,
    lineHeight: 1.6,
    flex: 1,
  },
  themaArrow: {
    fontSize: 22,
    color: C.gold,
    marginTop: 16,
    fontWeight: 300,
  },

  /* Step 5: Menü-Anpassung */
  menueBilder: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 24,
    maxWidth: 720,
    margin: "0 auto 24px",
  },
  menueBild: {
    aspectRatio: "1 / 1",
    borderRadius: 16,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 4px 12px rgba(28,16,8,.10)",
    animation: "fadeUp .5s ease-out backwards",
  },
  menueCard: {
    background: C.white,
    borderRadius: 24,
    padding: 32,
    maxWidth: 720,
    margin: "0 auto",
    boxShadow: "0 8px 32px rgba(28,16,8,.06)",
    border: `1px solid ${C.border}`,
  },
  menueCardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: C.burgundy,
    marginBottom: 24,
    fontStyle: "italic",
  },
  menueKategorie: {
    marginBottom: 20,
  },
  menueKatLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  menueFixItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: C.creamSoft,
    padding: "14px 16px",
    borderRadius: 12,
    fontSize: 15,
    color: C.ink,
    fontWeight: 500,
  },
  menueFixCheck: {
    color: C.gold,
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  menueWahlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  menueWahlBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: C.creamSoft,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15,
    color: C.ink,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all .2s",
  },
  menueWahlBtnActive: {
    background: C.white,
    borderColor: C.gold,
    boxShadow: `0 4px 12px ${C.gold}30`,
    fontWeight: 600,
  },
  menueRadio: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: `2px solid ${C.cappuccino}`,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .2s",
  },
  menueRadioActive: {
    borderColor: C.gold,
  },
  menueRadioInner: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: C.gold,
  },
  menueZusatzHint: {
    fontSize: 12,
    color: C.cappuccino,
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 1.5,
  },

  /* Step 3: Form */
  formCard: {
    background: C.white,
    borderRadius: 24,
    padding: 36,
    maxWidth: 560,
    margin: "0 auto",
    boxShadow: "0 8px 32px rgba(28,16,8,.06)",
    border: `1px solid ${C.border}`,
  },
  field: { marginBottom: 24 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: C.burgundy,
    marginBottom: 10,
    letterSpacing: ".3px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    background: C.creamSoft,
    color: C.ink,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "all .2s",
  },
  select: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    background: C.creamSoft,
    color: C.ink,
    fontFamily: "inherit",
    cursor: "pointer",
    boxSizing: "border-box",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%235C2818' d='M6 8L0 0h12z'/></svg>")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    paddingRight: 40,
  },

  /* Toggle */
  toggleGroup: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  toggleBtn: {
    background: C.creamSoft,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all .2s",
  },
  toggleBtnActive: {
    background: C.white,
    borderColor: C.gold,
    boxShadow: `0 4px 12px ${C.gold}30`,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: C.burgundy,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    color: C.inkSoft,
  },

  /* Buttons */
  primaryBtn: {
    width: "100%",
    background: C.burgundy,
    color: C.gold,
    border: "none",
    padding: "18px 24px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: ".3px",
    transition: "all .25s",
    boxShadow: `0 4px 16px ${C.burgundy}40`,
  },
  btnDisabled: {
    opacity: .4,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  /* Step 4: Pakete */
  paketCard: {
    background: C.white,
    border: `2px solid ${C.border}`,
    borderRadius: 24,
    padding: 32,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    position: "relative",
    boxShadow: "0 2px 8px rgba(28,16,8,.04)",
    display: "flex",
    flexDirection: "column",
  },
  paketCardFeatured: {
    background: C.burgundy,
    borderColor: C.gold,
    color: C.cream,
    transform: "scale(1.05)",
    boxShadow: `0 12px 32px ${C.burgundy}50`,
  },
  paketCardActive: {
    borderColor: C.gold,
    boxShadow: `0 12px 32px ${C.gold}50`,
  },
  paketBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 14px",
    borderRadius: 20,
    letterSpacing: "1px",
    textTransform: "uppercase",
    boxShadow: "0 2px 8px rgba(0,0,0,.15)",
  },
  paketName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 4,
  },
  paketTagline: {
    fontSize: 13,
    color: C.gold,
    fontWeight: 500,
    fontStyle: "italic",
    marginBottom: 24,
  },
  paketPriceWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
  },
  paketPrice: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 42,
    fontWeight: 700,
    color: C.gold,
  },
  paketPriceUnit: {
    fontSize: 13,
    opacity: .7,
  },
  paketTotal: {
    fontSize: 13,
    opacity: .65,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    background: "currentColor",
    opacity: .15,
    marginBottom: 20,
  },
  paketFeatures: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    flex: 1,
  },
  paketFeatureItem: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 1.5,
  },
  checkmark: {
    color: C.gold,
    fontWeight: 700,
    flexShrink: 0,
  },
  paketCta: {
    marginTop: 24,
    padding: "14px 18px",
    borderRadius: 12,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: ".3px",
  },

  /* Step 5: Anfrage */
  summaryCard: {
    background: C.burgundy,
    color: C.cream,
    borderRadius: 24,
    padding: 32,
    boxShadow: "0 8px 32px rgba(28,16,8,.15)",
    height: "fit-content",
  },
  summaryTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 700,
    color: C.gold,
    marginBottom: 24,
    fontStyle: "italic",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "10px 0",
    borderBottom: `1px solid ${C.cream}15`,
    gap: 16,
  },
  summaryLabel: {
    fontSize: 13,
    opacity: .7,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 600,
    textAlign: "right",
  },
  summaryDivider: {
    height: 2,
    background: C.gold,
    opacity: .3,
    margin: "20px 0 16px",
  },
  summarySubDivider: {
    height: 1,
    background: C.gold,
    opacity: .15,
    margin: "16px 0 8px",
  },
  summarySubTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 4,
  },
  summaryNotiz: {
    fontSize: 13,
    color: C.cream,
    fontStyle: "italic",
    lineHeight: 1.5,
    opacity: .9,
    padding: "4px 0 8px",
  },
  summaryBreakdown: {
    marginBottom: 16,
  },
  summaryBreakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "6px 0",
    gap: 12,
  },
  summaryBreakdownLabel: {
    fontSize: 13,
    opacity: .8,
  },
  summaryBreakdownValue: {
    fontSize: 14,
    fontWeight: 600,
    color: C.cream,
  },
  summaryPriceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  summaryPriceLabel: {
    fontSize: 12,
    opacity: .8,
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 4,
  },
  summaryPriceSmall: { fontSize: 12, opacity: .6 },
  summaryPriceBig: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 36,
    fontWeight: 700,
    color: C.gold,
    lineHeight: 1,
  },
  summaryNote: {
    fontSize: 11,
    opacity: .6,
    fontStyle: "italic",
    marginTop: 12,
  },

  /* Kontakt-Buttons */
  kontaktGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  kontaktBtn: {
    background: C.creamSoft,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    padding: "16px 8px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  kontaktBtnActive: {
    background: C.white,
    borderColor: C.gold,
    boxShadow: `0 4px 12px ${C.gold}40`,
  },
  kontaktIcon: { fontSize: 22 },
  kontaktLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: C.burgundy,
  },

  privacyNote: {
    fontSize: 11,
    color: C.cappuccino,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 1.5,
  },

  /* Erfolgs-Screen */
  successWrap: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    background: C.white,
    borderRadius: 32,
    padding: "60px 40px",
    maxWidth: 540,
    textAlign: "center",
    boxShadow: "0 16px 48px rgba(28,16,8,.10)",
    border: `2px solid ${C.gold}40`,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: C.gold,
    color: C.burgundy,
    fontSize: 40,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    boxShadow: `0 8px 24px ${C.gold}60`,
  },
  successTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 42,
    fontWeight: 700,
    color: C.burgundy,
    margin: "0 0 16px",
  },
  successText: {
    fontSize: 16,
    color: C.inkSoft,
    lineHeight: 1.6,
    marginBottom: 28,
  },
  successIdBox: {
    background: C.creamSoft,
    border: `2px dashed ${C.gold}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  successIdLabel: {
    fontSize: 11,
    color: C.gold,
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  successIdNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 700,
    color: C.burgundy,
    letterSpacing: "1px",
  },
  successFooter: {
    fontSize: 16,
    color: C.inkSoft,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  successBackLink: {
    display: "inline-block",
    color: C.gold,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    borderBottom: `2px solid ${C.gold}`,
    paddingBottom: 2,
  },

  /* Footer */
  footer: {
    background: C.burgundy,
    color: C.cream,
    padding: "20px 16px",
    textAlign: "center",
  },
  footerText: {
    fontSize: 12,
    opacity: .7,
    fontFamily: "'DM Sans', sans-serif",
  },
  footerLink: {
    color: 'inherit',
    textDecoration: 'none',
    opacity: 1,
  },
};
