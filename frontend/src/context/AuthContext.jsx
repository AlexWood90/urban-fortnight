import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guards against a stale response clobbering a newer one — e.g. the
  // mount-time /auth/me check (doubled by StrictMode) can still be in
  // flight when /auth/verify resolves; only the most recently issued
  // request's result is allowed to update state.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const { user } = await api.get('/auth/me');
      if (id === requestId.current) setUser(user);
    } catch {
      if (id === requestId.current) setUser(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // /auth/verify establishes the session itself via verify() below — running
    // the passive /auth/me check here too would race it (child effects run
    // before parent effects, so verify() fires first; a slower /me 401 could
    // still land after and stomp the freshly-set user back to null).
    if (window.location.pathname === '/auth/verify') { setLoading(false); return; }
    refresh();
  }, [refresh]);

  const requestLink = (email) => api.post('/auth/request-link', { email });

  const verify = async (token) => {
    const id = ++requestId.current;
    const { user } = await api.post('/auth/verify', { token });
    if (id === requestId.current) { setUser(user); setLoading(false); }
    return user;
  };

  const logout = async () => {
    const id = ++requestId.current;
    await api.post('/auth/logout');
    if (id === requestId.current) setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, requestLink, verify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
