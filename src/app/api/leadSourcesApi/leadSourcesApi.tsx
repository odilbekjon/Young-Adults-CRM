import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadSourcesResponse,
    LeadSourceResponse,
    LeadSourceForEditResponse,
    CreateLeadSourceRequest,
    UpdateLeadSourceRequest,
    DeleteLeadSourceResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (leadColumnsApi/
// groupsApi'dagi bir xil naming'dagi helper bilan bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

export const leadSourcesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeadSources: builder.query<LeadSourcesResponse, void>({
            query: () => ({
                url: PATHS.LEAD_SOURCES,
                method: "GET",
            }),
            transformResponse: (response: LeadSourcesResponse) => ({
                ...response,
                data: normalizeList<LeadSourcesResponse["data"][number]>(response.data),
            }),
            providesTags: ["leadSource"],
        }),
        leadSourceForEdit: builder.query<LeadSourceForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_SOURCES}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["leadSource"],
        }),
        createLeadSource: builder.mutation<LeadSourceResponse, CreateLeadSourceRequest>({
            query: (data) => ({
                url: PATHS.LEAD_SOURCES,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadSource"],
        }),
        updateLeadSource: builder.mutation<LeadSourceResponse, UpdateLeadSourceRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEAD_SOURCES}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["leadSource"],
        }),
        deleteLeadSource: builder.mutation<DeleteLeadSourceResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_SOURCES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["leadSource"],
        }),
    })
})

export const {
    useAllLeadSourcesQuery,
    useLeadSourceForEditQuery,
    useCreateLeadSourceMutation,
    useUpdateLeadSourceMutation,
    useDeleteLeadSourceMutation,
} = leadSourcesApi;
