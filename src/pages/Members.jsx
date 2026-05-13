import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Users, UserPlus, Search, X, Phone, Mail, MapPin, Briefcase,
  Calendar, Camera, Trash2, ChevronRight, Sparkles, Home,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';

const TABS = [
  { v: 'all',         label: 'All',          desc: 'Everyone on the registry' },
  { v: 'member',      label: 'Members',      desc: 'Active congregation' },
  { v: 'first_timer', label: 'First-timers', desc: 'Recently converted, in onboarding' },
  { v: 'visitor',     label: 'Visitors',     desc: 'Guests not yet integrated' },
  { v: 'inactive',    label: 'Inactive',     desc: 'No longer attending' },
];

const STATUS_BADGE = {
  visitor:     'bg-amber-50 text-amber-700',
  first_timer: 'bg-violet-50 text-violet-700',
  member:      'bg-emerald-50 text-emerald-700',
  inactive:    'bg-zinc-100 text-zinc-500',
};

const GENDERS = [
  { v: '',       label: '—' },
  { v: 'male',   label: 'Male' },
  { v: 'female', label: 'Female' },
  { v: 'other',  label: 'Other' },
];

const MARITAL = [
  { v: '',         label: '—' },
  { v: 'single',   label: 'Single' },
  { v: 'married',  label: 'Married' },
  { v: 'widowed',  label: 'Widowed' },
  { v: 'divorced', label: 'Divorced' },
];

