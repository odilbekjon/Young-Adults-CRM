import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    LeadSectionsRequest,
    LeadSectionsResponse,
    LeadSectionDetailResponse,
    LeadSectionForEditResponse,
    CreateLeadSectionRequest,
    UpdateLeadSectionRequest,
    LeadSectionResponse,
    DeleteLeadSectionResponse,
    CreateGroupFromSectionRequest,
    CreateGroupFromSectionResponse,
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

export const leadSectionsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allLeadSections: builder.query<LeadSectionsResponse, LeadSectionsRequest | void>({
            query: ({ columnId } = {}) => ({
                url: columnId ? `${PATHS.LEAD_SECTIONS}?columnId=${columnId}` : PATHS.LEAD_SECTIONS,
                method: "GET",
            }),
            transformResponse: (response: LeadSectionsResponse) => ({
                ...response,
                data: normalizeList<LeadSectionsResponse["data"][number]>(response.data),
            }),
            providesTags: ["leadSection"],
        }),
        leadSectionById: builder.query<LeadSectionDetailResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_SECTIONS}/${id}`,
                method: "GET",
            }),
            providesTags: ["leadSection"],
        }),
        leadSectionForEdit: builder.query<LeadSectionForEditResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_SECTIONS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["leadSection"],
        }),
        createLeadSection: builder.mutation<LeadSectionResponse, CreateLeadSectionRequest>({
            query: (data) => ({
                url: PATHS.LEAD_SECTIONS,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadSection", "leadColumn"],
        }),
        createGroupFromSection: builder.mutation<CreateGroupFromSectionResponse, CreateGroupFromSectionRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEAD_SECTIONS}/${id}/create-group`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["leadSection", "leadColumn", "group"],
        }),
        updateLeadSection: builder.mutation<LeadSectionResponse, UpdateLeadSectionRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.LEAD_SECTIONS}/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["leadSection", "leadColumn"],
        }),
        deleteLeadSection: builder.mutation<DeleteLeadSectionResponse, string>({
            query: (id) => ({
                url: `${PATHS.LEAD_SECTIONS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["leadSection", "leadColumn"],
        }),
    })
})

export const {
    useAllLeadSectionsQuery,
    useLeadSectionByIdQuery,
    useLeadSectionForEditQuery,
    useCreateLeadSectionMutation,
    useCreateGroupFromSectionMutation,
    useUpdateLeadSectionMutation,
    useDeleteLeadSectionMutation,
} = leadSectionsApi;
