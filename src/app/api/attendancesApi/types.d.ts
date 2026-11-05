export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceRecordInput {
  studentId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
  reason?: string;
}

export interface SaveAttendanceRequest {
  records: AttendanceRecordInput[];
}

export interface SaveAttendanceResponse {
  success: boolean;
  message?: string;
}

// Normalized shape our UI works with — the raw response is flattened into
// this by attendancesApi.tsx's normalizeRecords, since the backend's exact
// envelope for this endpoint isn't documented beyond a 200 status.
export interface AttendanceRecord {
  studentId: string;
  date: string;
  status: AttendanceStatus | null;
  reason?: string | null;
}

// One freeze of a student in this group, as GET /attendances/group/{id} lists it
// under the student's `freezeRanges`. Dates are the calendar days written in the
// backend's own timestamps ("2026-09-01T00:00:00+05:00" -> "2026-09-01").
export interface FreezeRange {
  id: string;
  // First frozen day.
  startDate: string;
  // Last frozen day; null while the freeze has no end yet.
  endDate: string | null;
  reason: string | null;
  // ACTIVE while the freeze is in force, EXPIRED once it has ended.
  status: string | null;
}

// What the Attendance grid reads out of GET /attendances/group/{id}: every mark,
// and - for each student whose row carries the field - their freezes (an empty
// list means "never frozen"; no entry means the backend did not say).
export interface GroupAttendance {
  records: AttendanceRecord[];
  freezeRanges: Record<string, FreezeRange[]>;
}

export interface GroupAttendanceQueryArgs {
  groupId: string;
  month: string;
}

// GET /attendances/report — group-membership status (distinct from
// AttendanceStatus above, which is the per-day attendance mark).
export type AttendanceReportGroupStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PROBATION"
  | "FROZEN"
  | "DELETED";

export type AttendanceReportAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "EXCUSED"
  | "UNMARKED";

export interface AttendanceReportQueryArgs {
  date?: string;
  name?: string;
  phone?: string;
  status?: AttendanceReportGroupStatus;
  groupId?: string;
  teacherId?: string;
  attendanceStatus?: AttendanceReportAttendanceStatus;
  branchId?: string;
  page?: number;
  limit?: number;
}

// Backend's exact row envelope for /attendances/report isn't documented
// beyond the endpoint description ("date, student name, phone, status,
// group, teacher, attendance status"); normalizeReportRow in
// attendancesApi.tsx maps the plausible field-name variants (flat or
// nested under student/group/teacher) into this shape rather than a
// literal mirror of the raw response.
export interface AttendanceReportRow {
  id: string;
  date: string | null;
  studentId: string | null;
  studentName: string;
  phone: string;
  status: AttendanceReportGroupStatus | null;
  groupId: string | null;
  groupName: string;
  teacherId: string | null;
  teacherName: string;
  attendanceStatus: AttendanceReportAttendanceStatus | null;
  comment: string | null;
}

export interface AttendanceReportMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceReportResult {
  rows: AttendanceReportRow[];
  meta: AttendanceReportMeta;
}

// One lesson day of a single student in a single group for a given month —
// built by attendancesApi's `studentMonthAttendance` from
// GET /attendances/group/{id}/dates + GET /attendances/group/{id} (filtered
// to the student's own row). `status` is null when the lesson is scheduled
// but no mark exists for the student.
export type StudentAttendanceDayStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export interface StudentAttendanceDay {
  groupId: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceDayStatus | null;
  reason: string | null;
  updatedBy: string | null;
}

export interface StudentMonthAttendanceArgs {
  studentId: string;
  groupIds: string[];
  month: string; // YYYY-MM
}
