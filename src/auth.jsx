import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { makeReq } from './api.js';

const AuthCtx = createContext(null);

const API_KEY     = 'gofamint_church_api_url';
const TOKEN_KEY   = 'gofamint_church_token';
const CHURCH_KEY  = 'gofamint_church_meta';
const STAFF_KEY   = 'gofamint_church_staff';
const BRANCHES_KEY = 'gofamint_church_branches';

const DEFAULT_API = import.meta.env.VITE_API_URL || 'https://api.gospelar.com';

const readJSON = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); }
  catch { return null; }
};

export function AuthProvider({ children }) {
  const [api, setApi]       = useState(() => localStorage.getItem(API_KEY) || DEFAULT_API);
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [church, setChurch] = useState(() => readJSON(CHURCH_KEY));
  const [staff, setStaff]       = useState(() => readJSON(STAFF_KEY));
  const [branches, setBranches] = useState(() => readJSON(BRANCHES_KEY) || []);

  const signIn = useCallback((apiUrl, tk, churchObj) => {
    const cleanApi = apiUrl.trim().replace(/\/$/, '');
    localStorage.setItem(API_KEY, cleanApi);
    localStorage.setItem(TOKEN_KEY, tk);
    localStorage.setItem(CHURCH_KEY, JSON.stringify(churchObj));
    setApi(cleanApi);
    setToken(tk);
    setChurch(churchObj);
  }, []);

  // Swap the backend URL without losing the current session. Used by the
  // Settings → Backend tab so an admin can point the dashboard at a
  // different deployment (e.g. localhost while developing) on the fly.
  const setApiUrl = useCallback((url) => {
    const clean = String(url || '').trim().replace(/\/$/, '');
    if (!clean) return;
    localStorage.setItem(API_KEY, clean);
    setApi(clean);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CHURCH_KEY);
    localStorage.removeItem(STAFF_KEY);
    localStorage.removeItem(BRANCHES_KEY);
    setToken('');
    setChurch(null);
    setStaff(null);
    setBranches([]);
  }, []);

  // Refresh staff + branches whenever the token changes. The first call after
  // login is what hydrates the role-switcher and the branch-switcher.
  const refreshMe = useCallback(async () => {
    if (!api || !token) return;
    try {
      const req = makeReq(api, token);
      const me  = await req('/api/church-admin/me');
      if (me?.staff) {
        setStaff(me.staff);
        localStorage.setItem(STAFF_KEY, JSON.stringify(me.staff));
      }
      if (Array.isArray(me?.branches)) {
        setBranches(me.branches);
        localStorage.setItem(BRANCHES_KEY, JSON.stringify(me.branches));
      }
      // If /me returns a fresher church row, prefer it.
      if (me?.church) {
        setChurch(me.church);
        localStorage.setItem(CHURCH_KEY, JSON.stringify(me.church));
      }
    } catch (e) {
      // Token invalid → sign out so the user doesn't sit on a broken session.
      if (e.status === 401 || e.status === 403) signOut();
      // 404 = backend hasn't been restarted with the new /me endpoint yet.
      // Surface a clear hint in devtools instead of failing silently.
      else if (e.status === 404) {
        console.warn(
          '[gospelar] /api/church-admin/me 404 — the backend has not been restarted ' +
          'with the new admin endpoints. Restart the server and reload. ' +
          'Falling back to pastor role in the meantime.'
        );
      } else {
        console.warn('[gospelar] /api/church-admin/me failed:', e.status, e.message);
      }
    }
  }, [api, token, signOut]);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  return (
    <AuthCtx.Provider value={{
      api, token, church, staff, branches,
      isAuthed: !!token,
      signIn, signOut, refreshMe, setApiUrl,
      setBranches,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
