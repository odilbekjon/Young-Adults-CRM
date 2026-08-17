export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  sectionId: string;
  columnId?: string | null;
  leadSourceId?: string | null;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Swagger only shows the endpoint list ("Kengaytirilgan filtrlar bilan" —
// with extended filters) without the exact query-param schema, so this is a
// defensible set derived from the resource's own foreign keys plus the
// page/limit + search convention already used by every other list endpoint
// in this codebase.
export interface LeadsRequest {
  page?: number;
  limit?: number;
  search?: string;
  sectionId?: string;
  columnId?: string;
  leadSourceId?: string;
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

// GET /leads/{id}/for-edit — response shape not documented beyond a 200
// status, so we expect the same Lead shape as GET /leads/{id}.
export interface LeadForEditResponse {
  success: boolean;
  message?: string;
  data: Lead;
}

export interface CreateLeadRequest {
  name: string;
  phone?: string;
  email?: string;
  sectionId: string;
  leadSourceId?: string;
  comment?: string;
}

export interface UpdateLeadRequest extends Partial<Omit<CreateLeadRequest, "sectionId">> {
  id: string;
}

export interface DeleteLeadResponse {
  success: boolean;
  message?: string;
}

// POST /leads/{id}/add-to-trial — "Lidni guruhga sinov darsiga biriktirish".
// Body schema not shown in Swagger; a target group id is the minimal
// information needed to attach the lead to a trial lesson.
export interface AddLeadToTrialRequest {
  id: string;
  groupId: string;
}

export interface AddLeadToTrialResponse {
  success: boolean;
  message?: string;
}

// PATCH /leads/{id}/move-section — Kanban drag & drop.
export interface MoveLeadSectionRequest {
  id: string;
  sectionId: string;
}

export interface MoveLeadSectionResponse {
  success: boolean;
  message?: string;
}
