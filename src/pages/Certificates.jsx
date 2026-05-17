import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, Plus, Search, Printer, Trash2, Sparkles, ScrollText, Share2, Check,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';

const CERT_TYPES = [
  { v: 'completion',    label: 'Completion',    title: 'Certificate of Completion' },
  { v: 'excellence',    label: 'Excellence',    title: 'Certificate of Excellence' },
  { v: 'attendance',    label: 'Attendance',    title: 'Certificate of Faithful Attendance' },
  { v: 'memorization',  label: 'Memorization',  title: 'Certificate of Memorization' },
  { v: 'custom',        label: 'Custom',        title: '' },
];

const TYPE_BADGE = {
  completion:   'bg-brand-50 text-brand-700',
  excellence:   'bg-amber-50 text-amber-700',
  attendance:   'bg-emerald-50 text-emerald-700',
  memorization: 'bg-violet-50 text-violet-700',
  custom:       'bg-zinc-100 text-zinc-700',
};

export default function Certificates() {
  const { api, token } = useAuth();
  const { activeBranchId, activeBranch } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType]     = useState('all');
  const [q, setQ]           = useState('');
  const [issuing, setIssuing] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (q.trim()) params.set('q', q.trim());
      const r = await req(`/api/church-admin/certificates?${params.toString()}`);
      setRows(r.certificates || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  }, [req, type, q, toast]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const issue = async (payload) => {
    try {
      const r = await req('/api/church-admin/certificates', 'POST', payload);
      toast?.success(`Certificate issued to ${r.certificate.student_name}.`);
      setIssuing(false);
      setViewing(r.certificate);   // open the printable preview right away
      await load();
    } catch (e) {
      toast?.error(e.message || 'Issue failed.');
    }
  };

  const revoke = async (c) => {
    if (!confirm(`Revoke certificate "${c.title}" for ${c.student_name}?`)) return;
    try {
      await req(`/api/church-admin/certificates/${c.id}`, 'DELETE');
      toast?.success('Revoked.');
      await load();
    } catch (e) {
      toast?.error(e.message || 'Revoke failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Learning</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Certificates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Recognise students for completing lessons, faithful attendance and memorization.
          </p>
        </div>
        <button onClick={() => setIssuing(true)} className="btn-primary">
          <Plus className="h-3.5 w-3.5" /> Issue certificate
        </button>
      </div>

      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="Search by name, email, title…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            <option value="all">All types</option>
            {CERT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <div className="ml-auto text-xs text-zinc-500">
            {rows.length} issued{activeBranch ? ` · ${activeBranch.name}` : ''}
          </div>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="card p-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : !rows.length ? (
        <div className="card p-12 text-center">
          <Award className="mx-auto h-8 w-8 text-zinc-300" />
          <div className="mt-2 text-sm font-medium text-zinc-500">No certificates issued yet.</div>
          <button onClick={() => setIssuing(true)} className="mt-3 btn-primary">
            <Plus className="h-3.5 w-3.5" /> Issue the first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="relative border-b border-zinc-100 bg-gradient-to-br from-amber-50/60 to-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <Award className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${TYPE_BADGE[c.type]}`}>
                    {c.type}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-ink tracking-tight">{c.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  Awarded to <span className="font-medium text-ink">{c.student_name}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {new Date(c.awarded_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <code className="text-[10px] text-zinc-500">{c.certificate_no}</code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewing(c)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    title="Preview / print"
                  >
                    <Printer className="inline h-3.5 w-3.5 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => revoke(c)}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                    title="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <IssueModal
        open={issuing}
        req={req}
        onClose={() => setIssuing(false)}
        onSave={issue}
      />

      <PrintableModal
        certificate={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function IssueModal({ open, req, onClose, onSave }) {
  const [step, setStep]   = useState(1);
  const [picked, setPicked] = useState(null);
  const [q, setQ]         = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm]   = useState({ type: 'completion', title: '', body: '', awarded_at: '' });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPicked(null);
    setQ('');
    setResults([]);
    setForm({
      type: 'completion',
      title: 'Certificate of Completion',
      body: '',
      awarded_at: new Date().toISOString().slice(0, 10),
    });
  }, [open]);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '40' });
      if (q.trim()) p.set('q', q.trim());
      const r = await req(`/api/church-admin/learning/students?${p.toString()}`);
      setResults(r.students || []);
    } finally { setLoading(false); }
  }, [req, q]);

  useEffect(() => { if (open && step === 1) search(); }, [open, step, search]);

  const choose = (t) => {
    const tpl = CERT_TYPES.find((x) => x.v === t);
    setForm((f) => ({ ...f, type: t, title: tpl?.title || f.title }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!picked || !form.title.trim()) return;
    onSave({
      student_email: picked.student_email,
      student_name:  picked.student_name,
      type:          form.type,
      title:         form.title.trim(),
      body:          form.body.trim() || null,
      awarded_at:    form.awarded_at || null,
      context: {
        lessons_completed: picked.lessons_completed,
        total_score:       picked.total_score,
        marks_received:    picked.marks_received,
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? 'Pick a student' : `Issue certificate to ${picked?.student_name}`}
      sub={step === 1 ? 'Search students enrolled in your classes.' : 'Type, title and message.'}
      size="md"
      footer={
        step === 1 ? (
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        ) : (
          <>
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button type="submit" form="cert-form" className="btn-primary">
              <Sparkles className="h-3.5 w-3.5" /> Issue
            </button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            placeholder="Search by name or email…"
            className="input"
          />
          {loading ? (
            <div className="h-20 animate-pulse rounded bg-zinc-100" />
          ) : !results.length ? (
            <div className="py-6 text-center text-sm text-zinc-500">No students found.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-80 overflow-y-auto rounded-lg ring-1 ring-zinc-200">
              {results.map((s) => (
                <li key={s.student_email}>
                  <button
                    onClick={() => { setPicked(s); setStep(2); }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-25"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{s.student_name}</div>
                      <div className="text-[11px] text-zinc-500">{s.student_email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-zinc-500">
                        {s.lessons_completed} lesson{s.lessons_completed === 1 ? '' : 's'}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {s.classes_count} class{s.classes_count === 1 ? '' : 'es'}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form id="cert-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-lg bg-zinc-25 p-3 ring-1 ring-zinc-200">
            <div className="text-sm font-semibold text-ink">{picked?.student_name}</div>
            <div className="text-xs text-zinc-500">{picked?.student_email}</div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {picked?.lessons_completed} lessons completed · {picked?.marks_received} teacher marks
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CERT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.v}
                  onClick={() => choose(t.v)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    form.type === t.v
                      ? 'bg-brand-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-150'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Citation (optional)</label>
            <textarea
              rows={3}
              className="input min-h-[80px]"
              placeholder="In recognition of faithful completion of the Q4 lessons…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Award date</label>
            <input
              type="date"
              className="input"
              value={form.awarded_at}
              onChange={(e) => setForm({ ...form, awarded_at: e.target.value })}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}

function PrintableModal({ certificate, onClose }) {
  const { church, staff } = useAuth();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!certificate) return null;
  const c = certificate;
  const date = new Date(c.awarded_at).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  // Display name for "Awarded by". Backend now stores the staff display name
  // for newly issued certs, but historical rows may still carry an email or
  // be empty — in that case use the current session's name as the best guess.
  const issuerLabel = c.awarded_by || staff?.name || 'Church Admin';

  // Public share URL. Uses the production church-dashboard origin so the
  // copied link works no matter where the dashboard is currently running
  // (localhost during dev, staging, etc.).
  const SHARE_ORIGIN = 'https://church.gospelar.com';
  const shareUrl = `${SHARE_ORIGIN}/verify/${encodeURIComponent(c.certificate_no)}`;
  const shareText = `🎓 ${c.title} — awarded to ${c.student_name} by ${church?.name || 'Gospelar'}. Verify: ${shareUrl}`;

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: c.title, text: shareText, url: shareUrl });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // user cancelled the sheet
        // fall through to clipboard fallback
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast?.success('Share link copied.');
    } catch {
      toast?.error('Could not copy. Long-press the URL field to copy manually.');
    }
  }

  return (
    <Modal
      open={!!c}
      onClose={onClose}
      title="Certificate preview"
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Close</button>
          <button
            type="button"
            onClick={share}
            className="btn-soft"
          >
            {copied
              ? <><Check className="h-3.5 w-3.5" /> Copied</>
              : <><Share2 className="h-3.5 w-3.5" /> Share</>}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </>
      }
    >
      {/* Print stylesheet — hides everything except the certificate body. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .cert-print, .cert-print * { visibility: visible; }
          .cert-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div className="cert-print rounded-2xl ring-2 ring-amber-300 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/60 px-10 py-12 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
          <Award className="h-5 w-5" />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
          {church?.name || 'Church'}
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">{c.title}</h2>
        <p className="mt-3 text-sm text-zinc-500">This certificate is proudly awarded to</p>
        <div className="mt-1 text-2xl font-bold text-ink underline decoration-amber-400 decoration-2 underline-offset-8">
          {c.student_name}
        </div>
        {c.body && (
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-700">
            {c.body}
          </p>
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
        <div className="mt-10 flex items-end justify-between text-left">
          <div>
            <div className="border-b-2 border-zinc-300 pb-1 text-sm font-bold text-ink min-w-[140px]">
              {date}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">Date</div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200">
            <ScrollText className="h-3 w-3 text-zinc-400" />
            <code className="text-[10px] text-zinc-600">{c.certificate_no}</code>
          </div>
          <div>
            <div className="border-b-2 border-zinc-300 pb-1 text-sm font-bold text-ink min-w-[140px]">
              {issuerLabel}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">Awarded by</div>
          </div>
        </div>
      </div>

      {/* Share strip — only visible on-screen; hidden when printing because
          the cert-print class scopes the print stylesheet to the certificate
          card above. */}
      <div className="mt-4 rounded-lg ring-1 ring-zinc-200 bg-zinc-25 px-3 py-2.5 flex items-center gap-2">
        <Share2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
          Share link
        </span>
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 bg-white rounded-md ring-1 ring-zinc-200 px-2 py-1 text-xs font-mono text-zinc-700"
        />
      </div>
    </Modal>
  );
}

