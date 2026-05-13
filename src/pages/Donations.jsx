import { useMemo, useState } from 'react';
import {
  Plus, Search, Filter, Download, Receipt as ReceiptIcon,
  HandCoins, Users, X,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  DONATIONS, DONATION_TYPES, PAYMENT_METHODS, MEMBERS,
  money, num, sum, withinDays,
} from '../mock/finance.js';

const WINDOWS = [
  { v: 7,   label: 'Last 7 days' },
  { v: 30,  label: 'Last 30 days' },
  { v: 90,  label: 'Last 90 days' },
  { v: 180, label: 'Last 6 months' },
  { v: 'all', label: 'All time' },
];

const TYPE_BADGE = {
  Tithe:    'bg-brand-50 text-brand-700',
  Offering: 'bg-emerald-50 text-emerald-700',
  Special:  'bg-violet-50 text-violet-700',
  Pledge:   'bg-amber-50 text-amber-700',
};

export default function Donations() {
  const toast = useToast();
  const [rows, setRows] = useState(DONATIONS);

  const [days, setDays]     = useState(30);
  const [type, setType]     = useState('all');
  const [method, setMethod] = useState('all');
  const [q, setQ]           = useState('');

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!withinDays(r.date, days)) return false;
      if (type !== 'all' && r.type !== type) return false;
      if (method !== 'all' && r.method !== method) return false;
      if (term) {
        const hay = `${r.member_name} ${r.note || ''} ${r.receipt_no}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, days, type, method, q]);

  const total       = sum(filtered);
  const uniqueGivers = new Set(filtered.map((r) => r.member_id)).size;
  const avgGift     = filtered.length ? Math.round(total / filtered.length) : 0;

  const handleAdd = (entry) => {
    setRows((prev) => [entry, ...prev]);
    toast?.success(`Recorded ${entry.type.toLowerCase()} from ${entry.member_name}.`);
  };

  const handleExport = () => {
    const csv = toCsv(filtered);
    download(csv, `donations-${new Date().toISOString().slice(0, 10)}.csv`);
    toast?.info(`Exported ${filtered.length} records.`);
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Finance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Donations</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Record tithes, offerings, pledges and special gifts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Record donation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary icon={HandCoins} label="Total received" value={money(total)} sub={`${num(filtered.length)} records`} />
        <Summary icon={Users}     label="Unique givers"  value={num(uniqueGivers)} sub="in selected window" />
        <Summary icon={ReceiptIcon} label="Average gift" value={money(avgGift)} sub="per donation" />
      </div>

      <div className="mt-6 card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search member, note, receipt…"
              className="w-full rounded-lg ring-1 ring-zinc-200 bg-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
          </div>
          <Select value={days} onChange={(v) => setDays(v === 'all' ? 'all' : parseInt(v, 10))}>
            {WINDOWS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
          </Select>
          <Select value={type} onChange={setType}>
            <option value="all">All types</option>
            {DONATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={method} onChange={setMethod}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          {(type !== 'all' || method !== 'all' || q) && (
            <button
              className="btn-soft !px-2"
              onClick={() => { setType('all'); setMethod('all'); setQ(''); }}
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
            <div className="text-3xl">🤲</div>
            <div className="mt-2 text-sm font-medium text-zinc-500">
              No donations match these filters.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Member</th>
                  <th className="px-5 py-2.5">Type</th>
                  <th className="px-5 py-2.5">Method</th>
                  <th className="px-5 py-2.5">Note</th>
                  <th className="px-5 py-2.5">Receipt</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.slice(0, 200).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setViewing(r)}
                    className="cursor-pointer hover:bg-zinc-25"
                  >
                    <td className="px-5 py-2.5 text-zinc-700">{r.date}</td>
                    <td className="px-5 py-2.5 font-semibold text-ink">{r.member_name}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[r.type] || 'bg-zinc-100 text-zinc-700'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-zinc-600">{r.method}</td>
                    <td className="px-5 py-2.5 text-zinc-500 truncate max-w-[220px]">{r.note || '—'}</td>
                    <td className="px-5 py-2.5"><code className="text-[11px] text-zinc-500">{r.receipt_no}</code></td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{money(r.amount)}</td>
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

      <AddDonationModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={(entry) => {
          handleAdd(entry);
          setOpen(false);
        }}
      />

      <ReceiptModal
        donation={viewing}
        onClose={() => setViewing(null)}
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

function AddDonationModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    date:      new Date().toISOString().slice(0, 10),
    member_id: MEMBERS[0].id,
    type:      'Tithe',
    amount:    '',
    method:    'Transfer',
    note:      '',
  });
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setErr('Enter a valid amount.');
      return;
    }
    const member = MEMBERS.find((m) => m.id === form.member_id);
    onSave({
      id: `d-new-${Date.now()}`,
      date: form.date,
      member_id: member.id,
      member_name: member.name,
      type: form.type,
      amount,
      method: form.method,
      note: form.note.trim(),
      receipt_no: `R-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    });
    setForm((f) => ({ ...f, amount: '', note: '' }));
    setErr('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a donation"
      sub="This will appear on the dashboard and reports."
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="donation-form" className="btn-primary">Save</button>
        </>
      }
    >
      <form id="donation-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
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
          <label className="label">Member</label>
          <select
            value={form.member_id}
            onChange={(e) => setForm({ ...form, member_id: e.target.value })}
            className="input"
          >
            {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="input"
          >
            {DONATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
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
        <div className="col-span-2">
          <label className="label">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="input"
            placeholder="e.g. Sunday service"
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

function ReceiptModal({ donation, onClose }) {
  if (!donation) return null;
  return (
    <Modal
      open={!!donation}
      onClose={onClose}
      title="Donation receipt"
      sub={donation.receipt_no}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Close</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => window.print()}
          >
            Print
          </button>
        </>
      }
    >
      <div className="rounded-lg ring-1 ring-zinc-200 bg-zinc-25 p-5 text-sm">
        <div className="flex items-center justify-between">
          <div className="font-bold text-ink">{donation.member_name}</div>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[donation.type] || 'bg-zinc-100 text-zinc-700'}`}>
            {donation.type}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Cell label="Date"     value={donation.date} />
          <Cell label="Method"   value={donation.method} />
          <Cell label="Receipt"  value={<code className="text-zinc-600">{donation.receipt_no}</code>} />
          <Cell label="Note"     value={donation.note || '—'} />
        </div>
        <div className="mt-4 border-t border-zinc-200 pt-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Amount</span>
          <span className="text-2xl font-bold text-emerald-700 tabular">{money(donation.amount)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Thank you for your faithful giving. May God bless and multiply your seed.
      </p>
    </Modal>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{value}</div>
    </div>
  );
}

function toCsv(rows) {
  const head = ['Date', 'Member', 'Type', 'Method', 'Note', 'Receipt', 'Amount'];
  const body = rows.map((r) => [
    r.date, r.member_name, r.type, r.method,
    (r.note || '').replace(/"/g, '""'),
    r.receipt_no, r.amount,
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
