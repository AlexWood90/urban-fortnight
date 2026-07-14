import { Router } from 'express';
import { nanoid, customAlphabet } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getTrip, listTripsForUser, createTrip, saveTripData, deleteTrip,
  getAccessRole, setShareCode, findTripByShareCode, grantAccess,
} from '../services/trips-store.js';
import { subscribe, unsubscribe } from '../services/events.js';
import { daysBetween, buildCitiesPlan, computeCitiesWithDates } from '../services/trip-plan.js';
import {
  generateItinerary, regenerateDay, generatePackingList,
  fetchWeatherForCity, fetchPhotoForQuery,
} from '../services/anthropic.js';

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

const genShareCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

function getProfile(userId) {
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  return {
    name: row?.name || '', homeCountry: row?.home_country || '', homeCity: row?.home_city || '',
    homeLocation: row?.home_location || '', currency: row?.currency || 'USD', notes: row?.notes || '',
  };
}

function loadTripOr404(req, res) {
  const trip = getTrip(req.params.id, req.user.id);
  if (!trip) { res.status(404).json({ error: 'Trip not found.' }); return null; }
  return trip;
}

function stripMeta(trip) {
  const { id, ownerId, shareCode, role, createdAt, updatedAt, ...data } = trip;
  return data;
}

tripsRouter.get('/', (req, res) => {
  res.json({ trips: listTripsForUser(req.user.id) });
});

tripsRouter.post('/generate', async (req, res) => {
  const {
    destination, startDate, endDate, staying, interests = [], pace, budget,
    travelers, arrival, transport, notes, extraCities = [],
  } = req.body || {};

  if (!destination || !startDate || !endDate) {
    return res.status(400).json({ error: 'Destination and dates are required.' });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'End date is before the start date.' });
  }
  const numDays = daysBetween(startDate, endDate);
  if (numDays > 14) {
    return res.status(400).json({ error: 'Keep trips to 14 days or fewer for a focused plan.' });
  }
  const plan = buildCitiesPlan(destination, numDays, extraCities);
  if (plan.error) return res.status(400).json({ error: plan.error });

  const cities = plan.cities;
  const isMultiCity = cities.length > 1;
  const { citiesWithDates, dayCityMap } = computeCitiesWithDates(cities, startDate);
  const userProfile = getProfile(req.user.id);

  try {
    const parsed = await generateItinerary({
      destination, startDate, endDate, staying, interests, pace, budget,
      travelers, arrival, transport, notes, numDays, isMultiCity, citiesWithDates, userProfile,
    });

    parsed.days.forEach((d, i) => {
      if (!d.activities || !Array.isArray(d.activities)) d.activities = [];
      d.city = dayCityMap[i] || cities[cities.length - 1]?.name || destination;
    });
    const routeDestination = isMultiCity ? cities.map(c => c.name).join(' → ') : (parsed.destination || destination);

    const tripData = {
      destination: routeDestination,
      cities: citiesWithDates,
      heroImageUrl: parsed.heroImageUrl || null,
      startDate, endDate, staying, pace, budget, travelers, arrival, transport, interests, notes,
      days: parsed.days,
      createdAt: new Date().toISOString(),
    };

    const id = 'trip_' + nanoid(16);
    const trip = createTrip(id, req.user.id, tripData);
    res.json({ trip });

    // Fire-and-forget enrichment: weather + verified photos. Any connected
    // SSE subscriber for this trip gets pushed an update once each lands.
    enrichWeather(id, req.user.id).catch(err => console.error('weather enrichment failed', err));
    enrichPhotos(id, req.user.id).catch(err => console.error('photo enrichment failed', err));
  } catch (err) {
    const msg = (err && err.message && err.message.length < 150) ? err.message : "Couldn't generate the itinerary. Please try again.";
    res.status(502).json({ error: msg });
  }
});

tripsRouter.get('/:id', (req, res) => {
  const trip = loadTripOr404(req, res);
  if (!trip) return;
  res.json({ trip });
});

// Full-document replace, mirroring the prototype's saveTrip(id, trip) which
// overwrites the whole JSON blob on every local edit (reorder, add/delete
// activity, packing checkbox, etc).
tripsRouter.put('/:id', (req, res) => {
  const role = getAccessRole(req.params.id, req.user.id);
  if (!role) return res.status(404).json({ error: 'Trip not found.' });
  const data = req.body?.trip;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Missing trip data.' });
  saveTripData(req.params.id, data);
  res.json({ trip: getTrip(req.params.id, req.user.id) });
});

tripsRouter.delete('/:id', (req, res) => {
  const role = getAccessRole(req.params.id, req.user.id);
  if (role !== 'owner') return res.status(403).json({ error: 'Only the trip owner can delete it.' });
  deleteTrip(req.params.id);
  res.json({ ok: true });
});

