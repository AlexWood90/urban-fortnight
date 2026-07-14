import { useMemo, useState } from 'react';
import { fmtDate } from '../../lib/time';
import { IconClose, IconTrash } from '../../lib/icons';

export default function SavedTripsModal({ trips, onOpen, onDelete, onClose }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = trips.filter(t => !q || (t.destination || '').toLowerCase().includes(q));
    l = l.slice();
    if (sort === 'oldest') l.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    else if (sort === 'upcoming') l.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    else if (sort === 'az') l.sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
    else l.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return l;
  }, [trips, search, sort]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h2>Saved trips</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ background: 'var(--line)', color: 'var(--ink)' }}>
            <IconClose />
          </button>
        </div>
        {!trips.length ? (
          <div className="empty-state">No saved trips yet. Plan one to see it here.</div>
        ) : (
          <>
            <div className="saved-controls">
              <input type="text" placeholder="Search saved trips…" value={search} onChange={e => setSearch(e.target.value)} />
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="upcoming">Trip date (soonest)</option>
                <option value="az">Destination A–Z</option>
              </select>
            </div>
            {!list.length ? (
              <div className="empty-state">No trips match your search.</div>
            ) : (
              <div>
                {list.map(t => (
                  <div className="saved-item" key={t.id} onClick={() => onOpen(t.id)}>
                    <div>
                      <div className="saved-item-title">
                        {t.destination || 'Untitled trip'}
                        {t.role === 'editor' && <span className="role-badge">Shared</span>}
                      </div>
                      <div className="saved-item-meta">{fmtDate(t.startDate)} — {fmtDate(t.endDate)}</div>
                    </div>
                    <button className="saved-item-del" aria-label={`Delete ${t.destination || 'trip'}`}
                      onClick={e => { e.stopPropagation(); onDelete(t); }}>
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
