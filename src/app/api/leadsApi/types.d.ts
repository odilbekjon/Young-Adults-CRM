export type LeadStatus = "ACTIVE" | "IN_TRIAL" | "CONVERTED" | "CANCELLED";

export interface LeadSectionRef {
  id: string;
  name: string;
}

export interface LeadColumnRef {
  id: string;
  name: string;
}

export interface LeadSourceRef {
  id: string;
  name: string;
}

export interface LeadTrialGroupRef {
  id: string;
  name: string;
}

export interface LeadStudentRef {
  id: string;
  name: string;
}

// GET /leads/{id}'s description (Swagger) says the response includes the
// lead's source, its section+column, submitted form answers (extraData), the
// attached trial group and the resulting student account — but the exact
// nested shapes aren't shown beyond that description, so they're modeled
// defensively as {id,name} refs (same pattern as StudentGroupRef) and kept
// optional throughout.
export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  sectionId: string;
  columnId?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  birthdate?: string | null;
  courseId?: string | null;
  status?: LeadStatus | string;
  extraData?: Record<string, unknown> | null;
  section?: LeadSectionRef | null;
  column?: LeadColumnRef | null;
  source?: LeadSourceRef | null;
  trialGroup?: LeadTrialGroupRef | null;
  student?: LeadStudentRef | null;
  createdAt?: string;
  updatedAt?: string;
}

// GET /leads — confirmed via Swagger: page/limit + search (name or phone) +
// branchId/columnId/sectionId/sourceId/courseId/status/startDate/endDate.
export interface LeadsRequest {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  columnId?: string;
  sectionId?: string;
  sourceId?: string;
  courseId?: string;
  status?: LeadStatus | string;
  startDate?: string;
  endDate?: string;
}

export interface LeadsResponse {
  success: boolean;
  message: string;
  data: Lead[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LeadResponse {
  success: boolean;
  message?: string;
  data: Lead;
}

// GET /leads/{id}/for-edit — "tahrirlash modali uchun lidning barcha
// maydonlarini (ism, telefon, bo'lim, manba, kurs, izoh) qaytaradi" — same
// Lead shape as GET /leads/{id}.
export interface LeadForEditResponse {
  success: boolean;
  message?: string;
  data: Lead;
}

// POST /leads — confirmed via Swagger as multipart/form-data with this exact
// field set (name/phone/sectionId required, rest optional).
export interface CreateLeadRequest {
  name: string;
  phone: string;
  sectionId: string;
  sourceId?: string;
  notes?: string;
  birthdate?: string;
  courseId?: string;
  branchId?: string;
  extraData?: Record<string, unknown>;
}

// PATCH /leads/{id} — same field set as create (all optional) plus `status`;
// confirmed via Swagger as multipart/form-data too.
export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  id: string;
  status?: LeadStatus | string;
}

export interface DeleteLeadResponse {
  success: boolean;
  message?: string;
}

// POST /leads/{id}/add-to-trial — confirmed via Swagger as multipart/
// form-data; groupId required, trialDate/notes optional. Response is 201.
export interface AddLeadToTrialRequest {
  id: string;
  groupId: string;
  trialDate?: string;
  notes?: string;
}

export interface AddLeadToTrialResponse {
  success: boolean;
  message?: string;
}

// PATCH /leads/{id}/move-section — Kanban drag & drop. Confirmed via Swagger
// as multipart/form-data with a single required field named
// `targetSectionId` (not `sectionId`).
export interface MoveLeadSectionRequest {
  id: string;
  targetSectionId: string;
}

export interface MoveLeadSectionResponse {
  success: boolean;
  message?: string;
}
