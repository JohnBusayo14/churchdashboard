import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { useBranch } from '../contexts/BranchContext.jsx';

export default function BranchSwitcher() {
  const { branches, activeBranchId, activeBranch, setActiveBranchId } = useBranch();
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

  if (!branches?.length) return null;

  const label = activeBranch ? activeBranch.name : 'All branches';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md ring-1 ring-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-zinc-50"
      >
        <Building2 className="h-3.5 w-3.5 text-brand-600" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg bg-white shadow-card ring-1 ring-zinc-200 py-1">
          <Item
            label="All branches"
            sub="Cross-branch rollup"
            active={activeBranchId == null}
            onClick={() => { setActiveBranchId(null); setOpen(false); }}
          />
          <div className="my-1 border-t border-zinc-100" />
          {branches.map((b) => (
            <Item
              key={b.id}
              label={b.name}
              sub={b.location || (b.is_headquarters ? 'Headquarters' : '')}
              active={activeBranchId === b.id}
              onClick={() => { setActiveBranchId(b.id); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({ label, sub, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${active ? 'bg-brand-50' : 'hover:bg-zinc-50'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold text-ink">{label}</div>
        {sub && <div className="truncate text-xs text-zinc-500">{sub}</div>}
      </div>
      {active && <Check className="h-4 w-4 text-brand-600" />}
    </button>
  );
}
