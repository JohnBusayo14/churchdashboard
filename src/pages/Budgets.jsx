import { useMemo, useState } from 'react';
import { PiggyBank, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  EXPENSES, EXPENSE_CATEGORIES, money, withinDays,
} from '../mock/finance.js';

// Budgets is preview-only: shows how a category-level monthly budget would
// look against the last 30 days of real expense data, so leaders can already
// see whether they're on track. Editing budgets is wired to local state and
// resets on refresh — persistence will land with the full-stack pass.
const DEFAULT_BUDGETS = {
  Utilities:   180_000,
  Salaries:    600_000,
  Maintenance: 150_000,
  Outreach:    220_000,
  Equipment:   120_000,
  Hospitality: 100_000,
  Transport:    80_000,
  Welfare:     130_000,
};

export default function Budgets() {
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS);

  const spendThisMonth = useMemo(() => {
    const map = new Map();
    for (const r of EXPENSES.filter((r) => withinDays(r.date, 30))) {
      map.set(r.category, (map.get(r.category) || 0) + r.amount);
    }
    return map;
  }, []);

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const totalSpent  = [...spendThisMonth.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Finance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Budgets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Monthly category limits and how this month is tracking.
          </p>
        </div>
        <button className="btn-primary" disabled title="Coming soon">
          <Plus className="h-3.5 w-3.5" /> Plan budget
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total budget"  value={money(totalBudget)} sub="this month" />
        <Summary label="Total spent"   value={money(totalSpent)}  sub="last 30 days" />
        <Summary
          label="Remaining"
          value={money(Math.max(0, totalBudget - totalSpent))}
          sub={totalSpent <= totalBudget ? 'On track' : 'Over budget'}
          tone={totalSpent <= totalBudget ? 'emerald' : 'red'}
        />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink">Category budgets</h2>
          <span className="text-xs text-zinc-500">Edit limits to preview impact</span>
        </div>
        <ul className="divide-y divide-zinc-100">
          {EXPENSE_CATEGORIES.map((cat) => {
            const budget = budgets[cat] || 0;
            const spent  = spendThisMonth.get(cat) || 0;
            const pct    = budget > 0 ? Math.min(120, (spent / budget) * 100) : 0;
            const over   = spent > budget;
            return (
              <li key={cat} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <PiggyBank className="h-4 w-4 text-brand-600" />
                    <div className="text-sm font-semibold text-ink">{cat}</div>
                    {over ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Over
                      </span>
                    ) : pct >= 80 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Near limit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> On track
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500 tabular">{money(spent)}</span>
                    <span className="text-zinc-300">/</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={budget}
                      onChange={(e) => setBudgets({ ...budgets, [cat]: Number(e.target.value) || 0 })}
                      className="w-32 rounded-md ring-1 ring-zinc-200 bg-white px-2 py-1 text-right text-sm tabular focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Note: edits here are previewed locally. Persistent multi-month budgets will arrive with the backend pass.
      </p>
    </div>
  );
}

function Summary({ label, value, sub, tone }) {
  const tones = { emerald: 'text-emerald-700', red: 'text-red-700' };
  return (
    <div className="card p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-3 text-[24px] font-bold tracking-tight tabular ${tones[tone] || 'text-ink'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

