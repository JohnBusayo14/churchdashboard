import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, HandCoins, Receipt,
  Megaphone, Calendar,
} from 'lucide-react';
import {
  DONATIONS, EXPENSES, CAMPAIGNS,
  money, num, sum, withinDays, groupByMonth, monthLabel, groupBy,
} from '../mock/finance.js';

const WINDOWS = [
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 'all', label: 'All time' },
];

export default function Dashboard() {
  const [days, setDays] = useState(30);

  const inWindow = useMemo(() => {
    const d = DONATIONS.filter((r) => withinDays(r.date, days));
    const e = EXPENSES.filter((r) => withinDays(r.date, days));
    return { d, e };
  }, [days]);

  // Compare against the previous window of the same length so we can show
  // a percentage delta — the kind of "vs last period" cue users expect on a
  // finance dashboard.
  const prevWindow = useMemo(() => {
    if (days === 'all') return { d: [], e: [] };
    const cutNow  = Date.now() - days * 86_400_000;
    const cutPrev = Date.now() - days * 2 * 86_400_000;
    const inPrev = (r) => {
      const t = Date.parse(r.date);
      return t >= cutPrev && t < cutNow;
    };
    return { d: DONATIONS.filter(inPrev), e: EXPENSES.filter(inPrev) };
  }, [days]);

  const income     = sum(inWindow.d);
  const expense    = sum(inWindow.e);
  const net        = income - expense;
  const prevIncome = sum(prevWindow.d);
  const prevExpense = sum(prevWindow.e);

  const incomeDelta  = pctDelta(income, prevIncome);
  const expenseDelta = pctDelta(expense, prevExpense);

  const monthly = useMemo(() => {
    const inc = groupByMonth(inWindow.d);
    const exp = groupByMonth(inWindow.e);
    const months = Array.from(new Set([...inc.map(m => m.month), ...exp.map(m => m.month)])).sort();
    const incMap = new Map(inc.map(m => [m.month, m.total]));
    const expMap = new Map(exp.map(m => [m.month, m.total]));
    return months.map((m) => ({
      month: m,
      label: monthLabel(m),
      income:  incMap.get(m) || 0,
      expense: expMap.get(m) || 0,
    }));
  }, [inWindow]);

  const incomeByType = useMemo(
    () => groupBy(inWindow.d, 'type'),
    [inWindow.d],
  );
  const expenseByCategory = useMemo(
    () => groupBy(inWindow.e, 'category').slice(0, 6),
    [inWindow.e],
  );

  const recent = useMemo(() => {
    const tag = (rows, kind) => rows.map((r) => ({ ...r, _kind: kind }));
    return [...tag(inWindow.d, 'donation'), ...tag(inWindow.e, 'expense')]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 8);
  }, [inWindow]);

  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === 'active');

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Finance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Finance overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Snapshot of giving, spending and outstanding campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => {
              const v = e.target.value;
              setDays(v === 'all' ? 'all' : parseInt(v, 10));
            }}
            className="rounded-lg ring-1 ring-zinc-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
          >
            {WINDOWS.map((w) => (
              <option key={w.v} value={w.v}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={HandCoins}
          label="Income"
          value={money(income)}
          sub={`${num(inWindow.d.length)} donations`}
          delta={incomeDelta}
          deltaGood
        />
        <Kpi
          icon={Receipt}
          label="Expenses"
          value={money(expense)}
          sub={`${num(inWindow.e.length)} entries`}
          delta={expenseDelta}
          deltaGood={false}
        />
        <Kpi
          icon={Wallet}
          label="Net balance"
          value={money(net)}
          sub={net >= 0 ? 'Surplus this period' : 'Deficit this period'}
          tone={net >= 0 ? 'emerald' : 'red'}
        />
        <Kpi
          icon={Megaphone}
          label="Active campaigns"
          value={String(activeCampaigns.length)}
          sub={`${money(sum(activeCampaigns, 'raised'))} raised`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Monthly income vs expense</h2>
            <span className="text-xs text-zinc-500">{monthly.length} months</span>
          </div>
          {monthly.length === 0 ? (
            <Empty icon="📊" text="Not enough activity in this window" />
          ) : (
            <MonthlyBars data={monthly} />
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Income mix</h2>
            <span className="text-xs text-zinc-500">By type</span>
          </div>
          {incomeByType.length === 0 ? (
            <Empty icon="🤲" text="No donations yet" />
          ) : (
            <Breakdown rows={incomeByType} total={income} accent="brand" />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Top expense categories</h2>
            <span className="text-xs text-zinc-500">Top 6</span>
          </div>
          {expenseByCategory.length === 0 ? (
            <Empty icon="🧾" text="No expenses yet" />
          ) : (
            <Breakdown rows={expenseByCategory} total={expense} accent="amber" />
          )}
        </div>

        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-ink">Recent activity</h2>
            <span className="text-xs text-zinc-500">Latest {recent.length}</span>
          </div>
          {recent.length === 0 ? (
            <div className="p-5"><Empty icon="🕒" text="Nothing recorded yet" /></div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((r) => (
                <li key={`${r._kind}-${r.id}`} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ring-1 ${
                    r._kind === 'donation'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-amber-50 text-amber-700 ring-amber-100'
                  }`}>
                    {r._kind === 'donation' ? <HandCoins className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r._kind === 'donation' ? r.member_name : r.payee}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {r._kind === 'donation' ? r.type : r.category} · {r.method} · <Calendar className="inline h-3 w-3 -mt-0.5" /> {r.date}
                    </div>
                  </div>
                  <div className={`text-sm font-bold tabular ${
                    r._kind === 'donation' ? 'text-emerald-700' : 'text-zinc-800'
                  }`}>
                    {r._kind === 'donation' ? '+' : '−'} {money(r.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-ink">Campaigns</h2>
          <span className="text-xs text-zinc-500">{CAMPAIGNS.length} total</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {CAMPAIGNS.map((c) => {
            const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
            const done = c.status === 'completed';
            return (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{c.title}</div>
                    <div className="text-xs text-zinc-500">
                      {money(c.raised)} of {money(c.goal)} · {c.donors} donors · ends {c.ends_at}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    done ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
                  }`}>
                    {done ? 'Completed' : `${pct}%`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full ${done ? 'bg-emerald-500' : 'bg-brand-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pctDelta(current, prev) {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function Kpi({ icon: Icon, label, value, sub, delta, deltaGood, tone }) {
  const tones = {
    emerald: 'text-emerald-700',
    red: 'text-red-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <div className={`mt-3 text-[26px] font-bold tracking-tight tabular ${tones[tone] || 'text-ink'}`}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${
            (delta >= 0) === deltaGood
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        <span className="text-zinc-500">{sub}</span>
      </div>
    </div>
  );
}

function MonthlyBars({ data }) {
  const W = 760;
  const H = 220;
  const PAD_X = 28;
  const PAD_Y = 24;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = (W - PAD_X * 2) / data.length;
  const barW = Math.min(18, (groupW - 6) / 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <line
            key={i}
            x1={PAD_X} x2={W - PAD_X}
            y1={H - PAD_Y - p * (H - PAD_Y * 2)}
            y2={H - PAD_Y - p * (H - PAD_Y * 2)}
            stroke="#F4F4F5" strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const cx = PAD_X + groupW * i + groupW / 2;
          const incH = (d.income  / max) * (H - PAD_Y * 2);
          const expH = (d.expense / max) * (H - PAD_Y * 2);
          return (
            <g key={d.month}>
              <rect
                x={cx - barW - 2}
                y={H - PAD_Y - incH}
                width={barW}
                height={incH}
                rx={2}
                fill="#2563EB"
              />
              <rect
                x={cx + 2}
                y={H - PAD_Y - expH}
                width={barW}
                height={expH}
                rx={2}
                fill="#F59E0B"
              />
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#71717A"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Expense
        </span>
      </div>
    </div>
  );
}

function Breakdown({ rows, total, accent }) {
  const accents = {
    brand: 'bg-brand-600',
    amber: 'bg-amber-500',
  };
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-ink">{r.key}</span>
              <span className="text-zinc-500 tabular">
                {money(r.total)} <span className="text-zinc-400">· {pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full ${accents[accent] || accents.brand}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="py-10 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="mt-2 text-sm font-medium text-zinc-500">{text}</div>
    </div>
  );
}

