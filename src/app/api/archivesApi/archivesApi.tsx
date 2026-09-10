import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { ArchivesRequest, ArchivesResponse } from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (leadsApi/
// roomsApi'dagi bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
};

export const archivesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allArchives: builder.query<ArchivesResponse, ArchivesRequest | void>({
      query: ({
        page = 1, limit = 10, search, status, branchId, role, reasonId, startDate, endDate,
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (branchId) params.set("branchId", branchId);
        if (role) params.set("role", role);
        if (reasonId) params.set("reasonId", reasonId);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return {
          url: `${PATHS.ARCHIVES}?${params.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: ArchivesResponse) => ({
        ...response,
        data: normalizeList<ArchivesResponse["data"][number]>(response.data),
      }),
      providesTags: ["archive"],
    }),
  }),
});

export const { useAllArchivesQuery } = archivesApi;
