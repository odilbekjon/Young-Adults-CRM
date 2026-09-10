// Swagger documents every /student-freezes endpoint's parameters and request
// bodies precisely, but never expands the Responses section (each shows only
// "200 / No links"), so the row shape is normalized defensively — the same
// approach reportsApi/salariesApi already take in this project. Field names
// come straight from the documented query/body params (studentId, groupId,
// studentGroupId, startDate, endDate, reason, status).

export type StudentFreezeStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface StudentFreezesRequest {
  studentId?: string;
  groupId?: string;
  status?: StudentFreezeStatus;
  page?: number;
  limit?: number;
}

export interface StudentFreezeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  groupId: string | null;
  groupName: string;
  studentGroupId: string | null;
  startDate: string;
  endDate: string | null;
  reason: string;
  status: StudentFreezeStatus | string;
  createdAt: string | null;
}

export interface StudentFreezesMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentFreezesResult {
  rows: StudentFreezeRecord[];
  meta: StudentFreezesMeta;
}

// POST /student-freezes — Swagger: multipart/form-data. studentId* and
// startDate* are required; groupId, studentGroupId, endDate, reason optional.
export interface CreateStudentFreezeRequest {
  studentId: string;
  groupId?: string;
  studentGroupId?: string;
  startDate: string;
  endDate?: string;
  reason?: string;
}

// PATCH /student-freezes/{id} — Swagger: multipart/form-data, only
// startDate/endDate/reason are editable (studentId/groupId are not).
export interface UpdateStudentFreezeRequest {
  id: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface StudentFreezeMutationResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
