import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    groupsRequest,
    groupsResponse,
    GroupResponse,
    GroupDetailResponse,
    CreateGroupRequest,
    UpdateGroupRequest,
    DeleteGroupResponse,
    AssignStudentsRequest,
    AssignStudentsResponse,
    RemoveStudentFromGroupRequest,
    RemoveStudentFromGroupResponse,
    TransferStudentRequest,
    TransferStudentResponse,
    GroupHistoryEntry,
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

const asString = (raw: unknown): string | null => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === "object") return String((raw as Record<string, unknown>).name ?? (raw as Record<string, unknown>).id ?? "") || null;
    return String(raw);
};

const asId = (raw: unknown): string | null => {
    if (raw && typeof raw === "object") return String((raw as Record<string, unknown>).id ?? "") || null;
    return raw === undefined || raw === null ? null : String(raw);
};

// Backend's exact envelope for GET /groups/{id}/history isn't documented
// beyond a 200 status, so we accept a bare array or a few likely wrappers
// and normalize field names defensively (same approach as attendancesApi).
const normalizeHistory = (raw: unknown): GroupHistoryEntry[] => {
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
        studentId: asId(r.studentId ?? r.student),
        studentName: asString(r.studentName ?? r.student),
        studentPhone: (r.studentPhone as string | undefined) ?? null,
        detail: String(r.detail ?? r.description ?? r.message ?? ""),
        createdAt: String(r.createdAt ?? r.timestamp ?? r.date ?? ""),
        actor: asString(r.modifiedBy ?? r.actor ?? r.createdBy ?? r.user),
    }));
};

const appendGroupFormData = (formData: FormData, data: Partial<CreateGroupRequest>) => {
    const { days, teacherIds, studentIds, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    days?.forEach((day) => formData.append("days", day));
    teacherIds?.forEach((id) => formData.append("teacherIds", id));
    studentIds?.forEach((id) => formData.append("studentIds", id));
};

export const groupsApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allGroups: builder.query<groupsResponse, groupsRequest>({
            query: ({ page = 1, limit = 10 } = {}) => ({
                url: `${PATHS.GROUPS}?page=${page}&limit=${limit}`,
                method: "GET",
            }),
            transformResponse: (response: groupsResponse) => ({
                ...response,
                data: normalizeList<groupsResponse["data"][number]>(response.data),
            }),
            providesTags: ["group"],
        }),
        groupById: builder.query<GroupDetailResponse, string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}`,
                method: "GET",
            }),
            providesTags: ["group"],
        }),
        createGroup: builder.mutation<GroupResponse, CreateGroupRequest>({
            query: (data) => {
                const formData = new FormData();
                appendGroupFormData(formData, data);
                return {
                    url: PATHS.GROUPS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["group"],
        }),
        updateGroup: builder.mutation<GroupResponse, UpdateGroupRequest>({
            query: ({ id, ...data }) => {
                const formData = new FormData();
                appendGroupFormData(formData, data);
                return {
                    url: `${PATHS.GROUPS}/${id}`,
                    method: "PUT",
                    body: formData,
                };
            },
            invalidatesTags: ["group"],
        }),
        deleteGroup: builder.mutation<DeleteGroupResponse, string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["group"],
        }),
        groupHistory: builder.query<GroupHistoryEntry[], string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}/history`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => {
                // TEMP DEBUG — remove once the real response shape is confirmed.
                if (import.meta.env.DEV) console.log("[groupsApi] history raw response:", response);
                return normalizeHistory(response?.data);
            },
            providesTags: ["group"],
        }),
        assignStudentsToGroup: builder.mutation<AssignStudentsResponse, AssignStudentsRequest>({
            query: ({ id, studentIds }) => ({
                url: `${PATHS.GROUPS}/${id}/students/assign`,
                method: "POST",
                body: { studentIds },
            }),
            invalidatesTags: ["group"],
        }),
        removeStudentFromGroup: builder.mutation<RemoveStudentFromGroupResponse, RemoveStudentFromGroupRequest>({
            query: ({ id, studentId }) => ({
                url: `${PATHS.GROUPS}/${id}/students/${studentId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["group"],
        }),
        transferStudent: builder.mutation<TransferStudentResponse, TransferStudentRequest>({
            query: ({ id, studentId, newGroupId, reason }) => ({
                url: `${PATHS.GROUPS}/${id}/students/transfer`,
                method: "POST",
                body: { studentId, newGroupId, reason },
            }),
            invalidatesTags: ["group"],
        }),
    })
})

export const {
    useAllGroupsQuery,
    useGroupByIdQuery,
    useCreateGroupMutation,
    useUpdateGroupMutation,
    useDeleteGroupMutation,
    useGroupHistoryQuery,
    useAssignStudentsToGroupMutation,
    useRemoveStudentFromGroupMutation,
    useTransferStudentMutation,
} = groupsApi;
