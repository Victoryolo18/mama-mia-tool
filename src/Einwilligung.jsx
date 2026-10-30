import React, { useEffect, useState } from "react";
import { S } from "./theme.js";
import { useTexte } from "./angebot/Sprache.jsx";
import { CLARITY_ID, OEFFNEN, aktuell, entferneClarity, ladeClarity, speichere } from "./einwilligung.js";

/* Einwilligungs-Banner des Generators, gleich wie auf der Website (Einwilligung.astro). Es erscheint nur, wenn es noch
   keine Entscheidung gibt; wer auf mama-mia-events.de schon akzeptiert oder abgelehnt hat, sieht es hier nicht.
   Der Link „Cookie-Einstellungen“ im Fuß schickt das Ereignis OEFFNEN; dann zeigt es die Kästchen mit der bisherigen
   Wahl. Steht in main.jsx neben dem Generator, damit es auch beim Laden und bei Fehlern da ist.
   Clarity lädt nur mit Einwilligung. */
export default function Einwilligung() {
  const t = useTexte().cookieBanner;
  const [stand, setStand] = useState(() => aktuell());
  const [einstellungen, setEinstellungen] = useState(false);
  const [wahl, setWahl] = useState({ statistik: false, bewertungen: false });

  useEffect(() => {
    if (stand?.statistik) ladeClarity();
  }, [stand]);

  useEffect(() => {
    const oeffne = () => {
      const jetzt = aktuell();
      setWahl({ statistik: !!jetzt?.statistik, bewertungen: !!jetzt?.bewertungen });
      setEinstellungen(true);
    };
    window.addEventListener(OEFFNEN, oeffne);
    return () => window.removeEventListener(OEFFNEN, oeffne);
  }, []);

  if (stand && !einstellungen) return null;

  const entscheide = (neu) => {
    const vorher = stand;
    const gespeichert = speichere({ statistik: !!CLARITY_ID && neu.statistik, bewertungen: neu.bewertungen });
    // Ein Widerruf entfernt geladene Dienste nur mit einem Neuladen der Seite.
    if (vorher?.statistik && !gespeichert.statistik) {
      entferneClarity();
      window.location.reload();
      return;
    }
    setEinstellungen(false);
    setStand(gespeichert);
  };

  const kaestchen = (name, text) => (
    <label style={S.einwilligungKaestchen}>
      <input
        type="checkbox"
        name={name}
        checked={wahl[name]}
        onChange={(e) => setWahl((w) => ({ ...w, [name]: e.target.checked }))}
        style={{ width: 20, height: 20 }}
      />
      {text}
    </label>
  );

  return (
    <section role="dialog" aria-labelledby="einwilligung-titel" data-einwilligung style={S.einwilligung}>
      <h2 id="einwilligung-titel" style={S.einwilligungTitel}>{t.titel}</h2>
      <p style={S.einwilligungText}>{t.mitStatistik}</p>
      <p style={S.einwilligungText}>
        {t.widerruf[0]}{" "}
        <a href="https://mama-mia-events.de/datenschutz" target="_blank" rel="noopener noreferrer" style={S.einwilligungLink}>{t.widerruf[1]}</a>
        {t.widerruf[2]}
      </p>
      {einstellungen && (
        <div style={S.einwilligungWahl} data-einwilligung-wahl>
          {kaestchen("statistik", t.statistik)}
          {kaestchen("bewertungen", t.bewertungen)}
        </div>
      )}
      <div style={S.einwilligungKnoepfe}>
        <button type="button" data-einwilligung-knopf="nein" style={{ ...S.einwilligungKnopf, ...S.einwilligungNein }} onClick={() => entscheide({ statistik: false, bewertungen: false })}>
          {t.ablehnen}
        </button>
        <button type="button" data-einwilligung-knopf="ja" style={S.einwilligungKnopf} onClick={() => entscheide({ statistik: true, bewertungen: true })}>
          {t.akzeptieren}
        </button>
        {einstellungen && (
          <button type="button" data-einwilligung-knopf="auswahl" style={{ ...S.einwilligungKnopf, ...S.einwilligungNein, flexBasis: "100%" }} onClick={() => entscheide(wahl)}>
            {t.speichern}
          </button>
        )}
      </div>
      {!einstellungen && (
        <button type="button" data-einwilligung-knopf="einstellungen" style={S.einwilligungMehr} onClick={() => setEinstellungen(true)}>
          {t.einstellungen}
        </button>
      )}
    </section>
  );
}
