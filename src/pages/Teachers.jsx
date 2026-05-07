import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, RefreshCcw, Search } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Badge from '../components/Badge.jsx';

const WINDOWS = [
  { v: 7,   label: 'Last 7 days' },
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 365, label: 'Last 12 months' },
];

const fmt = (n) => (n ?? 0).toLocaleString('en-NG');

const fmtRel = (d) => {
  if (!d) return 'Never';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600)    return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

export default function Teachers() {
  const { api, token } = useAuth();
  const req   = useMemo(() => makeReq(api, token), [api, token]);
  const toast = useToast();

  const [days, setDays]       = useState(90);
  const [teachers, setTeachers] = useState([]);
  const [marks, setMarks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perf, dist] = await Promise.all([
        req(`/api/admin/insights/teacher-performance?days=${days}`),
        req(`/api/admin/insights/mark-distribution?days=${days}`).catch(() => ({ breakdown: [] })),
      ]);
      setTeachers(perf?.teachers || []);
      setMarks(dist?.breakdown || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, [req, days, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter(
      (t) =>
        t.display_name?.toLowerCase().includes(term) ||
        t.teacher_email?.toLowerCase().includes(term),
    );
  }, [teachers, q]);

  const totalMarks = marks.reduce((sum, m) => sum + (Number(m.count) || 0), 0);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Insights</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Teacher performance</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Per-teacher rollup: classes, students enrolled, marks awarded, and last activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            {WINDOWS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
          </select>
          <button onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Mark distribution */}
      {!loading && marks.length > 0 && (
        <div className="mb-4 card p-5">
          <h2 className="text-[15px] font-semibold text-ink">Mark distribution</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{fmt(totalMarks)} marks awarded in this window.</p>
          <div className="mt-4 flex flex-col gap-2">
            {marks.map((m) => {
              const pct = totalMarks ? (m.count / totalMarks) * 100 : 0;
              return (
                <div key={m.mark_type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink capitalize">{m.mark_type || 'unspecified'}</span>
                    <span className="text-zinc-500 tabular">
                      {fmt(m.count)} · {fmt(m.total_points)} pts
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teacher…"
            className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          />
        </div>
        <span className="text-xs text-zinc-500">{filtered.length} of {teachers.length}</span>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6"><Skeleton lines={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-3 text-sm font-semibold text-zinc-700">
              {teachers.length === 0 ? 'No teachers yet' : 'No teachers match'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Teacher</th>
                  <th className="px-5 py-2.5 text-right">Classes</th>
                  <th className="px-5 py-2.5 text-right">Students</th>
                  <th className="px-5 py-2.5 text-right">Marks ({days}d)</th>
                  <th className="px-5 py-2.5 text-right">Points ({days}d)</th>
                  <th className="px-5 py-2.5 text-right">Marks total</th>
                  <th className="px-5 py-2.5 text-right">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((t) => {
                  const dormant = !t.last_active ||
                    (Date.now() - new Date(t.last_active).getTime()) / 86400000 > days;
                  return (
                    <tr key={t.teacher_email} className="hover:bg-zinc-25">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.avatar_emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">{t.display_name}</span>
                              {dormant && <Badge variant="amber">Dormant</Badge>}
                            </div>
                            <div className="text-[11px] text-zinc-500">{t.teacher_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-right text-zinc-700">{fmt(t.classes_owned)}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-700">{fmt(t.students_enrolled)}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-ink">{fmt(t.marks_awarded_recent)}</td>
                      <td className="px-5 py-2.5 text-right text-amber-600 font-bold">⭐ {fmt(t.points_awarded_recent)}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-500">{fmt(t.marks_awarded_total)}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-500">{fmtRel(t.last_active)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton({ lines = 4 }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
