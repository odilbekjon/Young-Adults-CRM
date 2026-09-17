import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    teachersRequest,
    teachersResponse,
    teacherByIdResponse,
    teacherForEditResponse,
    CreateTeacherRequest,
    UpdateTeacherRequest,
    TeacherResponse,
    DeleteTeacherResponse,
    ToggleTeacherStatusResponse,
    TeacherHistoryEntry,
    TeacherSelectOption,
    TeachersSelectRequest,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (coursesApi/
// roomsApi/groupsApi'dagi bir xil naming'dagi helper bilan bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

const asString = (raw: unknown): string | null => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === "object") return String((raw as Record<string, unknown>).name ?? (raw as Record<string, unknown>).id ?? "") || null;
    return String(raw);
};

// Backend's exact envelope for GET /teachers/{id}/history isn't documented
// beyond a 200 status, so we accept a bare array or a few likely wrappers
// and normalize field names defensively (same approach as groupsApi's
// normalizeHistory).
const normalizeHistory = (raw: unknown): TeacherHistoryEntry[] => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.history)
        ? container.history
        : Array.isArray(container.events)
        ? container.events
        : Array.isArray(container.logs)
        ? container.logs
        : Array.isArray(container.data)
        ? container.data
        : [];

    return (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        type: String(r.type ?? r.action ?? r.event ?? "").toUpperCase(),
        detail: String(r.detail ?? r.description ?? r.message ?? ""),
        createdAt: String(r.createdAt ?? r.timestamp ?? r.date ?? ""),
        actor: asString(r.modifiedBy ?? r.actor ?? r.createdBy ?? r.user),
    }));
};

const appendTeacherFormData = (formData: FormData, data: Partial<CreateTeacherRequest>) => {
    const { branchIds, photo, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (photo) formData.append("photo", photo);
    branchIds?.forEach((id) => formData.append("branchIds", id));
};

export const teachersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allTeachers: builder.query<teachersResponse, teachersRequest | void>({
            query: ({ page = 1, limit = 10, search, status, branchId } = {}) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                if (search) params.set("search", search);
                if (status) params.set("status", status);
                if (branchId) params.set("branchId", branchId);
                return {
                    url: `${PATHS.TEACHERS}?${params.toString()}`,
                    method: "GET",
                };
            },
            transformResponse: (response: teachersResponse) => ({
                ...response,
                data: normalizeList<teachersResponse["data"][number]>(response.data),
            }),
            providesTags: ["teacher"],
        }),
        // GET /teachers/select — used specifically by the group create/edit
        // form's teacher picker (see groupsApi's groupsSelect for the same
        // pattern). branchId is required by Swagger; callers pass the
        // selected branch id, or "all" when no specific branch is active.
        teachersSelect: builder.query<TeacherSelectOption[], TeachersSelectRequest>({
            query: ({ branchId }) => ({
                url: `${PATHS.TEACHERS}/select?branchId=${encodeURIComponent(branchId)}`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeList<TeacherSelectOption>(response?.data),
            providesTags: ["teacher"],
        }),
        teacherById: builder.query<teacherByIdResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEACHERS}/${id}`,
                method: "GET",
            }),
            providesTags: ["teacher"],
        }),
        teacherForEdit: builder.query<teacherForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEACHERS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["teacher"],
        }),
        // GET /teachers/excel — downloads the (optionally filtered) teachers
        // list as a file. Same lazy-Blob approach as financeApi's
        // debtors/expenses/payments/withdrawals excel and groupsApi's
        // groupsExcel — query params confirmed against Swagger (search,
        // status, page, limit, branchId), same set allTeachers already sends.
        teachersExcel: builder.query<Blob, teachersRequest | void>({
            query: ({ page, limit, search, status, branchId } = {}) => {
                const params = new URLSearchParams();
                if (page) params.set("page", String(page));
                if (limit) params.set("limit", String(limit));
                if (search) params.set("search", search);
                if (status) params.set("status", status);
                if (branchId) params.set("branchId", branchId);
                return {
                    url: `${PATHS.TEACHERS}/excel?${params.toString()}`,
                    method: "GET",
                    responseHandler: (response) => response.blob(),
                };
            },
        }),
        teacherHistory: builder.query<TeacherHistoryEntry[], string>({
            query: (id) => ({
                url: `${PATHS.TEACHERS}/${id}/history`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeHistory(response?.data),
            providesTags: ["teacher"],
        }),
        createTeacher: builder.mutation<TeacherResponse, CreateTeacherRequest>({
            query: (data) => {
                const formData = new FormData();
                appendTeacherFormData(formData, data);
                return {
                    url: PATHS.TEACHERS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["teacher"],
        }),
        updateTeacher: builder.mutation<TeacherResponse, UpdateTeacherRequest>({
            query: ({ id, ...data }) => {
                const formData = new FormData();
                appendTeacherFormData(formData, data);
                return {
                    url: `${PATHS.TEACHERS}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["teacher"],
        }),
        toggleTeacherStatus: builder.mutation<ToggleTeacherStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEACHERS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            // Flipping status moves the teacher between the Teachers list and
            // the Archive page — both must refetch, not just "teacher".
            invalidatesTags: ["teacher", "archive"],
        }),
        deleteTeacher: builder.mutation<DeleteTeacherResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEACHERS}/${id}`,
                method: "DELETE",
            }),
            // Also drops the teacher out of the Archive page (GET /archives)
            // whenever a permanent delete is issued directly from there.
            invalidatesTags: ["teacher", "archive"],
        }),
    })
})

export const {
    useAllTeachersQuery,
    useTeachersSelectQuery,
    useTeacherByIdQuery,
    useTeacherForEditQuery,
    useLazyTeachersExcelQuery,
    useTeacherHistoryQuery,
    useCreateTeacherMutation,
    useUpdateTeacherMutation,
    useToggleTeacherStatusMutation,
    useDeleteTeacherMutation,
} = teachersApi;
