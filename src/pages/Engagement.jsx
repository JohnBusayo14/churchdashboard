import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, GraduationCap, Trophy, TrendingUp, Award, RefreshCcw } from 'lucide-react';
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
  { v: 730, label: 'Last 24 months' },
];

const fmt = (n) => (n ?? 0).toLocaleString('en-NG');

export default function Engagement() {
  const { api, token } = useAuth();
  const req   = useMemo(() => makeReq(api, token), [api, token]);
  const toast = useToast();

  const [days, setDays]       = useState(90);
  const [data, setData]       = useState(null);
  const [topLearners, setTop] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, tl] = await Promise.all([
        req(`/api/admin/insights/engagement?days=${days}`),
        req(`/api/admin/insights/top-learners?days=${days}&limit=20`).catch(() => ({ learners: [] })),
      ]);
      setData(e);
      setTop(tl?.learners || tl || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load engagement.');
    } finally {
      setLoading(false);
    }
  }, [req, days, toast]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Insights</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Engagement</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Is the app actually being used? Quiz completions, active learners, and points awarded.
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={Users}          label="Teachers"          value={fmt(t.total_teachers ?? t.total_users)} loading={loading} />
        <Stat icon={GraduationCap}  label="Students enrolled" value={fmt(t.enrolled_students ?? t.active_subscribers)} loading={loading} />
        <Stat icon={Trophy}         label="Quiz completions"  value={fmt(t.total_quiz_completions)} loading={loading} />
        <Stat icon={TrendingUp}     label="Active in window"  value={fmt(t.active_learners)} loading={loading} />
        <Stat icon={Award}          label="Points awarded"    value={fmt(t.total_points_awarded ?? t.total_points_earned)} loading={loading} />
      </div>

      {/* Two-column body */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-ink">Quiz completions over time</h2>
          {loading ? (
            <div className="mt-4 h-40 animate-pulse rounded-lg bg-zinc-100" />
          ) : !data?.completionsDaily?.length ? (
            <Empty icon="📚" text="No completions in this window" />
          ) : (
            <div className="mt-3"><MiniChart points={data.completionsDaily} valueKey="completions" /></div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-ink">By category</h2>
          {loading ? (
            <Skeleton lines={4} />
          ) : !data?.subsByCategory?.length ? (
            <Empty icon="🗂️" text="No data" />
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {data.subsByCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink capitalize">{c.category || 'unknown'}</span>
                  <Badge variant="blue">{c.active} active</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top learners */}
      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink">Most engaged learners</h2>
          <span className="text-xs text-zinc-500">{topLearners.length} this window</span>
        </div>
        {loading ? (
          <div className="p-5"><Skeleton lines={5} /></div>
        ) : topLearners.length === 0 ? (
          <div className="p-5"><Empty icon="🏆" text="No active learners in this window" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Learner</th>
                  <th className="px-5 py-2.5 text-right">Lessons</th>
                  <th className="px-5 py-2.5 text-right">Score total</th>
                  <th className="px-5 py-2.5 text-right">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topLearners.slice(0, 20).map((l) => (
                  <tr key={l.email}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{l.avatar_emoji || '👤'}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{l.display_name}</div>
                          <div className="text-[11px] text-zinc-500">{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{fmt(l.lessons_completed)}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-amber-600">⭐ {fmt(l.total_score ?? l.total_points)}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-500">
                      {l.last_active ? new Date(l.last_active).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
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

function Stat({ icon: Icon, label, value, loading }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className="mt-3 text-[24px] font-bold tracking-tight text-ink tabular">
        {loading ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-zinc-100" /> : value}
      </div>
    </div>
  );
}

function MiniChart({ points, valueKey }) {
  const W = 760, H = 160, PAD = 14;
  const max = Math.max(1, ...points.map((p) => Number(p[valueKey]) || 0));
  const xStep = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - ((Number(p[valueKey]) || 0) / max) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = path + ` L${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eng-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#eng-grad)" />
      <path d={path} fill="none" stroke="#2563EB" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
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

function Empty({ icon, text }) {
  return (
    <div className="py-10 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="mt-2 text-sm font-medium text-zinc-500">{text}</div>
    </div>
  );
}
