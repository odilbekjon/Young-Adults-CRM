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
