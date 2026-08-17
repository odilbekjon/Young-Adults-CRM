import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadFormsResponse,
    LeadFormResponse,
    LeadFormDetailResponse,
    LeadFormForEditResponse,
    CreateLeadFormRequest,
    UpdateLeadFormRequest,
    DeleteLeadFormResponse,
    LeadFormFieldsResponse,
    LeadFormFieldResponse,
    CreateLeadFormFieldRequest,
    UpdateLeadFormFieldRequest,
    DeleteLeadFormFieldResponse,
    ReorderLeadFormFieldsRequest,
    ReorderLeadFormFieldsResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (leadsApi/
// groupsApi/teachersApi'dagi bir xil naming'dagi helper bilan bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

export const leadFormsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeadForms: builder.query<LeadFormsResponse, void>({
            query: () => ({
                url: PATHS.LEAD_FORMS,
                method: "GET",
            }),
            transformResponse: (response: LeadFormsResponse) => ({
                ...response,
                data: normalizeList<LeadFormsResponse["data"][number]>(response.data),
            }),
            providesTags: ["leadForm"],
        }),
        leadFormById: builder.query<LeadFormDetailResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_FORMS}/${id}`,
                method: "GET",
            }),
            providesTags: ["leadForm"],
        }),
        leadFormForEdit: builder.query<LeadFormForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_FORMS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["leadForm"],
        }),
        createLeadForm: builder.mutation<LeadFormResponse, CreateLeadFormRequest>({
            query: (data) => ({
                url: PATHS.LEAD_FORMS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadForm"],
        }),
        updateLeadForm: builder.mutation<LeadFormResponse, UpdateLeadFormRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEAD_FORMS}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["leadForm"],
        }),
        deleteLeadForm: builder.mutation<DeleteLeadFormResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_FORMS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["leadForm"],
        }),
        leadFormFields: builder.query<LeadFormFieldsResponse, string>({
            query: (formId) => ({
                url: `${PATHS.LEAD_FORMS}/${formId}/fields`,
                method: "GET",
            }),
            transformResponse: (response: LeadFormFieldsResponse) => ({
                ...response,
                data: normalizeList<LeadFormFieldsResponse["data"][number]>(response.data),
            }),
            providesTags: ["leadForm"],
        }),
        createLeadFormField: builder.mutation<LeadFormFieldResponse, CreateLeadFormFieldRequest>({
            query: ({ formId, ...data }) => ({
                url: `${PATHS.LEAD_FORMS}/${formId}/fields`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadForm"],
        }),
        updateLeadFormField: builder.mutation<LeadFormFieldResponse, UpdateLeadFormFieldRequest>({
            query: ({ formId, fieldId, ...data }) => ({
                url: `${PATHS.LEAD_FORMS}/${formId}/fields/${fieldId}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["leadForm"],
        }),
        reorderLeadFormFields: builder.mutation<ReorderLeadFormFieldsResponse, ReorderLeadFormFieldsRequest>({
            query: ({ formId, fieldIds }) => ({
                url: `${PATHS.LEAD_FORMS}/${formId}/fields/reorder`,
                method: "PATCH",
                body: { fieldIds },
            }),
            invalidatesTags: ["leadForm"],
        }),
        deleteLeadFormField: builder.mutation<DeleteLeadFormFieldResponse, { formId: string; fieldId: string }>({
            query: ({ formId, fieldId }) => ({
                url: `${PATHS.LEAD_FORMS}/${formId}/fields/${fieldId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["leadForm"],
        }),
    })
})

export const {
    useAllLeadFormsQuery,
    useLeadFormByIdQuery,
    useLeadFormForEditQuery,
    useCreateLeadFormMutation,
    useUpdateLeadFormMutation,
    useDeleteLeadFormMutation,
    useLeadFormFieldsQuery,
    useCreateLeadFormFieldMutation,
    useUpdateLeadFormFieldMutation,
    useReorderLeadFormFieldsMutation,
    useDeleteLeadFormFieldMutation,
} = leadFormsApi;
