import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ShieldCheck, Eye } from 'lucide-react';
import { useRole, ALL_ROLES, ROLE_LABELS } from '../contexts/RoleContext.jsx';

export default function RoleSwitcher() {
  const { actualRole, viewAsRole, effectiveRole, canPreview, setViewAsRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const previewing = !!viewAsRole && viewAsRole !== actualRole;

  // Non-preview roles see a static pill — no dropdown.
  if (!canPreview) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        {ROLE_LABELS[actualRole] || actualRole}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md ring-1 px-2.5 py-1.5 text-[12px] font-semibold ${
          previewing
            ? 'bg-violet-50 text-violet-700 ring-violet-100'
            : 'bg-white text-ink ring-zinc-200 hover:bg-zinc-50'
        }`}
        title="Preview the dashboard as another role"
      >
        {previewing ? <Eye className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {previewing ? 'Viewing as ' : ''}{ROLE_LABELS[effectiveRole] || effectiveRole}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-60 rounded-lg bg-white shadow-card ring-1 ring-zinc-200 py-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Preview as
          </div>
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setViewAsRole(r === actualRole ? null : r); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                effectiveRole === r ? 'bg-brand-50' : 'hover:bg-zinc-50'
              }`}
            >
              <span className="font-semibold text-ink">{ROLE_LABELS[r]}</span>
              {effectiveRole === r && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
          {previewing && (
            <>
              <div className="my-1 border-t border-zinc-100" />
              <button
                onClick={() => { setViewAsRole(null); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Reset to my role ({ROLE_LABELS[actualRole]})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
