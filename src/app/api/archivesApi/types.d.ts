// GET /api/v1/archives — confirmed via Swagger: page/limit + search (name or
// phone) + status/branchId/role/reasonId/startDate/endDate. `x-branch-id` and
// `x-lang` are sent centrally by baseApi's prepareHeaders (same as every other
// module), so they aren't part of this request type.
export type ArchiveStatus = "ACTIVE" | "INACTIVE";

export type ArchiveRole = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

export interface ArchivesRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: ArchiveStatus;
  branchId?: string;
  role?: ArchiveRole;
  reasonId?: string;
  startDate?: string;
  endDate?: string;
}

// Swagger only documented the Parameters for this endpoint — the Responses
// section wasn't expanded, so the exact response field names aren't
// confirmed. This is the normalized shape the Archive page consumes:
// archivesApi's normalizeArchiveRecord maps whichever field names the backend
// really sends (reason/reasonName, comment/note, archivedBy/processedBy, ...)
// onto it.
export interface ArchiveBranchRef {
  id: string;
  name: string;
}

export interface ArchiveReasonRef {
  id: string;
  name: string;
}

export interface ArchivedByRef {
  id: string;
  name: string;
}

export interface ArchiveRecord {
  id: string;
  name: string;
  phone?: string | null;
  role?: ArchiveRole | string | null;
  balance?: number | null;
  branch?: ArchiveBranchRef | null;
  reason?: ArchiveReasonRef | null;
  reasonId?: string | null;
  comment?: string | null;
  archivedBy?: ArchivedByRef | null;
  archivedAt?: string | null;
  status?: ArchiveStatus | string | null;
}

export interface ArchivesResponse {
  success: boolean;
  message?: string;
  data: ArchiveRecord[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
