export interface LeadSection {
  id: string;
  name: string;
  columnId: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadSectionsRequest {
  columnId?: string;
}

export interface LeadSectionsResponse {
  success: boolean;
  message: string;
  data: LeadSection[];
}

// Lightweight local ref rather than importing the full Lead type from
// leadsApi, matching the codebase convention of each API module defining its
// own reference shapes (e.g. GroupPersonRef in groupsApi) instead of cross-
// module type imports.
export interface SectionLeadRef {
  id: string;
  name: string;
  phone: string | null;
}

// GET /lead-sections/{id} — "bo'lim va uning ichidagi barcha lidlar"
export interface LeadSectionDetail extends LeadSection {
  leads: SectionLeadRef[];
}

export interface LeadSectionDetailResponse {
  success: boolean;
  message?: string;
  data: LeadSectionDetail;
}

// GET /lead-sections/{id}/for-edit — response shape not documented beyond a
// 200 status, so we expect the same LeadSection shape.
export interface LeadSectionForEditResponse {
  success: boolean;
  message?: string;
  data: LeadSection;
}

export interface CreateLeadSectionRequest {
  columnId: string;
  name: string;
  order?: number;
}

export interface UpdateLeadSectionRequest extends Partial<Omit<CreateLeadSectionRequest, "columnId">> {
  id: string;
}

export interface LeadSectionResponse {
  success: boolean;
  message?: string;
  data: LeadSection;
}

export interface DeleteLeadSectionResponse {
  success: boolean;
  message?: string;
}

// POST /lead-sections/{id}/create-group — "Bo'limdagi lidlar asosida yangi
// guruh ochish (SET -> Group)". No request/response body schema was shown in
// the Swagger screenshots, so this is a minimal, defensible shape: the
// section id identifies which leads to convert, with an optional name
// override for the new group.
export interface CreateGroupFromSectionRequest {
  id: string;
  name?: string;
}

export interface CreateGroupFromSectionResponse {
  success: boolean;
  message?: string;
  data?: { groupId: string };
}
