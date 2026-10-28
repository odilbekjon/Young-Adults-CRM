// Contract taken from the user's Swagger screenshots (2026-10): the dynamic
// "Lead Forms" module — GET/POST /lead-forms, GET /lead-forms/{id}, /select,
// PATCH /{id}, PATCH /{id}/toggle-status, DELETE /{id} and the
// /lead-forms/{formId}/fields[/{fieldId}|/reorder] sub-resource. Request bodies
// are application/json.

// Swagger: "Form turi (PUBLIC_LEAD yoki INTERNAL_SURVEY)". The editor's
// "Lead form" tab is PUBLIC_LEAD, the "Simple form" tab INTERNAL_SURVEY.
export type LeadFormType = "PUBLIC_LEAD" | "INTERNAL_SURVEY";

// POST /lead-forms sample shows targetAudience "ALL"; other values aren't
// documented, so any string is tolerated on read.
export type LeadFormTargetAudience = "ALL" | string;

// GET /lead-forms `status` filter ("ACTIVE/INACTIVE").
export type LeadFormStatus = "ACTIVE" | "INACTIVE";

// The `branch` / `source` objects a GET /lead-forms row embeds.
export interface LeadFormRef {
  id: string;
  name: string;
}

export interface LeadForm {
  id: string;
  title: string;
  // Alias of `title` kept for older call sites.
  name: string;
  description: string | null;
  slug: string | null;
  type: LeadFormType | string;
  targetAudience: LeadFormTargetAudience | null;
  branchId: string | null;
  sourceId: string | null;
  successMessage: string | null;
  status: string;
  // GET /lead-forms: "Ko'rishlar soni (viewCount) va topshirilgan arizalar
  // soni (submissionCount)".
  viewCount: number;
  submissionCount: number;
  branch: LeadFormRef | null;
  source: LeadFormRef | null;
  // `_count.fields` of a GET /lead-forms row.
  fieldsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadFormsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadFormsResponse {
  success: boolean;
  message: string;
  data: LeadForm[];
  meta: LeadFormsMeta;
}

// The accepted values aren't listed in the Swagger. TEXT and SELECT are
// confirmed (they come back from GET /lead-forms/{formId}/fields); TEXTAREA is
// our best guess (single place to adjust: FIELD_TYPE in
// pages/Settings/forms/pages/createForm). A wrong value comes back as a 400
// whose message lists the allowed values, which the editor shows in its toast.
export type LeadFormFieldType = "TEXT" | "TEXTAREA" | "SELECT" | string;

export interface LeadFormField {
  id: string;
  formId?: string;
  label: string;
  type: LeadFormFieldType;
  placeholder: string | null;
  options: string[];
  isRequired: boolean;
  order: number;
  // Lead attribute the answer is stored into (e.g. the fixed name/phone
  // fields); the allowed values aren't documented.
  mapsTo: string | null;
}

// GET /lead-forms/{id} — "full details AND its fields"
export interface LeadFormDetail extends LeadForm {
  fields: LeadFormField[];
}

export interface LeadFormDetailResponse {
  success: boolean;
  message?: string;
  data: LeadFormDetail;
}

// GET /lead-forms and GET /lead-forms/select query (page defaults to 1, limit
// to 10; branchId "all" or empty means every branch).
export interface LeadFormsRequest {
  search?: string;
  status?: LeadFormStatus;
  page?: number;
  limit?: number;
  branchId?: string;
  type?: LeadFormType;
}

export interface LeadFormSelectOption {
  id: string;
  name: string;
}

// POST /lead-forms. `fields` exists in the body too, but its item shape isn't
// shown (Swagger renders it as string[]), so fields are added one by one
// through POST /lead-forms/{formId}/fields instead — that path is confirmed
// live. `branchId` also goes out as the x-branch-id header (see leadFormsApi).
export interface CreateLeadFormRequest {
  title: string;
  description?: string;
  slug?: string;
  type: LeadFormType;
  targetAudience?: LeadFormTargetAudience;
  branchId?: string;
  sourceId?: string;
  successMessage?: string;
}

// PATCH /lead-forms/{id} — title, description, slug, status, successMessage,
// sourceId (type/branch can't be changed).
export interface UpdateLeadFormRequest {
  id: string;
  title?: string;
  description?: string;
  slug?: string;
  status?: string;
  successMessage?: string;
  sourceId?: string;
}

export interface LeadFormResponse {
  success: boolean;
  message?: string;
  data: LeadForm;
}

export interface DeleteLeadFormResponse {
  success: boolean;
  message?: string;
}

export interface LeadFormFieldsResponse {
  success: boolean;
  message: string;
  data: LeadFormField[];
}

export interface LeadFormFieldResponse {
  success: boolean;
  message?: string;
  data: LeadFormField;
}

// POST /lead-forms/{formId}/fields body: label, type, placeholder, options[],
// isRequired, order, mapsTo.
export interface CreateLeadFormFieldRequest {
  formId: string;
  label: string;
  type: LeadFormFieldType;
  placeholder?: string;
  options?: string[];
  isRequired?: boolean;
  order?: number;
  mapsTo?: string;
}

export interface UpdateLeadFormFieldRequest extends Partial<Omit<CreateLeadFormFieldRequest, "formId">> {
  formId: string;
  fieldId: string;
}

export interface DeleteLeadFormFieldResponse {
  success: boolean;
  message?: string;
}

// PATCH /lead-forms/{formId}/fields/reorder — "Drag & Drop": `fieldIds` is every
// field's id in the new order, the backend renumbers `order` from it.
export interface ReorderLeadFormFieldsRequest {
  formId: string;
  fieldIds: string[];
}

export interface ReorderLeadFormFieldsResponse {
  success: boolean;
  message?: string;
}

export interface ToggleLeadFormStatusResponse {
  success: boolean;
  message?: string;
  data?: LeadForm;
}
