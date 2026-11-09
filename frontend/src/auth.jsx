import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, readSession, saveSession, signOut } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!readSession()) { setLoading(false); return; }
      try {
        const result = await api('/api/auth/me/');
        if (active) setUser(result);
      } catch {
        if (active) { clearSession(); setUser(null); }
      } finally { if (active) setLoading(false); }
    };
    restore();
    const onExpired = () => { setUser(null); setExpired(true); };
    window.addEventListener('university-session-expired', onExpired);
    return () => { active = false; window.removeEventListener('university-session-expired', onExpired); };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login/', { method: 'POST', auth: false, body: { email, password } });
    saveSession({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    setExpired(false);
    return data.user;
  }, []);
  const logout = useCallback(async () => {
    setUser(null);
    await signOut();
  }, []);
  const value = useMemo(() => ({ user, loading, expired, login, logout, dismissExpired: () => setExpired(false) }), [user, loading, expired, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
