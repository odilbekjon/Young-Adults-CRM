// Contract taken from the user's Swagger screenshots (2026-10): the dynamic
// "Lead Forms" module — GET/POST /lead-forms, GET /lead-forms/{id}, /for-edit,
// /select, PATCH /{id}, PATCH /{id}/toggle-status, DELETE /{id} and the
// /lead-forms/{formId}/fields[/{fieldId}|/reorder] sub-resource. Request bodies
// are application/json.

// Swagger: "Form turi (PUBLIC_LEAD yoki INTERNAL_SURVEY)". The editor's
// "Lead form" tab is PUBLIC_LEAD, the "Simple form" tab INTERNAL_SURVEY.
export type LeadFormType = "PUBLIC_LEAD" | "INTERNAL_SURVEY";

// POST /lead-forms sample shows targetAudience "ALL"; other values aren't
// documented, so any string is tolerated on read.
export type LeadFormTargetAudience = "ALL" | string;

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
  // GET /lead-forms: "Ko'rishlar soni (viewsCount) va topshirilgan arizalar
  // soni (submissionsCount)".
  viewsCount: number;
  submissionsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadFormsResponse {
  success: boolean;
  message: string;
  data: LeadForm[];
}

// Swagger only shows `"type": "TEXT"` as the sample value for a field — the
// other accepted values aren't documented. TEXT is the only confirmed one; the
// rest are our best guesses (single place to adjust: FIELD_TYPE in
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

export type LeadFormForEditResponse = LeadFormDetailResponse;

// GET /lead-forms query: branchId ("Filial ID si") and type.
export interface LeadFormsRequest {
  branchId?: string;
  type?: LeadFormType;
}

export interface LeadFormSelectOption {
  id: string;
  name: string;
}

// POST /lead-forms. `fields` exists in the body too, but its item shape isn't
// shown (Swagger renders it as string[]), so fields are added one by one
// through POST /lead-forms/{formId}/fields instead.
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

// PATCH /lead-forms/{formId}/fields/reorder — "Drag & Drop"; its body isn't
// shown in the screenshots. The editor orders fields through `order` on
// create/update instead, so this is only kept for completeness.
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
