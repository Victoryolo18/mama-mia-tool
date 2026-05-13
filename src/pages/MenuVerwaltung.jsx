import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import { C, ANLAESSE, PAKETE } from '../lib/theme.js';

/* ───────────────────────────────────────────────────────────────
 * MENÜ-VERWALTUNG — Phase 3 Stufe 1
 * 3 Sub-Tabs: Gerichte-Pool · Pakete & Slots · Lieferzonen
 * ─────────────────────────────────────────────────────────────── */

const KATEGORIEN = {
  hauptspeise:           { label: 'Hauptspeisen',         icon: '🍖' },
  vorspeise:             { label: 'Vorspeisen',           icon: '🥗' },
  beilage:               { label: 'Beilagen',             icon: '🥔' },
  salat:                 { label: 'Salate',               icon: '🥬' },
  dessert:               { label: 'Desserts',             icon: '🍰' },
  fingerfood:            { label: 'Fingerfood',           icon: '🥟' },
  fruehstueck_herzhaft:  { label: 'Frühstück (herzhaft)', icon: '🍳' },
  backwaren:             { label: 'Backwaren',            icon: '🥐' },
  obst_suess:            { label: 'Obst & Süßes',         icon: '🍓' },
  inklusiv:              { label: 'Inklusive',            icon: '✨' },
};

const TYP_LABEL = {
  fix:           'Immer dabei',
  wahl_einzel:   'Kunde wählt 1 aus',
  wahl_mehrfach: 'Mehrfachauswahl',
};

