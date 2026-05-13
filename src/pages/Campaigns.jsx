import { useState } from 'react';
import { Megaphone, Plus, Calendar, Users, Target } from 'lucide-react';
import { CAMPAIGNS, money, num } from '../mock/finance.js';

const TABS = [
  { v: 'active',    label: 'Active' },
  { v: 'completed', label: 'Completed' },
  { v: 'all',       label: 'All' },
];

export default function Campaigns() {
  const [tab, setTab] = useState('active');

  const filtered = tab === 'all'
    ? CAMPAIGNS
    : CAMPAIGNS.filter((c) => c.status === tab);

  const totalGoal   = filtered.reduce((a, c) => a + c.goal, 0);
  const totalRaised = filtered.reduce((a, c) => a + c.raised, 0);
  const totalDonors = filtered.reduce((a, c) => a + c.donors, 0);

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Community
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Project-based fundraising with progress tracking.
          </p>
        </div>
        <button className="btn-primary" disabled title="Coming soon">
          <Plus className="h-3.5 w-3.5" /> New campaign
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary icon={Target}     label="Total goal"   value={money(totalGoal)} sub={`${filtered.length} campaign${filtered.length === 1 ? '' : 's'}`} />
        <Summary icon={Megaphone}  label="Total raised" value={money(totalRaised)} sub={`${pct(totalRaised, totalGoal)}% of goal`} />
        <Summary icon={Users}      label="Donors"       value={num(totalDonors)} sub="contributors" />
      </div>

      <div className="mt-6 flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.v
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const p = pct(c.raised, c.goal);
          const done = c.status === 'completed';
          return (
            <div key={c.id} className="card overflow-hidden">
              <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-50/60 to-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    done ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
                  }`}>
                    {done ? 'Completed' : 'Active'}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-ink tracking-tight">{c.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Ends {c.ends_at}
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold text-ink tabular">{money(c.raised)}</span>
                  <span className="text-zinc-500 tabular">of {money(c.goal)}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full ${done ? 'bg-emerald-500' : 'bg-brand-600'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{p}% funded</span>
                  <span>{c.donors} donors</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Note: campaign creation, public giving pages and donor messaging arrive with the full-stack pass.
      </p>
    </div>
  );
}

function pct(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function Summary({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className="mt-3 text-[24px] font-bold tracking-tight text-ink tabular">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}
