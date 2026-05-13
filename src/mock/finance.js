// Mock finance data shared across the Dashboard, Donations, Expenses,
// Reports and Members pages. Deterministic (no Math.random at module load)
// so every render of every page sees the same numbers — that's what makes
// the KPIs on the dashboard line up with the rows on Donations/Expenses.
//
// Currency assumption: Naira (₦), matching the en-NG locale already used
// elsewhere in this app.

export const DONATION_TYPES = ['Tithe', 'Offering', 'Special', 'Pledge'];
export const PAYMENT_METHODS = ['Cash', 'Transfer', 'Card', 'POS'];
export const EXPENSE_CATEGORIES = [
  'Utilities',
  'Salaries',
  'Maintenance',
  'Outreach',
  'Equipment',
  'Hospitality',
  'Transport',
  'Welfare',
];

export const MEMBERS = [
  { id: 'm1',  name: 'Adebayo Ogunleye',   joined: '2021-04-12' },
  { id: 'm2',  name: 'Funmi Adeyemi',      joined: '2020-11-03' },
  { id: 'm3',  name: 'Chukwuemeka Eze',    joined: '2022-06-18' },
  { id: 'm4',  name: 'Blessing Okoro',     joined: '2019-08-25' },
  { id: 'm5',  name: 'Tunde Bakare',       joined: '2023-01-09' },
  { id: 'm6',  name: 'Ngozi Umeh',         joined: '2018-02-14' },
  { id: 'm7',  name: 'Samuel Adeoye',      joined: '2024-03-30' },
  { id: 'm8',  name: 'Grace Williams',     joined: '2017-09-21' },
  { id: 'm9',  name: 'Ibrahim Yakubu',     joined: '2022-12-05' },
  { id: 'm10', name: 'Esther Olawale',     joined: '2021-07-17' },
  { id: 'm11', name: 'Daniel Akinola',     joined: '2020-05-02' },
  { id: 'm12', name: 'Mary Nwosu',         joined: '2019-04-11' },
  { id: 'm13', name: 'Joshua Adebanjo',    joined: '2023-10-14' },
  { id: 'm14', name: 'Ruth Ekanem',        joined: '2024-08-08' },
  { id: 'm15', name: 'Peter Olawumi',      joined: '2018-11-29' },
];

export const CAMPAIGNS = [
  {
    id: 'c1',
    title: 'New Sanctuary Roofing',
    goal: 4_500_000,
    raised: 2_870_000,
    ends_at: '2026-08-31',
    donors: 142,
    status: 'active',
  },
  {
    id: 'c2',
    title: 'Mission Trip — Northern Outreach',
    goal: 1_200_000,
    raised: 1_065_000,
    ends_at: '2026-07-15',
    donors: 88,
    status: 'active',
  },
  {
    id: 'c3',
    title: 'Annual Children’s Camp',
    goal: 800_000,
    raised: 800_000,
    ends_at: '2026-04-30',
    donors: 64,
    status: 'completed',
  },
];

// ── Deterministic pseudo-random ──────────────────────────────────────────
// Mulberry32 seeded so the same inputs always give the same outputs across
// page navigations. This is intentional: we want the dashboard's totals
// to match the rows you see on Donations and Expenses.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DONATION_NOTES = [
  'Sunday service', 'Midweek service', 'Thanksgiving', 'Building project',
  'Children outreach', '', '', '', 'Online giving', '',
];

const EXPENSE_PAYEES = [
  'PHCN', 'GoSchool Books', 'Daystar Transport', 'Lekki Fuel Mart',
  'Mama Bola Catering', 'TechHive Supplies', 'PrintWorld Lagos',
  'Spectranet', 'Cleanlink Services', 'Pastor T. Akande', 'A&B Plumbing',
];

const EXPENSE_NOTES = {
  Utilities:    ['Electricity bill', 'Internet subscription', 'Generator diesel'],
  Salaries:     ['Monthly stipend', 'Sound engineer', 'Cleaning staff'],
  Maintenance:  ['Plumbing repair', 'AC servicing', 'Roof patch'],
  Outreach:     ['Tract printing', 'Loudspeaker rental', 'Bus charter'],
  Equipment:    ['Replacement mic', 'Projector lamp', 'Children’s toys'],
  Hospitality:  ['Guest minister lodging', 'Snacks for workers', 'Anniversary catering'],
  Transport:    ['Fuel reimbursement', 'Bus driver', 'Toll fares'],
  Welfare:      ['Medical assistance', 'School fees support', 'Funeral support'],
};

