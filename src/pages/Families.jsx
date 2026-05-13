import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Plus, Pencil, Trash2, X, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';
import { Avatar } from './Members.jsx';

const FAMILY_ROLES = [
  { v: '',          label: '—' },
  { v: 'head',      label: 'Head' },
  { v: 'spouse',    label: 'Spouse' },
  { v: 'child',     label: 'Child' },
  { v: 'dependent', label: 'Dependent' },
  { v: 'other',     label: 'Other' },
];

export default function Families() {
  const { api, token, branches } = useAuth();
  const { activeBranchId } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | {row}
  const [openId, setOpenId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req('/api/church-admin/families');
      setRows(r.families || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load families.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const save = async (payload, id) => {
    try {
      if (id) {
        await req(`/api/church-admin/families/${id}`, 'PUT', payload);
        toast?.success('Family updated.');
      } else {
        await req('/api/church-admin/families', 'POST', payload);
        toast?.success('Family created.');
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Save failed.');
    }
  };

  const remove = async (f) => {
    if (!confirm(`Delete family "${f.name}"? Members will be unlinked but kept.`)) return;
    try {
      await req(`/api/church-admin/families/${f.id}`, 'DELETE');
      toast?.success('Family deleted.');
      await load();
    } catch (e) {
      toast?.error(e.message || 'Delete failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Community</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Families</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Group members into family units with heads, spouses and children.
          </p>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary">
          <Plus className="h-3.5 w-3.5" /> New family
        </button>
      </div>

      {loading && !rows.length ? (
        <div className="card p-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : !rows.length ? (
        <div className="card p-12 text-center">
          <Home className="mx-auto h-8 w-8 text-zinc-300" />
          <div className="mt-2 text-sm font-medium text-zinc-500">No families yet.</div>
          <button onClick={() => setEditing('new')} className="mt-3 btn-primary">
            <Plus className="h-3.5 w-3.5" /> Create the first family
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((f) => (
            <div key={f.id} className="card overflow-hidden">
              <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-50/60 to-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Home className="h-4 w-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                    <UsersIcon className="h-3 w-3" /> {f.member_count}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-ink tracking-tight">{f.name}</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {f.head_id
                    ? `Head: ${f.head_first || ''} ${f.head_last || ''}`.trim()
                    : 'No head assigned'}
                </p>
                {f.address && (
                  <p className="mt-1 text-xs text-zinc-500 truncate">{f.address}</p>
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  onClick={() => setOpenId(f.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  View members
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(f)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(f)}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FamilyFormModal
        open={!!editing}
        initial={editing === 'new' ? null : editing}
        branches={branches}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <FamilyDetailDrawer
        familyId={openId}
        req={req}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
    </div>
  );
}

function FamilyFormModal({ open, initial, branches, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', address: '', branch_id: '', notes: '' });

  useEffect(() => {
    if (!open) return;
    setForm({
      name:      initial?.name || '',
      address:   initial?.address || '',
      branch_id: initial?.branch_id ?? '',
      notes:     initial?.notes || '',
    });
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(
      {
        name:      form.name.trim(),
        address:   form.address || null,
        notes:     form.notes || null,
        branch_id: form.branch_id ? parseInt(form.branch_id, 10) : null,
      },
      initial?.id || null,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit family' : 'New family'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="family-form" className="btn-primary">Save</button>
        </>
      }
    >
      <form id="family-form" onSubmit={submit} className="grid grid-cols-1 gap-3">
        <div>
          <label className="label">Family name</label>
          <input
            type="text"
            className="input"
            required
            placeholder="e.g. The Adebayo Family"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Branch</label>
          <select
            className="input"
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
          >
            <option value="">Default (active branch)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            type="text"
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            rows={3}
            className="input min-h-[60px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Add members and set the family head from the family detail view.
        </p>
      </form>
    </Modal>
  );
}

function FamilyDetailDrawer({ familyId, req, onClose, onChanged }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/families/${familyId}`);
      setData(r);
    } catch (e) {
      toast?.error(e.message || 'Failed to load family.');
    } finally {
      setLoading(false);
    }
  }, [familyId, req, toast]);

  useEffect(() => { load(); }, [load]);

  const removeMember = async (m) => {
    if (!confirm(`Remove ${m.first_name} from this family?`)) return;
    try {
      await req(`/api/church-admin/members/${m.id}`, 'PUT', { family_id: null, family_role: null });
      toast?.success('Removed from family.');
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Remove failed.');
    }
  };

  const changeRole = async (m, role) => {
    try {
      await req(`/api/church-admin/members/${m.id}`, 'PUT', { family_role: role || null });
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Update failed.');
    }
  };

  const makeHead = async (m) => {
    try {
      // Set member.family_role='head' AND family.head_member_id.
      await req(`/api/church-admin/families/${familyId}`, 'PUT', { head_member_id: m.id });
      toast?.success(`${m.first_name} is now the head.`);
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Update failed.');
    }
  };

  const addMember = async (member) => {
    try {
      await req(`/api/church-admin/members/${member.id}`, 'PUT', {
        family_id: familyId,
        family_role: member.family_role || 'other',
      });
      toast?.success(`${member.first_name} added.`);
      setPicking(false);
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Add failed.');
    }
  };

  if (!familyId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 h-screen w-full max-w-md bg-white shadow-2xl ring-1 ring-zinc-200 flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Family detail
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading || !data ? (
          <div className="flex-1 p-6">
            <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5">
              <h2 className="text-lg font-bold text-ink tracking-tight">{data.family.name}</h2>
              {data.family.branch_name && (
                <div className="mt-0.5 text-xs text-zinc-500">{data.family.branch_name}</div>
              )}
              {data.family.address && (
                <div className="mt-1 text-sm text-zinc-600">{data.family.address}</div>
              )}
              {data.family.notes && (
                <div className="mt-3 rounded-lg bg-zinc-25 p-3 text-sm text-zinc-700">
                  {data.family.notes}
                </div>
              )}
            </div>

            <section className="border-t border-zinc-100">
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="text-[13px] font-semibold text-ink">
                  Members ({data.members.length})
                </h3>
                <button
                  onClick={() => setPicking(true)}
                  className="text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  + Add member
                </button>
              </div>
              {data.members.length ? (
                <ul className="divide-y divide-zinc-100">
                  {data.members.map((m) => (
                    <li key={m.id} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar member={m} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink truncate">
                            {m.first_name} {m.last_name || ''}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <select
                              value={m.family_role || ''}
                              onChange={(e) => changeRole(m, e.target.value)}
                              className="rounded-md ring-1 ring-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold"
                            >
                              {FAMILY_ROLES.map((r) => (
                                <option key={r.v} value={r.v}>{r.label || 'No role'}</option>
                              ))}
                            </select>
                            {data.family.head_member_id !== m.id && (
                              <button
                                onClick={() => makeHead(m)}
                                className="text-[11px] font-semibold text-brand-700 hover:underline"
                              >
                                Make head
                              </button>
                            )}
                            {data.family.head_member_id === m.id && (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                HEAD
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(m)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 pb-4 text-xs text-zinc-500">
                  No members in this family yet.
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <AddMemberPicker
        open={picking}
        req={req}
        onClose={() => setPicking(false)}
        onPick={addMember}
      />
    </>
  );
}

function AddMemberPicker({ open, req, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '20' });
      if (q.trim()) p.set('q', q.trim());
      const r = await req(`/api/church-admin/members?${p.toString()}`);
      // Filter out members already in a family — caller decides UX, simpler to allow.
      setRows(r.members || []);
    } finally { setLoading(false); }
  }, [req, q]);

  useEffect(() => { if (open) search(); }, [open, search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add member to family"
      sub="Pick an existing member. Family role can be changed after."
    >
      <div className="space-y-3">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            placeholder="Search by name…"
            className="input"
          />
        </div>
        {loading ? (
          <div className="h-20 animate-pulse rounded bg-zinc-100" />
        ) : !rows.length ? (
          <div className="py-6 text-center text-sm text-zinc-500">No matches.</div>
        ) : (
          <ul className="divide-y divide-zinc-100 max-h-72 overflow-y-auto rounded-lg ring-1 ring-zinc-200">
            {rows.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onPick(m)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-25"
                >
                  <Avatar member={m} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {m.first_name} {m.last_name || ''}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {m.family_name ? `Currently in ${m.family_name}` : 'No family'}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
