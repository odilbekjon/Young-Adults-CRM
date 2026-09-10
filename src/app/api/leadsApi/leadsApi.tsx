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

// POST /leads, PATCH /leads/{id} — Swagger'da tasdiqlangan holda
// multipart/form-data (studentsApi/teachersApi'dagi bir xil naqsh).
// `extraData` obyekt bo'lgani uchun JSON string qilib yuboriladi.
const appendLeadFormData = (formData: FormData, data: Partial<CreateLeadRequest & { status?: string }>) => {
    const { extraData, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (extraData !== undefined && extraData !== null) formData.append("extraData", JSON.stringify(extraData));
};

export const leadsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeads: builder.query<LeadsResponse, LeadsRequest | void>({
            query: ({
                page = 1, limit = 10, search, branchId, columnId, sectionId, sourceId, courseId, status, startDate, endDate,
            } = {}) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                if (search) params.set("search", search);
                if (branchId) params.set("branchId", branchId);
                if (columnId) params.set("columnId", columnId);
                if (sectionId) params.set("sectionId", sectionId);
                if (sourceId) params.set("sourceId", sourceId);
                if (courseId) params.set("courseId", courseId);
                if (status) params.set("status", status);
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);
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
            query: (data) => {
                const formData = new FormData();
                appendLeadFormData(formData, data);
                return {
                    url: PATHS.LEADS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["lead", "leadColumn", "leadSection"],
        }),
        updateLead: builder.mutation<LeadResponse, UpdateLeadRequest>({
            query: ({ id, ...data }) => {
                const formData = new FormData();
                appendLeadFormData(formData, data);
                return {
                    url: `${PATHS.LEADS}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
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
            query: ({ id, groupId, trialDate, notes }) => {
                const formData = new FormData();
                formData.append("groupId", groupId);
                if (trialDate) formData.append("trialDate", trialDate);
                if (notes) formData.append("notes", notes);
                return {
                    url: `${PATHS.LEADS}/${id}/add-to-trial`,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["lead", "group"],
        }),
        moveLeadSection: builder.mutation<MoveLeadSectionResponse, MoveLeadSectionRequest>({
            query: ({ id, targetSectionId }) => {
                const formData = new FormData();
                formData.append("targetSectionId", targetSectionId);
                return {
                    url: `${PATHS.LEADS}/${id}/move-section`,
                    method: "PATCH",
                    body: formData,
                };
            },
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
