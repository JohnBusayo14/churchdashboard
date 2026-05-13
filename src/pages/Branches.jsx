import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useBranch } from '../contexts/BranchContext.jsx';
import { useRole } from '../contexts/RoleContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';

export default function Branches() {
  const { api, token, refreshMe } = useAuth();
  const { setActiveBranchId } = useBranch();
  const { canSee } = useRole();
  const toast = useToast();
  const req = useMemo(() => makeReq(api, token), [api, token]);

  const canEdit = canSee('branches');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | {row}

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req('/api/church-admin/branches');
      setRows(r.branches || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (payload, id) => {
    try {
      if (id) {
        await req(`/api/church-admin/branches/${id}`, 'PUT', payload);
        toast?.success('Branch updated.');
      } else {
        await req('/api/church-admin/branches', 'POST', payload);
        toast?.success('Branch created.');
      }
      setEditing(null);
      await load();
      await refreshMe();   // refresh the branch list in the switcher
    } catch (e) {
      toast?.error(e.message || 'Save failed.');
    }
  };

  const remove = async (b) => {
    if (!confirm(`Delete branch "${b.name}"? This can only succeed if it has no members or classes.`)) return;
    try {
      await req(`/api/church-admin/branches/${b.id}`, 'DELETE');
      toast?.success('Branch deleted.');
      await load();
      await refreshMe();
    } catch (e) {
      toast?.error(e.message || 'Delete failed.');
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Admin</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Branches</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Each branch is a campus or location belonging to this church.
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setEditing('new')} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> New branch
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-6">
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : !rows.length ? (
        <div className="card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-zinc-300" />
          <div className="mt-2 text-sm font-medium text-zinc-500">No branches yet.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-50/60 to-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Building2 className="h-4 w-4" />
                  </div>
                  {b.is_headquarters && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      <Star className="h-3 w-3" /> Headquarters
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-ink tracking-tight">{b.name}</h3>
                <p className="mt-0.5 text-xs text-zinc-500">{b.location || 'No location set'}</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center text-xs">
                <Stat label="Members"  value={b.member_count} />
                <Stat label="Classes"  value={b.class_count} />
                <Stat label="Activity" value={b.recent_activity} sub="30d" />
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
                <button
                  onClick={() => setActiveBranchId(b.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  View dashboard
                </button>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(b)}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(b)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BranchModal
        open={!!editing}
        initial={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}{sub ? ` · ${sub}` : ''}
      </div>
      <div className="mt-0.5 text-[18px] font-bold text-ink tabular">
        {(value ?? 0).toLocaleString('en-NG')}
      </div>
    </div>
  );
}

function BranchModal({ open, initial, onClose, onSave }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isHq, setIsHq] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setLocation(initial?.location || '');
    setIsHq(!!initial?.is_headquarters);
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), location: location.trim(), is_headquarters: isHq }, initial?.id || null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit branch' : 'New branch'}
      sub={initial?.id ? null : 'A branch is a campus or location belonging to this church.'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="branch-form" className="btn-primary">Save</button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="grid grid-cols-1 gap-3">
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Lekki Branch"
            required
          />
        </div>
        <div>
          <label className="label">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
            placeholder="City or address"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isHq}
            onChange={(e) => setIsHq(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Mark as headquarters
        </label>
        <p className="text-xs text-zinc-500">
          Only one branch can be the headquarters. Marking a new one will unset the old.
        </p>
      </form>
    </Modal>
  );
}
