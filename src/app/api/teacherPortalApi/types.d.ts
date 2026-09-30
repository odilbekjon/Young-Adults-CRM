// Swagger doesn't expand a response body for any of the seven
// /teacher-portal/* endpoints (each shows only "200", no schema) — every
// shape below is inferred from the endpoint's own description text and
// normalized defensively with fallback field-name variants in
// teacherPortalApi.tsx, the same approach already used for
// studentPortalApi and groupsApi's normalizeHistory whenever Swagger
// doesn't expand a response body. Not asserted as a certain shape.

// GET /teacher-portal/dashboard — "tizimga kirgan o'qituvchining bugungi
// darslari, jami o'quvchilari va aktiv guruhlari sonini qaytaradi."
export interface TeacherPortalDashboard {
  todayLessonsCount: number;
  totalStudentsCount: number;
  activeGroupsCount: number;
}

export interface TeacherPortalGroupStudent {
  id: string;
  name: string;
  phone: string | null;
  // Membership/student status when the backend sends one (ACTIVE, FROZEN,
  // PROBATION, ...) — empty string when it doesn't.
  status: string;
}

// GET /teacher-portal/groups — "O'qituvchi o'qitayotgan barcha guruhlar
// ro'yxati."
export interface TeacherPortalGroup {
  id: string;
  name: string;
  courseName: string;
  daysType: string | null;
  time: string | null;
  studentsCount: number;
}

// GET /teacher-portal/groups/{id} — "O'qituvchi o'ziga tegishli bo'lgan
// aniq bitta guruhning barcha ma'lumotlarini olishi mumkin." A richer
// per-group shape than the list entry above, mirroring groupsApi's
// GroupDetail field names for the fields this description implies overlap
// with (room, training dates, full student list).
export interface TeacherPortalGroupDetail extends TeacherPortalGroup {
  roomName: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  students: TeacherPortalGroupStudent[];
}

// GET /teacher-portal/groups/{id}/students — "Guruhdagi o'quvchilar
// ro'yxati."
export type TeacherPortalGroupStudentsResponse = TeacherPortalGroupStudent[];

export type TeacherPortalGender = "MALE" | "FEMALE";

export interface TeacherPortalBranchRef {
  id: string;
  name: string;
}

// GET /teacher-portal/profile — "Shaxsiy profil"
export interface TeacherPortalProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  specialization: string | null;
  gender: TeacherPortalGender | null;
  // Plain YYYY-MM-DD (the datetime suffix, if any, is stripped).
  birthdate: string | null;
  branches: TeacherPortalBranchRef[];
  // Kept for callers that only need a single branch label.
  branchName: string | null;
}

// PATCH /teacher-portal/profile — multipart/form-data. Swagger documents
// `photo` and `password` (min 6 chars); the description also mentions
// gender and birth date, sent under the same names teachersApi uses for
// the admin-side teacher form (`gender`, `birthdate`). Empty/undefined
// values are never sent.
export interface UpdateTeacherPortalProfileRequest {
  photo?: File;
  password?: string;
  gender?: TeacherPortalGender;
  birthdate?: string;
}

// GET /teacher-portal/salaries — "O'qituvchining e'lon qilingan
// oyliklari" — same fields salariesApi's TeacherSalaryRow already models
// for GET /salaries/teacher/{teacherId} (the admin-side view of the same
// data), since both describe a teacher's own payroll history.
export interface TeacherPortalSalaryRow {
  id: string;
  periodYear: number | null;
  periodMonth: number | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paidAt: string;
}

// GET /teacher-portal/schedule — "O'zining dars jadvali". Expected to
// mirror GET /dashboard/schedule (admin) restricted to this teacher's own
// groups: one row per group with room/time/day-type. `day` is kept for a
// per-weekday shape, should the backend return one instead.
export interface TeacherPortalScheduleItem {
  groupId: string;
  groupName: string;
  courseName: string;
  roomName: string;
  day: string;
  days: string[];
  daysType: string;
  time: string | null;
  teachers: string;
  trainingStart: string | null;
  trainingEnd: string | null;
  studentsCount: number | null;
  maxStudents: number | null;
}
