// /api/v1/teacher-portal/* — self-service endpoints for whoever is
// currently authenticated with TEACHER permission (no teacherId param on
// any of them; the dashboard endpoint is explicitly documented "Bunga
// faqat TEACHER ruxsatiga ega bo'lgan foydalanuvchilar kira oladi" — only
// for TEACHER-role sessions). {id} on the group endpoints is the group's
// own id (one of the teacher's own groups), not another teacher's id.
export enum PATHS {
  DASHBOARD = "teacher-portal/dashboard",
  GROUPS = "teacher-portal/groups",
  PROFILE = "teacher-portal/profile",
  SALARIES = "teacher-portal/salaries",
  SCHEDULE = "teacher-portal/schedule",
}
