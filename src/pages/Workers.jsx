import { useCallback, useEffect, useMemo, useState } from 'react';
import { HardHat, Plus, Trash2, Search, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';
import { Avatar } from './Members.jsx';

// Suggested departments — these become quick-pick chips on the assign modal,
// but the field is free-text so churches can use anything.
const SUGGESTED_DEPTS = [
  'Choir', 'Ushering', 'Media', 'Children', 'Youth',
  'Evangelism', 'Welfare', 'Sound', 'Security', 'Prayer',
];

export default function Workers() {
  const { api, token } = useAuth();
  const { activeBranchId } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [includeEnded, setIncludeEnded] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/workers?include_ended=${includeEnded}`);
      setItems(r.assignments || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load workers.');
    } finally {
      setLoading(false);
    }
  }, [req, includeEnded, toast]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  // Group by department for display.
  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = items.filter((a) => {
      if (!term) return true;
      const hay = `${a.department} ${a.role} ${a.first_name} ${a.last_name || ''} ${a.email || ''}`.toLowerCase();
      return hay.includes(term);
    });
    const map = new Map();
    for (const a of filtered) {
      const key = a.department || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return [...map.entries()]
      .map(([dept, list]) => ({ dept, list }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [items, q]);

  const totalActive = items.filter((a) => !a.ended_at).length;

  const remove = async (a) => {
    if (!confirm(`Remove ${a.first_name} from ${a.department}?`)) return;
    try {
      await req(`/api/church-admin/assignments/${a.id}`, 'DELETE');
      toast?.success('Assignment removed.');
      await load();
    } catch (e) {
      toast?.error(e.message || 'Remove failed.');
    }
  };

  const endIt = async (a) => {
    try {
      await req(`/api/church-admin/assignments/${a.id}`, 'PUT', {
        ended_at: new Date().toISOString().slice(0, 10),
      });
      toast?.success('Assignment ended.');
      await load();
    } catch (e) {
      toast?.error(e.message || 'Update failed.');
    }
  };

  const create = async (payload) => {
    try {
      const { member_id, ...rest } = payload;
      await req(`/api/church-admin/members/${member_id}/assignments`, 'POST', rest);
      toast?.success('Assigned.');
      setAssigning(false);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Assign failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Community</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Workers &amp; Volunteers</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Who serves where. {totalActive} active assignment{totalActive === 1 ? '' : 's'}
            {grouped.length ? ` across ${grouped.length} department${grouped.length === 1 ? '' : 's'}` : ''}.
          </p>
        </div>
        <button onClick={() => setAssigning(true)} className="btn-primary">
          <Plus className="h-3.5 w-3.5" /> Assign worker
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by department, role, name…"
            className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          />
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
          <input
            type="checkbox"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Include past assignments
        </label>
      </div>

      {loading && !items.length ? (
        <div className="card p-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : !grouped.length ? (
        <div className="card p-12 text-center">
          <HardHat className="mx-auto h-8 w-8 text-zinc-300" />
          <div className="mt-2 text-sm font-medium text-zinc-500">No assignments yet.</div>
          <button onClick={() => setAssigning(true)} className="mt-3 btn-primary">
            <Plus className="h-3.5 w-3.5" /> Assign the first worker
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ dept, list }) => (
            <section key={dept} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-25 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <HardHat className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-[15px] font-semibold text-ink">{dept}</h2>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                  <UsersIcon className="h-3 w-3" /> {list.length}
                </span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {list.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar member={a} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-ink">
                        {a.first_name} {a.last_name || ''}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {a.role}
                        {a.started_at ? ` · since ${a.started_at.slice(0, 10)}` : ''}
                        {a.ended_at  ? ` · ended ${a.ended_at.slice(0, 10)}` : ''}
                        {a.branch_name && ` · ${a.branch_name}`}
                      </div>
                    </div>
                    {!a.ended_at && (
                      <button
                        onClick={() => endIt(a)}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                        title="End assignment (keep history)"
                      >
                        End
                      </button>
                    )}
                    <button
                      onClick={() => remove(a)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AssignWorkerModal
        open={assigning}
        req={req}
        onClose={() => setAssigning(false)}
        onSave={create}
      />
    </div>
  );
}

function AssignWorkerModal({ open, req, onClose, onSave }) {
  const [step, setStep]       = useState(1);  // 1 = pick member, 2 = enter details
  const [member, setMember]   = useState(null);
  const [q, setQ]             = useState('');
  const [results, setResults] = useState([]);
  const [form, setForm]       = useState({ department: '', role: 'member', started_at: '', notes: '' });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMember(null);
    setQ('');
    setResults([]);
    setForm({ department: '', role: 'member', started_at: new Date().toISOString().slice(0, 10), notes: '' });
  }, [open]);

  const search = async () => {
    const p = new URLSearchParams({ limit: '20' });
    if (q.trim()) p.set('q', q.trim());
    const r = await req(`/api/church-admin/members?${p.toString()}`);
    setResults(r.members || []);
  };

  useEffect(() => { if (open && step === 1) search(); /* eslint-disable-line */ }, [open, step]);

  const submit = (e) => {
    e.preventDefault();
    if (!member || !form.department.trim()) return;
    onSave({
      member_id:  member.id,
      department: form.department.trim(),
      role:       form.role.trim() || 'member',
      started_at: form.started_at || null,
      notes:      form.notes || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? 'Pick a member' : `Assign ${member?.first_name}`}
      sub={step === 1 ? 'Search for the member to assign.' : 'Department and role they will serve in.'}
      footer={
        step === 1 ? (
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        ) : (
          <>
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button type="submit" form="assign-worker-form" className="btn-primary">Assign</button>
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
            placeholder="Search name, email, phone…"
            className="input"
          />
          {!results.length ? (
            <div className="py-6 text-center text-sm text-zinc-500">No matches.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-72 overflow-y-auto rounded-lg ring-1 ring-zinc-200">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => { setMember(m); setStep(2); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-25"
                  >
                    <Avatar member={m} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">
                        {m.first_name} {m.last_name || ''}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {m.email || m.phone || '—'} · {m.status.replace('_', ' ')}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form id="assign-worker-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Department</label>
            <input
              className="input"
              required
              placeholder="e.g. Choir, Ushering, Media"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SUGGESTED_DEPTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, department: d })}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-150"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <input
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="member / leader / assistant"
            />
          </div>
          <div>
            <label className="label">Started on</label>
            <input
              type="date"
              className="input"
              value={form.started_at}
              onChange={(e) => setForm({ ...form, started_at: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <input
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}

