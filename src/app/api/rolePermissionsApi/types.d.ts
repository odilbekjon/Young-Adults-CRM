// GET /role-permissions/select — "Lavozimlarni tanlash uchun olish: Barcha
// faol lavozimlarni qisqa ro'yxatini qaytaradi." Used to populate the
// "Lavozim" (position) picker on the staff create/edit form — replaces
// CreateUserRequest/UpdateUserRequest.rolePermissionId's previous manual
// free-text UUID entry with a real dropdown of actual RolePermission
// records.
export interface RolePermissionSelectOption {
  id: string;
  name: string;
}

// POST /role-permissions/{id}/assign-user/{userId} and DELETE
// /role-permissions/{id}/remove-user/{userId} — AUTH_ROLE_DOCS.md §14/§15.
// Both take no body; assign is idempotent (succeeds even if already
// assigned), matching the doc's "Lavozim allaqachon biriktirilgan bo'lsa
// ham muvaffaqiyat qaytadi" note.
export interface RolePermissionAssignmentResponse {
  success?: boolean;
  message?: string;
  data?: {
    userId: string;
    rolePermissionId: string;
    assignedAt: string;
  } | null;
}
