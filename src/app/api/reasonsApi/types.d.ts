// GET /api/v1/reasons — Swagger: search / status / page / limit / branchId as
// query params. `branchId` is omitted from the request types below because
// baseApi's prepareHeaders already sends the selected branch as `x-branch-id`
// on every request (and `x-lang` for language) — sending it twice would
// duplicate the same value. The one exception is POST, where Swagger marks
// branchId as a *required query parameter*, so it's explicit there.
export type ReasonStatus = "ACTIVE" | "INACTIVE";

// Swagger documents the reasons endpoints' parameters but never expands the
// Responses section, so fields beyond id/name are modeled defensively
// (optional/nullable) — the same approach archivesApi/types.d.ts already
// takes for the archive rows.
export interface Reason {
  id: string;
  name: string;
  // Present in the POST/PATCH request body ({name, type}) but with no
  // documented value domain (no enum, no example beyond "string"), so it is
  // typed loosely and never sent with a made-up value — see reasonsApi.tsx.
  type?: string | null;
  status?: ReasonStatus | string | null;
  branchId?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ReasonsRequest {
  search?: string;
  status?: ReasonStatus;
  page?: number;
  limit?: number;
}

export interface ReasonsResponse {
  success: boolean;
  message?: string;
  data: Reason[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ReasonResponse {
  success: boolean;
  message?: string;
  data: Reason;
}

// GET /reasons/select — "Faol sabablarni tanlash uchun qisqa ro'yxati",
// i.e. the active-reasons shortlist used to populate dropdowns.
export interface ReasonSelectOption {
  id: string;
  name: string;
}

// POST /reasons — Swagger: branchId is a required *query* parameter, body is
// application/json {name, type}.
export interface CreateReasonRequest {
  branchId: string;
  name: string;
  type?: string;
}

// PATCH /reasons/{id} — application/json {name, type}, id in the path.
export interface UpdateReasonRequest {
  id: string;
  name?: string;
  type?: string;
}

export interface DeleteReasonResponse {
  success: boolean;
  message?: string;
}

export interface ToggleReasonStatusResponse {
  success: boolean;
  message?: string;
  data?: Reason;
}
