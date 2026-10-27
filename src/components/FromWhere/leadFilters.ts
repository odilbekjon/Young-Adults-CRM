// Mirrors GET /leads' query params (search is matched against name or phone
// server-side); dates are plain YYYY-MM-DD.
export interface LeadFilters {
  search: string;
  sectionId: string;
  sourceId: string;
  courseId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_LEAD_FILTERS: LeadFilters = {
  search: "", sectionId: "", sourceId: "", courseId: "", status: "", startDate: "", endDate: "",
};

export const hasActiveLeadFilters = (filters: LeadFilters): boolean =>
  Object.values(filters).some((value) => value !== "");
