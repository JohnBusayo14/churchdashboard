import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity as ActivityIcon, RefreshCcw, Filter } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { makeReq } from '../api.js';

const POLL_MS = 10_000;

const ENTITY_TYPES = [
  { v: 'all',     label: 'All events' },
  { v: 'teacher', label: 'Teachers' },
  { v: 'branch',  label: 'Branches' },
  { v: 'staff',   label: 'Staff' },
  { v: 'member',  label: 'Members' },
];

export default function Activity() {
  const { api, token } = useAuth();
  const { activeBranchId, activeBranch } = useBranch();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('all');
  const sinceIdRef = useRef(null);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set('limit', '50');
    if (entityType !== 'all') p.set('entity_type', entityType);
    return p;
  }, [entityType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/activity?${buildParams().toString()}`);
      setItems(r.items || []);
      sinceIdRef.current = r.items?.[0]?.id ?? null;
    } catch { /* toasted by callers, silent here */ }
    finally { setLoading(false); }
  }, [req, buildParams]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (sinceIdRef.current == null) return;
      try {
        const p = buildParams();
        p.set('since_id', String(sinceIdRef.current));
        const r = await req(`/api/church-admin/activity?${p.toString()}`);
        if (r.items?.length) {
          setItems((prev) => [...r.items.slice().reverse(), ...prev].slice(0, 200));
          sinceIdRef.current = r.items[r.items.length - 1].id;
        }
      } catch { /* silent */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [req, buildParams]);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Overview
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Activity</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live feed of approvals, branches, staff and member changes
            {activeBranch ? ` in ${activeBranch.name}` : ' across all branches'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            {ENTITY_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <button onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-[15px] font-semibold text-ink">Live</h2>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Filter className="h-3 w-3" /> {items.length} event{items.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading && !items.length ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        ) : !items.length ? (
          <div className="py-12 text-center">
            <ActivityIcon className="mx-auto h-7 w-7 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">No events match these filters.</div>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((it) => (
              <li key={it.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${actionColor(it.action)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[13.5px] text-ink leading-snug">{it.summary}</div>
                      <div className="text-[11px] text-zinc-500 whitespace-nowrap">
                        {relTime(it.created_at)}
                      </div>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span>{it.actor_name || it.actor_email || 'System'}</span>
                      <span className="text-zinc-300">·</span>
                      <code className="rounded bg-zinc-100 px-1 py-px text-[10px] text-zinc-600">{it.action}</code>
                      {it.entity_type && (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span className="capitalize">{it.entity_type}{it.entity_id ? ` #${it.entity_id}` : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
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
  return new Date(iso).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
