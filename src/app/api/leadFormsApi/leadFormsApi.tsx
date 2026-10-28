import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadForm,
    LeadFormsRequest,
    LeadFormsResponse,
    LeadFormResponse,
    LeadFormDetail,
    LeadFormDetailResponse,
    LeadFormField,
    LeadFormRef,
    LeadFormsMeta,
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

// The embedded {id, name} objects of a form row (`branch`, `source`).
const normalizeRef = (raw: unknown): LeadFormRef | null => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const id = str(r.id);
    return id ? { id, name: String(r.name ?? "") } : null;
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
        viewCount: num(r.viewCount),
        submissionCount: num(r.submissionCount),
        branch: normalizeRef(r.branch),
        source: normalizeRef(r.source),
        fieldsCount: num((r._count as Record<string, unknown> | undefined)?.fields),
        createdAt: str(r.createdAt) ?? undefined,
        updatedAt: str(r.updatedAt) ?? undefined,
    };
};

// GET /lead-forms paginates (page/limit query params); when the backend leaves
// out a meta value it is derived from the rows and the requested limit.
const normalizeMeta = (raw: unknown, rows: number, limit: number): LeadFormsMeta => {
    const m = (raw ?? {}) as Record<string, unknown>;
    const total = Number(m.total) || rows;
    return {
        total,
        page: Number(m.page) || 1,
        limit: Number(m.limit) || limit,
        totalPages: Number(m.totalPages) || Math.max(1, Math.ceil(total / limit)),
    };
};

// GET /lead-forms and GET /lead-forms/select share the same filters.
const listUrl = (path: string, args?: LeadFormsRequest | void): string => {
    const params = new URLSearchParams();
    if (args?.search) params.set("search", args.search);
    if (args?.status) params.set("status", args.status);
    if (args?.page) params.set("page", String(args.page));
    if (args?.limit) params.set("limit", String(args.limit));
    if (args?.branchId) params.set("branchId", args.branchId);
    if (args?.type) params.set("type", args.type);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
};

const normalizeDetail = (raw: unknown): LeadFormDetail => {
    const fields = normalizeList<unknown>((raw as { fields?: unknown } | null)?.fields)
        .map(normalizeField)
        .sort((a, b) => a.order - b.order);
    return { ...normalizeForm(raw), fields };
};

export const leadFormsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /lead-forms — search / status / type / branchId filters with
        // page + limit; the active branch also travels in the x-branch-id header.
        allLeadForms: builder.query<LeadFormsResponse, LeadFormsRequest | void>({
            query: (args) => ({ url: listUrl(PATHS.LEAD_FORMS, args), method: "GET" }),
            transformResponse: (response: LeadFormsResponse, _meta, args) => {
                const rows = normalizeList<unknown>(response.data).map(normalizeForm);
                return { ...response, data: rows, meta: normalizeMeta(response.meta, rows.length, args?.limit ?? 10) };
            },
            providesTags: ["leadForm"],
        }),
        // GET /lead-forms/select — "Formalarni tanlash uchun olish", same filters.
        leadFormsSelect: builder.query<LeadFormSelectOption[], LeadFormsRequest | void>({
            query: (args) => ({ url: listUrl(`${PATHS.LEAD_FORMS}/select`, args), method: "GET" }),
            transformResponse: (response: { data: unknown }) =>
                normalizeList<Record<string, unknown>>(response?.data).map((r) => ({
                    id: String(r.id ?? ""),
                    name: String(r.title ?? r.name ?? ""),
                })),
            providesTags: ["leadForm"],
        }),
        // GET /lead-forms/{id} — the form with its fields (the editor's source).
        leadFormById: builder.query<LeadFormDetailResponse, string>({
            query: (id) => ({ url: `${PATHS.LEAD_FORMS}/${id}`, method: "GET" }),
            transformResponse: (response: { success: boolean; message?: string; data: unknown }) => ({
                ...response,
                data: normalizeDetail(response.data),
            }),
            providesTags: ["leadForm"],
        }),
        // The form is created in the branch picked in the editor, which can
        // differ from the header's (or be "All branches"), so that branch is
        // also sent as x-branch-id — same as POST /courses.
        createLeadForm: builder.mutation<LeadFormResponse, CreateLeadFormRequest>({
            query: (data) => ({
                url: PATHS.LEAD_FORMS,
                method: "POST",
                body: data,
                headers: data.branchId ? { "x-branch-id": data.branchId } : undefined,
            }),
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
