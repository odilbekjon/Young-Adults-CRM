export interface LeadColumn {
  id: string;
  name: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadColumnsResponse {
  success: boolean;
  message: string;
  data: LeadColumn[];
}

export interface LeadColumnResponse {
  success: boolean;
  message?: string;
  data: LeadColumn;
}

// GET /lead-columns/{id}/for-edit — tahrirlash formasi uchun alohida endpoint;
// aniq javob strukturasi Swagger'da ochilmagan, shu sabab GET /lead-columns/{id}
// bilan bir xil LeadColumn shaklini kutamiz.
export interface LeadColumnForEditResponse {
  success: boolean;
  message?: string;
  data: LeadColumn;
}

export interface CreateLeadColumnRequest {
  name: string;
  order?: number;
}

export interface UpdateLeadColumnRequest extends Partial<CreateLeadColumnRequest> {
  id: string;
}

export interface DeleteLeadColumnResponse {
  success: boolean;
  message?: string;
}

// Backend's exact envelope for GET /lead-columns/kanban isn't documented
// beyond a 200 status, so this is our normalized shape (see normalizeKanban
// in leadsApi.tsx) rather than a literal mirror of the raw response.
export interface KanbanLead {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string | null;
}

export interface KanbanSection {
  id: string;
  name: string;
  leads: KanbanLead[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  sections: KanbanSection[];
}
