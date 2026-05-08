// pages/Approvals.jsx — review and approve/reject teacher signups for this church.
//
// Source: GET /api/church-admin/teachers?status=…
//   Actions: POST /api/church-admin/teachers/:id/approve
//            POST /api/church-admin/teachers/:id/reject  body { reason }
//
// All three endpoints sit behind churchAuth on the backend, so the list is
// already scoped to this admin's church. We don't have to filter client-side.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, RefreshCcw, Search, Check, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Badge from '../components/Badge.jsx';

const STATUS_TABS = [
  { v: 'pending',  label: 'Pending'  },
  { v: 'approved', label: 'Approved' },
  { v: 'rejected', label: 'Rejected' },
  { v: 'all',      label: 'All'      },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtRel  = (d) => {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600)    return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const StatusBadge = ({ status }) =>
  status === 'approved' ? <Badge variant="green">Approved</Badge>
: status === 'rejected' ? <Badge variant="red">Rejected</Badge>
:                         <Badge variant="amber">Pending</Badge>;

export default function Approvals() {
  const { api, token } = useAuth();
  const req   = useMemo(() => makeReq(api, token), [api, token]);
  const toast = useToast();

  const [status,   setStatus]   = useState('pending');
  const [teachers, setTeachers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);
  const [q,        setQ]        = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await req(`/api/church-admin/teachers?status=${encodeURIComponent(status)}`);
      setTeachers(d?.teachers || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, [req, status, toast]);

  useEffect(() => { load(); }, [load]);

  const approve = async (t) => {
    setBusyId(t.id);
    try {
      await req(`/api/church-admin/teachers/${t.id}/approve`, 'POST');
      toast.success(`Approved ${t.display_name || t.email}`);
      // Optimistic update: drop from pending list, or update status in place.
      if (status === 'pending') setTeachers((xs) => xs.filter((x) => x.id !== t.id));
      else setTeachers((xs) => xs.map((x) => x.id === t.id ? { ...x, approval_status: 'approved' } : x));
    } catch (e) {
      toast.error(e.message || 'Approve failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (t) => {
    const reason = window.prompt(
      `Reason for rejecting ${t.display_name || t.email}? (optional, shown to the applicant on next login)`,
      '',
    );
    if (reason === null) return; // cancelled
    setBusyId(t.id);
    try {
      await req(`/api/church-admin/teachers/${t.id}/reject`, 'POST', { reason: reason.trim() || null });
      toast.info('Rejected.');
      if (status === 'pending') setTeachers((xs) => xs.filter((x) => x.id !== t.id));
      else setTeachers((xs) => xs.map((x) => x.id === t.id ? { ...x, approval_status: 'rejected', rejected_reason: reason.trim() || null } : x));
    } catch (e) {
      toast.error(e.message || 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((t) =>
      t.display_name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.full_name?.toLowerCase().includes(term),
    );
  }, [teachers, q]);

  const pendingCount = teachers.filter((t) => t.approval_status === 'pending').length;

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Manage</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Teacher approvals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review teachers who registered with your church code. Approve to grant them access; reject if you don't recognise them.
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-zinc-200 bg-white p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.v}
            onClick={() => setStatus(tab.v)}
            className={
              `rounded-md px-3 py-1.5 text-sm font-semibold transition ` +
              (status === tab.v
                ? 'bg-brand-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-100')
            }
          >
            {tab.label}
            {tab.v === 'pending' && pendingCount > 0 && (
              <span className={`ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                status === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
              }`}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

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
            <UserCheck className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-3 text-sm font-semibold text-zinc-700">
              {teachers.length === 0
                ? (status === 'pending' ? 'No teachers awaiting approval.' : `No ${status} teachers.`)
                : 'No teachers match'}
            </div>
            {teachers.length === 0 && status === 'pending' && (
              <div className="mt-1 text-[12.5px] text-zinc-500 max-w-sm mx-auto">
                When a teacher registers with your church invite code, they'll appear here so you can approve them.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Teacher</th>
                  <th className="px-5 py-2.5">Joined</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-25">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{t.avatar_emoji || '👤'}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">
                            {t.display_name || t.full_name || t.email}
                          </div>
                          <div className="text-[11px] text-zinc-500">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      <div>{fmtDate(t.created_at)}</div>
                      <div className="text-[11px] text-zinc-400">{fmtRel(t.created_at)}</div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.approval_status} />
                      {t.approval_status === 'rejected' && t.rejected_reason && (
                        <div className="mt-1 max-w-xs text-[11px] text-zinc-500" title={t.rejected_reason}>
                          {t.rejected_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {t.approval_status === 'pending' && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => approve(t)}
                            disabled={busyId === t.id}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => reject(t)}
                            disabled={busyId === t.id}
                            className="inline-flex items-center gap-1 rounded-md bg-white ring-1 ring-zinc-200 px-2.5 py-1.5 text-[12.5px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}
                      {t.approval_status === 'rejected' && (
                        <button
                          onClick={() => approve(t)}
                          disabled={busyId === t.id}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" /> Re-approve
                        </button>
                      )}
                      {t.approval_status === 'approved' && (
                        <span className="text-[12px] text-zinc-400">—</span>
                      )}
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
