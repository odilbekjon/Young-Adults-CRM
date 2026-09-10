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
    GroupComment,
    AssignTeachersRequest,
    AssignTeachersResponse,
    RemoveTeacherFromGroupRequest,
    RemoveTeacherFromGroupResponse,
    UpdateGroupStatusRequest,
    UpdateGroupStatusResponse,
    ToggleGroupStatusResponse,
    AddStudentToGroupRequest,
    AddStudentToGroupResponse,
    GroupSelectOption,
    GroupsExcelQueryArgs,
    StudentGroupRecord,
    StudentGroupsRequest,
    StudentGroupsResult,
    FreezeStudentGroupRequest,
    StudentGroupActionResponse,
    UpdateStudentGroupRequest,
    UpdateStudentGroupStatusRequest,
} from "./types";

// Swagger (POST /api/v1/groups) declares the request body as multipart/
// form-data explicitly — this is the only content type the endpoint
// accepts, so a JSON body is rejected outright.
//
// Array fields (days, teacherIds, studentIds) were originally sent as
// repeated same-name parts with no bracket suffix (the plain OpenAPI 3
// "explode" convention). Confirmed against the live API: with exactly one
// item selected, that encoding arrives server-side as a bare scalar string
// instead of a one-element array, and class-validator's @IsArray() rejects
// it with "teacherIds must be an array" (400). The bracket suffix below is
// the standard fix for multer/append-field-based multipart parsers — it
// forces array parsing on the backend regardless of item count, while the
// base field name (teacherIds) is unaffected since brackets are stripped
// during parsing.
const appendGroupFormData = (formData: FormData, data: Partial<CreateGroupRequest>) => {
    const { days, teacherIds, studentIds, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
    });
    days?.forEach((day) => formData.append("days[]", day));
    teacherIds?.forEach((id) => formData.append("teacherIds[]", id));
    studentIds?.forEach((id) => formData.append("studentIds[]", id));
};

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

// Backend's exact envelope for GET /groups/{id}/comments isn't documented
// beyond a 200 status, so we accept a bare array or a few likely wrappers
// and normalize field names defensively (same approach as normalizeHistory).
const normalizeComments = (raw: unknown): GroupComment[] => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.comments)
        ? container.comments
        : Array.isArray(container.data)
        ? container.data
        : [];

    return (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        text: String(r.text ?? r.message ?? r.comment ?? r.content ?? ""),
        author: asString(r.author ?? r.createdBy ?? r.user ?? r.modifiedBy),
        createdAt: String(r.createdAt ?? r.timestamp ?? r.date ?? ""),
    }));
};

const asStatus = (v: unknown): string => String(v ?? "").toUpperCase();

// GET /student-groups' envelope isn't documented beyond "200" (same
// situation as groupHistory/groupComments above), so each row is normalized
// defensively — a nested student/group object is accepted alongside flat
// studentId/studentName/groupId/groupName fields.
const normalizeStudentGroupRecord = (r: Record<string, unknown>, i: number): StudentGroupRecord => {
    const student = (r.student ?? {}) as Record<string, unknown>;
    const group = (r.group ?? {}) as Record<string, unknown>;
    return {
        id: String(r.id ?? r._id ?? i),
        studentId: String(r.studentId ?? student.id ?? ""),
        studentName: String(r.studentName ?? student.name ?? ""),
        studentPhone: String(r.studentPhone ?? student.phone ?? ""),
        groupId: String(r.groupId ?? group.id ?? ""),
        groupName: String(r.groupName ?? group.name ?? ""),
        status: asStatus(r.status),
        joinedAt: (r.joinedAt as string | undefined) ?? null,
        exitedAt: (r.exitedAt as string | undefined) ?? null,
        paymentStartDate: (r.paymentStartDate as string | undefined) ?? null,
        customPrice: typeof r.customPrice === "number" ? r.customPrice : null,
        discountReason: (r.discountReason as string | undefined) ?? null,
        createdAt: (r.createdAt as string | undefined) ?? null,
        updatedAt: (r.updatedAt as string | undefined) ?? null,
        reason: asString(r.reason ?? r.reasonName),
        reasonId: asId(r.reasonId ?? r.reason),
        comment: (r.comment as string | undefined) ?? (r.note as string | undefined) ?? null,
        processedBy: asString(r.processedBy ?? r.modifiedBy ?? r.updatedBy ?? r.staff ?? r.actor),
    };
};

const pickStudentGroupRow = (raw: unknown): Record<string, unknown> => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const container = raw as Record<string, unknown>;
    const nested = container.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
    return container;
};

const normalizeStudentGroupsList = (raw: unknown): StudentGroupsResult => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.data)
        ? container.data
        : Array.isArray(container.rows)
        ? container.rows
        : [];
    const rows = (list as Record<string, unknown>[]).map(normalizeStudentGroupRecord);
    const meta = (container.meta ?? {}) as Record<string, unknown>;
    const total = Number(meta.total ?? meta.totalItems) || rows.length;
    const limit = Number(meta.limit) || rows.length || 10;
    return {
        rows,
        meta: {
            total,
            page: Number(meta.page) || 1,
            limit,
            totalPages: Number(meta.totalPages) || Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
    };
};