export default function Members() {
  const { api, token, branches } = useAuth();
  const { activeBranchId } = useBranch();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const [tab, setTab]     = useState('all');
  const [q, setQ]         = useState('');
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | {row}
  const [openMemberId, setOpenMemberId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all')  params.set('status', tab);
      if (q.trim())       params.set('q', q.trim());
      params.set('limit', '300');
      const r = await req(`/api/church-admin/members?${params.toString()}`);
      setRows(r.members || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [req, tab, q, toast]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  // Counts by status for the tab pills. Lightweight extra fetch so the badge
  // numbers stay accurate even when a tab is filtered.
  const [counts, setCounts] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const all = await req('/api/church-admin/members?limit=500');
        const c = { all: all.members.length };
        for (const s of ['visitor', 'first_timer', 'member', 'inactive']) {
          c[s] = all.members.filter((m) => m.status === s).length;
        }
        setCounts(c);
      } catch { /* silent */ }
    })();
  }, [req, activeBranchId, rows.length]);

  const save = async (payload, id) => {
    try {
      if (id) {
        await req(`/api/church-admin/members/${id}`, 'PUT', payload);
        toast?.success('Member updated.');
      } else {
        const r = await req('/api/church-admin/members', 'POST', payload);
        toast?.success(`Registered ${r.member.first_name}.`);
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Save failed.');
    }
  };

  const remove = async (m) => {
    if (!confirm(`Remove ${m.first_name} ${m.last_name || ''} from the registry?`)) return;
    try {
      await req(`/api/church-admin/members/${m.id}`, 'DELETE');
      toast?.success('Member removed.');
      setOpenMemberId(null);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Delete failed.');
    }
  };

  const promote = async (id) => {
    try {
      const r = await req(`/api/church-admin/members/${id}/promote`, 'POST');
      toast?.success(`Promoted to ${r.member.status.replace('_', ' ')}.`);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Promote failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Community
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Members</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Digital membership database. Track visitors, first-timers and active members.
          </p>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary">
          <UserPlus className="h-3.5 w-3.5" /> New member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200">
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
              <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                active ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {counts[t.v] ?? 0}
              </span>
            </button>
          );
        })}
        <div className="ml-auto relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 card overflow-hidden">
        {loading && !rows.length ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300" />
            <div className="mt-2 text-sm font-medium text-zinc-500">No members yet.</div>
            <button onClick={() => setEditing('new')} className="mt-3 btn-primary">
              <UserPlus className="h-3.5 w-3.5" /> Register the first member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Member</th>
                  <th className="px-5 py-2.5">Contact</th>
                  <th className="px-5 py-2.5">Branch</th>
                  <th className="px-5 py-2.5">Family</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Joined</th>
                  <th className="px-5 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setOpenMemberId(m.id)}
                    className="cursor-pointer hover:bg-zinc-25"
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar member={m} size={32} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {m.first_name} {m.last_name || ''}
                          </div>
                          {m.active_assignments > 0 && (
                            <div className="text-[11px] text-emerald-700">
                              Active worker · {m.active_assignments} role{m.active_assignments === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-zinc-600">
                      <div className="text-xs">{m.email || '—'}</div>
                      <div className="text-xs text-zinc-500">{m.phone || ''}</div>
                    </td>
                    <td className="px-5 py-2.5 text-zinc-600 text-xs">{m.branch_name || '—'}</td>
                    <td className="px-5 py-2.5 text-zinc-600 text-xs">{m.family_name || '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[m.status] || 'bg-zinc-100'}`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-zinc-600 text-xs">
                      {m.joined_at?.slice(0, 10) || '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MemberFormModal
        open={!!editing}
        initial={editing === 'new' ? null : editing}
        branches={branches}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <MemberDetailDrawer
        memberId={openMemberId}
        onClose={() => setOpenMemberId(null)}
        req={req}
        onEdit={(m) => { setEditing(m); setOpenMemberId(null); }}
        onDelete={remove}
        onPromote={promote}
        onChanged={load}
      />
    </div>
  );
}

export function Avatar({ member, size = 32 }) {
  const initials = `${(member.first_name || '?')[0]}${(member.last_name || '')[0] || ''}`.toUpperCase();
  if (member.photo_base64) {
    return (
      <img
        src={member.photo_base64.startsWith('data:') ? member.photo_base64 : `data:image/jpeg;base64,${member.photo_base64}`}
        alt={initials}
        className="rounded-full object-cover ring-1 ring-zinc-200"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}

function MemberFormModal({ open, initial, branches, onClose, onSave }) {
  const empty = {
    first_name: '', last_name: '', email: '', phone: '',
    gender: '', date_of_birth: '', marital_status: '',
    address: '', occupation: '',
    status: 'member', joined_at: new Date().toISOString().slice(0, 10),
    branch_id: '', notes: '',
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (initial?.id) {
      setForm({
        first_name:     initial.first_name || '',
        last_name:      initial.last_name || '',
        email:          initial.email || '',
        phone:          initial.phone || '',
        gender:         initial.gender || '',
        date_of_birth:  initial.date_of_birth?.slice(0, 10) || '',
        marital_status: initial.marital_status || '',
        address:        initial.address || '',
        occupation:     initial.occupation || '',
        status:         initial.status || 'member',
        joined_at:      initial.joined_at?.slice(0, 10) || '',
        branch_id:      initial.branch_id ?? '',
        notes:          initial.notes || '',
      });
    } else {
      setForm(empty);
    }
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) return;
    const payload = {
      ...form,
      branch_id:     form.branch_id ? parseInt(form.branch_id, 10) : undefined,
      date_of_birth: form.date_of_birth || null,
      joined_at:     form.joined_at || null,
      gender:        form.gender || null,
      marital_status: form.marital_status || null,
    };
    onSave(payload, initial?.id || null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit member' : 'Register new member'}
      sub={initial?.id ? null : 'Add a visitor, first-timer or full member to the registry.'}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="member-form" className="btn-primary">Save</button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="First name" required>
          <input className="input" required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </Field>
        <Field label="Last name">
          <input className="input"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" placeholder="+234 …"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Gender">
          <select className="input"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Date of birth">
          <input type="date" className="input"
            value={form.date_of_birth}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </Field>
        <Field label="Marital status">
          <select className="input"
            value={form.marital_status}
            onChange={(e) => setForm({ ...form, marital_status: e.target.value })}>
            {MARITAL.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Occupation">
          <input className="input"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="visitor">Visitor</option>
            <option value="first_timer">First-timer</option>
            <option value="member">Member</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Joined on">
          <input type="date" className="input"
            value={form.joined_at}
            onChange={(e) => setForm({ ...form, joined_at: e.target.value })} />
        </Field>
        <Field label="Branch" className="col-span-2">
          <select className="input"
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Default (active branch)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.is_headquarters ? ' (HQ)' : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Address" className="col-span-2">
          <input className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Notes" className="col-span-2">
          <textarea className="input min-h-[60px]" rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}

function Field({ label, required, className, children }) {
  return (
    <div className={className}>
      <label className="label">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function MemberDetailDrawer({ memberId, onClose, req, onEdit, onDelete, onPromote, onChanged }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const toast = useToast();
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const r = await req(`/api/church-admin/members/${memberId}`);
      setData(r);
    } catch (e) {
      toast?.error(e.message || 'Failed to load member.');
    } finally {
      setLoading(false);
    }
  }, [memberId, req, toast]);

  useEffect(() => { load(); }, [load]);

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast?.error('Photo must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await req(`/api/church-admin/members/${memberId}/photo`, 'POST', {
          photo_base64: reader.result,
        });
        toast?.success('Photo updated.');
        await load();
        onChanged?.();
      } catch (e) {
        toast?.error(e.message || 'Upload failed.');
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    try {
      await req(`/api/church-admin/members/${memberId}/photo`, 'POST', { photo_base64: null });
      toast?.success('Photo cleared.');
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Remove failed.');
    }
  };

  const removeAssignment = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await req(`/api/church-admin/assignments/${id}`, 'DELETE');
      toast?.success('Assignment removed.');
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Remove failed.');
    }
  };

  const addAssignment = async ({ department, role, started_at, notes }) => {
    try {
      await req(`/api/church-admin/members/${memberId}/assignments`, 'POST', { department, role, started_at, notes });
      toast?.success('Assigned.');
      setShowAssign(false);
      await load();
      onChanged?.();
    } catch (e) {
      toast?.error(e.message || 'Assign failed.');
    }
  };

  if (!memberId) return null;
  const m = data?.member;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-40 h-screen w-full max-w-md bg-white shadow-2xl ring-1 ring-zinc-200 flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Member profile
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading || !m ? (
          <div className="flex-1 p-6">
            <div className="h-20 w-20 animate-pulse rounded-full bg-zinc-100" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar member={m} size={72} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    title="Upload photo"
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-card hover:bg-brand-700"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadPhoto(e.target.files?.[0])}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-ink tracking-tight">
                    {m.first_name} {m.last_name || ''}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[m.status] || 'bg-zinc-100'}`}>
                      {m.status.replace('_', ' ')}
                    </span>
                    {m.branch_name && (
                      <span className="text-xs text-zinc-500">{m.branch_name}</span>
                    )}
                  </div>
                  {m.photo_base64 && (
                    <button onClick={removePhoto} className="mt-1 text-[11px] text-zinc-500 hover:underline">
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <Row icon={Phone}     value={m.phone} />
                <Row icon={Mail}      value={m.email} />
                <Row icon={MapPin}    value={m.address} />
                <Row icon={Briefcase} value={m.occupation} />
                <Row icon={Calendar}  value={m.date_of_birth ? `Born ${m.date_of_birth.slice(0, 10)}` : null} />
                <Row icon={Home}      value={m.family_name ? `Family: ${m.family_name}${m.family_role ? ` (${m.family_role})` : ''}` : null} />
                <Row icon={Calendar}  value={m.joined_at ? `Joined ${m.joined_at.slice(0, 10)}` : null} />
              </div>

              {m.notes && (
                <div className="mt-5 rounded-lg bg-zinc-25 p-3 text-sm text-zinc-700">
                  {m.notes}
                </div>
              )}

              {m.status !== 'member' && m.status !== 'inactive' && (
                <button
                  onClick={() => onPromote(m.id)}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Promote to {m.status === 'visitor' ? 'first-timer' : 'member'}
                </button>
              )}
            </div>

            {/* Assignments */}
            <section className="border-t border-zinc-100">
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="text-[13px] font-semibold text-ink">Worker assignments</h3>
                <button
                  onClick={() => setShowAssign(true)}
                  className="text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  + Assign
                </button>
              </div>
              {data.assignments?.length ? (
                <ul className="divide-y divide-zinc-100">
                  {data.assignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-5 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">{a.department}</div>
                        <div className="text-[11px] text-zinc-500">
                          {a.role} · since {a.started_at?.slice(0, 10)}
                          {a.ended_at && ` · ended ${a.ended_at.slice(0, 10)}`}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAssignment(a.id)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 pb-4 text-xs text-zinc-500">
                  Not assigned to any department yet.
                </div>
              )}
            </section>

            {/* Family members */}
            {data.family_members?.length > 0 && (
              <section className="border-t border-zinc-100">
                <div className="px-5 py-3">
                  <h3 className="text-[13px] font-semibold text-ink">Family</h3>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {data.family_members.map((fm) => (
                    <li key={fm.id} className="px-5 py-2.5 text-sm">
                      <span className="font-medium text-ink">
                        {fm.first_name} {fm.last_name || ''}
                      </span>
                      {fm.family_role && (
                        <span className="ml-2 text-[11px] text-zinc-500 capitalize">
                          {fm.family_role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3">
          <button
            onClick={() => onDelete(m)}
            disabled={!m}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost">Close</button>
            <button onClick={() => onEdit(m)} disabled={!m} className="btn-primary">Edit</button>
          </div>
        </footer>
      </div>

      <AssignModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onSave={addAssignment}
      />
    </>
  );
}

function Row({ icon: Icon, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-zinc-700">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="text-sm">{value}</span>
    </div>
  );
}

function AssignModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ department: '', role: 'member', started_at: '', notes: '' });
  useEffect(() => {
    if (open) setForm({ department: '', role: 'member', started_at: new Date().toISOString().slice(0, 10), notes: '' });
  }, [open]);
  const submit = (e) => {
    e.preventDefault();
    if (!form.department.trim()) return;
    onSave({ ...form, started_at: form.started_at || null, notes: form.notes || null });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign to a department"
      sub="Choir, ushering, media, evangelism, welfare — anywhere this member serves."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="assign-form" className="btn-primary">Assign</button>
        </>
      }
    >
      <form id="assign-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Department" required className="col-span-2">
          <input className="input" required placeholder="e.g. Choir, Ushering, Media"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </Field>
        <Field label="Role">
          <input className="input" placeholder="member / leader / assistant"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </Field>
        <Field label="Started on">
          <input type="date" className="input"
            value={form.started_at}
            onChange={(e) => setForm({ ...form, started_at: e.target.value })} />
        </Field>
        <Field label="Notes" className="col-span-2">
          <input className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
