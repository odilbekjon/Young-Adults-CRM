// Swagger only expands a response body for GET /student-portal/attendances
// (confirmed via a real executed "Try it out" call); every other endpoint
// below shows just "200 / No links". Those six are typed from the
// endpoint's own description text, normalized defensively with fallback
// field-name variants in studentPortalApi.tsx — the same approach this
// codebase already uses for groupHistory/groupComments/studentGroups
// whenever Swagger doesn't expand a response body — rather than asserted
// as a certain shape.

// GET /student-portal/attendances — "Talabaning barcha guruhlar kesimida
// shaxsiy davomat tarixi." Confirmed real shape: {success, data: [...]}.
export interface StudentPortalAttendanceRecord {
  date: string;
  groupName: string;
  status: string;
  reason: string | null;
}

// GET /student-portal/balance — "Talabaning joriy balansi, to'lagan summasi
// va qarzi."
export interface StudentPortalBalance {
  balance: number;
  paidAmount: number;
  debt: number;
}

// GET /student-portal/dashboard — "Talabaning davomat foizi, aktiv kurslari
// soni va umumiy statistikasi."
export interface StudentPortalDashboard {
  attendancePercentage: number;
  activeCoursesCount: number;
}

export interface StudentPortalGroupTeacher {
  id: string;
  name: string;
}

// GET /student-portal/groups — "Talaba a'zo bo'lgan barcha guruhlar va
// ulardagi ustozlar ro'yxati."
export interface StudentPortalGroup {
  id: string;
  name: string;
  courseName: string;
  daysType: string | null;
  time: string | null;
  teachers: StudentPortalGroupTeacher[];
}

// GET /student-portal/payments — "Talabaning amalga oshirgan barcha
// to'lovlari ro'yxati."
export interface StudentPortalPayment {
  id: string;
  amount: number;
  method: string | null;
  date: string | null;
  comment: string | null;
}

export interface StudentPortalComment {
  id: string;
  text: string;
  author: string | null;
  createdAt: string | null;
}

// GET /student-portal/profile — "Talabaning shaxsiy ma'lumotlarini va u
// haqidagi izohlarni (comments) qaytaradi."
export interface StudentPortalProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  branchName: string | null;
  comments: StudentPortalComment[];
}

// GET /student-portal/schedule — "Talabaga biriktirilgan guruhlar dars
// kunlarini qaytaradi."
export interface StudentPortalScheduleItem {
  groupId: string;
  groupName: string;
  day: string;
  time: string | null;
}
