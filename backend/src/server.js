import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import './db/index.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { tripsRouter } from './routes/trips.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set — itinerary generation will fail. Copy .env.example to .env and fill it in.');
}

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/trips', tripsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Waypoint API listening on http://localhost:${port}`));
