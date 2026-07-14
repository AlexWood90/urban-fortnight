// Empty string = relative requests, which the Vite dev server proxies to the
// backend (see vite.config.js) so cookies stay same-origin. In production,
// set VITE_API_URL only if the API is served from a different origin than
// the frontend — and see the cookie note in backend/src/routes/auth.js.
const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  base: API_BASE,
};

export { ApiError };
