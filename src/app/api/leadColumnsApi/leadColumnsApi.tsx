import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadColumnsResponse,
    LeadColumnResponse,
    LeadColumnForEditResponse,
    CreateLeadColumnRequest,
    UpdateLeadColumnRequest,
    DeleteLeadColumnResponse,
    KanbanColumn,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (groupsApi/
// teachersApi'dagi bir xil naming'dagi helper bilan bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

const asString = (raw: unknown): string => {
    if (raw === undefined || raw === null) return "";
    if (typeof raw === "object") return String((raw as Record<string, unknown>).name ?? (raw as Record<string, unknown>).id ?? "");
    return String(raw);
};

// Backend's exact envelope for GET /lead-columns/kanban isn't documented
// beyond a 200 status — the description only says it returns a
// Column -> Section -> Lead hierarchy — so we accept a few likely field-name
// variants at each level and normalize defensively (same approach as
// groupsApi's normalizeHistory / teachersApi's normalizeHistory).
const normalizeKanban = (raw: unknown): KanbanColumn[] => {
    const columnsRaw = normalizeList<Record<string, unknown>>(raw);

    const readLeads = (section: Record<string, unknown>): Record<string, unknown>[] => {
        const leads = section.leads ?? section.cards ?? section.items;
        return Array.isArray(leads) ? (leads as Record<string, unknown>[]) : [];
    };
    const readSections = (column: Record<string, unknown>): Record<string, unknown>[] => {
        const sections = column.sections ?? column.divisions ?? column.groups;
        return Array.isArray(sections) ? (sections as Record<string, unknown>[]) : [];
    };

    return columnsRaw.map((column, ci) => ({
        id: String(column.id ?? ci),
        name: asString(column.name ?? column.title) || String(column.id ?? ""),
        sections: readSections(column).map((section, si) => ({
            id: String(section.id ?? si),
            name: asString(section.name ?? section.title) || String(section.id ?? ""),
            leads: readLeads(section).map((lead, li) => ({
                id: String(lead.id ?? li),
                name: asString(lead.name ?? lead.fullName) || "—",
                phone: (lead.phone as string | undefined) ?? (lead.phoneNumber as string | undefined) ?? null,
                createdAt: (lead.createdAt as string | undefined) ?? (lead.date as string | undefined) ?? null,
            })),
        })),
    }));
};

export const leadColumnsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeadColumns: builder.query<LeadColumnsResponse, void>({
            query: () => ({
                url: PATHS.LEAD_COLUMNS,
                method: "GET",
            }),
            transformResponse: (response: LeadColumnsResponse) => ({
                ...response,
                data: normalizeList<LeadColumnsResponse["data"][number]>(response.data),
            }),
            providesTags: ["leadColumn"],
        }),
        leadColumnById: builder.query<LeadColumnResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_COLUMNS}/${id}`,
                method: "GET",
            }),
            providesTags: ["leadColumn"],
        }),
        leadColumnForEdit: builder.query<LeadColumnForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_COLUMNS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["leadColumn"],
        }),
        leadsKanban: builder.query<KanbanColumn[], void>({
            query: () => ({
                url: `${PATHS.LEAD_COLUMNS}/kanban`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeKanban(response?.data),
            providesTags: ["leadColumn"],
        }),
        createLeadColumn: builder.mutation<LeadColumnResponse, CreateLeadColumnRequest>({
            query: (data) => ({
                url: PATHS.LEAD_COLUMNS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadColumn"],
        }),
        updateLeadColumn: builder.mutation<LeadColumnResponse, UpdateLeadColumnRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEAD_COLUMNS}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["leadColumn"],
        }),
        deleteLeadColumn: builder.mutation<DeleteLeadColumnResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_COLUMNS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["leadColumn"],
        }),
    })
})

export const {
    useAllLeadColumnsQuery,
    useLeadColumnByIdQuery,
    useLeadColumnForEditQuery,
    useLeadsKanbanQuery,
    useCreateLeadColumnMutation,
    useUpdateLeadColumnMutation,
    useDeleteLeadColumnMutation,
} = leadColumnsApi;
