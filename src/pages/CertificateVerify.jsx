// Public certificate verification view. Reached via the share URL
// (/verify/:certificate_no). No auth — calls the public verification
// endpoint, which returns a redacted projection of the certificate.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, ScrollText, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';

export default function CertificateVerify() {
  const { certificate_no } = useParams();
  const { api } = useAuth();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    // No token — endpoint is public.
    const req = makeReq(api, null);
    req(`/api/certificates/verify/${encodeURIComponent(certificate_no)}`)
      .then((r) => { if (!cancelled) setCert(r.certificate || null); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not verify that certificate.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, certificate_no]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-white to-amber-50/60 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Gospelar
        </Link>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-12 text-center ring-1 ring-zinc-200">
            <div className="mx-auto h-4 w-32 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : error || !cert ? (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center ring-1 ring-zinc-200 space-y-2">
            <ShieldAlert className="mx-auto h-10 w-10 text-zinc-300" />
            <h1 className="text-xl font-bold text-ink">Certificate not found</h1>
            <p className="text-sm text-zinc-500">
              {error || `No certificate matches the code ${certificate_no}.`}
            </p>
          </div>
        ) : (
          <Cert cert={cert} />
        )}
      </div>
    </div>
  );
}

function Cert({ cert: c }) {
  const date = c.awarded_at
    ? new Date(c.awarded_at).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const revoked = !!c.revoked_at;

  return (
    <div className={`mt-6 rounded-2xl px-8 py-10 sm:px-12 sm:py-14 text-center ring-2 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/60 ${
      revoked ? 'ring-red-200' : 'ring-amber-300'
    }`}>
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
        <Award className="h-5 w-5" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
        {c.church_name}{c.branch_name ? ` · ${c.branch_name}` : ''}
      </div>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-ink">{c.title}</h1>
      <p className="mt-3 text-sm text-zinc-500">This certificate is proudly awarded to</p>
      <div className="mt-1 text-2xl font-bold text-ink underline decoration-amber-400 decoration-2 underline-offset-8">
        {c.student_name}
      </div>
      {c.body && (
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-700">{c.body}</p>
      )}
      {c.context && (
        <div className="mx-auto mt-5 inline-flex max-w-md flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
          {c.context.lessons_completed != null && (
            <span><strong>{c.context.lessons_completed}</strong> lessons completed</span>
          )}
          {c.context.marks_received != null && (
            <span><strong>{c.context.marks_received}</strong> teacher marks</span>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 text-left">
        <div>
          <div className="border-b-2 border-zinc-300 pb-1 text-sm font-bold text-ink min-w-[140px]">
            {date || '—'}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">Date</div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200">
          <ScrollText className="h-3 w-3 text-zinc-400" />
          <code className="text-[10px] text-zinc-600">{c.certificate_no}</code>
        </div>
        <div>
          <div className="border-b-2 border-zinc-300 pb-1 text-sm font-bold text-ink min-w-[140px]">
            {c.awarded_by || 'Church Admin'}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">Awarded by</div>
        </div>
      </div>

      <div className={`mt-8 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
        revoked
          ? 'bg-red-50 text-red-700 ring-red-100'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      }`}>
        {revoked ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {revoked ? 'Revoked' : 'Verified by Gospelar'}
      </div>
    </div>
  );
}
