import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { GeneralSettings, GeneralSettingsRequest, UpdateGeneralSettingsRequest } from "./types";

// Swagger never expands GET /settings' response schema beyond "200", so both
// a flat object and a {data: {...}} envelope are accepted — same defensive
// approach as archivesApi/reportsApi in this project.
const normalizeSettings = (raw: unknown): GeneralSettings => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const obj = (container.data && typeof container.data === "object" ? container.data : container) as Record<string, unknown>;
    return {
        companyName: String(obj.companyName ?? ""),
        companyPhone: String(obj.companyPhone ?? ""),
        startTime: String(obj.startTime ?? ""),
        endTime: String(obj.endTime ?? ""),
        lessonStartStep: Boolean(obj.lessonStartStep),
        animation: Boolean(obj.animation),
        logoUrl: String(obj.logoUrl ?? ""),
        themeColor: String(obj.themeColor ?? ""),
        offerUrl: String(obj.offerUrl ?? ""),
    };
};

export const settingsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /settings — "Umumiy sozlamalarni olish (Redis orqali keshlangan)".
        // Confirmed live: requires a `branchId` query param naming one real,
        // specific branch — see GeneralSettingsRequest's doc comment.
        generalSettings: builder.query<GeneralSettings, GeneralSettingsRequest>({
            query: ({ branchId }) => ({
                url: `${PATHS.SETTINGS}?branchId=${encodeURIComponent(branchId)}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeSettings(response),
            providesTags: ["generalSettings"],
        }),
        // PUT /settings — "Umumiy sozlamalarni saqlash", application/json.
        updateGeneralSettings: builder.mutation<GeneralSettings, UpdateGeneralSettingsRequest>({
            query: ({ branchId, ...data }) => ({
                url: `${PATHS.SETTINGS}?branchId=${encodeURIComponent(branchId)}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: unknown) => normalizeSettings(response),
            invalidatesTags: ["generalSettings"],
        }),
    }),
});

export const {
    useGeneralSettingsQuery,
    useUpdateGeneralSettingsMutation,
} = settingsApi;
