export interface LeadForm {
  id: string;
  name: string;
  branchId?: string | null;
  sectionId?: string | null;
  leadSourceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadFormsResponse {
  success: boolean;
  message: string;
  data: LeadForm[];
}

// Backend's field-type enum isn't documented in the Swagger screenshots (only
// endpoint list/method/path shown, no request/response body schema) — these
// values are our best-effort mapping from the pre-existing local editor's
// 3 field kinds ("One of the list" / "Short answer" / "Long answer"). If the
// backend uses different literal values this enum (and the two small
// to/from-UI mapping functions in leadFormsApi.tsx) is the single place to
// adjust.
export type LeadFormFieldType = "SINGLE_CHOICE" | "SHORT_TEXT" | "LONG_TEXT";

export interface LeadFormFieldOption {
  id: string;
  label: string;
}

export interface LeadFormField {
  id: string;
  formId: string;
  type: LeadFormFieldType;
  question: string;
  required: boolean;
  order?: number;
  options: LeadFormFieldOption[];
}

// GET /lead-forms/{id} — "single form's full details AND its fields"
export interface LeadFormDetail extends LeadForm {
  fields: LeadFormField[];
}

export interface LeadFormDetailResponse {
  success: boolean;
  message?: string;
  data: LeadFormDetail;
}

// GET /lead-forms/{id}/for-edit — response shape not documented beyond a 200
// status, so we expect the same LeadFormDetail shape as GET /lead-forms/{id}.
export interface LeadFormForEditResponse {
  success: boolean;
  message?: string;
  data: LeadFormDetail;
}

export interface CreateLeadFormRequest {
  name: string;
  branchId?: string;
  sectionId?: string;
  leadSourceId?: string;
}

export interface UpdateLeadFormRequest extends Partial<CreateLeadFormRequest> {
  id: string;
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

export interface CreateLeadFormFieldRequest {
  formId: string;
  type: LeadFormFieldType;
  question: string;
  required?: boolean;
  options?: string[];
}

export interface UpdateLeadFormFieldRequest {
  formId: string;
  fieldId: string;
  type?: LeadFormFieldType;
  question?: string;
  required?: boolean;
  options?: string[];
}

export interface DeleteLeadFormFieldResponse {
  success: boolean;
  message?: string;
}

export interface ReorderLeadFormFieldsRequest {
  formId: string;
  fieldIds: string[];
}

export interface ReorderLeadFormFieldsResponse {
  success: boolean;
  message?: string;
}
