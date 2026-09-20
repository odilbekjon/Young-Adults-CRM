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
