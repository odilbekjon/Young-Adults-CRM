export interface LeadSource {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadSourcesResponse {
  success: boolean;
  message: string;
  data: LeadSource[];
}

export interface LeadSourceResponse {
  success: boolean;
  message?: string;
  data: LeadSource;
}

// GET /lead-sources/{id}/for-edit — response shape not documented beyond a
// 200 status, so we expect the same LeadSource shape.
export interface LeadSourceForEditResponse {
  success: boolean;
  message?: string;
  data: LeadSource;
}

export interface CreateLeadSourceRequest {
  name: string;
}

export interface UpdateLeadSourceRequest {
  id: string;
  name?: string;
}

export interface DeleteLeadSourceResponse {
  success: boolean;
  message?: string;
}