export default function MenuVerwaltung() {
  const [subTab, setSubTab] = useState('gerichte');

  return (
    <div>
      <div style={S.header}>
        <h1 style={S.h1}>Menü-Verwaltung</h1>
      </div>

      {/* Sub-Tabs */}
      <div style={S.subTabs}>
        {[
          ['gerichte',    '🍽️ Gerichte-Pool'],
          ['pakete',      '📦 Pakete & Slots'],
          ['lieferzonen', '🚚 Lieferzonen'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSubTab(k)}
            style={{
              ...S.subTab,
              ...(subTab === k ? S.subTabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'gerichte'    && <GerichtePool />}
      {subTab === 'pakete'      && <PaketeSlots />}
      {subTab === 'lieferzonen' && <Lieferzonen />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 1) GERICHTE-POOL
 * ═══════════════════════════════════════════════════════════════ */

function GerichtePool() {
  const [gerichte, setGerichte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ kategorie: 'alle', aktiv: 'alle', search: '' });
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gerichte')
      .select('*')
      .order('kategorie')
      .order('name');
    if (!error) setGerichte(data || []);
    else console.error('Load gerichte error:', error);
    setLoading(false);
  }

  async function toggleAktiv(g) {
    const { error } = await supabase
      .from('gerichte')
      .update({ aktiv: !g.aktiv })
      .eq('id', g.id);
    if (!error) await load();
  }

  const filtered = useMemo(() => gerichte.filter(g => {
    if (filter.kategorie !== 'alle' && g.kategorie !== filter.kategorie) return false;
    if (filter.aktiv === 'aktiv'   && !g.aktiv) return false;
    if (filter.aktiv === 'inaktiv' &&  g.aktiv) return false;
    if (filter.search && !g.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }), [gerichte, filter]);

  const counts = useMemo(() => {
    const c = {};
    Object.keys(KATEGORIEN).forEach(k => c[k] = 0);
    gerichte.forEach(g => { if (g.aktiv) c[g.kategorie] = (c[g.kategorie] || 0) + 1; });
    return c;
  }, [gerichte]);

  if (loading) return <div style={S.empty}>Lade Gerichte…</div>;

  return (
    <div>
      <div style={S.actionBar}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <input
            placeholder="🔍 Suchen…"
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
            style={{ ...S.input, width: 200 }}
            className="mm-input"
          />
          <select
            value={filter.kategorie}
            onChange={e => setFilter({ ...filter, kategorie: e.target.value })}
            style={S.select}
          >
            <option value="alle">Alle Kategorien</option>
            {Object.entries(KATEGORIEN).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label} ({counts[k] || 0})</option>
            ))}
          </select>
          <select
            value={filter.aktiv}
            onChange={e => setFilter({ ...filter, aktiv: e.target.value })}
            style={S.select}
          >
            <option value="alle">Alle (aktiv + inaktiv)</option>
            <option value="aktiv">Nur aktive</option>
            <option value="inaktiv">Nur inaktive</option>
          </select>
          <div style={S.resultCount}>{filtered.length} Gerichte</div>
        </div>
        <button onClick={() => setEditing({ isNew: true })} style={S.btnPrimary}>
          + Neues Gericht
        </button>
      </div>

      <div style={S.card}>
        {filtered.length === 0 ? (
          <div style={S.empty}>Keine Gerichte gefunden.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Kategorie</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Vegetarisch</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => {
                  const kat = KATEGORIEN[g.kategorie];
                  return (
                    <tr key={g.id} style={{ ...S.tr, background: i % 2 === 0 ? C.white : '#FDFBF8' }}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{g.name}</td>
                      <td style={S.td}>{kat?.icon} {kat?.label || g.kategorie}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>{g.vegetarisch ? '🌱' : '—'}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <button onClick={() => toggleAktiv(g)} style={S.toggleBtn(g.aktiv)}>
                          {g.aktiv ? '● Aktiv' : '○ Inaktiv'}
                        </button>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <button onClick={() => setEditing(g)} style={S.btnSecondarySmall}>
                          ✏️ Bearbeiten
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <GerichtEditModal
          gericht={editing.isNew ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function GerichtEditModal({ gericht, onClose, onSaved }) {
  const isNew = !gericht;
  const [form, setForm] = useState(gericht || {
    name: '',
    kategorie: 'hauptspeise',
    vegetarisch: false,
    aktiv: true,
    notiz: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name:        form.name.trim(),
      kategorie:   form.kategorie,
      vegetarisch: form.vegetarisch,
      aktiv:       form.aktiv,
      notiz:       form.notiz?.trim() || null,
    };
    if (!payload.name) { setError('Bitte einen Namen eingeben.'); setSaving(false); return; }

    let res;
    if (isNew) res = await supabase.from('gerichte').insert(payload);
    else       res = await supabase.from('gerichte').update(payload).eq('id', gericht.id);

    if (res.error) { setError(res.error.message); setSaving(false); }
    else { await onSaved(); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={S.modalTitle}>{isNew ? 'Neues Gericht' : 'Gericht bearbeiten'}</h2>

      <label style={S.lbl}>Name</label>
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        style={S.input}
        className="mm-input"
        placeholder="z.B. Rinderfilet mit Rotweinsauce"
        autoFocus
      />

      <label style={S.lbl}>Kategorie</label>
      <select
        value={form.kategorie}
        onChange={e => setForm({ ...form, kategorie: e.target.value })}
        style={S.select}
      >
        {Object.entries(KATEGORIEN).map(([k, v]) => (
          <option key={k} value={k}>{v.icon} {v.label}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
        <label style={S.checkLbl}>
          <input
            type="checkbox"
            checked={form.vegetarisch}
            onChange={e => setForm({ ...form, vegetarisch: e.target.checked })}
          />
          🌱 Vegetarisch
        </label>
        <label style={S.checkLbl}>
          <input
            type="checkbox"
            checked={form.aktiv}
            onChange={e => setForm({ ...form, aktiv: e.target.checked })}
          />
          ● Aktiv (sichtbar im Generator)
        </label>
      </div>

      <label style={S.lbl}>Interne Notiz (optional)</label>
      <textarea
        value={form.notiz || ''}
        onChange={e => setForm({ ...form, notiz: e.target.value })}
        style={{ ...S.input, height: 70, resize: 'vertical' }}
        placeholder="z.B. nur in Kalbsbrühe…"
      />

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.modalActions}>
        <button onClick={onClose} style={S.btnSecondary}>Abbrechen</button>
        <button onClick={save} disabled={saving} style={S.btnPrimary}>
          {saving ? 'Speichere…' : '💾 Speichern'}
        </button>
      </div>

      {!isNew && (
        <div style={S.modalHint}>
          💡 <strong>Hinweis:</strong> Gerichte werden nie gelöscht — nur deaktiviert.
          Inaktive Gerichte werden im Generator nicht angezeigt, bleiben aber für alte
          Anfragen einsehbar.
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 2) PAKETE & SLOTS
 * ═══════════════════════════════════════════════════════════════ */

function PaketeSlots() {
  const [anlass, setAnlass] = useState('hochzeit');
  const [paket,  setPaket]  = useState('Genuss');
  const [konfig, setKonfig] = useState(null);
  const [slots,  setSlots]  = useState([]);
  const [allGerichte, setAllGerichte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [preisDraft, setPreisDraft] = useState('');

  useEffect(() => { loadAll(); }, [anlass, paket]);

  async function loadAll() {
    setLoading(true);
    const { data: konfigData } = await supabase
      .from('paket_konfiguration').select('*')
      .eq('anlass', anlass).eq('paket', paket).single();
    setKonfig(konfigData);
    setPreisDraft(String(konfigData?.preis_pro_person ?? ''));

    if (konfigData) {
      const { data: slotsData } = await supabase
        .from('paket_slots')
        .select('*, slot_gerichte(id, reihenfolge, gericht:gerichte(id, name, kategorie, vegetarisch, aktiv))')
        .eq('paket_konfiguration_id', konfigData.id)
        .order('reihenfolge');
      setSlots(slotsData || []);
    }

    const { data: ger } = await supabase
      .from('gerichte').select('*').eq('aktiv', true).order('kategorie').order('name');
    setAllGerichte(ger || []);

    setLoading(false);
  }

  async function savePreis() {
    const p = parseFloat(preisDraft.replace(',', '.'));
    if (isNaN(p) || p < 0) { alert('Bitte gültigen Preis eingeben.'); return; }
    setSaving(true);
    await supabase.from('paket_konfiguration').update({ preis_pro_person: p }).eq('id', konfig.id);
    await loadAll();
    setSaving(false);
  }

  if (loading || !konfig) return <div style={S.empty}>Lade Paket-Konfiguration…</div>;

  return (
    <div>
      <div style={S.sectionLabel}>1. Anlass wählen</div>
      <div style={S.pillRow}>
        {Object.entries(ANLAESSE).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setAnlass(k)}
            style={{ ...S.pillBtn, ...(anlass === k ? S.pillBtnActive : {}) }}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div style={{ ...S.sectionLabel, marginTop: 24 }}>2. Paket wählen</div>
      <div style={S.pillRow}>
        {PAKETE.map(p => (
          <button
            key={p}
            onClick={() => setPaket(p)}
            style={{ ...S.pillBtn, ...(paket === p ? S.pillBtnActive : {}) }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ ...S.card, marginTop: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: C.cappuccino, fontWeight: 600, marginBottom: 4 }}>
              Preis pro Person für „{ANLAESSE[anlass]?.label} · {paket}"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={preisDraft}
                onChange={e => setPreisDraft(e.target.value)}
                style={{ ...S.input, width: 100, fontSize: 18, fontWeight: 700 }}
                className="mm-input"
              />
              <span style={{ fontSize: 18, fontWeight: 700 }}>€</span>
              <button
                onClick={savePreis}
                disabled={saving || preisDraft === String(konfig.preis_pro_person)}
                style={S.btnPrimary}
              >
                {saving ? 'Speichere…' : '💾 Preis speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...S.sectionLabel, marginTop: 32 }}>
        3. Menü-Aufbau (Slots) <span style={{ color: C.cappuccino, fontWeight: 400 }}>· {slots.length} Slots</span>
      </div>

      {slots.length === 0 ? (
        <div style={S.empty}>Noch keine Slots für dieses Paket angelegt.</div>
      ) : (
        slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            allGerichte={allGerichte}
            position={idx}
            totalSlots={slots.length}
            onChange={loadAll}
          />
        ))
      )}

      <button onClick={async () => {
        const { error } = await supabase.from('paket_slots').insert({
          paket_konfiguration_id: konfig.id,
          label: 'Neuer Slot',
          kategorie: 'hauptspeise',
          typ: 'wahl_einzel',
          min_auswahl: 1,
          max_auswahl: 1,
          reihenfolge: slots.length,
        });
        if (error) alert('Fehler: ' + error.message);
        else await loadAll();
      }} style={{ ...S.btnSecondary, marginTop: 16 }}>
        + Neuen Slot hinzufügen
      </button>
    </div>
  );
}

function SlotCard({ slot, allGerichte, position, totalSlots, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    label:       slot.label,
    kategorie:   slot.kategorie,
    typ:         slot.typ,
    min_auswahl: slot.min_auswahl,
    max_auswahl: slot.max_auswahl,
  });
  const [showAddGericht, setShowAddGericht] = useState(false);

  const zugewieseneIds = new Set((slot.slot_gerichte || []).map(sg => sg.gericht?.id));
  const verfuegbareGerichte = allGerichte.filter(g =>
    g.kategorie === slot.kategorie && !zugewieseneIds.has(g.id)
  );

  async function saveSlot() {
    let { min_auswahl, max_auswahl, typ } = form;
    min_auswahl = parseInt(min_auswahl) || 0;
    max_auswahl = parseInt(max_auswahl) || 1;

    if (typ === 'fix') {
      const n = slot.slot_gerichte?.length || 0;
      min_auswahl = n;
      max_auswahl = n;
    }
    if (typ === 'wahl_einzel') { min_auswahl = 1; max_auswahl = 1; }
    if (typ === 'wahl_mehrfach') {
      if (max_auswahl < min_auswahl) max_auswahl = min_auswahl;
      if (min_auswahl < 1) min_auswahl = 1;
    }

    const { error } = await supabase
      .from('paket_slots')
      .update({
        label:     form.label.trim() || 'Slot',
        kategorie: form.kategorie,
        typ,
        min_auswahl,
        max_auswahl,
      })
      .eq('id', slot.id);
    if (error) { alert(error.message); return; }
    setEditing(false);
    await onChange();
  }

  async function deleteSlot() {
    if (!window.confirm(`Slot „${slot.label}" wirklich löschen?\n(Die Gerichte selbst bleiben im Pool.)`)) return;
    await supabase.from('paket_slots').delete().eq('id', slot.id);
    await onChange();
  }

  async function moveSlot(direction) {
    const newPos = position + direction;
    if (newPos < 0 || newPos >= totalSlots) return;
    const { data: nachbarn } = await supabase
      .from('paket_slots').select('id, reihenfolge')
      .eq('paket_konfiguration_id', slot.paket_konfiguration_id)
      .order('reihenfolge');
    const others = nachbarn || [];
    const me = others.find(o => o.id === slot.id);
    const target = others[newPos];
    if (!me || !target) return;
    await supabase.from('paket_slots').update({ reihenfolge: 9999 }).eq('id', me.id);
    await supabase.from('paket_slots').update({ reihenfolge: me.reihenfolge }).eq('id', target.id);
    await supabase.from('paket_slots').update({ reihenfolge: target.reihenfolge }).eq('id', me.id);
    await onChange();
  }

  async function addGericht(gerichtId) {
    const n = slot.slot_gerichte?.length || 0;
    const { error } = await supabase
      .from('slot_gerichte')
      .insert({ slot_id: slot.id, gericht_id: gerichtId, reihenfolge: n });
    if (error) { alert(error.message); return; }
    setShowAddGericht(false);
    await onChange();
  }

  async function removeGericht(slotGerichtId) {
    await supabase.from('slot_gerichte').delete().eq('id', slotGerichtId);
    await onChange();
  }

  return (
    <div style={S.slotCard}>
      <div style={S.slotHeader}>
        {editing ? (
          <>
            <input
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              style={{ ...S.input, flex: 1, marginRight: 12, fontWeight: 700 }}
              className="mm-input"
              autoFocus
            />
            <button onClick={saveSlot} style={S.btnPrimary}>💾 Speichern</button>
            <button onClick={() => setEditing(false)} style={S.btnSecondary}>Abbrechen</button>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={S.slotPos}>{position + 1}</span>
              {slot.label}
              <span style={S.slotMeta}>
                {KATEGORIEN[slot.kategorie]?.icon} {KATEGORIEN[slot.kategorie]?.label} ·
                {' '}{TYP_LABEL[slot.typ]}
                {slot.typ === 'wahl_mehrfach' && ` (${slot.min_auswahl}–${slot.max_auswahl} aus ${slot.slot_gerichte?.length || 0})`}
                {slot.typ === 'wahl_einzel' && ` (1 aus ${slot.slot_gerichte?.length || 0})`}
                {slot.typ === 'fix' && ` (${slot.slot_gerichte?.length || 0} Stück)`}
              </span>
            </div>
            <button onClick={() => moveSlot(-1)} disabled={position === 0} style={S.iconBtn} title="Hoch">↑</button>
            <button onClick={() => moveSlot(1)} disabled={position === totalSlots - 1} style={S.iconBtn} title="Runter">↓</button>
            <button onClick={() => setEditing(true)} style={S.btnSecondarySmall}>✏️ Bearbeiten</button>
            <button onClick={deleteSlot} style={{ ...S.btnSecondarySmall, color: C.red }}>🗑️</button>
          </>
        )}
      </div>

      {editing && (
        <div style={S.slotEditBlock}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.lbl}>Kategorie</label>
              <select
                value={form.kategorie}
                onChange={e => setForm({ ...form, kategorie: e.target.value })}
                style={S.select}
              >
                {Object.entries(KATEGORIEN).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Auswahl-Typ</label>
              <select
                value={form.typ}
                onChange={e => setForm({ ...form, typ: e.target.value })}
                style={S.select}
              >
                <option value="fix">Immer dabei (Kunde wählt nicht)</option>
                <option value="wahl_einzel">Kunde wählt 1 aus</option>
                <option value="wahl_mehrfach">Mehrfachauswahl</option>
              </select>
            </div>
          </div>
          {form.typ === 'wahl_mehrfach' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={S.lbl}>Mindestens (min)</label>
                <input
                  type="number" min="1"
                  value={form.min_auswahl}
                  onChange={e => setForm({ ...form, min_auswahl: e.target.value })}
                  style={S.input} className="mm-input"
                />
              </div>
              <div>
                <label style={S.lbl}>Höchstens (max)</label>
                <input
                  type="number" min="1"
                  value={form.max_auswahl}
                  onChange={e => setForm({ ...form, max_auswahl: e.target.value })}
                  style={S.input} className="mm-input"
                />
              </div>
            </div>
          )}
          {form.typ === 'fix' && (
            <div style={S.hint}>
              💡 <strong>Immer dabei:</strong> Alle hier zugewiesenen Gerichte landen automatisch im Angebot.
            </div>
          )}
          {form.typ === 'wahl_einzel' && (
            <div style={S.hint}>
              💡 <strong>Kunde wählt 1 aus:</strong> Radio-Buttons im Generator.
            </div>
          )}
          {form.typ === 'wahl_mehrfach' && (
            <div style={S.hint}>
              💡 <strong>Mehrfachauswahl:</strong> Checkboxen im Generator. Kunde wählt zwischen min und max.
            </div>
          )}
        </div>
      )}

      <div style={S.gerichteListe}>
        {(slot.slot_gerichte || []).length === 0 ? (
          <div style={{ ...S.empty, padding: 16, fontSize: 13 }}>
            Noch keine Gerichte zugewiesen.
          </div>
        ) : (
          (slot.slot_gerichte || [])
            .filter(sg => sg.gericht)
            .map(sg => (
              <div key={sg.id} style={S.gerichtRow}>
                <span style={{ flex: 1 }}>
                  {sg.gericht.name}
                  {sg.gericht.vegetarisch && <span style={S.veggieBadge}>🌱</span>}
                  {!sg.gericht.aktiv && <span style={S.inaktivBadge}>inaktiv</span>}
                </span>
                <button
                  onClick={() => removeGericht(sg.id)}
                  style={S.removeBtn}
                  title="Aus diesem Slot entfernen (bleibt im Pool)"
                >
                  ✕
                </button>
              </div>
            ))
        )}

        {showAddGericht ? (
          <div style={S.addGerichtRow}>
            <select
              onChange={e => e.target.value && addGericht(e.target.value)}
              style={{ ...S.select, flex: 1 }}
              defaultValue=""
            >
              <option value="">— Gericht aus Pool wählen ({verfuegbareGerichte.length} verfügbar) —</option>
              {verfuegbareGerichte.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.vegetarisch ? '🌱' : ''}
                </option>
              ))}
            </select>
            <button onClick={() => setShowAddGericht(false)} style={S.btnSecondarySmall}>Abbrechen</button>
          </div>
        ) : (
          <button onClick={() => setShowAddGericht(true)} style={S.addGerichtBtn}>
            + Gericht hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 3) LIEFERZONEN
 * ═══════════════════════════════════════════════════════════════ */

function Lieferzonen() {
  const [zonen, setZonen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('lieferzonen').select('*').order('reihenfolge');
    setZonen(data || []);
    setDrafts({});
    setLoading(false);
  }

  function getDraft(z) {
    return drafts[z.id] || {
      zuschlag:    z.zuschlag,
      plz_liste:   z.plz_liste?.join(', ') || '',
      plz_pattern: z.plz_pattern || '',
      aktiv:       z.aktiv,
    };
  }

  function setDraft(zId, key, value) {
    const z = zonen.find(z => z.id === zId);
    setDrafts({ ...drafts, [zId]: { ...getDraft(z), [key]: value } });
  }

  async function save(z) {
    const d = getDraft(z);
    const zuschlag = parseFloat(String(d.zuschlag).replace(',', '.'));
    if (isNaN(zuschlag) || zuschlag < 0) { alert('Bitte gültigen Zuschlag.'); return; }
    const plz_liste = d.plz_liste.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase
      .from('lieferzonen')
      .update({
        zuschlag,
        plz_liste,
        plz_pattern: d.plz_pattern.trim() || null,
        aktiv: d.aktiv,
      })
      .eq('id', z.id);
    if (error) { alert(error.message); return; }
    await load();
  }

  if (loading) return <div style={S.empty}>Lade Lieferzonen…</div>;

  return (
    <div>
      <div style={S.hint}>
        💡 <strong>Wie funktionieren Lieferzonen?</strong> Im Generator gibt der Kunde eine PLZ ein.
        Stimmt sie mit einer PLZ aus der Liste überein, ODER fängt sie mit einem Pattern an
        (z.B. „13" für alle 13xxx), wird der Zuschlag berechnet.
      </div>

      {zonen.map(z => {
        const d = getDraft(z);
        const changed = JSON.stringify(d) !== JSON.stringify({
          zuschlag:    z.zuschlag,
          plz_liste:   z.plz_liste?.join(', ') || '',
          plz_pattern: z.plz_pattern || '',
          aktiv:       z.aktiv,
        });
        return (
          <div key={z.id} style={S.zoneCard}>
            <div style={S.zoneHeader}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{z.zone_name}</div>
              <label style={S.checkLbl}>
                <input
                  type="checkbox"
                  checked={d.aktiv}
                  onChange={e => setDraft(z.id, 'aktiv', e.target.checked)}
                />
                aktiv
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={S.lbl}>Zuschlag (€)</label>
                <input
                  type="text"
                  value={d.zuschlag}
                  onChange={e => setDraft(z.id, 'zuschlag', e.target.value)}
                  style={S.input}
                  className="mm-input"
                  placeholder="0"
                />
              </div>
              <div>
                <label style={S.lbl}>PLZ-Pattern (Komma-getrennt)</label>
                <input
                  type="text"
                  value={d.plz_pattern}
                  onChange={e => setDraft(z.id, 'plz_pattern', e.target.value)}
                  style={S.input}
                  className="mm-input"
                  placeholder="z.B. 13 oder 10,12,14"
                />
              </div>
            </div>

            <label style={S.lbl}>Konkrete PLZ-Liste (Komma-getrennt)</label>
            <textarea
              value={d.plz_liste}
              onChange={e => setDraft(z.id, 'plz_liste', e.target.value)}
              style={{ ...S.input, height: 60, resize: 'vertical' }}
              placeholder="z.B. 16767, 16515, 16761…"
            />

            {changed && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => { const d2 = { ...drafts }; delete d2[z.id]; setDrafts(d2); }} style={S.btnSecondary}>
                  Zurücksetzen
                </button>
                <button onClick={() => save(z)} style={S.btnPrimary}>
                  💾 Speichern
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * MODAL
 * ═══════════════════════════════════════════════════════════════ */

function Modal({ children, onClose }) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalContent} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={S.modalClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * STYLES
 * ═══════════════════════════════════════════════════════════════ */

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  h1:     { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.ink, margin: 0 },

  subTabs:       { display: 'flex', gap: 8, marginBottom: 24, borderBottom: `2px solid ${C.border}`, flexWrap: 'wrap' },
  subTab:        { padding: '10px 16px', border: 'none', background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: C.cappuccino, cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
  subTabActive:  { color: C.burgundy, borderBottomColor: C.gold },

  card:    { background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 0, overflow: 'hidden' },
  empty:   { padding: 40, textAlign: 'center', color: C.cappuccino, fontSize: 14 },

  actionBar:   { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  input:       { padding: '8px 12px', border: `2px solid ${C.border}`, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, background: C.white, color: C.ink },
  select:      { padding: '8px 12px', border: `2px solid ${C.border}`, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, background: C.white, color: C.ink, cursor: 'pointer' },
  resultCount: { fontSize: 13, color: C.cappuccino, fontWeight: 600 },

  btnPrimary:        { padding: '8px 16px', background: C.burgundy, color: C.cream, border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary:      { padding: '8px 16px', background: C.white, color: C.burgundy, border: `2px solid ${C.burgundy}`, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondarySmall: { padding: '4px 10px', background: C.white, color: C.cappuccino, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  iconBtn:           { padding: '4px 8px', background: C.white, color: C.cappuccino, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: 'pointer', minWidth: 28 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.cappuccino, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, background: '#FDFBF8' },
  tr:    { cursor: 'default', transition: 'background .15s' },
  td:    { padding: '12px 16px', fontSize: 14, color: C.ink, borderBottom: `1px solid ${C.border}` },

  toggleBtn: (aktiv) => ({
    padding: '4px 12px',
    border: `1.5px solid ${aktiv ? C.green : C.cappuccino}`,
    background: aktiv ? C.greenSoft : '#F5F0E8',
    color: aktiv ? C.green : C.cappuccino,
    borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  }),

  lbl:      { display: 'block', fontSize: 11, fontWeight: 700, color: C.cappuccino, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  checkLbl: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink, cursor: 'pointer', fontWeight: 600 },

  sectionLabel: { fontSize: 13, fontWeight: 700, color: C.burgundy, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  pillRow:       { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pillBtn:       { padding: '8px 14px', border: `2px solid ${C.border}`, background: C.white, color: C.cappuccino, borderRadius: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  pillBtnActive: { borderColor: C.gold, color: C.burgundy, background: '#FFF8E6' },

  slotCard:      { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 0, marginBottom: 12, overflow: 'hidden' },
  slotHeader:    { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#FDFBF8', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' },
  slotPos:       { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: C.gold, color: C.burgundy, fontSize: 12, fontWeight: 700 },
  slotMeta:      { fontSize: 12, color: C.cappuccino, fontWeight: 500 },
  slotEditBlock: { padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: '#FAFAFA' },
  gerichteListe: { padding: '10px 18px' },
  gerichtRow:    { display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 14 },
  veggieBadge:   { marginLeft: 8, fontSize: 12 },
  inaktivBadge:  { marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 8, background: '#F0F0F0', color: '#888', fontWeight: 600 },
  removeBtn:     { padding: '4px 8px', background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, fontWeight: 700 },
  addGerichtBtn: { marginTop: 10, padding: '8px 12px', background: '#FAFAFA', border: `1px dashed ${C.cappuccino}`, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.cappuccino, cursor: 'pointer', width: '100%' },
  addGerichtRow: { display: 'flex', gap: 8, marginTop: 10 },

  zoneCard:   { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  zoneHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },

  hint:     { padding: '12px 14px', background: '#FFF8E6', border: `1px solid ${C.gold}66`, borderRadius: 8, fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 },
  errorBox: { padding: '10px 14px', background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: 8, fontSize: 13, color: C.red, marginTop: 16 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalContent: { background: C.white, borderRadius: 12, padding: 28, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto', position: 'relative' },
  modalClose:   { position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', fontSize: 20, color: C.cappuccino, cursor: 'pointer', padding: 6 },
  modalTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.ink, margin: '0 0 8px 0' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  modalHint:    { marginTop: 16, padding: '10px 14px', background: '#FDFBF8', borderRadius: 8, fontSize: 12, color: C.cappuccino, lineHeight: 1.5 },
};
