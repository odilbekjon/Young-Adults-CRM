// GET/PUT /api/v1/settings — confirmed live (2026-09-24) that this is in
// fact per-branch, not a single global object as originally assumed here:
// omitting `branchId` (even sending "all") 400s with "Sozlamalarni ko'rish
// uchun aniq bitta filial (branchId) tanlanishi shart" ("viewing settings
// requires exactly one branch to be selected") — makes sense in hindsight,
// since company name/logo/hours are plausibly different per branch. A
// specific real branch id is required; there is no "all branches" view.
export interface GeneralSettingsRequest {
  branchId: string;
}

export interface GeneralSettings {
  companyName: string;
  companyPhone: string;
  startTime: string;
  endTime: string;
  lessonStartStep: boolean;
  animation: boolean;
  logoUrl: string;
  themeColor: string;
  offerUrl: string;
}

export interface GeneralSettingsResponse {
  success?: boolean;
  message?: string;
  data: GeneralSettings;
}

// PUT body — every field optional-in-practice since Swagger's example shows
// them all as plain strings/booleans with no explicit required markers, but
// the endpoint is modeled as a full replace (same object shape as GET).
// `branchId` is sent the same way as the GET side (query param, not part of
// the body) — same per-branch requirement applies to writes.
export type UpdateGeneralSettingsRequest = GeneralSettings & { branchId: string };
