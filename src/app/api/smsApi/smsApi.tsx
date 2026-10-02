import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    AutoSmsSetting,
    AutoSmsSettingsRequest,
    UpdateAutoSmsSettingRequest,
    UpdateAutoSmsSettingResponse,
    SmsTemplate,
    SmsTemplateResponse,
    CreateSmsTemplateRequest,
    UpdateSmsTemplateRequest,
    DeleteSmsTemplateResponse,
    SendSmsToStudentsRequest,
    SendSmsToStudentsResponse,
    SendSmsToTeachersRequest,
    SendSmsToTeachersResponse,
    SmsHistoryRequest,
    SmsHistoryRow,
    SmsHistoryResult,
    SmsConfig,
} from "./types";

// SMS endpoints' response envelope isn't shown in Swagger beyond the status
// code (only request schemas were documented), so — unlike studentsApi/
// teachersApi/leadsApi, which can assume {success,message,data} because it's
// confirmed elsewhere in this same backend — this accepts a bare array too,
// and checks a few common wrapper key names (attendancesApi's
// normalizeRecords uses the same multi-key defensive approach for its own
// undocumented endpoint).
const LIST_KEYS = ["data", "items", "rows", "list", "results", "templates", "settings"];
const normalizeList = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === "object") {
        for (const key of LIST_KEYS) {
            const value = (raw as Record<string, unknown>)[key];
            if (Array.isArray(value)) return value as T[];
        }
    }
    return [];
};

type Row = Record<string, unknown>;

const text = (...candidates: unknown[]): string => {
    for (const v of candidates) {
        if (typeof v === "string" && v) return v;
        if (typeof v === "number") return String(v);
    }
    return "";
};

const numOr = (fallback: number, ...candidates: unknown[]): number => {
    for (const v of candidates) {
        const n = Number(v);
        if (v !== null && v !== "" && Number.isFinite(n) && n > 0) return n;
    }
    return fallback;
};

// GET /sms/history comes back as {success, message, data: {data: [...], total,
// ...}} — a list nested one level inside `data` — but a flat {data: [...]} or
// a bare array is accepted too.
const normalizeHistory = (raw: unknown, args: SmsHistoryRequest): SmsHistoryResult => {
    const top = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Row;
    const inner = top.data && typeof top.data === "object" && !Array.isArray(top.data) ? (top.data as Row) : null;
    const list: Row[] = Array.isArray(raw)
        ? (raw as Row[])
        : Array.isArray(inner?.data)
        ? (inner!.data as Row[])
        : Array.isArray(top.data)
        ? (top.data as Row[])
        : Array.isArray(inner?.items)
        ? (inner!.items as Row[])
        : [];
    const meta = (top.meta ?? inner?.meta ?? {}) as Row;
    const limit = numOr(args.limit ?? 10, meta.limit, inner?.limit, top.limit);
    const total = numOr(list.length, meta.total, inner?.total, top.total);
    const rows: SmsHistoryRow[] = list.map((r, i) => {
        const user = (r.user && typeof r.user === "object" ? r.user : {}) as Row;
        return {
            id: text(r.id) || String(i),
            phone: text(r.phone),
            message: text(r.message, r.text),
            status: text(r.status).toUpperCase(),
            providerError: text(r.providerError) || null,
            createdAt: text(r.createdAt),
            userName: text(user.name, r.userName),
            userRole: text(user.role, r.role).toUpperCase(),
        };
    });
    return {
        rows,
        meta: {
            total,
            page: numOr(args.page ?? 1, meta.page, inner?.page, top.page),
            limit,
            totalPages: numOr(Math.max(1, Math.ceil(total / Math.max(limit, 1))), meta.totalPages, inner?.totalPages, top.totalPages),
        },
    };
};

const normalizeConfig = (raw: unknown): SmsConfig => {
    const top = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Row;
    const obj = (top.data && typeof top.data === "object" && !Array.isArray(top.data) ? top.data : top) as Row;
    return { email: text(obj.email), password: text(obj.password), alias: text(obj.alias) };
};

