// /api/v1/users — staff accounts (SUPERADMIN/ADMIN). Swagger: "Tizimdagi
// barcha xodimlar (SUPERADMIN va ADMIN) ro'yxatini qaytaradi. STUDENT va
// TEACHER bu ro'yxatga kirmaydi." Distinct resource from /teachers and
// /student-portal — this is the Settings > CEO > Staff page's backend.
export enum PATHS {
  USERS = "users",
}
