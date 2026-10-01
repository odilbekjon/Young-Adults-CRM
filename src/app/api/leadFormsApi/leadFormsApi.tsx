import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadForm,
    LeadFormsRequest,
    LeadFormsResponse,
    LeadFormResponse,
    LeadFormDetail,
    LeadFormDetailResponse,
    LeadFormForEditResponse,
    LeadFormField,
    LeadFormSelectOption,
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
    ToggleLeadFormStatusResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz.
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

// Options may arrive as plain strings or as {label|value|name} objects.
const normalizeOptions = (raw: unknown): string[] =>
    (Array.isArray(raw) ? raw : []).map((o) => {
        if (typeof o === "string") return o;
        const obj = (o ?? {}) as Record<string, unknown>;
        return String(obj.label ?? obj.value ?? obj.name ?? "");
    });

const normalizeField = (raw: unknown, i = 0): LeadFormField => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        id: String(r.id ?? r._id ?? i),
        formId: str(r.formId) ?? undefined,
        label: String(r.label ?? r.question ?? ""),
        type: String(r.type ?? "TEXT").toUpperCase(),
        placeholder: str(r.placeholder),
        options: normalizeOptions(r.options),
        isRequired: Boolean(r.isRequired ?? r.required ?? false),
        order: num(r.order ?? i),
        mapsTo: str(r.mapsTo),
    };
};

const normalizeForm = (raw: unknown): LeadForm => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const title = String(r.title ?? r.name ?? "");
    return {
        id: String(r.id ?? r._id ?? ""),
        title,
        name: title,
        description: str(r.description),
        slug: str(r.slug),
        type: String(r.type ?? "PUBLIC_LEAD"),
        targetAudience: str(r.targetAudience),
        branchId: str(r.branchId) ?? str((r.branch as Record<string, unknown> | undefined)?.id),
        sourceId: str(r.sourceId) ?? str((r.source as Record<string, unknown> | undefined)?.id),
        successMessage: str(r.successMessage),
        status: String(r.status ?? "ACTIVE"),
        viewsCount: num(r.viewsCount),
        submissionsCount: num(r.submissionsCount),
        createdAt: str(r.createdAt) ?? undefined,
        updatedAt: str(r.updatedAt) ?? undefined,
    };
};

const normalizeDetail = (raw: unknown): LeadFormDetail => {
    const fields = normalizeList<unknown>((raw as { fields?: unknown } | null)?.fields)
        .map(normalizeField)
        .sort((a, b) => a.order - b.order);
    return { ...normalizeForm(raw), fields };
};

export const leadFormsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /lead-forms — optional branchId / type query params; the active
        // branch also travels in the x-branch-id header.
        allLeadForms: builder.query<LeadFormsResponse, LeadFormsRequest | void>({
            query: (args) => {
                const params = new URLSearchParams();
                if (args?.branchId) params.set("branchId", args.branchId);
                if (args?.type) params.set("type", args.type);
                const qs = params.toString();
                return { url: qs ? `${PATHS.LEAD_FORMS}?${qs}` : PATHS.LEAD_FORMS, method: "GET" };
            },
            transformResponse: (response: LeadFormsResponse) => ({
                ...response,
                data: normalizeList<unknown>(response.data).map(normalizeForm),
            }),
            providesTags: ["leadForm"],
        }),
        // GET /lead-forms/select — "Formalarni tanlash uchun olish".
        leadFormsSelect: builder.query<LeadFormSelectOption[], void>({
            query: () => ({ url: `${PATHS.LEAD_FORMS}/select`, method: "GET" }),
            transformResponse: (response: { data: unknown }) =>
                normalizeList<Record<string, unknown>>(response?.data).map((r) => ({
                    id: String(r.id ?? ""),
                    name: String(r.title ?? r.name ?? ""),
                })),
            providesTags: ["leadForm"],
        }),
        leadFormById: builder.query<LeadFormDetailResponse, string>({
            query: (id) => ({ url: `${PATHS.LEAD_FORMS}/${id}`, method: "GET" }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeDetail(response.data),
            }),
            providesTags: ["leadForm"],
        }),
        leadFormForEdit: builder.query<LeadFormForEditResponse, string>({
            query: (id) => ({ url: `${PATHS.LEAD_FORMS}/${id}/for-edit`, method: "GET" }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeDetail(response.data),
            }),
            providesTags: ["leadForm"],
        }),
        createLeadForm: builder.mutation<LeadFormResponse, CreateLeadFormRequest>({
            query: (data) => ({ url: PATHS.LEAD_FORMS, method: "POST", body: data }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeForm(response.data),
            }),
            invalidatesTags: ["leadForm"],
        }),
        updateLeadForm: builder.mutation<LeadFormResponse, UpdateLeadFormRequest>({
            query: ({ id, ...data }) => ({ url: `${PATHS.LEAD_FORMS}/${id}`, method: "PATCH", body: data }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeForm(response.data),
            }),
            invalidatesTags: ["leadForm"],
        }),
        // PATCH /lead-forms/{id}/toggle-status — "Forma holatini o'zgartirish".
        toggleLeadFormStatus: builder.mutation<ToggleLeadFormStatusResponse, string>({
            query: (id) => ({ url: `${PATHS.LEAD_FORMS}/${id}/toggle-status`, method: "PATCH" }),
            invalidatesTags: ["leadForm"],
        }),
        deleteLeadForm: builder.mutation<DeleteLeadFormResponse, string>({
            query: (id) => ({ url: `${PATHS.LEAD_FORMS}/${id}`, method: "DELETE" }),
            invalidatesTags: ["leadForm"],
        }),
        leadFormFields: builder.query<LeadFormFieldsResponse, string>({
            query: (formId) => ({ url: `${PATHS.LEAD_FORMS}/${formId}/fields`, method: "GET" }),
            transformResponse: (response: LeadFormFieldsResponse) => ({
                ...response,
                data: normalizeList<unknown>(response.data).map(normalizeField).sort((a, b) => a.order - b.order),
            }),
            providesTags: ["leadForm"],
        }),
        createLeadFormField: builder.mutation<LeadFormFieldResponse, CreateLeadFormFieldRequest>({
            query: ({ formId, ...data }) => ({ url: `${PATHS.LEAD_FORMS}/${formId}/fields`, method: "POST", body: data }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeField(response.data),
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
    useLeadFormsSelectQuery,
    useLeadFormByIdQuery,
    useLeadFormForEditQuery,
    useCreateLeadFormMutation,
    useUpdateLeadFormMutation,
    useToggleLeadFormStatusMutation,
    useDeleteLeadFormMutation,
    useLeadFormFieldsQuery,
    useCreateLeadFormFieldMutation,
    useUpdateLeadFormFieldMutation,
    useReorderLeadFormFieldsMutation,
    useDeleteLeadFormFieldMutation,
} = leadFormsApi;
