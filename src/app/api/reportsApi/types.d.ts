// Swagger documents every /reports endpoint's *parameters* but never expands
// the Responses section (each one only shows "200 / No links"), so the row
// shapes below are normalized defensively — the same approach archivesApi and
// groupsApi (normalizeHistory/normalizeComments) already take in this project.
// The one place Swagger does pin down field names is the attendance report's
// `orderBy` enum (studentName, status, groupName, attendance), so those are
// used as the primary keys when reading attendance rows.
//
// `x-lang` and `x-branch-id` are sent centrally by baseApi's prepareHeaders.
// `branchId` still appears in the request types below because these reports
// expose a branch *filter* of their own (the report can be scoped to a branch
// independently of the globally selected one), which is a distinct purpose
// from the header.

// ── Attendance ───────────────────────────────────────────────────────────────
export type AttendanceReportOrderBy = "studentName" | "status" | "groupName" | "attendance";

export interface AttendanceReportRequest {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  groupId?: string;
  orderBy?: AttendanceReportOrderBy;
}

export interface AttendanceReportRow {
  id: string;
  studentName: string;
  status: string;
  groupName: string;
  // Raw value as returned by the backend — it may be a boolean, a count or a
  // label, so it is preserved as-is and interpreted at render time.
  attendance: boolean | number | string | null;
}

// ── Conversion ───────────────────────────────────────────────────────────────
export interface ConversionReportRequest {
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  userId?: string;
  branchId?: string;
}

export interface ConversionReportLead {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  staffName: string;
}

export interface ConversionReportResult {
  leads: ConversionReportLead[];
  // Stage name → count, when the backend returns its own funnel totals.
  // Empty when it only returns rows (the page then derives the counts).
  stageCounts: Record<string, number>;
}

// ── Leads ────────────────────────────────────────────────────────────────────
export interface LeadsReportRequest {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  status?: string;
}

export interface ReportBreakdownItem {
  name: string;
  value: number;
}

export interface LeadsReportResult {
  total: number;
  bySource: ReportBreakdownItem[];
  byMonth: ReportBreakdownItem[];
}

// ── Left students ────────────────────────────────────────────────────────────
export interface LeftStudentsReportRequest {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  groupId?: string;
}

export interface LeftStudentsReportResult {
  total: number;
  byTeacher: ReportBreakdownItem[];
  byCourse: ReportBreakdownItem[];
  byMonth: ReportBreakdownItem[];
  byReason: ReportBreakdownItem[];
}
