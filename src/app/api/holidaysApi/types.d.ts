// Swagger documents the holidays endpoints' parameters (id in the path,
// x-lang / x-branch-id in headers) but not their response bodies, so the
// entity below mirrors this backend's standard entity shape (same audit
// fields as Room/Group/Course) with everything beyond id/name/date treated
// as optional rather than assumed.
export interface Holiday {
  id: string;
  name: string;
  // ISO date — Swagger's write contract specifies YYYY-MM-DD, but reads can
  // come back as a full ISO timestamp, so consumers normalize before use.
  date: string;
  branchId?: string | null;
  status?: string;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Not part of the documented POST/PATCH contract (which accepts only name
  // and date). Read-only here: rendered when the backend returns it, never
  // sent, so the UI doesn't claim to persist a field the API doesn't accept.
  affectsPayment?: boolean;
}

export interface HolidaysResponse {
  success: boolean;
  message?: string;
  data: Holiday[];
}

export interface HolidayResponse {
  success: boolean;
  message?: string;
  data: Holiday;
}

// GET /holidays/select — simplified list for dropdowns, same convention as
// the other /select endpoints on this backend.
export interface HolidaySelectOption {
  id: string;
  name: string;
}

// POST /holidays — Swagger declares multipart/form-data with exactly two
// required fields.
export interface CreateHolidayRequest {
  name: string;
  date: string;
}

// PATCH /holidays/{id} — same multipart body, both fields optional.
export interface UpdateHolidayRequest {
  id: string;
  name?: string;
  date?: string;
}

export interface DeleteHolidayResponse {
  success: boolean;
  message?: string;
}
