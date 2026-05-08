import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays, TrendingUp, BookOpen, Users, UserCheck, Search,
  MoreHorizontal, LogOut, ChevronsUpDown,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { makeReq } from '../api.js';

const NAV = [
  { section: 'Insights', items: [
    { to: '/',           icon: CalendarDays, label: 'Attendance' },
    { to: '/engagement', icon: TrendingUp,   label: 'Engagement' },
    { to: '/lessons',    icon: BookOpen,     label: 'Lessons' },
    { to: '/teachers',   icon: Users,        label: 'Teachers' },
  ]},
  { section: 'Manage', items: [
    { to: '/approvals',  icon: UserCheck,    label: 'Approvals', badgeKey: 'approvals' },
  ]},
];

const FLAT = NAV.flatMap(s => s.items);

export default function Layout() {
  const { signOut, church, api, token } = useAuth();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [badges, setBadges] = useState({});

  // Fetch pending teacher count once on mount, and refresh whenever the
  // route changes (so approving a teacher in /approvals updates the sidebar
  // badge as soon as the user navigates away).
  useEffect(() => {
    if (!api || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const req = makeReq(api, token);
        const d = await req('/api/church-admin/teachers?status=pending');
        if (!cancelled) setBadges((b) => ({ ...b, approvals: d?.count || 0 }));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [api, token, pathname]);

  const filtered = useMemo(() => {
    if (!q.trim()) return NAV;
    const term = q.toLowerCase();
    return NAV
      .map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(term)) }))
      .filter(s => s.items.length);
  }, [q]);

  const current = FLAT.find(i => i.to === pathname) || FLAT[0];

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-25">
        {/* Brand */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-2.5 px-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-sm font-bold shrink-0">
              ⛪
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate">
                {church?.name || 'Gospelar'}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">Church Leader</div>
            </div>
          </div>
          <button className="rounded-md p-1 hover:bg-zinc-150 text-zinc-500 shrink-0" title="Switch">
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* Quick search */}
        <div className="px-3 py-3 border-b border-zinc-200">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find…"
              className="w-full rounded-md bg-white ring-1 ring-zinc-200 pl-8 pr-8 py-1.5 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
              F
            </kbd>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {filtered.map((section) => (
            <div key={section.section} className="mb-4">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {section.section}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map((it) => {
                  const Icon  = it.icon;
                  const count = it.badgeKey ? badges[it.badgeKey] : 0;
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.to === '/'}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] font-medium transition ` +
                        (isActive
                          ? 'bg-zinc-150 text-ink'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-ink')
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{it.label}</span>
                      {count > 0 && (
                        <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                          {count}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Foot */}
        <div className="border-t border-zinc-200 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-ink tracking-tight">
              {current?.label || 'Attendance'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" title="More">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
