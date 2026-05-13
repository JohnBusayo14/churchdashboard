import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCog, UserPlus, Trash2, Mail } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useRole, ALL_ROLES, ROLE_LABELS } from '../contexts/RoleContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';

const STATUS_BADGE = {
  active:   'bg-emerald-50 text-emerald-700',
  invited:  'bg-amber-50 text-amber-700',
  disabled: 'bg-zinc-100 text-zinc-500',
};

export default function Team() {
  const { api, token, branches } = useAuth();
  const { canSee } = useRole();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const canEdit = canSee('team');
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req('/api/church-admin/staff');
      setRows(r.staff || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load]);

  const update = async (id, patch) => {
    try {
      const r = await req(`/api/church-admin/staff/${id}`, 'PUT', patch);
      setRows((rs) => rs.map((s) => (s.id === id ? { ...s, ...r.staff } : s)));
      toast?.success('Staff updated.');
    } catch (e) {
      toast?.error(e.message || 'Update failed.');
    }
  };

  const remove = async (s) => {
    if (!confirm(`Remove ${s.name || s.email} from the roster?`)) return;
    try {
      await req(`/api/church-admin/staff/${s.id}`, 'DELETE');
      toast?.success('Staff removed.');
      setRows((rs) => rs.filter((r) => r.id !== s.id));
    } catch (e) {
      toast?.error(e.message || 'Remove failed.');
    }
  };

  const invite = async (payload) => {
    try {
      await req('/api/church-admin/staff', 'POST', payload);
      toast?.success('Invitation recorded.');
      setInviting(false);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Invite failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Admin</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Team</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pastors, finance officers, workers and teachers. Assign roles and branches.
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setInviting(true)} className="btn-primary">
            <UserPlus className="h-3.5 w-3.5" /> Invite staff
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : !rows.length ? (
          <div className="py-10 text-center">
            <UserCog className="mx-auto h-7 w-7 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">No staff yet.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Email</th>
                  <th className="px-5 py-2.5">Role</th>
                  <th className="px-5 py-2.5">Branch</th>
                  <th className="px-5 py-2.5">Status</th>
                  {canEdit && <th className="px-5 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                          {initials(s.name || s.email)}
                        </div>
                        <span className="font-semibold text-ink">{s.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-zinc-600">
                      <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 hover:underline">
                        <Mail className="h-3 w-3 text-zinc-400" /> {s.email}
                      </a>
                    </td>
                    <td className="px-5 py-2.5">
                      {canEdit ? (
                        <select
                          value={s.role}
                          onChange={(e) => update(s.id, { role: e.target.value })}
                          className="rounded-md ring-1 ring-zinc-200 bg-white px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{ROLE_LABELS[s.role] || s.role}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {canEdit ? (
                        <select
                          value={s.branch_id ?? ''}
                          onChange={(e) => update(s.id, { branch_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                          className="rounded-md ring-1 ring-zinc-200 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
                        >
                          <option value="">All branches</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-zinc-600">{s.branch_name || 'All branches'}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {canEdit ? (
                        <select
                          value={s.status}
                          onChange={(e) => update(s.id, { status: e.target.value })}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[s.status] || 'bg-zinc-100'}`}
                        >
                          <option value="active">Active</option>
                          <option value="invited">Invited</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[s.status]}`}>
                          {s.status}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-5 py-2.5 text-right">
                        <button
                          onClick={() => remove(s)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal
        open={inviting}
        branches={branches}
        onClose={() => setInviting(false)}
        onSave={invite}
      />
    </div>
  );
}

function initials(s) {
  return s.split(/[\s@.]+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function InviteModal({ open, branches, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'worker', branch_id: '' });

  useEffect(() => {
    if (open) setForm({ name: '', email: '', role: 'worker', branch_id: '' });
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name:      form.name.trim() || null,
      email:     form.email.trim().toLowerCase(),
      role:      form.role,
      branch_id: form.branch_id ? parseInt(form.branch_id, 10) : null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite staff"
      sub="They'll appear as Invited until they accept (multi-user login coming in a future pass)."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="invite-form" className="btn-primary">Send invite</button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            placeholder="Optional"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Branch</label>
          <select
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            className="input"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
