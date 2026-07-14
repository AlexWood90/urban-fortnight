import { useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { COUNTRIES, CITY_DATA } from '../../lib/countries';
import { currencySymbols } from '../../lib/format';
import { IconClose } from '../../lib/icons';

function CityField({ country, value, onChange }) {
  const cities = CITY_DATA[country];
  if (cities && cities.length) {
    return (
      <select value={cities.includes(value) ? value : (value ? '__other__' : '')} onChange={e => onChange(e.target.value === '__other__' ? '' : e.target.value)}>
        <option value="">Select a city…</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__other__">Other / not listed</option>
      </select>
    );
  }
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="City" />;
}

export default function ProfileModal({ isWelcome, onClose }) {
  const { profile, save } = useProfile();
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function persist() {
    setSaving(true);
    const homeLocation = [form.homeCity, form.homeCountry].filter(Boolean).join(', ');
    try {
      await save({ ...form, homeLocation });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persist();
    onClose();
  }
  async function handleSkip() {
    await persist();
    onClose();
  }
  async function handleDismiss() {
    if (isWelcome) await persist();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isWelcome ? 'Welcome to Waypoint' : 'Your profile'}</h2>
          <button className="icon-btn" onClick={handleDismiss} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 18px' }}>
          {isWelcome
            ? "A little about you helps tailor your trips — currency for cost estimates, and any context worth factoring in. You can skip this and fill it in anytime from the profile icon."
            : 'This helps tailor your trips — currency for cost estimates, and any context worth factoring in. Nothing here is required.'}
        </p>
        <div className="field">
          <label>Name (optional)</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
        </div>
        <div className="field edit-row2">
          <div>
            <label>Home country (optional)</label>
            <select value={form.homeCountry} onChange={e => { set('homeCountry', e.target.value); set('homeCity', ''); }}>
              <option value="">Select a country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Home city (optional)</label>
            <CityField country={form.homeCountry} value={form.homeCity} onChange={v => set('homeCity', v)} />
          </div>
        </div>
        <div className="field">
          <label>Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)}>
            {Object.keys(currencySymbols).map(c => <option key={c} value={c}>{c} ({currencySymbols[c].trim()})</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Anything else worth knowing? (optional)</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Dietary restrictions, mobility needs, travel style, allergies..." />
        </div>
        <div className="modal-btn-row">
          {isWelcome && <button className="modal-delete" style={{ flex: 1 }} onClick={handleSkip} disabled={saving}>Skip for now</button>}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}
