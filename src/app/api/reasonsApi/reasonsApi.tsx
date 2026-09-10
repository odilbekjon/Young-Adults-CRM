import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    ReasonsRequest,
    ReasonsResponse,
    ReasonResponse,
    ReasonSelectOption,
    CreateReasonRequest,
    UpdateReasonRequest,
    DeleteReasonResponse,
    ToggleReasonStatusResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (archivesApi/
// leadSourcesApi'dagi bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

// Shared by GET /reasons and GET /reasons/select — both document the same
// search/status/page/limit query params.
const buildReasonsQueryString = (args: ReasonsRequest = {}): string => {
    const params = new URLSearchParams();
    if (args.search) params.set("search", args.search);
    if (args.status) params.set("status", args.status);
    if (args.page) params.set("page", String(args.page));
    if (args.limit) params.set("limit", String(args.limit));
    return params.toString();
};

export const reasonsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allReasons: builder.query<ReasonsResponse, ReasonsRequest | void>({
            query: (args) => ({
                url: `${PATHS.REASONS}?${buildReasonsQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: ReasonsResponse) => ({
                ...response,
                data: normalizeList<ReasonsResponse["data"][number]>(response?.data),
            }),
            providesTags: ["reason"],
        }),
        // GET /reasons/{id}/for-edit — used to prefill the edit form, kept as
        // its own endpoint since Swagger documents it separately.
        reasonForEdit: builder.query<ReasonResponse, string>({
            query: (id) => ({
                url: `${PATHS.REASONS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["reason"],
        }),
        // GET /reasons/select — active-reasons shortlist for dropdowns.
        reasonsSelect: builder.query<ReasonSelectOption[], ReasonsRequest | void>({
            query: (args) => ({
                url: `${PATHS.REASONS}/select?${buildReasonsQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) =>
                normalizeList<ReasonSelectOption>(response?.data),
            providesTags: ["reason"],
        }),
        // POST /reasons — Swagger: branchId is a required *query* parameter
        // (not part of the body), body is application/json. `type` is in the
        // documented body but has no value domain in Swagger, so it's only
        // sent when a caller actually supplies one — never defaulted to a
        // guessed value.
        createReason: builder.mutation<ReasonResponse, CreateReasonRequest>({
            query: ({ branchId, name, type }) => ({
                url: `${PATHS.REASONS}?branchId=${encodeURIComponent(branchId)}`,
                method: "POST",
                body: type === undefined ? { name } : { name, type },
            }),
            invalidatesTags: ["reason"],
        }),
        updateReason: builder.mutation<ReasonResponse, UpdateReasonRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.REASONS}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["reason"],
        }),
        // PATCH /reasons/{id}/toggle-status — flips ACTIVE <-> INACTIVE, no body.
        toggleReasonStatus: builder.mutation<ToggleReasonStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.REASONS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            invalidatesTags: ["reason"],
        }),
        deleteReason: builder.mutation<DeleteReasonResponse, string>({
            query: (id) => ({
                url: `${PATHS.REASONS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["reason"],
        }),
    }),
});

export const {
    useAllReasonsQuery,
    useLazyReasonForEditQuery,
    useReasonsSelectQuery,
    useCreateReasonMutation,
    useUpdateReasonMutation,
    useToggleReasonStatusMutation,
    useDeleteReasonMutation,
} = reasonsApi;
