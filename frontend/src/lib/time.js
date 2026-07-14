export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function findTodayDayIndex(trip) {
  return (trip.days || []).findIndex(d => d.date === todayStr());
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (isNaN(h) || isNaN(min)) return null;
  return h * 60 + min;
}

export function getDayStatus(day) {
  const acts = day.activities || [];
  const timed = acts.map((a, i) => ({ a, i, t: parseTimeToMinutes(a.time) })).filter(x => x.t != null);
  if (!timed.length) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let currentIdx = -1;
  for (let i = 0; i < timed.length; i++) {
    if (timed[i].t <= nowMin) currentIdx = i; else break;
  }
  if (currentIdx === -1) {
    return { type: 'upcoming', activity: timed[0].a, index: timed[0].i };
  }
  const current = timed[currentIdx];
  const next = timed[currentIdx + 1];
  return { type: 'now', activity: current.a, index: current.i, next: next ? next.a : null, nextIndex: next ? next.i : null };
}
