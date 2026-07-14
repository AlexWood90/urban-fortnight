import { useEffect, useRef, useState } from 'react';
import { fmtDate, findTodayDayIndex, todayStr, getDayStatus } from '../lib/time';
import { catLabels, calcDayCostRange, calcTripCostRange, dayCostKnown, formatCostRange, getCostRange } from '../lib/format';
import { useProfile } from '../context/ProfileContext';
import {
  IconPlus, IconClock, IconCost, IconRefresh, IconEdit, IconTrash,
  IconExternalLink, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconExport, IconPacking, IconShare, WeatherIcon,
} from '../lib/icons';
import ConfirmModal from './modals/ConfirmModal';
import AlertModal from './modals/AlertModal';
import ActivityModal from './modals/ActivityModal';

export default function TripView({ trip, onSaveTrip, onRegenerateDay, onOpenPacking, onOpenShare, onNewTrip }) {
  const { profile } = useProfile();
  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const ti = findTodayDayIndex(trip);
    return ti !== -1 ? ti : 0;
  });
  const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'confirm'|'alert'|'activity', ...props }
  const [regenerating, setRegenerating] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => {
    setActiveDayIdx(idx => Math.min(idx, Math.max(trip.days.length - 1, 0)));
  }, [trip.days.length]);

  useEffect(() => { setEditMode(false); }, [activeDayIdx]);

  const day = trip.days[activeDayIdx];
  if (!day) return <div className="empty-state">No day to show.</div>;

  function goToDay(idx) { setActiveDayIdx(idx); }

  function mutate(fn) {
    const next = structuredClone(trip);
    fn(next);
    onSaveTrip(next);
  }

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && activeDayIdx < trip.days.length - 1) goToDay(activeDayIdx + 1);
      else if (dx > 0 && activeDayIdx > 0) goToDay(activeDayIdx - 1);
    }
    touchStart.current = null;
  }

  async function handleRegenerateDay() {
    setModal(null);
    setRegenerating(true);
    try {
      await onRegenerateDay(activeDayIdx);
    } catch {
      setModal({ type: 'alert', title: "Couldn't regenerate this day", message: "Something went wrong reaching the planner. Your existing plan for this day hasn't changed — please try again." });
    } finally {
      setRegenerating(false);
    }
  }

  function handleRemoveDay() {
    setModal(null);
    const remaining = trip.days.length - 1;
    if (remaining === 0) { onNewTrip(); return; }
    const next = structuredClone(trip);
    next.days.splice(activeDayIdx, 1);
    onSaveTrip(next);
    setActiveDayIdx(idx => Math.min(idx, remaining - 1));
  }

  function moveActivity(dir) {
    mutate(t => {
      const acts = t.days[activeDayIdx].activities;
      const i = dir.index;
      const j = dir.dir === 'up' ? i - 1 : i + 1;
      [acts[i], acts[j]] = [acts[j], acts[i]];
    });
  }

  function saveActivity(actIdx, data) {
    mutate(t => {
      if (!t.days[activeDayIdx].activities) t.days[activeDayIdx].activities = [];
      if (actIdx === null) t.days[activeDayIdx].activities.push(data);
      else t.days[activeDayIdx].activities[actIdx] = data;
    });
    setModal(null);
  }

  function deleteActivity(actIdx) {
    mutate(t => { t.days[activeDayIdx].activities.splice(actIdx, 1); });
    setModal(null);
  }

  function exportTrip() {
    let text = `${trip.destination}\n${fmtDate(trip.startDate)} — ${fmtDate(trip.endDate)}\n`;
    const tripRange = calcTripCostRange(trip);
    if (tripRange.high > 0) text += `Estimated trip cost: ${formatCostRange(tripRange.low, tripRange.high, profile.currency)}\n`;
    text += `\n`;
    trip.days.forEach((d, i) => {
      const dayRange = calcDayCostRange(d);
      text += `DAY ${i + 1} — ${fmtDate(d.date)}${trip.cities && trip.cities.length > 1 && d.city ? ` — ${d.city}` : ''} — ${d.theme}${dayCostKnown(d) ? ` (${formatCostRange(dayRange.low, dayRange.high, profile.currency)})` : ''}\n`;
      (d.activities || []).forEach(act => {
        text += `  ${act.time}  ${act.title}\n    ${act.description}\n`;
        const extras = [];
        if (act.hours) extras.push(`Hours: ${act.hours}`);
        if (act.price) extras.push(`Price: ${act.price}`);
        const actRange = getCostRange(act);
        if (actRange) extras.push(`Est. cost: ${formatCostRange(actRange.low, actRange.high, profile.currency)}`);
        if (extras.length) text += `    ${extras.join(' · ')}\n`;
        if (act.website) text += `    ${act.website}\n`;
      });
      text += `\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${trip.destination.replace(/[^a-z0-9]+/gi, '-')}-itinerary.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const tripRange = calcTripCostRange(trip);
  const isToday = day.date === todayStr();
  const status = isToday ? getDayStatus(day) : null;
  const nowIndex = status?.type === 'now' ? status.index : -1;
  const wx = day.weather && day.weather.available ? day.weather : null;
  const photoUrl = day.imageUrl || trip.heroImageUrl || '';
  const acts = day.activities || [];
  const todayIdx = findTodayDayIndex(trip);

  return (
    <div>
      <div className="trip-actions">
        <button className="text-btn" onClick={onNewTrip}><IconPlus /> New trip</button>
        <button className="text-btn" onClick={onOpenPacking}><IconPacking /> Packing list</button>
        {trip.role !== 'editor' && <button className="text-btn" onClick={onOpenShare}><IconShare /> Share</button>}
        <button className="text-btn" onClick={exportTrip}><IconExport /> Export</button>
      </div>

      {tripRange.high > 0 && (
        <div className="trip-cost-bar">
          <span>Estimated trip cost</span>
          <strong>{formatCostRange(tripRange.low, tripRange.high, profile.currency)}</strong>
        </div>
      )}

      <div className="day-tabs">
        {trip.days.map((d, di) => {
          const dow = d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : `D${di + 1}`;
          return (
            <div key={di} className={`day-tab${di === activeDayIdx ? ' active' : ''}`} role="button" tabIndex={0}
              aria-label={`Day ${di + 1}, ${dow}`} aria-current={di === activeDayIdx ? 'true' : 'false'}
              onClick={() => goToDay(di)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDay(di); } }}>
              <div className="day-tab-num">{di + 1}</div>
              <div className="day-tab-dow">{dow}</div>
            </div>
          );
        })}
      </div>

      <div className="day-nav">
        <button className="day-nav-btn" aria-label="Previous day" disabled={activeDayIdx === 0} onClick={() => goToDay(activeDayIdx - 1)}>
          <IconChevronLeft />
        </button>
        <div className="day-nav-progress">
          DAY {activeDayIdx + 1} OF {trip.days.length}
          {todayIdx !== -1 && todayIdx !== activeDayIdx && (
            <button className="jump-today-btn" onClick={() => goToDay(todayIdx)}>Jump to today</button>
          )}
        </div>
        <button className="day-nav-btn" aria-label="Next day" disabled={activeDayIdx === trip.days.length - 1} onClick={() => goToDay(activeDayIdx + 1)}>
          <IconChevronRight />
        </button>
      </div>

      <div className="route" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="day-block">
          {isToday && (
            status?.type === 'now' ? (
              <div className="today-banner">
                <div className="today-banner-badge">Happening now</div>
                <div className="today-banner-title">{status.activity.title}</div>
                <div className="today-banner-next">{status.next ? `Next: ${status.next.title} at ${status.next.time || ''}` : 'Nothing else planned after this — enjoy!'}</div>
              </div>
            ) : status?.type === 'upcoming' ? (
              <div className="today-banner">
                <div className="today-banner-badge">Up next today</div>
                <div className="today-banner-title">{status.activity.title}</div>
                <div className="today-banner-next">{status.activity.time || ''}</div>
              </div>
            ) : (
              <div className="today-banner today-banner-quiet">
                <div className="today-banner-badge">Today</div>
                <div className="today-banner-title">Nothing timed left to track right now — enjoy the rest of your day!</div>
              </div>
            )
          )}

          <div className="day-card">
            <div className="day-photo-banner" style={{ filter: `hue-rotate(${(activeDayIdx * 35) % 360}deg)` }}>
              {photoUrl && <img src={photoUrl} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
              {wx && (
                <div className="weather-chip">
                  <span className="meta-icon" style={{ width: 15, height: 15 }}><WeatherIcon condition={wx.condition} /></span>
                  {wx.high}°<span className="weather-chip-lo">/{wx.low}°</span>
                </div>
              )}
              {photoUrl && photoUrl.includes('wikimedia.org') && (
                <a className="photo-credit" href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Photo: Wikimedia Commons</a>
              )}
            </div>
            <div className="day-head">
              <div className="day-head-inner">
                <div className="waypoint-pin">{activeDayIdx + 1}</div>
                <div className="day-head-left">
                  <div className="day-date">
                    {fmtDate(day.date)}
                    {trip.cities && trip.cities.length > 1 && day.city ? ` · ${day.city}` : ''}
                    {dayCostKnown(day) ? ` · ${(() => { const r = calcDayCostRange(day); return formatCostRange(r.low, r.high, profile.currency); })()}` : ''}
                  </div>
                  <div className="day-theme">{day.theme || ''}</div>
                </div>
              </div>
              <div className="day-head-actions">
                <button className="day-icon-btn" title="Regenerate this day" aria-label="Regenerate this day"
                  onClick={() => setModal({ type: 'confirm', title: 'Regenerate this day?', message: `This replaces all of ${fmtDate(day.date) || `Day ${activeDayIdx + 1}`}'s activities with a new plan. This can't be undone.`, confirmLabel: 'Regenerate', onConfirm: handleRegenerateDay })}>
                  <IconRefresh />
                </button>
                <button className={`day-icon-btn${editMode ? ' active' : ''}`} title="Edit & reorder" aria-label={editMode ? 'Done editing' : 'Edit and reorder activities'} aria-pressed={editMode}
                  onClick={() => setEditMode(m => !m)}>
                  <IconEdit />
                </button>
                <button className="day-icon-btn" title="Remove day" aria-label="Remove this day"
                  onClick={() => setModal({ type: 'confirm', title: 'Remove this day?', message: `This deletes all activities planned for ${fmtDate(day.date) || `Day ${activeDayIdx + 1}`}. This can't be undone.`, confirmLabel: 'Remove day', onConfirm: handleRemoveDay })}>
                  <IconTrash />
                </button>
              </div>
            </div>

            {regenerating ? (
              <div className="loading" style={{ padding: '50px 10px' }}>
                <div className="globe"></div>
                <div className="loading-text">Regenerating day {activeDayIdx + 1}…</div>
              </div>
            ) : (
              <>
                {editMode && <div className="edit-mode-hint">Tap an activity to edit it, or use the arrows to reorder</div>}
                <div className="activities">
                  {acts.map((act, ai) => {
                    const metaBits = [];
                    if (act.hours) metaBits.push(<span key="h"><span className="meta-icon"><IconClock /></span>{act.hours}</span>);
                    const costRange = getCostRange(act);
                    if (costRange) metaBits.push(<span key="c"><span className="meta-icon"><IconCost /></span>{formatCostRange(costRange.low, costRange.high, profile.currency)}</span>);
                    else if (act.price) metaBits.push(<span key="p"><span className="meta-icon"><IconCost /></span>{act.price}</span>);

                    return (
                      <div key={ai} className={`activity${editMode ? ' editing' : ''}${ai === nowIndex ? ' activity-now' : ''}`}
                        onClick={() => { if (editMode) setModal({ type: 'activity', actIdx: ai }); }}>
                        <div className="act-time">{act.time || ''}{ai === nowIndex && <span className="act-now-tag">NOW</span>}</div>
                        <div>
                          <div className="act-title">{act.title || ''}</div>
                          <div className="act-desc">{act.description || ''}</div>
                          {metaBits.length > 0 && <div className="act-meta">{metaBits.reduce((prev, cur) => prev === null ? [cur] : [...prev, ' · ', cur], null)}</div>}
                          <div className="act-cat-row">
                            <div className="act-cat">{catLabels[act.category] || act.category || ''}</div>
                            {act.website && (
                              <a className="act-link" href={act.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                Visit site <IconExternalLink />
                              </a>
                            )}
                          </div>
                        </div>
                        {editMode && (
                          <div className="act-reorder" onClick={e => e.stopPropagation()}>
                            <button aria-label="Move up" disabled={ai === 0} onClick={() => moveActivity({ index: ai, dir: 'up' })}><IconChevronUp /></button>
                            <button aria-label="Move down" disabled={ai === acts.length - 1} onClick={() => moveActivity({ index: ai, dir: 'down' })}><IconChevronDown /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {acts.some(a => a.hours || a.price || getCostRange(a)) && (
                    <div className="trust-note">Hours, prices &amp; costs are best-effort estimates, not live-verified — please confirm before you go.</div>
                  )}
                  {editMode && (
                    <button className="add-activity-btn" onClick={() => setModal({ type: 'activity', actIdx: null })}>
                      <IconPlus /> Add activity
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modal?.type === 'confirm' && (
        <ConfirmModal title={modal.title} message={modal.message} confirmLabel={modal.confirmLabel}
          onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'alert' && (
        <AlertModal title={modal.title} message={modal.message} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'activity' && (
        <ActivityModal
          activity={modal.actIdx === null ? null : acts[modal.actIdx]}
          onSave={data => saveActivity(modal.actIdx, data)}
          onDelete={() => deleteActivity(modal.actIdx)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
