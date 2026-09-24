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

export const smsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        autoSmsSettings: builder.query<AutoSmsSetting[], AutoSmsSettingsRequest>({
            query: ({ branchId }) => ({
                url: `${PATHS.AUTO_SETTINGS}?branchId=${encodeURIComponent(branchId)}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => {
                // TEMP DEBUG — remove once the real response shape is confirmed.
                if (import.meta.env.DEV) console.log("[smsApi] auto-settings raw response:", response);
                return normalizeList<AutoSmsSetting>(response);
            },
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
            transformResponse: (response: unknown) => {
                // TEMP DEBUG — remove once the real response shape is confirmed.
                if (import.meta.env.DEV) console.log("[smsApi] templates raw response:", response);
                return normalizeList<SmsTemplate>(response);
            },
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
            transformResponse: (response: SmsTemplateResponse) => {
                // TEMP DEBUG — remove once the real response shape is confirmed.
                if (import.meta.env.DEV) console.log("[smsApi] create template raw response:", response);
                return response;
            },
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
            invalidatesTags: ["student"],
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
} = smsApi;
