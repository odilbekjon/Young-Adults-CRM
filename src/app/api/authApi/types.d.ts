export interface LoginRequest {
  identifier: string;
  password: string;
}

// GET /role-permissions/enums documents the exact closed set of values for
// both fields below — anything outside these is not a valid backend value.
export type PermissionLabel =
  | "STUDENTS"
  | "TEACHERS"
  | "USERS"
  | "GROUPS"
  | "COURSES"
  | "ROOMS"
  | "BRANCHES"
  | "SETTINGS"
  | "FINANCE"
  | "PAYMENTS"
  | "EXPENSES"
  | "SALARIES"
  | "LEADS";

export type PermissionAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "GET_ARCHIVE" | "MANAGE";

export interface Permission {
  action: PermissionAction;
  label: PermissionLabel;
}

// A "lavozim" (position) — a named bundle of permissions a user can be
// assigned in addition to their base `role` (AUTH_ROLE_DOCS.md §RolePermission).
export interface RolePermissionDetail {
  id: string;
  name: string;
  description: string | null;
  labels: PermissionLabel[];
  permissions: Permission[];
}

export interface LoginUser {
  id: string;
  email: string;
  phone: string | null;
  // Base system role: SUPERADMIN | ADMIN | TEACHER | STUDENT.
  role: string;
  // `role` plus every assigned RolePermission.name — flattened for display
  // (e.g. sidebar labels), not for permission checks (use rolePermissions).
  roles?: string[];
  rolePermissions?: RolePermissionDetail[];
  jobTitle?: string | null;
}

// POST /auth/login — multipart/form-data {identifier, password}. identifier
// accepts either an email or a phone number (AUTH_ROLE_DOCS.md §1).
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: LoginUser;
    token: string;
    refreshToken?: string;
  };
}

export interface MeUserBranchRef {
  branchId: string;
  branch: {
    id: string;
    name: string;
    status: string;
  };
}

export interface MeUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo: string | null;
  role: string;
  jobTitle: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  rolePermissions: RolePermissionDetail[];
  // First branch id (shortcut) — kept for backward compatibility with call
  // sites that only need a single "primary" branch.
  branchId?: string | null;
  branchIds: string[];
  branches: MeUserBranchRef[];
}

export interface MeResponse {
  success: boolean;
  message: string;
  data: MeUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

// GET /auth/sidebar — drives which menus/routes are visible. `allAccess:
// true` (SUPERADMIN) means everything is visible regardless of `labels`.
export interface SidebarResponse {
  success: boolean;
  data: {
    allAccess: boolean;
    labels: PermissionLabel[];
  };
}
