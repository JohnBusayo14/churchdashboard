import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, CalendarCheck, BookOpen, HandCoins, TrendingUp, TrendingDown,
  Activity as ActivityIcon, Building2, RefreshCcw,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { makeReq } from '../api.js';

const POLL_MS = 10_000;

const fmtNum = (n) => (n ?? 0).toLocaleString('en-NG');

export default function AdminOverview() {
  const { api, token, church } = useAuth();
  const { activeBranchId, activeBranch, branches } = useBranch();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [summary, setSummary]    = useState(null);
  const [growth, setGrowth]      = useState(null);
  const [activity, setActivity]  = useState([]);
  const [branchRows, setBranchRows] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState('');

  // since_id cursor for the activity feed — polled separately so we only
  // fetch deltas instead of refetching the whole list every 10s.
  const sinceIdRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, grw, act, br] = await Promise.all([
        req('/api/church-admin/insights/admin-summary'),
        req('/api/church-admin/insights/member-growth?days=180'),
        req('/api/church-admin/activity?limit=10'),
        req('/api/church-admin/branches'),
      ]);
      setSummary(sum);
      setGrowth(grw);
      setActivity(act.items || []);
      setBranchRows(br.branches || []);
      sinceIdRef.current = act.items?.[0]?.id ?? null;
    } catch (e) {
      setError(e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [req]);

  // Reload everything when the active branch changes — header is already set
  // by BranchContext so the req helper picks it up automatically.
  useEffect(() => { loadAll(); }, [loadAll, activeBranchId]);

  // Poll only the activity feed for "new since" rows. Prepends new items so
  // they appear at the top of the list.
  useEffect(() => {
    if (!api || !token) return;
    const id = setInterval(async () => {
      try {
        const params = new URLSearchParams();
        if (sinceIdRef.current != null) params.set('since_id', String(sinceIdRef.current));
        params.set('limit', '20');
        const r = await req(`/api/church-admin/activity?${params.toString()}`);
        if (r.items?.length) {
          setActivity((prev) => {
            const merged = [...r.items.slice().reverse(), ...prev];
            return merged.slice(0, 20);
          });
          sinceIdRef.current = r.items[r.items.length - 1].id;
        }
      } catch { /* silent — next poll will try again */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [api, token, req]);

  const m = summary?.members;
  const a = summary?.attendance;
  const e = summary?.engagement;

  const memberDelta = pct(m?.this_month, m?.last_month);
  const attDelta    = pct(a?.this_week, a?.last_week);
  const engDelta    = pct(e?.lessons_7d, e?.lessons_prev_7d);

  const showBranchSummary = !activeBranchId;

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            {church?.name || 'Church'}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {activeBranch ? `${activeBranch.name} dashboard` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {activeBranch
              ? `Activity, growth and engagement scoped to ${activeBranch.name}.`
              : 'Cross-branch summary of members, attendance, engagement and live activity.'}
          </p>
        </div>
        <button onClick={loadAll} className="btn-ghost" disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Users}
          label="Members"
          value={fmtNum(m?.total)}
          sub={`+${fmtNum(m?.this_month)} this month`}
          delta={memberDelta}
          deltaGood
          loading={loading}
        />
        <Kpi
          icon={CalendarCheck}
          label="Attendance · 7d"
          value={fmtNum(a?.this_week)}
          sub={`${fmtNum(a?.last_week)} last week`}
          delta={attDelta}
          deltaGood
          loading={loading}
        />
        <Kpi
          icon={BookOpen}
          label="Lessons · 7d"
          value={fmtNum(e?.lessons_7d)}
          sub="completions"
          delta={engDelta}
          deltaGood
          loading={loading}
        />
        <Kpi
          icon={HandCoins}
          label="Giving · 30d"
          value="—"
          sub="Connect finance module"
          loading={loading}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Member growth</h2>
              <p className="text-xs text-zinc-500">Cumulative members over the last 6 months.</p>
            </div>
            <span className="text-xs text-zinc-500">
              {growth?.series?.length || 0} active days
            </span>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-zinc-100" />
          ) : !growth?.series?.length ? (
            <Empty icon="📈" text="No new members in this window" />
          ) : (
            <GrowthChart series={growth.series} startTotal={growth.startTotal} />
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-[15px] font-semibold text-ink">Live activity</h2>
            </div>
            <span className="text-xs text-zinc-500">Updates every 10s</span>
          </div>
          <ActivityFeed items={activity} loading={loading} />
        </div>
      </div>

      {showBranchSummary && (
        <div className="mt-4 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-600" />
              <h2 className="text-[15px] font-semibold text-ink">Branches</h2>
            </div>
            <span className="text-xs text-zinc-500">{branchRows.length || branches.length} total</span>
          </div>
          <BranchTable branches={branchRows.length ? branchRows : branches} />
        </div>
      )}
    </div>
  );
}

function pct(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function Kpi({ icon: Icon, label, value, sub, delta, deltaGood, loading }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className="mt-3 text-[26px] font-bold tracking-tight text-ink tabular">
        {loading
          ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-zinc-100" />
          : value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${
            (delta >= 0) === !!deltaGood
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        <span className="text-zinc-500">{sub}</span>
      </div>
    </div>
  );
}

function GrowthChart({ series, startTotal }) {
  const W = 760, H = 200, PAD = 24;
  if (!series.length) return null;
  const max = Math.max(1, ...series.map((p) => p.cumulative));
  const min = Math.max(0, startTotal ?? 0);
  const xStep = series.length > 1 ? (W - PAD * 2) / (series.length - 1) : 0;
  const yFor = (v) => H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
  const path = series.map((p, i) => {
    const x = PAD + i * xStep;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yFor(p.cumulative).toFixed(1)}`;
  }).join(' ');
  const area = path + ` L${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grow-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grow-grad)" />
      <path d={path} fill="none" stroke="#2563EB" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ActivityFeed({ items, loading }) {
  if (loading && !items.length) {
    return (
      <div className="px-5 py-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <ActivityIcon className="mx-auto h-6 w-6 text-zinc-300" />
        <div className="mt-2 text-sm font-medium text-zinc-500">No activity yet.</div>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
      {items.map((it) => (
        <li key={it.id} className="px-5 py-3">
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${actionColor(it.action)}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink leading-snug">{it.summary}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">
                {it.actor_name || it.actor_email || 'System'} · {relTime(it.created_at)}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function actionColor(action) {
  if (!action) return 'bg-zinc-300';
  if (action.endsWith('.created') || action.endsWith('.approved') || action.endsWith('.invited')) return 'bg-emerald-500';
  if (action.endsWith('.rejected') || action.endsWith('.deleted') || action.endsWith('.removed')) return 'bg-red-500';
  if (action.endsWith('.updated')) return 'bg-amber-500';
  return 'bg-brand-500';
}

function relTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - Date.parse(iso);
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 30)        return 'just now';
  if (s < 60)        return `${s}s ago`;
  if (s < 3600)     return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)    return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function BranchTable({ branches }) {
  if (!branches.length) {
    return (
      <div className="py-10 text-center">
        <div className="text-3xl">🏢</div>
        <div className="mt-2 text-sm font-medium text-zinc-500">No branches yet. Create one under Admin → Branches.</div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead className="bg-zinc-25">
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <th className="px-5 py-2.5">Branch</th>
            <th className="px-5 py-2.5">Location</th>
            <th className="px-5 py-2.5 text-right">Members</th>
            <th className="px-5 py-2.5 text-right">Classes</th>
            <th className="px-5 py-2.5 text-right">Recent activity (30d)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {branches.map((b) => (
            <tr key={b.id}>
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{b.name}</span>
                  {b.is_headquarters && (
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">HQ</span>
                  )}
                </div>
              </td>
              <td className="px-5 py-2.5 text-zinc-600">{b.location || '—'}</td>
              <td className="px-5 py-2.5 text-right text-ink">{fmtNum(b.member_count)}</td>
              <td className="px-5 py-2.5 text-right text-ink">{fmtNum(b.class_count)}</td>
              <td className="px-5 py-2.5 text-right text-ink">{fmtNum(b.recent_activity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
