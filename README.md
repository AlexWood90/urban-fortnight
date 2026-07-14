# Waypoint

An AI trip-planning app: a short wizard collects destination, dates, interests,
pace, budget, and travel style, then an AI call generates a full day-by-day
itinerary with cost estimates, editable/reorderable activities, real weather
and photos, a packing list, and live trip sharing.

This is a rebuild of a single-file HTML prototype (originally built as a
Claude.ai artifact) into a real app: a React frontend and an Express +
SQLite backend, with the Anthropic API calls moved server-side behind a real
API key, real accounts (magic-link email auth), and live trip sharing backed
by a database and Server-Sent Events instead of client-side polling.

## Stack

- **Frontend**: React + Vite (`frontend/`), plain CSS porting the original's
  design system (Fraunces/Inter/IBM Plex Mono, coral/violet/gold gradient brand).
- **Backend**: Node/Express + better-sqlite3 (`backend/`).
- **Auth**: Magic-link email sign-in. In dev, the link is printed to the
  backend console instead of actually being emailed (see
  `backend/src/services/mail.js`) — swap in a real provider before shipping.
- **AI calls**: All five Anthropic API calls from the original prototype
  (itinerary generation, day regeneration, packing list, weather, photos) live
  server-side in `backend/src/services/anthropic.js`, using the same prompts
  and JSON schemas as the original, with the API key read from an environment
  variable and never sent to the client.
- **Live sharing**: A trip owner generates a 6-character code
  (`POST /api/trips/:id/share`); anyone who enters it
  (`POST /api/trips/join`) gets real, database-backed edit access
  (`trip_access` table). Every connected client (owner + collaborators) gets
  pushed live updates over Server-Sent Events whenever the trip changes —
  including background weather/photo enrichment landing — instead of the
  original prototype's 20-second polling.

## Getting started

Requires Node 20+.

### 1. Backend

```
cd backend
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY, and generate a SESSION_SECRET with
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Listens on `http://localhost:8787` by default. Uses a local SQLite file at
`backend/data/waypoint.db` (auto-created).

### 2. Frontend

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to the
backend (see `frontend/vite.config.js`) so the session cookie stays
same-origin — don't set `VITE_API_URL` in dev unless you've read the cookie
note in `backend/src/routes/auth.js` first.

### 3. Sign in

Enter any email on the sign-in screen. The magic link is printed to the
**backend terminal** (dev mode has no real mail provider configured) — copy
it into your browser to complete sign-in.

## Project layout

```
backend/
  src/
    db/            SQLite schema + connection
    services/       anthropic.js (AI calls), trips-store.js (data access),
                     events.js (SSE broadcaster), trip-plan.js (multi-city math),
                     mail.js (dev-mode magic link "sending")
    routes/          auth.js, profile.js, trips.js
    middleware/      auth.js (session cookie -> req.user)
frontend/
  src/
    components/      Hero, Home, Wizard, TripView, modals/
    context/         AuthContext, ProfileContext
    lib/             api.js, tripApi.js, format.js, time.js, icons.jsx, ...
    pages/           AuthGate, Login, AuthVerify, JoinTrip, WaypointApp
```

## What's different from the original prototype

See `backend/src/services/anthropic.js` for the ported prompts, and the brief
this was built from for the full list — in short:

1. Anthropic API calls moved server-side with a real API key (env var).
2. `window.storage` (artifact-only) replaced by SQLite + real REST endpoints.
3. Trip sharing is now backend-mediated with real access control and
   Server-Sent Events, not a client-side polling hack.
4. Real accounts via magic-link auth instead of "whatever's in this browser."

## Known limitations

- **Not tested against a real Anthropic API key** in this environment (no
  key was available) — the request/response wiring, prompts, and error
  handling were verified against the original prototype's logic and exercised
  with a deliberately invalid key to confirm errors surface correctly in the
  UI without losing the user's in-progress wizard input, but an actual
  successful generation call has not been observed. Everything else (auth,
  wizard, trip editing, day navigation, reordering, packing-list UI,
  multi-user live sharing over SSE, saved trips, profile) was exercised
  end-to-end in a browser.
- Dev-mode "email" just logs the magic link to the console — wire up a real
  provider (Postmark, Resend, SES, ...) in `backend/src/services/mail.js`
  before deploying.
- The model id used (`claude-sonnet-4-6`, matching the original artifact
  prototype) may not be a valid model for a real Anthropic API key —
  override with the `ANTHROPIC_MODEL` env var if generation fails with a
  model-not-found error.
