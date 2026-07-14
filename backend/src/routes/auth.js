import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { sendMagicLink } from '../services/mail.js';
import { getSessionUser, SESSION_COOKIE_NAME } from '../middleware/auth.js';

export const authRouter = Router();

const LINK_TTL_MINUTES = 15;
const SESSION_TTL_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// SameSite=Lax cookies aren't sent on cross-origin fetch/EventSource calls,
// only on top-level navigation — fine as long as the frontend reaches this
// API through a same-origin proxy (the Vite dev proxy locally; a reverse
// proxy in production). If you deploy frontend and backend on genuinely
// different origins instead, switch to sameSite:'none' + secure:true (HTTPS
// required) so the browser will still send the cookie cross-site.
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

authRouter.post('/request-link', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60 * 1000).toISOString();
  db.prepare('INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, ?)').run(token, email, expiresAt);

  const link = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/auth/verify?token=${token}`;
  try {
    await sendMagicLink(email, link);
  } catch (err) {
    console.error('Failed to send magic link', err);
    return res.status(500).json({ error: 'Could not send sign-in email right now.' });
  }
  res.json({ ok: true });
});

authRouter.post('/verify', (req, res) => {
  const token = String(req.body?.token || '');
  const row = db.prepare(`
    SELECT * FROM magic_links WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).get(token);
  if (!row) {
    return res.status(400).json({ error: 'This sign-in link is invalid or has expired. Request a new one.' });
  }
  db.prepare('UPDATE magic_links SET used_at = datetime(\'now\') WHERE token = ?').run(token);

  let user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(row.email);
  if (!user) {
    const id = nanoid();
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, row.email);
    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(id);
    user = { id, email: row.email };
  }

  const sessionToken = nanoid(48);
  const sessionExpires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(sessionToken, user.id, sessionExpires);

  res.cookie(SESSION_COOKIE_NAME, sessionToken, cookieOptions());
  res.json({ user });
});

authRouter.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});
