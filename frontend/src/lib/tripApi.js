import { api } from './api';

const META_KEYS = ['id', 'ownerId', 'shareCode', 'role', 'createdAt', 'updatedAt'];

// Backend stamps id/ownerId/shareCode/role/createdAt/updatedAt onto every trip
// object it returns; strip them back off before round-tripping a trip through
// PUT so we never persist a stale copy inside the JSON blob.
export function stripMeta(trip) {
  const copy = { ...trip };
  META_KEYS.forEach(k => delete copy[k]);
  return copy;
}

export const tripApi = {
  list: () => api.get('/trips').then(r => r.trips),
  get: (id) => api.get(`/trips/${id}`).then(r => r.trip),
  generate: (payload) => api.post('/trips/generate', payload).then(r => r.trip),
  save: (id, trip) => api.put(`/trips/${id}`, { trip: stripMeta(trip) }).then(r => r.trip),
  remove: (id) => api.delete(`/trips/${id}`),
  regenerateDay: (id, dayIdx) => api.post(`/trips/${id}/regenerate-day`, { dayIdx }).then(r => r.trip),
  packingList: (id) => api.post(`/trips/${id}/packing-list`).then(r => r.trip),
  enrich: (id) => api.post(`/trips/${id}/enrich`),
  share: (id) => api.post(`/trips/${id}/share`).then(r => r.shareCode),
  join: (code) => api.post('/trips/join', { code }).then(r => r.trip),
  eventsUrl: (id) => `${api.base}/api/trips/${id}/events`,
};
