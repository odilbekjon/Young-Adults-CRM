import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadsRequest,
    LeadsResponse,
    LeadResponse,
    LeadForEditResponse,
    CreateLeadRequest,
    UpdateLeadRequest,
    DeleteLeadResponse,
    AddLeadToTrialRequest,
    AddLeadToTrialResponse,
    MoveLeadSectionRequest,
    MoveLeadSectionResponse,
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

export const leadsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeads: builder.query<LeadsResponse, LeadsRequest | void>({
            query: ({ page = 1, limit = 10, search, sectionId, columnId, leadSourceId } = {}) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                if (search) params.set("search", search);
                if (sectionId) params.set("sectionId", sectionId);
                if (columnId) params.set("columnId", columnId);
                if (leadSourceId) params.set("leadSourceId", leadSourceId);
                return {
                    url: `${PATHS.LEADS}?${params.toString()}`,
                    method: "GET",
                };
            },
            transformResponse: (response: LeadsResponse) => ({
                ...response,
                data: normalizeList<LeadsResponse["data"][number]>(response.data),
            }),
            providesTags: ["lead"],
        }),
        leadById: builder.query<LeadResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEADS}/${id}`,
                method: "GET",
            }),
            providesTags: ["lead"],
        }),
        leadForEdit: builder.query<LeadForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEADS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["lead"],
        }),
        createLead: builder.mutation<LeadResponse, CreateLeadRequest>({
            query: (data) => ({
                url: PATHS.LEADS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["lead", "leadColumn", "leadSection"],
        }),
        updateLead: builder.mutation<LeadResponse, UpdateLeadRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEADS}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["lead", "leadColumn"],
        }),
        deleteLead: builder.mutation<DeleteLeadResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEADS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["lead", "leadColumn", "leadSection"],
        }),
        addLeadToTrial: builder.mutation<AddLeadToTrialResponse, AddLeadToTrialRequest>({
            query: ({ id, groupId }) => ({
                url: `${PATHS.LEADS}/${id}/add-to-trial`,
                method: "POST",
                body: { groupId },
            }),
            invalidatesTags: ["lead", "group"],
        }),
        moveLeadSection: builder.mutation<MoveLeadSectionResponse, MoveLeadSectionRequest>({
            query: ({ id, sectionId }) => ({
                url: `${PATHS.LEADS}/${id}/move-section`,
                method: "PATCH",
                body: { sectionId },
            }),
            invalidatesTags: ["lead", "leadColumn", "leadSection"],
        }),
    })
})

export const {
    useAllLeadsQuery,
    useLeadByIdQuery,
    useLeadForEditQuery,
    useCreateLeadMutation,
    useUpdateLeadMutation,
    useDeleteLeadMutation,
    useAddLeadToTrialMutation,
    useMoveLeadSectionMutation,
} = leadsApi;
