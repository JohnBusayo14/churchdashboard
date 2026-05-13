import { useMemo, useState } from 'react';
import {
  Plus, Search, Filter, Download, Receipt as ReceiptIcon,
  Tag, X, Wallet,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  EXPENSES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  money, num, sum, withinDays, groupBy,
} from '../mock/finance.js';

const WINDOWS = [
  { v: 7,   label: 'Last 7 days' },
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 'all', label: 'All time' },
];

export default function Expenses() {
  const toast = useToast();
  const [rows, setRows] = useState(EXPENSES);

  const [days, setDays]       = useState(30);
  const [category, setCategory] = useState('all');
  const [method, setMethod]   = useState('all');
  const [q, setQ]             = useState('');

  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!withinDays(r.date, days)) return false;
      if (category !== 'all' && r.category !== category) return false;
      if (method !== 'all' && r.method !== method) return false;
      if (term) {
        const hay = `${r.payee} ${r.note || ''} ${r.ref}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, days, category, method, q]);

  const total       = sum(filtered);
  const topCategory = useMemo(() => groupBy(filtered, 'category')[0], [filtered]);
  const avgExpense  = filtered.length ? Math.round(total / filtered.length) : 0;

  const handleAdd = (entry) => {
    setRows((prev) => [entry, ...prev]);
    toast?.success(`Logged ${entry.category.toLowerCase()} expense to ${entry.payee}.`);
  };

  const handleExport = () => {
    const csv = toCsv(filtered);
    download(csv, `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    toast?.info(`Exported ${filtered.length} records.`);
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Finance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Expenses</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track operating spend by category and payee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary icon={Wallet}      label="Total spend"   value={money(total)} sub={`${num(filtered.length)} entries`} />
        <Summary icon={Tag}         label="Top category"  value={topCategory?.key || '—'} sub={topCategory ? money(topCategory.total) : ''} />
        <Summary icon={ReceiptIcon} label="Average entry" value={money(avgExpense)} sub="per expense" />
      </div>

      <div className="mt-6 card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payee, note, ref…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <Select value={days} onChange={(v) => setDays(v === 'all' ? 'all' : parseInt(v, 10))}>
            {WINDOWS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
          </Select>
          <Select value={category} onChange={setCategory}>
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={method} onChange={setMethod}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          {(category !== 'all' || method !== 'all' || q) && (
            <button
              className="btn-soft !px-2"
              onClick={() => { setCategory('all'); setMethod('all'); setQ(''); }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <div className="ml-auto text-xs text-zinc-500 inline-flex items-center gap-1">
            <Filter className="h-3 w-3" /> {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </div>
        </div>
      </div>

      <div className="mt-4 card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl">🧾</div>
            <div className="mt-2 text-sm font-medium text-zinc-500">
              No expenses match these filters.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5">Payee</th>
                  <th className="px-5 py-2.5">Method</th>
                  <th className="px-5 py-2.5">Note</th>
                  <th className="px-5 py-2.5">Ref</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.slice(0, 200).map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-25">
                    <td className="px-5 py-2.5 text-zinc-700">{r.date}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
                        {r.category}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 font-semibold text-ink">{r.payee}</td>
                    <td className="px-5 py-2.5 text-zinc-600">{r.method}</td>
                    <td className="px-5 py-2.5 text-zinc-500 truncate max-w-[220px]">{r.note || '—'}</td>
                    <td className="px-5 py-2.5"><code className="text-[11px] text-zinc-500">{r.ref}</code></td>
                    <td className="px-5 py-2.5 text-right font-bold text-ink">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-25">
                <tr>
                  <td colSpan={6} className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-ink tabular">{money(total)}</td>
                </tr>
              </tfoot>
            </table>
            {filtered.length > 200 && (
              <div className="border-t border-zinc-100 px-5 py-2 text-xs text-zinc-500">
                Showing first 200 of {num(filtered.length)} — narrow filters to see more.
              </div>
            )}
          </div>
        )}
      </div>

      <AddExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={(entry) => {
          handleAdd(entry);
          setOpen(false);
        }}
      />
    </div>
  );
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

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg ring-1 ring-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
    >
      {children}
    </select>
  );
}

function AddExpenseModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    date:     new Date().toISOString().slice(0, 10),
    category: EXPENSE_CATEGORIES[0],
    payee:    '',
    amount:   '',
    method:   'Transfer',
    note:     '',
  });
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.payee.trim()) {
      setErr('Payee is required.');
      return;
    }
    if (!amount || amount <= 0) {
      setErr('Enter a valid amount.');
      return;
    }
    onSave({
      id: `e-new-${Date.now()}`,
      date: form.date,
      category: form.category,
      payee: form.payee.trim(),
      amount,
      method: form.method,
      note: form.note.trim(),
      ref: `EX-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    });
    setForm((f) => ({ ...f, payee: '', amount: '', note: '' }));
    setErr('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record an expense"
      sub="Logged spend appears on Dashboard and Reports."
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="expense-form" className="btn-primary">Save</button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Payee</label>
          <input
            type="text"
            value={form.payee}
            onChange={(e) => setForm({ ...form, payee: e.target.value })}
            className="input"
            placeholder="Who is being paid?"
            required
          />
        </div>
        <div>
          <label className="label">Amount (₦)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="input"
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="label">Method</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="input"
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="input"
            placeholder="e.g. Monthly electricity bill"
          />
        </div>
        {err && (
          <div className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {err}
          </div>
        )}
      </form>
    </Modal>
  );
}

function toCsv(rows) {
  const head = ['Date', 'Category', 'Payee', 'Method', 'Note', 'Ref', 'Amount'];
  const body = rows.map((r) => [
    r.date, r.category, r.payee, r.method,
    (r.note || '').replace(/"/g, '""'),
    r.ref, r.amount,
  ]);
  return [head, ...body]
    .map((line) => line.map((c) => `"${String(c)}"`).join(','))
    .join('\n');
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
