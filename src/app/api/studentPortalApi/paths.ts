// /api/v1/student-portal/* — self-service endpoints for whoever is
// currently authenticated (no studentId param anywhere; the dashboard
// endpoint is explicitly documented "Faqat STUDENT ruxsatiga ega
// bo'lganlarga" — only for STUDENT-role sessions). See
// src/routes/StudentRoute.tsx for the role gate that keeps staff sessions
// away from these.
export enum PATHS {
  ATTENDANCES = "student-portal/attendances",
  BALANCE = "student-portal/balance",
  DASHBOARD = "student-portal/dashboard",
  GROUPS = "student-portal/groups",
  PAYMENTS = "student-portal/payments",
  PROFILE = "student-portal/profile",
  SCHEDULE = "student-portal/schedule",
}
