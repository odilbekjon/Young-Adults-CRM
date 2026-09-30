import type { MeUser, PermissionAction, PermissionLabel } from "../app/api/authApi/types";

// System-level roles (AUTH_ROLE_DOCS.md §Umumiy tushuncha). Business terms
// like "CEO" or "Manager" from the product spec aren't (necessarily) backend
// roles — CEO is treated as an alias of SUPERADMIN (same "sees everything"
// behavior) in case the backend ever returns it verbatim, and Manager is an
// ADMIN distinguished purely by their assigned RolePermission/sidebar labels,
// not a separate system role. Any other unknown staff role string (e.g.
// "MANAGER") is treated like a label-driven staff member: no implicit access
// beyond what /auth/sidebar (or /auth/me's rolePermissions) grants.
export const SYSTEM_ROLES = {
  SUPERADMIN: "SUPERADMIN",
  CEO: "CEO",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

// Case-insensitive and tolerant of a Spring-style "ROLE_" prefix.
export const normalizeRole = (role?: string | null): string =>
  (role ?? "").trim().toUpperCase().replace(/^ROLE_/, "");

export const isSuperAdminRole = (role?: string | null) => {
  const r = normalizeRole(role);
  return r === SYSTEM_ROLES.SUPERADMIN || r === SYSTEM_ROLES.CEO;
};
export const isAdminRole = (role?: string | null) => normalizeRole(role) === SYSTEM_ROLES.ADMIN;
export const isTeacherRole = (role?: string | null) => normalizeRole(role) === SYSTEM_ROLES.TEACHER;
export const isStudentRole = (role?: string | null) => normalizeRole(role) === SYSTEM_ROLES.STUDENT;

// Every distinct label the user holds via their assigned RolePermissions
// (both the flattened `labels` list and each individual permission's label),
// uppercased. Used as a second source of truth next to GET /auth/sidebar's
// `labels` — if that endpoint ever answers with an empty list while
// /auth/me still shows assigned permissions, the nav keeps working.
export const collectUserLabels = (
  user: Pick<MeUser, "rolePermissions"> | null | undefined
): string[] => {
  const out = new Set<string>();
  for (const rp of user?.rolePermissions ?? []) {
    for (const l of rp.labels ?? []) if (l) out.add(String(l).toUpperCase());
    for (const p of rp.permissions ?? []) if (p?.label) out.add(String(p.label).toUpperCase());
  }
  return [...out];
};

// Mirrors the backend's own check (AUTH_ROLE_DOCS.md §Frontend ruxsat
// tekshirish logikasi): SUPERADMIN always passes; otherwise look through
// every assigned RolePermission for a matching label, where MANAGE covers
// every action.
export const hasPermission = (
  user: Pick<MeUser, "role" | "rolePermissions"> | null | undefined,
  label: PermissionLabel,
  action: PermissionAction
): boolean => {
  if (!user) return false;
  if (isSuperAdminRole(user.role)) return true;

  return (user.rolePermissions ?? []).some((rp) =>
    (rp.permissions ?? []).some((p) => p.label === label && (p.action === action || p.action === "MANAGE"))
  );
};

// Whether the user has ANY permission (of any action) for a label — used to
// gate sidebar items/routes where a specific action doesn't apply.
export const hasLabelAccess = (
  user: Pick<MeUser, "role" | "rolePermissions"> | null | undefined,
  label: PermissionLabel
): boolean => {
  if (!user) return false;
  if (isSuperAdminRole(user.role)) return true;
  return (user.rolePermissions ?? []).some((rp) => (rp.permissions ?? []).some((p) => p.label === label));
};
