// GET/PUT /api/v1/settings — Swagger shows only x-lang/x-branch-id headers
// (no query/path params — this is a single global settings object, not a
// per-branch or per-id resource) and pins down the exact PUT body shape.
// GET's response schema isn't expanded beyond "200", so it is assumed to
// mirror the PUT body (the standard shape for this kind of singleton
// settings endpoint elsewhere on this backend).
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
export type UpdateGeneralSettingsRequest = GeneralSettings;
