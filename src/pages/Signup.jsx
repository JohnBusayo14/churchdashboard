import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ShieldCheck, Church, Mail, Lock, User, Phone, MapPin,
  Loader2, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { signupRequest } from '../api.js';

export default function Signup() {
  const { isAuthed, api } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    church_name:  '',
    location:     '',
    contact_name: '',
    admin_email:  '',
    phone:        '',
    password:     '',
  });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoad]    = useState(false);
  const [error, setError]     = useState('');
  const [submitted, setDone]  = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.church_name.trim() || !form.admin_email.trim() || !form.password) {
      setError('Church name, admin email, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoad(true);
    setError('');
    try {
      await signupRequest(api, {
        ...form,
        admin_email: form.admin_email.trim().toLowerCase(),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoad(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-25 px-4 py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-100 blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-50 blur-3xl opacity-70" />
        </div>

        <div className="w-full max-w-[460px] text-center">
          <div className="relative mx-auto mb-6 inline-block">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-cta ring-1 ring-white/20">
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.25} />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Application submitted</h1>
          <p className="mt-2 text-sm text-zinc-500">
            We've received your church's application. The Gospelar admin team will review it
            and email <span className="font-medium text-ink">{form.admin_email}</span> when your
            account is approved.
          </p>

          <div className="card mt-6 p-5 text-left">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">What happens next?</h2>
            <ol className="space-y-2.5 text-sm text-zinc-700">
              <li className="flex gap-2.5"><span className="font-mono text-xs text-zinc-400">01</span><span>Main admin reviews your application (usually within 24h).</span></li>
              <li className="flex gap-2.5"><span className="font-mono text-xs text-zinc-400">02</span><span>You'll get an approval email with your church invite code.</span></li>
              <li className="flex gap-2.5"><span className="font-mono text-xs text-zinc-400">03</span><span>Sign in here to start tracking attendance and engagement.</span></li>
            </ol>
          </div>

          <Link to="/login" className="btn-primary mt-6 inline-flex w-full py-2.5 group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-25 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-100 blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-brand-50 blur-3xl opacity-70" />
      </div>

      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-brand-600/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-cta ring-1 ring-white/20">
              <Church className="h-8 w-8" strokeWidth={2.25} />
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            Register your church
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Apply for a church admin account. Approval usually takes under 24 hours.
          </p>
        </div>

        <form onSubmit={submit} className="card overflow-hidden">
          <div className="space-y-4 p-6">
            {/* Church section */}
            <div className="border-b border-zinc-100 pb-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Church details</h2>

              <div className="mb-3">
                <label className="label flex items-center gap-1.5">
                  <Church className="h-3.5 w-3.5 text-zinc-400" />
                  Church name <span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  className="input"
                  value={form.church_name}
                  onChange={set('church_name')}
                  placeholder="Gospelar Lagos"
                  autoFocus
                />
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  Location <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.location}
                  onChange={set('location')}
                  placeholder="Ikeja, Lagos"
                />
              </div>
            </div>

            {/* Admin section */}
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Admin contact</h2>

              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-400" />
                    Contact name
                  </label>
                  <input
                    className="input"
                    value={form.contact_name}
                    onChange={set('contact_name')}
                    placeholder="Pastor Adeyemi"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" />
                    Phone
                  </label>
                  <input
                    className="input"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="0801 234 5678"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="label flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  Admin email <span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  value={form.admin_email}
                  onChange={set('admin_email')}
                  placeholder="pastor@yourchurch.org"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  Password <span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className="input pr-11"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 group">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit application
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-zinc-100 bg-zinc-25 px-6 py-3 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Your password is hashed before storage — we never see it.</span>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