tripsRouter.post('/:id/regenerate-day', async (req, res) => {
  const trip = loadTripOr404(req, res);
  if (!trip) return;
  const dayIdx = Number(req.body?.dayIdx);
  if (!Number.isInteger(dayIdx) || !trip.days[dayIdx]) {
    return res.status(400).json({ error: 'Invalid day index.' });
  }
  try {
    const userProfile = getProfile(req.user.id);
    const parsed = await regenerateDay({ trip, dayIdx, userProfile });
    const day = trip.days[dayIdx];
    const verifiedPhoto = trip.cityPhotos && trip.cityPhotos[day.city];
    trip.days[dayIdx] = {
      date: day.date, city: day.city,
      theme: parsed.theme || day.theme,
      imageUrl: verifiedPhoto || parsed.imageUrl || null,
      weather: day.weather || null,
      activities: parsed.activities || [],
    };
    saveTripData(req.params.id, stripMeta(trip));
    res.json({ trip: getTrip(req.params.id, req.user.id) });
  } catch (err) {
    res.status(502).json({ error: "Couldn't regenerate this day. Please try again." });
  }
});

tripsRouter.post('/:id/packing-list', async (req, res) => {
  const trip = loadTripOr404(req, res);
  if (!trip) return;
  try {
    const userProfile = getProfile(req.user.id);
    trip.packingList = await generatePackingList({ trip, userProfile });
    if (!trip.packingChecked) trip.packingChecked = {};
    saveTripData(req.params.id, stripMeta(trip));
    res.json({ trip: getTrip(req.params.id, req.user.id) });
  } catch (err) {
    res.status(502).json({ error: "Couldn't build a packing list right now." });
  }
});

async function enrichWeather(tripId, userId) {
  const trip = getTrip(tripId, userId);
  if (!trip) return;
  const daysOut = daysBetween(new Date().toISOString().slice(0, 10), trip.startDate) - 1;
  if (daysOut > 15) return;
  const cities = (trip.cities && trip.cities.length) ? trip.cities : [{ name: trip.destination, from: trip.startDate, to: trip.endDate }];
  let changed = false;
  for (const city of cities) {
    const byDate = await fetchWeatherForCity(city.name, city.from, city.to);
    trip.days.forEach(day => {
      if (day.city && day.city !== city.name) return;
      const wx = byDate[day.date];
      if (wx && wx.available) { day.weather = wx; changed = true; }
    });
  }
  if (changed) saveTripData(tripId, stripMeta(trip));
}

async function enrichPhotos(tripId, userId) {
  const trip = getTrip(tripId, userId);
  if (!trip) return;
  const cities = (trip.cities && trip.cities.length) ? trip.cities : [{ name: trip.destination }];
  if (!trip.cityPhotos) trip.cityPhotos = {};
  let changed = false;
  for (const city of cities) {
    if (trip.cityPhotos[city.name]) continue;
    const url = await fetchPhotoForQuery(city.name);
    if (url) { trip.cityPhotos[city.name] = url; changed = true; }
  }
  if (!changed && trip.heroImageUrl) return;
  if (trip.cityPhotos[cities[0].name]) { trip.heroImageUrl = trip.cityPhotos[cities[0].name]; changed = true; }
  trip.days.forEach(day => {
    if (!day.imageUrl) {
      const cityName = day.city || cities[0].name;
      if (trip.cityPhotos[cityName]) { day.imageUrl = trip.cityPhotos[cityName]; changed = true; }
    }
  });
  if (changed) saveTripData(tripId, stripMeta(trip));
}

// Explicit re-fetch, used when opening a saved trip that never got weather/photos.
tripsRouter.post('/:id/enrich', (req, res) => {
  const trip = loadTripOr404(req, res);
  if (!trip) return;
  if (!trip.days.some(d => d.weather)) enrichWeather(req.params.id, req.user.id).catch(err => console.error(err));
  if (!trip.heroImageUrl) enrichPhotos(req.params.id, req.user.id).catch(err => console.error(err));
  res.json({ ok: true });
});

// ---- Live sharing ----
tripsRouter.post('/:id/share', (req, res) => {
  const role = getAccessRole(req.params.id, req.user.id);
  if (role !== 'owner') return res.status(403).json({ error: 'Only the trip owner can share it.' });
  const trip = getTrip(req.params.id, req.user.id);
  if (trip.shareCode) return res.json({ shareCode: trip.shareCode });
  const code = genShareCode();
  setShareCode(req.params.id, code);
  res.json({ shareCode: code });
});

tripsRouter.post('/join', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const row = findTripByShareCode(code);
  if (!row) return res.status(404).json({ error: "No trip found for that code." });
  if (row.owner_id !== req.user.id) grantAccess(row.id, req.user.id, 'editor');
  res.json({ trip: getTrip(row.id, req.user.id) });
});

// ---- Server-Sent Events: live updates for owner + collaborators ----
tripsRouter.get('/:id/events', (req, res) => {
  const role = getAccessRole(req.params.id, req.user.id);
  if (!role) return res.status(404).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':ok\n\n');
  subscribe(req.params.id, res);

  const heartbeat = setInterval(() => res.write(':hb\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe(req.params.id, res);
  });
});
