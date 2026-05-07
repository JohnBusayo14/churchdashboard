import { createContext, useContext, useState, useCallback } from 'react';

const AuthCtx = createContext(null);

const API_KEY    = 'gofamint_church_api_url';
const TOKEN_KEY  = 'gofamint_church_token';
const CHURCH_KEY = 'gofamint_church_meta';

const DEFAULT_API = import.meta.env.VITE_API_URL || 'https://gospelarapp-production.up.railway.app';

const readJSON = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); }
  catch { return null; }
};

export function AuthProvider({ children }) {
  const [api, setApi]       = useState(() => localStorage.getItem(API_KEY) || DEFAULT_API);
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [church, setChurch] = useState(() => readJSON(CHURCH_KEY));

  const signIn = useCallback((apiUrl, tk, churchObj) => {
    const cleanApi = apiUrl.trim().replace(/\/$/, '');
    localStorage.setItem(API_KEY, cleanApi);
    localStorage.setItem(TOKEN_KEY, tk);
    localStorage.setItem(CHURCH_KEY, JSON.stringify(churchObj));
    setApi(cleanApi);
    setToken(tk);
    setChurch(churchObj);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CHURCH_KEY);
    setToken('');
    setChurch(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ api, token, church, isAuthed: !!token, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
