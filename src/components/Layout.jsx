import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Wallet, HandCoins, Receipt, PiggyBank, BarChart3,
  Users, Home, HardHat, Megaphone, Share2, Building2, UserCog,
  School, BookOpen, GraduationCap, CalendarDays, TrendingUp, UserCheck, Award,
  ClipboardCheck,
  Settings as SettingsIcon, Search,
  MoreHorizontal, LogOut, ChevronsUpDown,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useRole } from '../contexts/RoleContext.jsx';
import BranchSwitcher from './BranchSwitcher.jsx';
import RoleSwitcher from './RoleSwitcher.jsx';

// `gate` matches the keys returned by RoleContext.canSee(). Sidebar groups
// are hidden entirely when none of their items pass the gate.
const NAV = [
  { section: 'Overview', items: [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard', gate: 'dashboard' },
    { to: '/activity', icon: Activity,        label: 'Activity',  gate: 'activity' },
  ]},
  { section: 'Finance', items: [
    { to: '/finance',   icon: Wallet,    label: 'Overview',  gate: 'finance' },
    { to: '/donations', icon: HandCoins, label: 'Donations', gate: 'donations' },
    { to: '/expenses',  icon: Receipt,   label: 'Expenses',  gate: 'expenses' },
    { to: '/budgets',   icon: PiggyBank, label: 'Budgets',   gate: 'budgets' },
    { to: '/reports',   icon: BarChart3, label: 'Reports',   gate: 'reports' },
  ]},
  { section: 'Community', items: [
    { to: '/members',   icon: Users,     label: 'Members',   gate: 'members' },
    { to: '/families',  icon: Home,      label: 'Families',  gate: 'families' },
    { to: '/workers',   icon: HardHat,   label: 'Workers',   gate: 'workers' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns', gate: 'campaigns' },
    { to: '/social',    icon: Share2,    label: 'Social',    gate: 'social' },
  ]},
  { section: 'Learning', items: [
    { to: '/classes',      icon: School,          label: 'Classes',      gate: 'classes' },
    { to: '/lessons',      icon: BookOpen,        label: 'Lessons',      gate: 'lessons' },
    { to: '/teachers',     icon: GraduationCap,   label: 'Teachers',     gate: 'teachers' },
    { to: '/marks',        icon: ClipboardCheck,  label: 'Marks',        gate: 'marks' },
    { to: '/attendance',   icon: CalendarDays,    label: 'Attendance',   gate: 'attendance' },
    { to: '/engagement',   icon: TrendingUp,      label: 'Engagement',   gate: 'engagement' },
    { to: '/approvals',    icon: UserCheck,       label: 'Approvals',    gate: 'approvals' },
    { to: '/certificates', icon: Award,           label: 'Certificates', gate: 'certificates' },
  ]},
  { section: 'Admin', items: [
    { to: '/branches', icon: Building2,    label: 'Branches', gate: 'branches' },
    { to: '/team',     icon: UserCog,      label: 'Team',     gate: 'team' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings', gate: 'settings' },
  ]},
];

export default function Layout() {
  const { signOut, church } = useAuth();
  const { canSee } = useRole();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');

  const gated = useMemo(() => {
    return NAV
      .map((s) => ({ ...s, items: s.items.filter((it) => canSee(it.gate)) }))
      .filter((s) => s.items.length);
  }, [canSee]);

  const filtered = useMemo(() => {
    if (!q.trim()) return gated;
    const term = q.toLowerCase();
    return gated
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(term)) }))
      .filter((s) => s.items.length);
  }, [gated, q]);

  const flat = useMemo(() => gated.flatMap((s) => s.items), [gated]);
  const current = flat.find((i) => i.to === pathname) || flat[0];

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-25">
        <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-2.5 px-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-sm font-bold shrink-0">
              ⛪
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate">
                {church?.name || 'Gospelar'}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">Church Admin</div>
            </div>
          </div>
          <button className="rounded-md p-1 hover:bg-zinc-150 text-zinc-500 shrink-0" title="Switch">
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>

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

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {filtered.map((section) => (
            <div key={section.section} className="mb-4">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {section.section}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map((it) => {
                  const Icon = it.icon;
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
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-ink tracking-tight">
              {current?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <BranchSwitcher />
            <RoleSwitcher />
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
