import { fmtDate } from '../lib/time';
import { IconPlus, IconTrash } from '../lib/icons';

export default function Home({ trips, loading, onStart, onOpenTrip, onDelete, onSeeAll, onJoin }) {
  const shown = trips.slice(0, 4);

  return (
    <div>
      <button className="btn btn-primary home-cta" onClick={onStart}>
        <IconPlus /> Plan a new trip
      </button>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : !trips.length ? (
        <div className="empty-state fade-in">No trips yet — plan your first one above.</div>
      ) : (
        <>
          <div className="home-section-label">Recent trips</div>
          {shown.map(t => (
            <div className="saved-item" key={t.id} onClick={() => onOpenTrip(t.id)}>
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
          {trips.length > shown.length && (
            <button className="text-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={onSeeAll}>
              See all {trips.length} trips
            </button>
          )}
        </>
      )}

      <button className="text-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} onClick={onJoin}>
        Have a trip code? Join a shared trip
      </button>
    </div>
  );
}
