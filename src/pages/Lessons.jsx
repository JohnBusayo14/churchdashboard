import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCcw, Search } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Badge from '../components/Badge.jsx';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const CAT_PILL = {
  adult:        'violet',
  youth:        'blue',
  intermediate: 'teal',
  children:     'orange',
};

export default function Lessons() {
  const { api, token } = useAuth();
  const req   = useMemo(() => makeReq(api, token), [api, token]);
  const toast = useToast();

  const [rows, setRows]       = useState([]);
  const [byCat, setByCat]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [cat, setCat]         = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lessons, cats] = await Promise.all([
        req('/api/admin/insights/most-completed-lessons?limit=100'),
        req('/api/admin/insights/lesson-categories').catch(() => []),
      ]);
      setRows(Array.isArray(lessons) ? lessons : []);
      // Backend returns a raw array; tolerate the {categories} envelope too
      // in case it gets standardised later.
      setByCat(Array.isArray(cats) ? cats : (cats?.categories || []));
    } catch (e) {
      toast.error(e.message || 'Failed to load lessons.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((l) => {
      if (cat !== 'all' && l.category_id !== cat) return false;
      if (!term) return true;
      return (
        l.title?.toLowerCase().includes(term) ||
        String(l.lesson_number || '').includes(term)
      );
    });
  }, [rows, q, cat]);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Insights</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Lesson completions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Which lessons are landing? Sorted by total quiz completions across your students.
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Per-category mini summary */}
      {byCat.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {byCat.map((c) => (
            <div key={c.category_id || c.id || c.category} className="card p-3">
              <div className="flex items-center justify-between">
                <Badge variant={CAT_PILL[c.category_id || c.id || c.category] || 'zinc'}>
                  <span className="capitalize">{c.category_id || c.id || c.category}</span>
                </Badge>
              </div>
              <div className="mt-2 text-xl font-bold tabular text-ink">{c.completions ?? c.total_completions ?? 0}</div>
              <div className="text-[11px] text-zinc-500">completions</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lesson…"
            className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg ring-1 ring-zinc-200 bg-white px-3 py-2 text-sm font-medium text-ink"
        >
          <option value="all">All categories</option>
          {Object.keys(CAT_PILL).map((c) => (
            <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-500">{filtered.length} lessons</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6"><Skeleton lines={6} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-3 text-sm font-semibold text-zinc-700">
              {rows.length === 0 ? 'No completions yet' : 'No lessons match'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5 w-14">#</th>
                  <th className="px-5 py-2.5">Title</th>
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5 text-right">Completions</th>
                  <th className="px-5 py-2.5 text-right">Unique</th>
                  <th className="px-5 py-2.5 text-right">Avg score</th>
                  <th className="px-5 py-2.5 text-right">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-25">
                    <td className="px-5 py-2.5 font-bold text-zinc-500">{l.lesson_number ?? '—'}</td>
                    <td className="px-5 py-2.5">
                      <div className="font-semibold text-ink">{l.title}</div>
                      {l.lesson_date && (
                        <div className="mt-0.5 text-[11px] text-zinc-500">{fmtDate(l.lesson_date)}</div>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant={CAT_PILL[l.category_id] || 'zinc'}>
                        <span className="capitalize">{l.category_id}</span>
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold text-ink">{l.completions}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{l.unique_learners}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{l.avg_score ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-500">
                      {l.last_completed ? new Date(l.last_completed).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
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

function Skeleton({ lines = 4 }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