// Build donations spread over the last ~180 days. ~3-7 donations per Sunday
// plus occasional weekday entries. Amounts skew small (most members give
// modestly, a few give large tithes).
function buildDonations() {
  const rng = mulberry32(0xC0FFEE);
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let id = 1;
  for (let dayOffset = 180; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const dow = d.getDay(); // 0 = Sunday

    // Probability of any donation on this day
    const sunday = dow === 0;
    const wednesday = dow === 3;
    const count = sunday
      ? 4 + Math.floor(rng() * 4)        // 4-7 on Sundays
      : wednesday
        ? 1 + Math.floor(rng() * 3)      // 1-3 midweek
        : rng() < 0.18 ? 1 : 0;          // rare weekday giving

    for (let i = 0; i < count; i++) {
      const memberIdx = Math.floor(rng() * MEMBERS.length);
      const typeRoll  = rng();
      const type =
        typeRoll < 0.55 ? 'Tithe' :
        typeRoll < 0.85 ? 'Offering' :
        typeRoll < 0.95 ? 'Special' : 'Pledge';

      // Amount distribution per type, in naira, snapped to clean values.
      let amount;
      if (type === 'Tithe') {
        amount = Math.round((8_000 + rng() * 92_000) / 500) * 500;
      } else if (type === 'Offering') {
        amount = Math.round((1_000 + rng() * 14_000) / 500) * 500;
      } else if (type === 'Special') {
        amount = Math.round((5_000 + rng() * 145_000) / 1_000) * 1_000;
      } else {
        amount = Math.round((20_000 + rng() * 280_000) / 5_000) * 5_000;
      }

      const methodRoll = rng();
      const method =
        methodRoll < 0.45 ? 'Transfer' :
        methodRoll < 0.80 ? 'Cash' :
        methodRoll < 0.93 ? 'Card' : 'POS';

      out.push({
        id: `d${id++}`,
        date: d.toISOString().slice(0, 10),
        member_id: MEMBERS[memberIdx].id,
        member_name: MEMBERS[memberIdx].name,
        type,
        amount,
        method,
        note: DONATION_NOTES[Math.floor(rng() * DONATION_NOTES.length)],
        receipt_no: `R-${String(id).padStart(5, '0')}`,
      });
    }
  }
  // Newest first
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

function buildExpenses() {
  const rng = mulberry32(0xBADF00D);
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let id = 1;
  for (let dayOffset = 180; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);

    // Expenses are sporadic — most days have none.
    if (rng() > 0.28) continue;
    const count = 1 + Math.floor(rng() * 2);

    for (let i = 0; i < count; i++) {
      const cat = EXPENSE_CATEGORIES[Math.floor(rng() * EXPENSE_CATEGORIES.length)];

      // Salaries are higher and bunch near month-end; utilities mid-range; etc.
      let amount;
      if (cat === 'Salaries') {
        amount = Math.round((60_000 + rng() * 240_000) / 1_000) * 1_000;
      } else if (cat === 'Equipment' || cat === 'Maintenance') {
        amount = Math.round((10_000 + rng() * 220_000) / 1_000) * 1_000;
      } else if (cat === 'Welfare' || cat === 'Outreach') {
        amount = Math.round((8_000 + rng() * 92_000) / 500) * 500;
      } else {
        amount = Math.round((3_000 + rng() * 67_000) / 500) * 500;
      }

      const notes = EXPENSE_NOTES[cat] || ['—'];
      const methodRoll = rng();
      const method =
        methodRoll < 0.55 ? 'Transfer' :
        methodRoll < 0.85 ? 'Cash' :
        methodRoll < 0.95 ? 'Card' : 'POS';

      out.push({
        id: `e${id++}`,
        date: d.toISOString().slice(0, 10),
        category: cat,
        payee: EXPENSE_PAYEES[Math.floor(rng() * EXPENSE_PAYEES.length)],
        amount,
        method,
        note: notes[Math.floor(rng() * notes.length)],
        ref: `EX-${String(id).padStart(5, '0')}`,
      });
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

export const DONATIONS = buildDonations();
export const EXPENSES = buildExpenses();

// ── Helpers ──────────────────────────────────────────────────────────────

export const nairaFmt = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const money = (n) => nairaFmt.format(n ?? 0);
export const num   = (n) => (n ?? 0).toLocaleString('en-NG');

export function withinDays(isoDate, days) {
  if (!days || days === 'all') return true;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function sum(list, key = 'amount') {
  return list.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

export function groupByMonth(rows) {
  const buckets = new Map();
  for (const r of rows) {
    const k = r.date.slice(0, 7); // YYYY-MM
    buckets.set(k, (buckets.get(k) || 0) + (Number(r.amount) || 0));
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, total]) => ({ month, total }));
}

export function groupBy(rows, key) {
  const buckets = new Map();
  for (const r of rows) {
    const k = r[key] || 'Other';
    buckets.set(k, (buckets.get(k) || 0) + (Number(r.amount) || 0));
  }
  return [...buckets.entries()]
    .map(([k, total]) => ({ key: k, total }))
    .sort((a, b) => b.total - a.total);
}

export function monthLabel(yyyymm) {
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
}