const buildStudentGroupsQueryString = (args: StudentGroupsRequest = {}): string => {
    const qs = new URLSearchParams();
    if (args.branchId) qs.set("branchId", args.branchId);
    if (args.groupId) qs.set("groupId", args.groupId);
    if (args.studentId) qs.set("studentId", args.studentId);
    if (args.status) qs.set("status", args.status);
    if (args.search) qs.set("search", args.search);
    qs.set("page", String(args.page ?? 1));
    qs.set("limit", String(args.limit ?? 10));
    return qs.toString();
};

// Swagger: POST .../freeze, PATCH /student-groups/{id} and PATCH
// .../status all declare multipart/form-data bodies (same convention as
// appendGroupFormData above, minus the array-field handling this resource
// doesn't need).
const appendStudentGroupFormData = (data: Record<string, string | number | boolean | undefined>): FormData => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") formData.append(key, String(value));
    });
    return formData;
};

// GET /groups/excel query string — only appends filters that are actually
// set, same convention as the analogous *Excel endpoints in financeApi.
const buildGroupsExcelQueryString = (args: GroupsExcelQueryArgs = {}): string => {
    const qs = new URLSearchParams();
    if (args.search) qs.set("search", args.search);
    if (args.status) qs.set("status", args.status);
    if (args.page) qs.set("page", String(args.page));
    if (args.limit) qs.set("limit", String(args.limit));
    if (args.courseId) qs.set("courseId", args.courseId);
    if (args.teacherId) qs.set("teacherId", args.teacherId);
    if (args.daysType) qs.set("daysType", args.daysType);
    if (args.startDate) qs.set("startDate", args.startDate);
    if (args.endDate) qs.set("endDate", args.endDate);
    return qs.toString();
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
        // GET /groups/{id}/for-edit — same envelope as GET /groups/{id}, used
        // specifically to prefill the edit form (kept as its own endpoint
        // since Swagger documents it separately from groupById).
        groupForEdit: builder.query<GroupDetailResponse, string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["group"],
        }),
        // GET /groups/select — simplified {id, name} list for dropdowns
        // (e.g. "move student to another group"), distinct from allGroups.
        groupsSelect: builder.query<GroupSelectOption[], void>({
            query: () => ({
                url: `${PATHS.GROUPS}/select`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeList<GroupSelectOption>(response?.data),
            providesTags: ["group"],
        }),
        // GET /groups/excel — downloads the (optionally filtered) groups list
        // as a file. Modeled as a lazy query returning a Blob, same approach
        // as financeApi's debtors/expenses/payments/withdrawals excel and
        // attendancesApi's groupAttendanceExcel.
        groupsExcel: builder.query<Blob, GroupsExcelQueryArgs | void>({
            query: (args) => ({
                url: `${PATHS.GROUPS}/excel?${buildGroupsExcelQueryString(args ?? {})}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /groups/{id}/excel — downloads a single group's student list as
        // a file. Same lazy-Blob approach as groupsExcel.
        groupExcel: builder.query<Blob, string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}/excel`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
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
                    method: "PATCH",
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
            transformResponse: (response: { data: unknown }) => normalizeHistory(response?.data),
            providesTags: ["group"],
        }),
        groupComments: builder.query<GroupComment[], string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}/comments`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeComments(response?.data),
            providesTags: ["group"],
        }),
        assignStudentsToGroup: builder.mutation<AssignStudentsResponse, AssignStudentsRequest>({
            query: ({ id, studentIds }) => ({
                url: `${PATHS.GROUPS}/${id}/students/assign`,
                method: "POST",
                body: { studentIds },
            }),
            invalidatesTags: ["group", "studentGroup"],
        }),
        removeStudentFromGroup: builder.mutation<RemoveStudentFromGroupResponse, RemoveStudentFromGroupRequest>({
            query: ({ id, studentId }) => ({
                url: `${PATHS.GROUPS}/${id}/students/${studentId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["group", "studentGroup"],
        }),
        transferStudent: builder.mutation<TransferStudentResponse, TransferStudentRequest>({
            // reason is required by the live backend (confirmed: omitting it
            // 400s with "reason should not be empty" + "reason must be a
            // string" — both class-validator's messages for a missing field,
            // not an empty-string one), so it's always sent.
            query: ({ id, studentId, newGroupId, reason }) => ({
                url: `${PATHS.GROUPS}/${id}/students/transfer`,
                method: "POST",
                body: { studentId, newGroupId, reason },
            }),
            invalidatesTags: ["group", "studentGroup"],
        }),
        assignTeachersToGroup: builder.mutation<AssignTeachersResponse, AssignTeachersRequest>({
            query: ({ id, teacherIds }) => ({
                url: `${PATHS.GROUPS}/${id}/teachers/assign`,
                method: "POST",
                body: { teacherIds },
            }),
            invalidatesTags: ["group"],
        }),
        removeTeacherFromGroup: builder.mutation<RemoveTeacherFromGroupResponse, RemoveTeacherFromGroupRequest>({
            query: ({ id, teacherId }) => ({
                url: `${PATHS.GROUPS}/${id}/teachers/${teacherId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["group"],
        }),
        updateGroupStatus: builder.mutation<UpdateGroupStatusResponse, UpdateGroupStatusRequest>({
            query: ({ id, status }) => ({
                url: `${PATHS.GROUPS}/${id}/status`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: ["group"],
        }),
        toggleGroupStatus: builder.mutation<ToggleGroupStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.GROUPS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            invalidatesTags: ["group"],
        }),
        addStudentToGroup: builder.mutation<AddStudentToGroupResponse, AddStudentToGroupRequest>({
            // POST /student-groups (Swagger: multipart/form-data) — adds the
            // student as a new member of the group, distinct from
            // assignStudentsToGroup (POST /groups/{id}/students/assign) which
            // this app already uses elsewhere; kept as its own endpoint since
            // Swagger documents it as a separate resource with its own optional
            // fields (status/joinedAt/paymentStartDate/customPrice/discountReason).
            query: (data) => {
                const formData = new FormData();
                (Object.keys(data) as (keyof AddStudentToGroupRequest)[]).forEach((key) => {
                    const value = data[key];
                    if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
                });
                return {
                    url: PATHS.STUDENT_GROUPS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["group", "student", "studentGroup"],
        }),
        studentGroups: builder.query<StudentGroupsResult, StudentGroupsRequest | void>({
            query: (args) => ({
                url: `${PATHS.STUDENT_GROUPS}?${buildStudentGroupsQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentGroupsList(response),
            providesTags: ["studentGroup"],
        }),
        studentGroupById: builder.query<StudentGroupRecord, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentGroupRecord(pickStudentGroupRow(response), 0),
            providesTags: ["studentGroup"],
        }),
        // GET /student-groups/{id}/for-edit — same envelope as GET
        // /student-groups/{id}, used specifically to prefill the edit form
        // (kept as its own endpoint since Swagger documents it separately).
        studentGroupForEdit: builder.query<StudentGroupRecord, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}/for-edit`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentGroupRecord(pickStudentGroupRow(response), 0),
            providesTags: ["studentGroup"],
        }),
        freezeStudentGroup: builder.mutation<StudentGroupActionResponse, FreezeStudentGroupRequest>({
            query: ({ id, startDate, endDate, reason }) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}/freeze`,
                method: "POST",
                body: appendStudentGroupFormData({ startDate, endDate, reason }),
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        unfreezeStudentGroup: builder.mutation<StudentGroupActionResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}/unfreeze`,
                method: "POST",
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        // POST /student-groups/{id}/graduate-trial — PROBATION -> ACTIVE.
        graduateTrialStudentGroup: builder.mutation<StudentGroupActionResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}/graduate-trial`,
                method: "POST",
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        updateStudentGroup: builder.mutation<StudentGroupActionResponse, UpdateStudentGroupRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}`,
                method: "PATCH",
                body: appendStudentGroupFormData(data),
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        updateStudentGroupStatus: builder.mutation<StudentGroupActionResponse, UpdateStudentGroupStatusRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}/status`,
                method: "PATCH",
                body: appendStudentGroupFormData(data),
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        // DELETE /student-groups/{id} — soft-deletes the membership (status
        // -> DELETED, exitedAt set); distinct from removeStudentFromGroup
        // above (DELETE /groups/{id}/students/{studentId}), which predates
        // this documented resource.
        deleteStudentGroup: builder.mutation<StudentGroupActionResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_GROUPS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
    })
})

export const {
    useAllGroupsQuery,
    useGroupByIdQuery,
    useLazyGroupForEditQuery,
    useGroupsSelectQuery,
    useLazyGroupsExcelQuery,
    useLazyGroupExcelQuery,
    useCreateGroupMutation,
    useUpdateGroupMutation,
    useDeleteGroupMutation,
    useGroupHistoryQuery,
    useGroupCommentsQuery,
    useAssignStudentsToGroupMutation,
    useRemoveStudentFromGroupMutation,
    useTransferStudentMutation,
    useAssignTeachersToGroupMutation,
    useRemoveTeacherFromGroupMutation,
    useUpdateGroupStatusMutation,
    useToggleGroupStatusMutation,
    useAddStudentToGroupMutation,
    useStudentGroupsQuery,
    useLazyStudentGroupsQuery,
    useStudentGroupByIdQuery,
    useLazyStudentGroupForEditQuery,
    useFreezeStudentGroupMutation,
    useUnfreezeStudentGroupMutation,
    useGraduateTrialStudentGroupMutation,
    useUpdateStudentGroupMutation,
    useUpdateStudentGroupStatusMutation,
    useDeleteStudentGroupMutation,
} = groupsApi;
