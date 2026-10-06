import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SESSION_KEY, api, readSession } from '../api/client.js';
import { AuthContext, useAuth } from './useAuth.js';

const HEARTBEAT_MS = 4 * 60 * 1000;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const store = useCallback((data) => {
    if (data) localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    else localStorage.removeItem(SESSION_KEY);
    setSession(data);
  }, []);

  const signIn = useCallback((data) => store(data), [store]);
  const clear = useCallback(() => store(null), [store]);

  const signOut = useCallback(async () => {
    // Free the single admin session on the server so another admin can log in.
    try { await api.post('/auth/logout'); } catch { /* the session may already be gone */ }
    store(null);
  }, [store]);

  const updateAdmin = useCallback((admin) => {
    const current = readSession();
    if (current) store({ ...current, admin });
  }, [store]);

  const token = session?.token;

  // Keeps the session alive while the panel is open and detects if it was ended elsewhere.
  useEffect(() => {
    if (!token) return undefined;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      api.get('/auth/session')
        .then(({ data }) => { if (data.data.admin) updateAdmin(data.data.admin); })
        .catch((error) => { if (error.response?.status === 401) clear(); });
    };
    check();
    const interval = setInterval(check, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('srsb:unauthorized', clear);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('srsb:unauthorized', clear);
    };
  }, [token, clear, updateAdmin]);

  const value = useMemo(() => ({
    session,
    admin: session?.admin || null,
    canEdit: session?.mode === 'full',
    isOwner: session?.admin?.role === 'OWNER',
    signIn,
    signOut,
    updateAdmin,
  }), [session, signIn, signOut, updateAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