export const smsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        autoSmsSettings: builder.query<AutoSmsSetting[], AutoSmsSettingsRequest>({
            query: ({ branchId }) => ({
                url: `${PATHS.AUTO_SETTINGS}?branchId=${encodeURIComponent(branchId)}`,
                method: "GET",
            }),
            // Confirmed live: a bare array of {id, type, isActive, template,
            // branchId, ...} rows (no {success,data} envelope).
            transformResponse: (response: unknown) => normalizeList<AutoSmsSetting>(response),
            providesTags: ["smsAutoSetting"],
        }),
        updateAutoSmsSetting: builder.mutation<UpdateAutoSmsSettingResponse, UpdateAutoSmsSettingRequest>({
            query: ({ type, ...data }) => ({
                url: `${PATHS.AUTO_SETTINGS}/${type}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["smsAutoSetting"],
        }),
        smsTemplates: builder.query<SmsTemplate[], void>({
            query: () => ({
                url: PATHS.TEMPLATES,
                method: "GET",
            }),
            // Confirmed live: a bare array (`[]` when there are none).
            transformResponse: (response: unknown) => normalizeList<SmsTemplate>(response),
            providesTags: ["smsTemplate"],
        }),
        smsTemplateById: builder.query<SmsTemplateResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEMPLATES}/${id}`,
                method: "GET",
            }),
            providesTags: ["smsTemplate"],
        }),
        createSmsTemplate: builder.mutation<SmsTemplateResponse, CreateSmsTemplateRequest>({
            query: (data) => ({
                url: PATHS.TEMPLATES,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["smsTemplate"],
        }),
        updateSmsTemplate: builder.mutation<SmsTemplateResponse, UpdateSmsTemplateRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.TEMPLATES}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["smsTemplate"],
        }),
        deleteSmsTemplate: builder.mutation<DeleteSmsTemplateResponse, string>({
            query: (id) => ({
                url: `${PATHS.TEMPLATES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["smsTemplate"],
        }),
        // POST /sms/send/students — used by both the per-student "Send SMS"
        // drawer (StudentProfile) and the per-group one (SmsDrawer,
        // SingleGroup), neither of which called any backend before this (the
        // group one just cleared its textarea and closed; the student one
        // only console.logged the message).
        sendSmsToStudents: builder.mutation<SendSmsToStudentsResponse, SendSmsToStudentsRequest>({
            query: (data) => ({
                url: PATHS.SEND_STUDENTS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["student", "smsHistory"],
        }),
        // POST /sms/send/teachers — same JSON body as the students one, with
        // `teacherIds`.
        sendSmsToTeachers: builder.mutation<SendSmsToTeachersResponse, SendSmsToTeachersRequest>({
            query: (data) => ({
                url: PATHS.SEND_TEACHERS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["smsHistory"],
        }),
        // GET /sms/history — sent-SMS log (Reports > Logs > SMS).
        smsHistory: builder.query<SmsHistoryResult, SmsHistoryRequest | void>({
            query: (args) => {
                const a = args ?? {};
                const qs = new URLSearchParams();
                if (a.search) qs.set("search", a.search);
                if (a.status) qs.set("status", a.status);
                if (a.role) qs.set("role", a.role);
                if (a.branchId) qs.set("branchId", a.branchId);
                qs.set("page", String(a.page ?? 1));
                qs.set("limit", String(a.limit ?? 10));
                return { url: `${PATHS.HISTORY}?${qs.toString()}`, method: "GET" };
            },
            transformResponse: (response: unknown, _meta, args) => normalizeHistory(response, args ?? {}),
            providesTags: ["smsHistory"],
        }),
        // GET/PUT /sms/config — Eskiz provider credentials ({email, password,
        // alias}); PUT is application/json.
        smsConfig: builder.query<SmsConfig, void>({
            query: () => ({ url: PATHS.CONFIG, method: "GET" }),
            transformResponse: (response: unknown) => normalizeConfig(response),
            providesTags: ["smsConfig"],
        }),
        updateSmsConfig: builder.mutation<unknown, SmsConfig>({
            query: (data) => ({ url: PATHS.CONFIG, method: "PUT", body: data }),
            invalidatesTags: ["smsConfig"],
        }),
    })
})

export const {
    useAutoSmsSettingsQuery,
    useUpdateAutoSmsSettingMutation,
    useSmsTemplatesQuery,
    useSmsTemplateByIdQuery,
    useCreateSmsTemplateMutation,
    useUpdateSmsTemplateMutation,
    useDeleteSmsTemplateMutation,
    useSendSmsToStudentsMutation,
    useSendSmsToTeachersMutation,
    useSmsHistoryQuery,
    useSmsConfigQuery,
    useUpdateSmsConfigMutation,
} = smsApi;
