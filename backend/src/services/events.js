// In-process SSE broadcaster. Since the API server is the only writer of trip
// data, any mutation it makes can be pushed straight to connected clients —
// no polling needed, and no separate pub/sub broker required at this scale.
const subscribers = new Map(); // tripId -> Set<res>

export function subscribe(tripId, res) {
  if (!subscribers.has(tripId)) subscribers.set(tripId, new Set());
  subscribers.get(tripId).add(res);
}

export function unsubscribe(tripId, res) {
  const set = subscribers.get(tripId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) subscribers.delete(tripId);
}

export function broadcastTripUpdate(tripId) {
  const set = subscribers.get(tripId);
  if (!set) return;
  for (const res of set) {
    res.write(`event: trip_updated\ndata: ${JSON.stringify({ tripId })}\n\n`);
  }
}
