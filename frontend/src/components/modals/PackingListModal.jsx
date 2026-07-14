import { useEffect, useState } from 'react';
import { IconClose, IconCheck } from '../../lib/icons';

export default function PackingListModal({ trip, onGenerate, onToggleItem, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trip.packingList) runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGenerate() {
    setBusy(true);
    setError('');
    try {
      await onGenerate();
    } catch (err) {
      setError(err.message || "Couldn't build a packing list right now.");
    } finally {
      setBusy(false);
    }
  }

  const categories = trip.packingList || [];
  const checked = trip.packingChecked || {};

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>Packing list</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        {busy && <div className="empty-state">Building your list…</div>}
        {!busy && error && (
          <div className="empty-state">
            {error}<br />
            <button className="text-btn" style={{ marginTop: 10 }} onClick={runGenerate}>Try again</button>
          </div>
        )}
        {!busy && !error && !categories.length && <div className="empty-state">No packing list yet.</div>}
        {!busy && !error && categories.map(cat => (
          <div className="pack-category" key={cat.name}>
            <div className="pack-category-title">{cat.name}</div>
            {(cat.items || []).map(item => {
              const key = `${cat.name}::${item}`;
              const isChecked = !!checked[key];
              return (
                <div className={`pack-item${isChecked ? ' checked' : ''}`} key={key} onClick={() => onToggleItem(key)}>
                  <div className="pack-checkbox"><IconCheck /></div>
                  <div className="pack-item-label">{item}</div>
                </div>
              );
            })}
          </div>
        ))}
        {!busy && !error && categories.length > 0 && (
          <div className="pack-regen-row">
            <button className="text-btn" onClick={runGenerate}>Regenerate list</button>
          </div>
        )}
      </div>
    </div>
  );
}
