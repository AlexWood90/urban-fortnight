import { useState } from 'react';
import { catLabels, getCostRange } from '../../lib/format';
import { useProfile } from '../../context/ProfileContext';
import { IconClose } from '../../lib/icons';

export default function ActivityModal({ activity, onSave, onDelete, onClose }) {
  const { profile } = useProfile();
  const isNew = activity === null;
  const base = activity || { time: '', title: '', description: '', category: 'logistics', hours: '', price: '', website: '', estCostLow: null, estCostHigh: null };
  const existingRange = getCostRange(base);

  const [form, setForm] = useState({
    time: base.time || '',
    title: base.title || '',
    description: base.description || '',
    category: base.category || 'logistics',
    hours: base.hours || '',
    price: base.price || '',
    website: base.website || '',
    estCostLow: existingRange ? existingRange.low : '',
    estCostHigh: existingRange ? existingRange.high : '',
  });
  const [titleError, setTitleError] = useState(false);
  const [websiteError, setWebsiteError] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSave() {
    const website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) { setWebsiteError(true); return; }
    setWebsiteError(false);
    let estCostLow = form.estCostLow === '' ? null : Math.max(0, Math.round(Number(form.estCostLow)));
    let estCostHigh = form.estCostHigh === '' ? null : Math.max(0, Math.round(Number(form.estCostHigh)));
    if (estCostLow != null && estCostHigh == null) estCostHigh = estCostLow;
    if (estCostHigh != null && estCostLow == null) estCostLow = estCostHigh;
    if (estCostLow != null && estCostHigh != null && estCostLow > estCostHigh) [estCostLow, estCostHigh] = [estCostHigh, estCostLow];

    const title = form.title.trim();
    if (!title) { setTitleError(true); return; }
    setTitleError(false);

    onSave({
      time: form.time.trim(),
      title,
      description: form.description.trim(),
      category: form.category,
      hours: form.hours.trim() || null,
      price: form.price.trim() || null,
      estCostLow, estCostHigh,
      website: website || null,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isNew ? 'Add activity' : 'Edit activity'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        <div className="field edit-row2">
          <div>
            <label>Time</label>
            <input type="text" value={form.time} onChange={e => set('time', e.target.value)} placeholder="9:00 AM" />
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.keys(catLabels).map(k => <option key={k} value={k}>{catLabels[k]}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Title</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Visit the old town"
            style={titleError ? { borderColor: 'var(--coral)' } : undefined} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What happens here..." />
        </div>
        <div className="field edit-row2">
          <div>
            <label>Hours (optional)</label>
            <input type="text" value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="9am–5pm" />
          </div>
          <div>
            <label>Price note (optional)</label>
            <input type="text" value={form.price} onChange={e => set('price', e.target.value)} placeholder="$15, Free" />
          </div>
        </div>
        <div className="field edit-row2">
          <div>
            <label>Est. cost low ({profile.currency})</label>
            <input type="number" min="0" step="1" value={form.estCostLow} onChange={e => set('estCostLow', e.target.value)} placeholder="10" />
          </div>
          <div>
            <label>Est. cost high ({profile.currency})</label>
            <input type="number" min="0" step="1" value={form.estCostHigh} onChange={e => set('estCostHigh', e.target.value)} placeholder="20" />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Website (optional)</label>
          <input type="text" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..."
            style={websiteError ? { borderColor: 'var(--coral)' } : undefined} />
        </div>
        <div className="modal-btn-row">
          {!isNew && <button className="modal-delete" onClick={onDelete}>Delete</button>}
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
