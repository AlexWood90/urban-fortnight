import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

function toApi(row) {
  return {
    name: row?.name || '',
    homeCountry: row?.home_country || '',
    homeCity: row?.home_city || '',
    homeLocation: row?.home_location || '',
    currency: row?.currency || 'USD',
    notes: row?.notes || '',
  };
}

profileRouter.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  res.json({ profile: toApi(row), onboarded: !!row?.onboarded });
});

profileRouter.put('/', (req, res) => {
  const { name, homeCountry, homeCity, homeLocation, currency, notes } = req.body || {};
  db.prepare(`
    INSERT INTO profiles (user_id, name, home_country, home_city, home_location, currency, notes, onboarded)
    VALUES (@user_id, @name, @home_country, @home_city, @home_location, @currency, @notes, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      name=excluded.name, home_country=excluded.home_country, home_city=excluded.home_city,
      home_location=excluded.home_location, currency=excluded.currency, notes=excluded.notes, onboarded=1
  `).run({
    user_id: req.user.id,
    name: name || '',
    home_country: homeCountry || '',
    home_city: homeCity || '',
    home_location: homeLocation || '',
    currency: currency || 'USD',
    notes: notes || '',
  });
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
  res.json({ profile: toApi(row), onboarded: true });
});
