import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  School, RefreshCcw, Search, Users as UsersIcon, Calendar, ShieldCheck,
  AlertTriangle, BookOpen,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { makeReq } from '../api.js';
import Badge from '../components/Badge.jsx';

const CAT_PILL = {
  adult:        'violet',
  youth:        'blue',
  intermediate: 'teal',
  children:     'orange',
};

const fmtRel = (d) => {
  if (!d) return 'Never';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600)    return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

export default function Classes() {
  const { api, token } = useAuth();
  const { activeBranchId, activeBranch } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [rows, setRows]   = useState([]);
  const [q, setQ]         = useState('');
  const [cat, setCat]     = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req('/api/church-admin/learning/classes');
      setRows(r.classes || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (cat !== 'all' && c.category !== cat) return false;
      if (term) {
        const hay = `${c.name} ${c.teacher_name || ''} ${c.teacher_email || ''} ${c.invite_code || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, q, cat]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const enrolled = filtered.reduce((a, c) => a + (c.enrollment || 0), 0);
    const active = filtered.filter((c) => c.last_active_at).length;
    const stale  = filtered.filter((c) => {
      if (!c.last_active_at) return true;
      const ageDays = (Date.now() - new Date(c.last_active_at).getTime()) / 86_400_000;
      return ageDays > 30;
    }).length;
    return { total, enrolled, active, stale };
  }, [filtered]);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Learning</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Classes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every Sunday-school class teachers have set up
            {activeBranch ? ` in ${activeBranch.name}` : ' across all branches'}. Read-only oversight.
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Kpi icon={School}      label="Classes"    value={totals.total} />
        <Kpi icon={UsersIcon}   label="Enrolled"   value={totals.enrolled} />
        <Kpi icon={ShieldCheck} label="Active"     value={totals.active}    sub="have teacher marks" />
        <Kpi icon={AlertTriangle} label="Stale (30d+)" value={totals.stale} tone="amber" />
      </div>

      <div className="mt-6 card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search class, teacher, invite code…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            <option value="all">All categories</option>
            <option value="adult">Adult</option>
            <option value="youth">Youth</option>
            <option value="intermediate">Intermediate</option>
            <option value="children">Children</option>
          </select>
          <div className="ml-auto text-xs text-zinc-500">
            {filtered.length} of {rows.length}
          </div>
        </div>
      </div>

      <div className="mt-4 card overflow-hidden">
        {loading && !rows.length ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="py-14 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">
              {rows.length ? 'No classes match these filters.' : 'No classes set up yet.'}
            </div>
            {!rows.length && (
              <p className="mt-1 text-xs text-zinc-400">
                Teachers create classes from the teacher app. They will appear here automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Class</th>
                  <th className="px-5 py-2.5">Teacher</th>
                  <th className="px-5 py-2.5">Invite code</th>
                  <th className="px-5 py-2.5 text-right">Enrollment</th>
                  <th className="px-5 py-2.5 text-right">Lessons</th>
                  <th className="px-5 py-2.5 text-right">Attendance</th>
                  <th className="px-5 py-2.5 text-right">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5">
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="mt-0.5">
                        <Badge variant={CAT_PILL[c.category] || 'zinc'}>{c.category || 'adult'}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="text-zinc-800">{c.teacher_name || '—'}</div>
                      <div className="text-[11px] text-zinc-500">{c.teacher_email}</div>
                      {c.teacher_status && c.teacher_status !== 'approved' && (
                        <Badge variant="amber" className="mt-0.5">{c.teacher_status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700">
                        {c.invite_code}
                      </code>
                    </td>
                    <td className="px-5 py-2.5 text-right text-ink">{c.enrollment || 0}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{c.lessons_taught || 0}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{c.attendance_count || 0}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-zinc-500 inline-flex items-center gap-1 justify-end w-full">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      {fmtRel(c.last_active_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }) {
  const tones = { amber: 'text-amber-700' };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className={`mt-3 text-[24px] font-bold tracking-tight tabular ${tones[tone] || 'text-ink'}`}>
        {(value ?? 0).toLocaleString('en-NG')}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
