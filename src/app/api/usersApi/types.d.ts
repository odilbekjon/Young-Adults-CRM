export type UserStatus = "ACTIVE" | "INACTIVE";

// "Lavozimlar" (positions) module — referenced by id from CreateUserRequest/
// UpdateUserRequest.rolePermissionId, but no GET endpoint listing available
// RolePermission records has been documented anywhere in this app yet, so
// only the nested read-shape (as returned inline on a StaffUser) is typed
// here; there's no way to build a real dropdown for it until one exists.
export interface RolePermissionRef {
  id: string;
  name: string;
}

// GET /users — confirmed real response shape (Swagger "Try it out" was
// actually executed): {success, data: [{id, photo, name, email, phone,
// role, rolePermission, status, createdAt}]}. No meta was visible in the
// captured response, so pagination meta is treated as optional/defensive
// like every other list endpoint in this app whose envelope isn't fully
// documented.
export interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  rolePermission: RolePermissionRef | null;
  photo: string | null;
  status: UserStatus | string;
  createdAt: string | null;
}

export interface UsersRequest {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
  branchId?: string;
}

export interface UsersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersResult {
  rows: StaffUser[];
  meta: UsersMeta;
}

// POST /users — Swagger: multipart/form-data. name* and rolePermissionId*
// are the only required fields; email/phone are each optional but at least
// one must be supplied (also usable as the login identifier per the
// field descriptions) — enforced client-side since Swagger doesn't specify
// which one to prefer.
export interface CreateUserRequest {
  name: string;
  rolePermissionId: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
  photo?: File;
  branchIds?: string[];
  birthdate?: string;
  gender?: string;
}

export interface UpdateUserRequest extends Partial<Omit<CreateUserRequest, "name" | "rolePermissionId">> {
  id: string;
  name?: string;
  rolePermissionId?: string;
}

export interface UserActionResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

// GET /users/select?branchId= (branchId required) — "Faqat id, ism, rasm
// qaytaradi."
export interface UserSelectOption {
  id: string;
  name: string;
  photo: string | null;
}
