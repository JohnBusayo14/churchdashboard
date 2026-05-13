import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck, TrendingUp, TrendingDown, Trophy, Users as UsersIcon,
  GraduationCap, RefreshCcw, Search, Filter, Award,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { makeReq } from '../api.js';
import Badge from '../components/Badge.jsx';

const POLL_MS = 15_000;

const TABS = [
  { v: 'live',  label: 'Live submissions', desc: 'Marks as teachers submit them' },
  { v: 'class', label: 'By class',         desc: 'Marks matrix per Sunday-school class' },
  { v: 'student', label: 'By student',     desc: 'Full scorecard for one student' },
];

const MARK_BADGE = {
  answered_question: 'blue',
  memory_verse:      'violet',
  bonus:             'amber',
  attendance:        'teal',
};

const fmtNum = (n) => (n ?? 0).toLocaleString('en-NG');

export default function Marks() {
  const { api, token } = useAuth();
  const { activeBranchId, activeBranch } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [tab, setTab] = useState('live');
  const [summary, setSummary]   = useState(null);
  const [sLoading, setSLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setSLoading(true);
    try {
      const r = await req('/api/church-admin/marks/summary');
      setSummary(r);
    } catch (e) {
      toast?.error(e.message || 'Failed to load summary.');
    } finally {
      setSLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { loadSummary(); }, [loadSummary, activeBranchId]);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Learning</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Sunday School Marks</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every mark teachers submit from the mobile app
            {activeBranch ? `, scoped to ${activeBranch.name}` : ', across all branches'}.
          </p>
        </div>
        <button onClick={loadSummary} className="btn-ghost" disabled={sLoading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${sLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <SummaryStrip data={summary} loading={sLoading} />

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-zinc-200">
        {TABS.map((t) => {
          const active = tab === t.v;
          return (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              title={t.desc}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
                active
                  ? 'border-brand-600 text-ink'
                  : 'border-transparent text-zinc-500 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tab === 'live'    && <LiveTab    req={req} onMarkChange={loadSummary} />}
        {tab === 'class'   && <ClassTab   req={req} />}
        {tab === 'student' && <StudentTab req={req} />}
      </div>
    </div>
  );
}

function SummaryStrip({ data, loading }) {
  const w = data?.windowed || {};
  const marksDelta = pct(w.marks_7d, w.marks_prev_7d);
  const pointsDelta = pct(w.points_7d, w.points_prev_7d);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={ClipboardCheck}
          label="Marks · 7d"
          value={loading ? '—' : fmtNum(w.marks_7d)}
          sub={`${fmtNum(w.marks_prev_7d)} last week`}
          delta={marksDelta} deltaGood
        />
        <Kpi
          icon={Award}
          label="Points · 7d"
          value={loading ? '—' : fmtNum(w.points_7d)}
          sub={`${fmtNum(w.points_prev_7d)} last week`}
          delta={pointsDelta} deltaGood
        />
        <Kpi
          icon={GraduationCap}
          label="Active teachers · 30d"
          value={loading ? '—' : fmtNum(w.active_teachers_30d)}
          sub="submitted at least 1 mark"
        />
        <TopCard data={data} loading={loading} />
      </div>
      {!loading && data?.byType?.length > 0 && (
        <div className="mt-4 card p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Mark types · last 30 days
          </div>
          <MarkTypeBars rows={data.byType} />
        </div>
      )}
    </>
  );
}

function TopCard({ data, loading }) {
  if (loading) return <Kpi icon={Trophy} label="Top student · 30d" value="—" sub="" />;
  const s = data?.topStudent;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Top student · 30d
        </div>
        <Trophy className="h-4 w-4 text-amber-500" />
      </div>
      <div className="mt-3 text-[18px] font-bold tracking-tight text-ink truncate">
        {s?.name || '—'}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {s ? `${fmtNum(s.points)} points · ${fmtNum(s.marks)} marks` : 'No marks yet this month'}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, delta, deltaGood }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className="mt-3 text-[26px] font-bold tracking-tight text-ink tabular">{value}</div>
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

function MarkTypeBars({ rows }) {
  const total = rows.reduce((a, r) => a + r.count, 0);
  if (!total) return null;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const p = Math.round((r.count / total) * 100);
        return (
          <li key={r.type}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-ink capitalize">
                {String(r.type || '').replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-zinc-500 tabular">
                {fmtNum(r.count)} marks · {fmtNum(r.points)} pts · {p}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full bg-brand-600" style={{ width: `${p}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function pct(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

// ── Tab 1: Live submissions ────────────────────────────────────────────────
function LiveTab({ req, onMarkChange }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ class_id: '', mark_type: '', awarded_by: '', q: '' });
  const [classes, setClasses] = useState([]);
  const sinceIdRef = useRef(null);

  // Load class list for the filter dropdown (one-shot).
  useEffect(() => {
    (async () => {
      try {
        const r = await req('/api/church-admin/learning/classes');
        setClasses(r.classes || []);
      } catch { /* silent */ }
    })();
  }, [req]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set('limit', '100');
    if (filters.class_id)   p.set('class_id',   filters.class_id);
    if (filters.mark_type)  p.set('mark_type',  filters.mark_type);
    if (filters.awarded_by) p.set('awarded_by', filters.awarded_by);
    return p;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/marks?${buildParams().toString()}`);
      setItems(r.marks || []);
      sinceIdRef.current = r.marks?.[0]?.id ?? null;
    } catch { /* toast handled at page level */ }
    finally { setLoading(false); }
  }, [req, buildParams]);

  useEffect(() => { load(); }, [load]);

  // Poll for new submissions.
  useEffect(() => {
    const id = setInterval(async () => {
      if (sinceIdRef.current == null) return;
      try {
        const p = buildParams();
        p.set('since_id', String(sinceIdRef.current));
        const r = await req(`/api/church-admin/marks?${p.toString()}`);
        if (r.marks?.length) {
          setItems((prev) => [...r.marks.slice().reverse(), ...prev].slice(0, 200));
          sinceIdRef.current = r.marks[r.marks.length - 1].id;
          onMarkChange?.();
        }
      } catch { /* silent */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [req, buildParams, onMarkChange]);

  const filtered = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((m) => {
      const hay = `${m.student_name} ${m.teacher_name} ${m.class_name} ${m.note || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, filters.q]);

  return (
    <div>
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Search student, teacher, class, note…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <Select value={filters.class_id} onChange={(v) => setFilters({ ...filters, class_id: v })}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={filters.mark_type} onChange={(v) => setFilters({ ...filters, mark_type: v })}>
            <option value="">All types</option>
            <option value="answered_question">Answered question</option>
            <option value="memory_verse">Memory verse</option>
            <option value="bonus">Bonus</option>
            <option value="attendance">Attendance</option>
          </Select>
          <button onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live · polls every 15s
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !filtered.length ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="py-14 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">
              No marks submitted yet for these filters.
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Teachers submit marks from the mobile app. They will appear here within 15 seconds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">When</th>
                  <th className="px-5 py-2.5">Student</th>
                  <th className="px-5 py-2.5">Class · lesson</th>
                  <th className="px-5 py-2.5">Type</th>
                  <th className="px-5 py-2.5 text-right">Points</th>
                  <th className="px-5 py-2.5">Teacher</th>
                  <th className="px-5 py-2.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-2.5 text-zinc-600 whitespace-nowrap text-xs">
                      {relTime(m.awarded_at)}
                    </td>
                    <td className="px-5 py-2.5 font-semibold text-ink">{m.student_name}</td>
                    <td className="px-5 py-2.5 text-zinc-700">
                      <div className="text-xs">{m.class_name}</div>
                      <div className="text-[11px] text-zinc-500">Lesson #{m.lesson_number}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant={MARK_BADGE[m.mark_type] || 'zinc'}>
                        {String(m.mark_type || '').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-700">
                      +{fmtNum(m.points)}
                    </td>
                    <td className="px-5 py-2.5 text-zinc-600 text-xs">
                      {m.teacher_name}
                    </td>
                    <td className="px-5 py-2.5 text-zinc-500 text-xs max-w-[200px] truncate">
                      {m.note || '—'}
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

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg ring-1 ring-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
    >
      {children}
    </select>
  );
}

// ── Tab 2: By class — marks matrix ─────────────────────────────────────────
function ClassTab({ req }) {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const r = await req('/api/church-admin/learning/classes');
        setClasses(r.classes || []);
        if (r.classes?.length && !classId) setClassId(String(r.classes[0].id));
      } catch (e) {
        toast?.error(e.message || 'Failed to load classes.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    (async () => {
      try {
        const r = await req(`/api/church-admin/marks/by-class/${classId}`);
        setData(r);
      } catch (e) {
        toast?.error(e.message || 'Failed to load class marks.');
      } finally { setLoading(false); }
    })();
  }, [req, classId, toast]);

  const lessons = data?.lessons || [];

  return (
    <div>
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Class
          </label>
          <Select value={classId} onChange={setClassId}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.enrollment || 0} student{c.enrollment === 1 ? '' : 's'}
              </option>
            ))}
          </Select>
          {data?.class && (
            <div className="ml-3 text-xs text-zinc-500">
              Teacher: <span className="text-zinc-800">{data.class.teacher_name || data.class.teacher_email}</span>
              {' · '}
              <code className="rounded bg-zinc-100 px-1 py-0.5">{data.class.invite_code}</code>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="p-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : !data?.students?.length ? (
          <div className="py-12 text-center">
            <UsersIcon className="mx-auto h-7 w-7 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">
              No students or marks in this class yet.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25 sticky top-0">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5 sticky left-0 bg-zinc-25">Student</th>
                  {lessons.map((l) => (
                    <th key={l.lesson_number} className="px-3 py-2.5 text-right">
                      L{l.lesson_number}
                    </th>
                  ))}
                  <th className="px-5 py-2.5 text-right">Marks</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.students.map((s) => (
                  <tr key={s.email}>
                    <td className="px-5 py-2.5 sticky left-0 bg-white">
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-[11px] text-zinc-500">{s.email}</div>
                      {s.left_class && (
                        <Badge variant="zinc" className="mt-0.5">Left class</Badge>
                      )}
                    </td>
                    {lessons.map((l) => {
                      const cell = s.lessons[l.lesson_number];
                      return (
                        <td
                          key={l.lesson_number}
                          className={`px-3 py-2.5 text-right ${cell ? 'text-ink' : 'text-zinc-300'}`}
                          title={cell ? formatBreakdown(cell) : 'No mark'}
                        >
                          {cell ? cell.points : '—'}
                        </td>
                      );
                    })}
                    <td className="px-5 py-2.5 text-right text-zinc-700">
                      {fmtNum(s.totals.marks)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-700">
                      {fmtNum(s.totals.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-25">
                <tr>
                  <td className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 sticky left-0 bg-zinc-25">
                    Class total
                  </td>
                  {lessons.map((l) => (
                    <td key={l.lesson_number} className="px-3 py-2.5 text-right text-zinc-700">
                      {fmtNum(l.total_points)}
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right text-zinc-700">
                    {fmtNum(lessons.reduce((a, l) => a + l.marks_count, 0))}
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold text-ink">
                    {fmtNum(lessons.reduce((a, l) => a + l.total_points, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500 inline-flex items-center gap-1">
        <Filter className="h-3 w-3" /> Hover a cell to see the per-mark-type breakdown.
      </p>
    </div>
  );
}

function formatBreakdown(cell) {
  if (!cell?.by_type) return '';
  return Object.entries(cell.by_type)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n');
}

// ── Tab 3: By student — scorecard ──────────────────────────────────────────
function StudentTab({ req }) {
  const [q, setQ]             = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked]   = useState(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // One-shot prefetch of "any student" so the picker has options on first open.
  const search = useCallback(async () => {
    setSearching(true);
    try {
      const p = new URLSearchParams({ limit: '20' });
      if (q.trim()) p.set('q', q.trim());
      const r = await req(`/api/church-admin/learning/students?${p.toString()}`);
      setResults(r.students || []);
    } finally { setSearching(false); }
  }, [req, q]);

  useEffect(() => { search(); /* prefetch */ /* eslint-disable-next-line */ }, []);

  const open = async (s) => {
    setPicked(s);
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/marks/by-student?email=${encodeURIComponent(s.student_email)}`);
      setData(r);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  if (picked) {
    return (
      <StudentScorecard
        picked={picked}
        data={data}
        loading={loading}
        onBack={() => { setPicked(null); setData(null); }}
      />
    );
  }

  return (
    <div>
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
              placeholder="Search students by name or email…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <button onClick={search} className="btn-ghost" disabled={searching}>
            <RefreshCcw className={`h-3.5 w-3.5 ${searching ? 'animate-spin' : ''}`} />
            Search
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {searching && !results.length ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        ) : !results.length ? (
          <div className="py-12 text-center">
            <UsersIcon className="mx-auto h-7 w-7 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">
              No students found. Try a different search.
            </div>
          </div>
        ) : (
          <table className="w-full text-sm tabular">
            <thead className="bg-zinc-25">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-2.5">Student</th>
                <th className="px-5 py-2.5 text-right">Classes</th>
                <th className="px-5 py-2.5 text-right">Lessons completed</th>
                <th className="px-5 py-2.5 text-right">Teacher marks</th>
                <th className="px-5 py-2.5 text-right">Quiz score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {results.map((s) => (
                <tr
                  key={s.student_email}
                  onClick={() => open(s)}
                  className="cursor-pointer hover:bg-zinc-25"
                >
                  <td className="px-5 py-2.5">
                    <div className="font-semibold text-ink">{s.student_name}</div>
                    <div className="text-[11px] text-zinc-500">{s.student_email}</div>
                  </td>
                  <td className="px-5 py-2.5 text-right">{fmtNum(s.classes_count)}</td>
                  <td className="px-5 py-2.5 text-right">{fmtNum(s.lessons_completed)}</td>
                  <td className="px-5 py-2.5 text-right">{fmtNum(s.marks_received)}</td>
                  <td className="px-5 py-2.5 text-right text-zinc-700">{fmtNum(s.total_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StudentScorecard({ picked, data, loading, onBack }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-zinc-500 hover:text-ink"
          >
            ← Back to student list
          </button>
          <h2 className="mt-1 text-xl font-bold text-ink">
            {picked.student_name}
          </h2>
          <p className="text-xs text-zinc-500">{picked.student_email}</p>
        </div>
      </div>

      {loading || !data ? (
        <div className="card p-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Kpi icon={ClipboardCheck} label="Marks received" value={fmtNum(data.totals.marks)} sub="all time" />
            <Kpi icon={Award}          label="Total points"   value={fmtNum(data.totals.points)} sub="all time" />
            <Kpi icon={GraduationCap}  label="Classes joined" value={fmtNum(data.byClass.length)} sub="" />
            <Kpi icon={Trophy}         label="Last activity"  value={data.totals.last_awarded ? relTime(data.totals.last_awarded) : '—'} sub="" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <h3 className="text-[15px] font-semibold text-ink">By class</h3>
                <span className="text-xs text-zinc-500">{data.byClass.length} class{data.byClass.length === 1 ? '' : 'es'}</span>
              </div>
              {!data.byClass.length ? (
                <div className="py-8 text-center text-sm text-zinc-500">No class marks yet.</div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {data.byClass.map((c) => (
                    <li key={c.class_id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="font-semibold text-ink">{c.class_name}</div>
                        <div className="text-[11px] text-zinc-500">
                          {c.lessons_covered} lesson{c.lessons_covered === 1 ? '' : 's'} · {c.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 tabular">{fmtNum(c.points)} pts</div>
                        <div className="text-[11px] text-zinc-500">{fmtNum(c.marks)} marks</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <h3 className="text-[15px] font-semibold text-ink">By type</h3>
              </div>
              {!data.byType.length ? (
                <div className="py-8 text-center text-sm text-zinc-500">No marks yet.</div>
              ) : (
                <div className="p-5">
                  <MarkTypeBars rows={data.byType} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 card overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <h3 className="text-[15px] font-semibold text-ink">Recent marks</h3>
              <span className="text-xs text-zinc-500">Latest {data.recent.length}</span>
            </div>
            {!data.recent.length ? (
              <div className="py-8 text-center text-sm text-zinc-500">No marks recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular">
                  <thead className="bg-zinc-25">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-2.5">When</th>
                      <th className="px-5 py-2.5">Class · lesson</th>
                      <th className="px-5 py-2.5">Type</th>
                      <th className="px-5 py-2.5 text-right">Points</th>
                      <th className="px-5 py-2.5">Teacher</th>
                      <th className="px-5 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.recent.map((m) => (
                      <tr key={m.id}>
                        <td className="px-5 py-2.5 text-zinc-600 text-xs whitespace-nowrap">{relTime(m.awarded_at)}</td>
                        <td className="px-5 py-2.5 text-zinc-700">
                          <div className="text-xs">{m.class_name}</div>
                          <div className="text-[11px] text-zinc-500">Lesson #{m.lesson_number}</div>
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge variant={MARK_BADGE[m.mark_type] || 'zinc'}>
                            {String(m.mark_type || '').replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-5 py-2.5 text-right font-bold text-emerald-700">+{fmtNum(m.points)}</td>
                        <td className="px-5 py-2.5 text-xs text-zinc-600">{m.teacher_name}</td>
                        <td className="px-5 py-2.5 text-xs text-zinc-500 max-w-[200px] truncate">{m.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function relTime(iso) {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 30)     return 'just now';
  if (s < 60)     return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}
