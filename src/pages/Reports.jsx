import { useMemo, useState } from 'react';
import {
  Download, FileText, TrendingUp, TrendingDown, Wallet, BarChart3,
} from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import {
  DONATIONS, EXPENSES,
  money, num, sum, withinDays, groupBy, groupByMonth, monthLabel,
} from '../mock/finance.js';

const WINDOWS = [
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 365, label: 'Last 12 months' },
  { v: 'all', label: 'All time' },
];

export default function Reports() {
  const toast = useToast();
  const [days, setDays] = useState(90);

  const { donations, expenses } = useMemo(() => ({
    donations: DONATIONS.filter((r) => withinDays(r.date, days)),
    expenses:  EXPENSES.filter((r) => withinDays(r.date, days)),
  }), [days]);

  const income  = sum(donations);
  const expense = sum(expenses);
  const net     = income - expense;

  const byType     = useMemo(() => groupBy(donations, 'type'),     [donations]);
  const byCategory = useMemo(() => groupBy(expenses, 'category'),  [expenses]);
  const byMember   = useMemo(() => {
    const map = new Map();
    for (const d of donations) {
      const e = map.get(d.member_id) || { id: d.member_id, name: d.member_name, total: 0, count: 0 };
      e.total += d.amount;
      e.count += 1;
      map.set(d.member_id, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [donations]);

  const monthly = useMemo(() => {
    const inc = groupByMonth(donations);
    const exp = groupByMonth(expenses);
    const months = Array.from(new Set([...inc.map(m => m.month), ...exp.map(m => m.month)])).sort();
    const incMap = new Map(inc.map(m => [m.month, m.total]));
    const expMap = new Map(exp.map(m => [m.month, m.total]));
    return months.map((m) => {
      const i = incMap.get(m) || 0;
      const e = expMap.get(m) || 0;
      return { month: m, label: monthLabel(m), income: i, expense: e, net: i - e };
    });
  }, [donations, expenses]);

  const exportPeriodCsv = () => {
    const head = ['Month', 'Income', 'Expense', 'Net'];
    const body = monthly.map((r) => [r.label, r.income, r.expense, r.net]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${c}"`).join(',')).join('\n');
    download(csv, `period-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast?.info('Exported period summary.');
  };

  const exportMembersCsv = () => {
    const head = ['Member', 'Donations', 'Total'];
    const body = byMember.map((r) => [r.name, r.count, r.total]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${c}"`).join(',')).join('\n');
    download(csv, `members-giving-${new Date().toISOString().slice(0, 10)}.csv`);
    toast?.info('Exported member giving.');
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Finance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Period summaries, category breakdowns and member giving.
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
            {WINDOWS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon={TrendingUp}   label="Total income"  value={money(income)}  sub={`${num(donations.length)} donations`} tone="emerald" />
        <Kpi icon={TrendingDown} label="Total expense" value={money(expense)} sub={`${num(expenses.length)} entries`} />
        <Kpi icon={Wallet}       label="Net"           value={money(net)}     sub={net >= 0 ? 'Surplus' : 'Deficit'} tone={net >= 0 ? 'emerald' : 'red'} />
      </div>

      <Section
        icon={BarChart3}
        title="Period summary"
        sub="Income vs expense, month over month"
        action={
          <button className="btn-ghost" onClick={exportPeriodCsv} disabled={!monthly.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        }
      >
        {monthly.length === 0 ? (
          <Empty icon="📅" text="No activity in this window" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Month</th>
                  <th className="px-5 py-2.5 text-right">Income</th>
                  <th className="px-5 py-2.5 text-right">Expense</th>
                  <th className="px-5 py-2.5 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {monthly.map((r) => (
                  <tr key={r.month}>
                    <td className="px-5 py-2.5 font-semibold text-ink">{r.label}</td>
                    <td className="px-5 py-2.5 text-right text-emerald-700">{money(r.income)}</td>
                    <td className="px-5 py-2.5 text-right text-zinc-700">{money(r.expense)}</td>
                    <td className={`px-5 py-2.5 text-right font-bold ${r.net >= 0 ? 'text-ink' : 'text-red-700'}`}>
                      {money(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-25">
                <tr>
                  <td className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total</td>
                  <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{money(income)}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-ink">{money(expense)}</td>
                  <td className={`px-5 py-2.5 text-right font-bold ${net >= 0 ? 'text-ink' : 'text-red-700'}`}>
                    {money(net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={BarChart3} title="Income by type" sub="Tithe, offering, special, pledge">
          {byType.length === 0
            ? <Empty icon="🤲" text="No donations in window" />
            : <BreakdownTable rows={byType} total={income} valueClass="text-emerald-700" />}
        </Section>

        <Section icon={BarChart3} title="Expense by category" sub="Where the spend is going">
          {byCategory.length === 0
            ? <Empty icon="🧾" text="No expenses in window" />
            : <BreakdownTable rows={byCategory} total={expense} valueClass="text-zinc-800" />}
        </Section>
      </div>

      <Section
        icon={FileText}
        title="Member giving"
        sub="Ranked by total contribution"
        action={
          <button className="btn-ghost" onClick={exportMembersCsv} disabled={!byMember.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        }
      >
        {byMember.length === 0 ? (
          <Empty icon="👥" text="No giving in this window" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Member</th>
                  <th className="px-5 py-2.5 text-right">Donations</th>
                  <th className="px-5 py-2.5 text-right">Avg</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                  <th className="px-5 py-2.5 text-right">% of income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {byMember.map((r) => {
                  const pct = income > 0 ? (r.total / income) * 100 : 0;
                  const avg = r.count ? Math.round(r.total / r.count) : 0;
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5 font-semibold text-ink">{r.name}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-700">{num(r.count)}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-700">{money(avg)}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{money(r.total)}</td>
                      <td className="px-5 py-2.5 text-right text-zinc-500">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }) {
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
      <div className={`mt-3 text-[24px] font-bold tracking-tight tabular ${tones[tone] || 'text-ink'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function Section({ icon: Icon, title, sub, action, children }) {
  return (
    <section className="mt-6 card overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            <p className="text-xs text-zinc-500">{sub}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BreakdownTable({ rows, total, valueClass }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead className="bg-zinc-25">
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <th className="px-5 py-2.5">Name</th>
            <th className="px-5 py-2.5 text-right">Amount</th>
            <th className="px-5 py-2.5 text-right">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const pct = total > 0 ? (r.total / total) * 100 : 0;
            return (
              <tr key={r.key}>
                <td className="px-5 py-2.5 font-semibold text-ink">{r.key}</td>
                <td className={`px-5 py-2.5 text-right font-bold ${valueClass || ''}`}>{money(r.total)}</td>
                <td className="px-5 py-2.5 text-right text-zinc-500">{pct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

function download(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
