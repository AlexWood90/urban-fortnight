import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

const DEFAULT_PROFILE = { name: '', homeCountry: '', homeCity: '', homeLocation: '', currency: 'USD', notes: '' };

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [onboarded, setOnboarded] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoaded(false); return; }
    const res = await api.get('/profile');
    setProfile(res.profile);
    setOnboarded(res.onboarded);
    setLoaded(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async (updated) => {
    const res = await api.put('/profile', updated);
    setProfile(res.profile);
    setOnboarded(true);
    return res.profile;
  };

  return (
    <ProfileContext.Provider value={{ profile, onboarded, loaded, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
