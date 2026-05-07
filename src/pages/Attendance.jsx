import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Users, School, RefreshCcw } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';

const WINDOWS = [
  { v: 7,   label: 'Last 7 days' },
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 365, label: 'Last 12 months' },
  { v: 730, label: 'Last 24 months' },
];

const fmt = (n) => (n ?? 0).toLocaleString('en-NG');

export default function Attendance() {
  const { api, token } = useAuth();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [days, setDays]       = useState(90);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await req(`/api/admin/insights/attendance?days=${days}`);
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [req, days]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const daily   = data?.daily || [];
  const byClass = data?.byClass || [];
  const avgPerLesson = (row) =>
    row.lessons_with_attendance > 0
      ? Math.round((row.attendance_count / row.lessons_with_attendance) * 10) / 10
      : 0;

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      {/* Heading + window selector */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Insights
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Attendance trends</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Each marker awarded by a teacher counts as one student-lesson attendance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            {WINDOWS.map((w) => (
              <option key={w.v} value={w.v}>{w.label}</option>
            ))}
          </select>
          <button onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={CalendarDays} label="Total attendances" value={fmt(summary?.total_attendances)} loading={loading} />
        <Stat icon={Users}        label="Unique students"   value={fmt(summary?.unique_students)}   loading={loading} />
        <Stat icon={School}       label="Active classes"    value={fmt(summary?.active_classes)}    loading={loading} />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* Daily chart */}
      <div className="mt-6 card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Daily attendance</h2>
          <span className="text-xs text-zinc-500">
            {daily.length} {daily.length === 1 ? 'day' : 'days'} with activity
          </span>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-lg bg-zinc-100" />
        ) : daily.length === 0 ? (
          <Empty icon="📅" text="No attendance recorded in this window" />
        ) : (
          <Chart points={daily} />
        )}
      </div>

      {/* Per-class table */}
      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink">By class</h2>
          <span className="text-xs text-zinc-500">{byClass.length} classes</span>
        </div>
        {loading ? (
          <div className="p-5"><Skeleton lines={5} /></div>
        ) : byClass.length === 0 ? (
          <div className="p-5"><Empty icon="🏫" text="No classes yet" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Class</th>
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5">Invite</th>
                  <th className="px-5 py-2.5 text-right">Lessons</th>
                  <th className="px-5 py-2.5 text-right">Attendance</th>
                  <th className="px-5 py-2.5 text-right">Avg / lesson</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {byClass.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-semibold text-ink">{c.name}</td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        {c.category || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <code className="text-[11px] text-zinc-500">{c.invite_code}</code>
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">
                      {fmt(c.lessons_with_attendance)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-ink">
                      {fmt(c.attendance_count)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">
                      {avgPerLesson(c)}
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
      <div className="mt-3 text-[28px] font-bold tracking-tight text-ink tabular">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-zinc-100" /> : value}
      </div>
    </div>
  );
}

// Lightweight inline SVG sparkline + bar chart hybrid. No charting library needed.
function Chart({ points }) {
  const W = 760;
  const H = 160;
  const PAD = 14;
  const max = Math.max(1, ...points.map((p) => Number(p.attended) || 0));
  const xStep = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - ((Number(p.attended) || 0) / max) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = path + ` L${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="att-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#att-grad)" />
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
