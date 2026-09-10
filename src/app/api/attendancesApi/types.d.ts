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
