import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';

const RoleCtx = createContext(null);

const VIEW_AS_KEY = 'gofamint_view_as_role';

// All roles the system knows about. Order matters for the switcher dropdown.
export const ALL_ROLES = [
  'super_admin', 'pastor', 'finance', 'worker', 'sunday_school_teacher', 'member',
];

export const ROLE_LABELS = {
  super_admin:           'Super Admin',
  pastor:                'Pastor',
  finance:               'Finance Team',
  worker:                'Worker',
  sunday_school_teacher: 'Sunday School Teacher',
  member:                'Member',
};

// Resource permissions used by the sidebar gate. Mirrors the backend
// ROLE_PERMS but adds finer-grained menu rules (the backend only enforces
// branches/staff/activity/settings — the rest is UI-only convention).
// Sunday-school / Learning gates: classes, lessons, teachers, attendance,
// engagement, approvals, certificates. Pastors + super-admins see all of them;
// sunday_school_teacher sees the read-only oversight plus certificates so they
// can recognise their own students.
export const ROLE_MENU = {
  super_admin: ['dashboard', 'finance', 'donations', 'expenses', 'budgets', 'reports', 'members', 'families', 'workers', 'campaigns', 'social', 'classes', 'lessons', 'teachers', 'marks', 'attendance', 'engagement', 'approvals', 'certificates', 'branches', 'team', 'activity', 'settings'],
  pastor:      ['dashboard', 'finance', 'donations', 'expenses', 'budgets', 'reports', 'members', 'families', 'workers', 'campaigns', 'social', 'classes', 'lessons', 'teachers', 'marks', 'attendance', 'engagement', 'approvals', 'certificates', 'branches', 'team', 'activity', 'settings'],
  finance:     ['dashboard', 'finance', 'donations', 'expenses', 'budgets', 'reports', 'members', 'families', 'campaigns', 'social', 'activity'],
  worker:      ['dashboard', 'members', 'families', 'workers', 'activity'],
  sunday_school_teacher: ['dashboard', 'members', 'families', 'classes', 'lessons', 'marks', 'attendance', 'engagement', 'certificates', 'activity'],
  member:      ['dashboard'],
};

// Any signed-in user can pick which role-view to use from the header. The
// sidebar gate is UI-only — the backend still enforces real permissions on
// /api/church-admin/* — so this is just letting people see the menus that
// belong to whichever team they want to work on.
const CAN_PREVIEW = new Set(ALL_ROLES);

export function RoleProvider({ children }) {
  const { staff, isAuthed } = useAuth();
  // The dashboard is a church-admin surface — only the church admin (pastor)
  // holds the token in the first place. Default to 'pastor' so an approved
  // church account lands on the full menu even before /api/church-admin/me
  // returns a real staff row. Matches the backend's middleware fallback in
  // backend/middleware/auth.js when no staff row exists for the admin email.
  const actualRole = staff?.role || (isAuthed ? 'pastor' : 'member');

  const [viewAsRole, setViewAs] = useState(() => {
    const raw = localStorage.getItem(VIEW_AS_KEY);
    return raw || null;
  });

  // If the persisted preview-role isn't valid anymore (e.g. the underlying
  // staff record changed roles), drop it.
  useEffect(() => {
    if (!viewAsRole) return;
    if (!CAN_PREVIEW.has(actualRole) || !ALL_ROLES.includes(viewAsRole)) {
      setViewAs(null);
      localStorage.removeItem(VIEW_AS_KEY);
    }
  }, [viewAsRole, actualRole]);

  const setViewAsRole = (role) => {
    setViewAs(role || null);
    if (role) localStorage.setItem(VIEW_AS_KEY, role);
    else      localStorage.removeItem(VIEW_AS_KEY);
  };

  const effectiveRole = viewAsRole || actualRole;
  const canPreview = CAN_PREVIEW.has(actualRole);

  const canSee = (key) => (ROLE_MENU[effectiveRole] || []).includes(key);

  return (
    <RoleCtx.Provider value={{
      actualRole, viewAsRole, effectiveRole,
      canPreview, setViewAsRole, canSee,
    }}>
      {children}
    </RoleCtx.Provider>
  );
}

export const useRole = () => useContext(RoleCtx);
