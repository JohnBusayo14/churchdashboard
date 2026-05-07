import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { loginRequest } from '../api.js';

export default function Login() {
  const { isAuthed, signIn, api: defaultApi } = useAuth();
  const nav = useNavigate();

  const [api, setApi]           = useState(defaultApi);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoad]      = useState(false);
  const [error, setError]       = useState('');
  const [showAdvanced, setAdv]  = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoad(true);
    setError('');
    try {
      const data = await loginRequest(api.trim(), email.trim().toLowerCase(), password);
      signIn(api, data.admin_token, data.church);
      nav('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-25 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-cta">
            <span className="text-lg">⛪</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Church Leader Sign-in</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track attendance, engagement, and lesson progress for your church.
          </p>
        </div>

        <form onSubmit={submit} className="card p-6">
          <div className="mb-4">
            <label className="label">Admin Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pastor@yourchurch.org"
              autoComplete="email"
            />
          </div>

          <div className="mb-4">
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your church admin password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => setAdv((s) => !s)}
            className="mt-3 w-full text-center text-xs font-semibold text-zinc-500 hover:text-ink"
          >
            {showAdvanced ? '▴ Hide advanced' : '▾ Advanced'}
          </button>

          {showAdvanced && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <label className="label">API URL</label>
              <input
                className="input"
                value={api}
                onChange={(e) => setApi(e.target.value)}
                placeholder="https://your-api.example.com"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Only change this if your church uses a self-hosted GOFAMINT backend.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Session stored locally on this device.
          </div>
        </form>
      </div>
    </div>
  );
}
