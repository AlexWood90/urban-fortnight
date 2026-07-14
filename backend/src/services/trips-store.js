import { db } from '../db/index.js';
import { broadcastTripUpdate } from './events.js';

function rowToTrip(row, role) {
  // Spread the stored blob first, then stamp the authoritative DB columns on
  // top — a client PUT could otherwise smuggle a stale id/role/shareCode
  // through the JSON body and have it clobber the real values below.
  return {
    ...JSON.parse(row.data),
    id: row.id,
    ownerId: row.owner_id,
    shareCode: row.share_code || null,
    role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAccessRole(tripId, userId) {
  const row = db.prepare('SELECT owner_id FROM trips WHERE id = ?').get(tripId);
  if (!row) return null;
  if (row.owner_id === userId) return 'owner';
  const access = db.prepare('SELECT role FROM trip_access WHERE trip_id = ? AND user_id = ?').get(tripId, userId);
  return access ? access.role : null;
}

export function getTrip(tripId, userId) {
  const role = getAccessRole(tripId, userId);
  if (!role) return null;
  const row = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  return rowToTrip(row, role);
}

export function listTripsForUser(userId) {
  const owned = db.prepare('SELECT * FROM trips WHERE owner_id = ?').all(userId)
    .map(row => rowToTrip(row, 'owner'));
  const shared = db.prepare(`
    SELECT t.* FROM trips t
    JOIN trip_access a ON a.trip_id = t.id
    WHERE a.user_id = ?
  `).all(userId).map(row => rowToTrip(row, 'editor'));
  return [...owned, ...shared].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function createTrip(id, ownerId, data) {
  db.prepare('INSERT INTO trips (id, owner_id, data) VALUES (?, ?, ?)').run(id, ownerId, JSON.stringify(data));
  return getTrip(id, ownerId);
}

export function saveTripData(tripId, data) {
  db.prepare('UPDATE trips SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(data), tripId);
  broadcastTripUpdate(tripId);
}

export function deleteTrip(tripId) {
  db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
}

export function setShareCode(tripId, code) {
  db.prepare('UPDATE trips SET share_code = ? WHERE id = ?').run(code, tripId);
}

export function findTripByShareCode(code) {
  return db.prepare('SELECT * FROM trips WHERE share_code = ?').get(code);
}

export function grantAccess(tripId, userId, role = 'editor') {
  db.prepare('INSERT OR IGNORE INTO trip_access (trip_id, user_id, role) VALUES (?, ?, ?)').run(tripId, userId, role);
}
