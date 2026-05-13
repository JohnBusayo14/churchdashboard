import { useState } from 'react';
import {
  ShieldCheck, UserCog, Bell, CreditCard, Plug, Server, Check, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';

const TABS = [
  { v: 'backend',  label: 'Backend',             icon: Server },
  { v: 'roles',    label: 'Roles & permissions', icon: ShieldCheck },
  { v: 'profile',  label: 'Church profile',      icon: UserCog },
  { v: 'notify',   label: 'Notifications',       icon: Bell },
  { v: 'billing',  label: 'Billing',             icon: CreditCard },
  { v: 'integrations', label: 'Integrations',    icon: Plug },
];

const DEFAULT_ROLES = [
  {
    name: 'Senior Pastor',
    description: 'Full access to all data and settings.',
    members: 1,
    perms: { donations: 'edit', expenses: 'edit', budgets: 'edit', reports: 'view', members: 'edit', settings: 'edit' },
  },
  {
    name: 'Finance Officer',
    description: 'Records giving and expenses, generates reports.',
    members: 2,
    perms: { donations: 'edit', expenses: 'edit', budgets: 'view', reports: 'view', members: 'view', settings: 'none' },
  },
  {
    name: 'Usher / Counter',
    description: 'Records Sunday giving only.',
    members: 4,
    perms: { donations: 'edit', expenses: 'none', budgets: 'none', reports: 'none', members: 'view', settings: 'none' },
  },
  {
    name: 'Auditor',
    description: 'Read-only access to financial records.',
    members: 1,
    perms: { donations: 'view', expenses: 'view', budgets: 'view', reports: 'view', members: 'view', settings: 'none' },
  },
];

const PERM_LABELS = ['none', 'view', 'edit'];
const PERM_COLORS = {
  none: 'bg-zinc-100 text-zinc-500',
  view: 'bg-brand-50 text-brand-700',
  edit: 'bg-emerald-50 text-emerald-700',
};
const RESOURCES = ['donations', 'expenses', 'budgets', 'reports', 'members', 'settings'];

export default function Settings() {
  const [tab, setTab] = useState('backend');
  const [roles, setRoles] = useState(DEFAULT_ROLES);

  const cyclePerm = (roleIdx, resource) => {
    setRoles((rs) => rs.map((r, i) => {
      if (i !== roleIdx) return r;
      const cur = r.perms[resource];
      const next = PERM_LABELS[(PERM_LABELS.indexOf(cur) + 1) % PERM_LABELS.length];
      return { ...r, perms: { ...r.perms, [resource]: next } };
    }));
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Admin
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage roles, church profile and integrations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.v;
          return (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
                active
                  ? 'border-brand-600 text-ink'
                  : 'border-transparent text-zinc-500 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'backend' && <BackendPanel />}

      {tab === 'roles' && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Roles &amp; permissions</h2>
              <p className="text-xs text-zinc-500">
                Tap a permission cell to cycle through none → view → edit.
              </p>
            </div>
            <button className="btn-ghost" disabled title="Coming soon">+ New role</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-25">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5">Role</th>
                  {RESOURCES.map((r) => (
                    <th key={r} className="px-3 py-2.5 capitalize text-center">{r}</th>
                  ))}
                  <th className="px-5 py-2.5 text-right">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {roles.map((role, i) => (
                  <tr key={role.name}>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{role.name}</div>
                      <div className="text-xs text-zinc-500">{role.description}</div>
                    </td>
                    {RESOURCES.map((res) => {
                      const lvl = role.perms[res] || 'none';
                      return (
                        <td key={res} className="px-3 py-3 text-center">
                          <button
                            onClick={() => cyclePerm(i, res)}
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold capitalize ${PERM_COLORS[lvl]}`}
                          >
                            {lvl}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right text-zinc-700 tabular">{role.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
            Permission edits are preview-only until the backend pass lands.
          </p>
        </div>
      )}

      {tab === 'profile' && (
        <StubPanel
          title="Church profile"
          description="Name, contact details, banking info, currency and timezone."
          fields={['Church name', 'Primary email', 'Phone', 'Address', 'Currency', 'Timezone']}
        />
      )}

      {tab === 'notify' && (
        <StubPanel
          title="Notifications"
          description="Configure who gets alerted on big donations, over-budget categories and weekly summaries."
          fields={['Big donation threshold (₦)', 'Weekly digest recipients', 'Over-budget alerts', 'Receipt auto-email']}
        />
      )}

      {tab === 'billing' && (
        <StubPanel
          title="Billing"
          description="Subscription tier, payment method and invoices."
          fields={['Plan', 'Next renewal', 'Payment method', 'Invoice email']}
        />
      )}

      {tab === 'integrations' && (
        <StubPanel
          title="Integrations"
          description="Connect a giving processor, bank feed or accounting export."
          fields={['Paystack', 'Flutterwave', 'Bank statement import', 'QuickBooks export']}
        />
      )}
    </div>
  );
}

// Backend URL editor — lets the admin point the dashboard at a different
// backend (e.g. localhost while developing, or a staging deploy) without
// having to set VITE_API_URL and rebuild. Also runs a live /health probe so
// 404 issues caused by a stale deployment surface immediately.
function BackendPanel() {
  const { api, setApiUrl } = useAuth();
  const toast = useToast();
  const [draft, setDraft]     = useState(api);
  const [status, setStatus]   = useState('idle');   // idle | ok | fail
  const [checking, setChecking] = useState(false);
  const [version, setVersion] = useState(null);

  const probe = async (url) => {
    setChecking(true);
    setStatus('idle');
    setVersion(null);
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(cleanUrl + '/health', { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json().catch(() => ({}));
      // We also poke /api/church-admin/me with no token — a 401/403 means
      // the endpoint is registered (good news), a 404 means stale deploy.
      const meRes = await fetch(cleanUrl + '/api/church-admin/me');
      const hasMe = meRes.status !== 404;
      setStatus(hasMe ? 'ok' : 'partial');
      setVersion(body.timestamp || 'reachable');
    } catch (e) {
      setStatus('fail');
      setVersion(e.message);
    } finally {
      setChecking(false);
    }
  };

  const save = () => {
    if (!draft.trim()) return;
    setApiUrl(draft);
    toast?.success('Backend URL saved. Reload the page to apply.');
  };

  return (
    <div className="mt-6 card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-ink">Backend URL</h2>
        <p className="text-xs text-zinc-500">
          Where this dashboard sends API requests. Change to point at a different
          backend (e.g. <code>http://localhost:5000</code> for local dev).
        </p>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <label className="label">API base URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="input flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://api.gospelar.com"
            />
            <button onClick={() => probe(draft)} disabled={checking} className="btn-ghost whitespace-nowrap">
              {checking ? 'Checking…' : 'Test'}
            </button>
            <button
              onClick={save}
              disabled={draft.trim() === api}
              className="btn-primary whitespace-nowrap"
            >
              Save
            </button>
          </div>
        </div>

        {status === 'ok' && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-100">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Backend reachable and up to date.</div>
              <div className="text-xs">{version}</div>
            </div>
          </div>
        )}
        {status === 'partial' && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 ring-1 ring-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Backend reachable, but new endpoints missing.</div>
              <div className="text-xs">
                The server responds to <code>/health</code> but not <code>/api/church-admin/me</code>.
                It needs the latest <code>backend/server.js</code> — restart the server (or redeploy)
                to pick up the new admin/members/families/marks/certificates routes.
              </div>
            </div>
          </div>
        )}
        {status === 'fail' && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Cannot reach this backend.</div>
              <div className="text-xs">{version}</div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-zinc-25 p-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
          <div className="font-semibold text-ink">Current: <code>{api}</code></div>
          <div className="mt-1">
            For a permanent default, create <code>churchdashboard/.env.local</code> with:
          </div>
          <pre className="mt-1 overflow-x-auto rounded bg-white p-2 ring-1 ring-zinc-200">VITE_API_URL=http://localhost:5000</pre>
          <div className="mt-1">Then restart <code>npm run dev</code>.</div>
        </div>
      </div>
    </div>
  );
}

function StubPanel({ title, description, fields }) {
  return (
    <div className="mt-6 card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f}>
            <label className="label">{f}</label>
            <input className="input" placeholder="—" disabled />
          </div>
        ))}
      </div>
      <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
        Saving is disabled until the backend pass lands.
      </p>
    </div>
  );
}
