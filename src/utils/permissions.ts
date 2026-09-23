import type { MeUser, PermissionAction, PermissionLabel } from "../app/api/authApi/types";

// System-level roles (AUTH_ROLE_DOCS.md §Umumiy tushuncha). Business terms
// like "CEO" or "Manager" from the product spec aren't backend roles — CEO
// maps to SUPERADMIN (same "sees everything" behavior), and Manager is an
// ADMIN distinguished purely by their assigned RolePermission/sidebar labels,
// not a separate system role.
export const SYSTEM_ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export const isSuperAdminRole = (role?: string | null) => role?.toUpperCase() === SYSTEM_ROLES.SUPERADMIN;
export const isAdminRole = (role?: string | null) => role?.toUpperCase() === SYSTEM_ROLES.ADMIN;
export const isTeacherRole = (role?: string | null) => role?.toUpperCase() === SYSTEM_ROLES.TEACHER;
export const isStudentRole = (role?: string | null) => role?.toUpperCase() === SYSTEM_ROLES.STUDENT;

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
    rp.permissions.some((p) => p.label === label && (p.action === action || p.action === "MANAGE"))
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
  return (user.rolePermissions ?? []).some((rp) => rp.permissions.some((p) => p.label === label));
};
