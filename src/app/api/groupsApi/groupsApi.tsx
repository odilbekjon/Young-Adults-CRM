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
    GroupHistoryChange,
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
    UnfreezeStudentGroupRequest,
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
    const { days, teacherIds, studentIds, tagIds, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
    });
    days?.forEach((day) => formData.append("days[]", day));
    teacherIds?.forEach((id) => formData.append("teacherIds[]", id));
    studentIds?.forEach((id) => formData.append("studentIds[]", id));
    // Same bracket convention as the other array fields. An empty list sends
    // nothing (multipart can't express "no tags").
    tagIds?.forEach((id) => formData.append("tagIds[]", id));
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
// Every row keeps as much information as we can find: well-known fields map
// to dedicated properties, status moves become `transition`, and anything
// else the backend sends (changes/fields/diff blocks or unknown scalar
// fields) is surfaced as `changes` rows so nothing is silently dropped.
const historyScalar = (v: unknown): string | null => {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "string") {
        // Midnight-UTC ISO timestamps are really plain dates — show them as such.
        const m = v.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?Z?$/);
        return m ? m[1] : v;
    }
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return null;
};

const historyPerson = (v: unknown): string | null => {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v !== "object") return String(v);
    const o = v as Record<string, unknown>;
    const full = [o.firstName, o.lastName].filter((x) => typeof x === "string" && x).join(" ");
    const name = o.name ?? o.fullName ?? (full || undefined) ?? o.username ?? o.login ?? o.id;
    return name === undefined || name === null || name === "" ? null : String(name);
};

const historyHumanize = (key: string): string => {
    const words = key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_\-.]+/g, " ")
        .trim()
        .toLowerCase();
    return words ? words[0].toUpperCase() + words.slice(1) : key;
};

const historyFirst = (r: Record<string, unknown>, keys: string[]): unknown => {
    for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
};

const HISTORY_KNOWN_KEYS = new Set([
    "id", "_id", "__v", "updatedAt",
    "type", "action", "event", "eventType",
    "detail", "details", "description", "message",
    "student", "studentId", "studentName", "studentPhone", "phone",
    "group", "groupId", "groupName", "groupCode", "code", "uid",
    "oldStatus", "previousStatus", "fromStatus", "statusFrom", "newStatus", "toStatus", "statusTo", "from", "to",
    "activatedFrom", "activatedAt",
    "changes", "fields", "diff",
    "modifiedBy", "actor", "createdBy", "user", "performedBy", "changedBy",
    "createdAt", "timestamp", "date", "created_at",
]);

// Containers whose scalar members are unwrapped into rows of their own.
const HISTORY_NESTED_KEYS = ["data", "meta", "metadata", "payload", "extra", "info", "details"];

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

    return (list as unknown[])
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((r, i) => {
            const student = (r.student && typeof r.student === "object" ? r.student : {}) as Record<string, unknown>;
            const group = (r.group && typeof r.group === "object" ? r.group : {}) as Record<string, unknown>;

            // A bare string `group` is either the id (uuid/number) or the name.
            const groupRefIsId = typeof r.group === "string" && /^([0-9a-f-]{8,}|\d+)$/i.test(r.group);

            const changes: GroupHistoryChange[] = [];
            const pushChange = (key: string, value: unknown, from?: unknown) => {
                const v = historyScalar(value);
                if (v === null) return;
                changes.push({ key, label: historyHumanize(key), value: v, from: historyScalar(from) });
            };

            // Status moves: explicit old/new fields first, then a `status`
            // entry inside a changes/fields/diff block as a fallback.
            let from = historyScalar(historyFirst(r, ["oldStatus", "previousStatus", "fromStatus", "statusFrom", "from"]));
            let to = historyScalar(historyFirst(r, ["newStatus", "toStatus", "statusTo", "to"]));

            const block = historyFirst(r, ["changes", "fields", "diff"]);
            if (Array.isArray(block)) {
                block.forEach((c, ci) => {
                    if (c && typeof c === "object") {
                        const o = c as Record<string, unknown>;
                        const key = String(historyFirst(o, ["field", "key", "name", "label", "property"]) ?? `change ${ci + 1}`);
                        const cFrom = historyFirst(o, ["from", "old", "oldValue", "previous", "before"]);
                        const cTo = historyFirst(o, ["to", "new", "newValue", "value", "current", "after"]);
                        if (key.toLowerCase() === "status" && (!to || historyScalar(cTo) === to)) {
                            from = from ?? historyScalar(cFrom);
                            to = to ?? historyScalar(cTo);
                        } else {
                            pushChange(key, cTo, cFrom);
                        }
                    } else {
                        const v = historyScalar(c);
                        if (v !== null) changes.push({ key: `change${ci}`, label: "", value: v, from: null });
                    }
                });
            } else if (block && typeof block === "object") {
                Object.entries(block as Record<string, unknown>).forEach(([key, val]) => {
                    if (val && typeof val === "object" && !Array.isArray(val)) {
                        const o = val as Record<string, unknown>;
                        const cFrom = historyFirst(o, ["from", "old", "oldValue", "previous", "before"]);
                        const cTo = historyFirst(o, ["to", "new", "newValue", "value", "current", "after"]);
                        if (key.toLowerCase() === "status" && (!to || historyScalar(cTo) === to)) {
                            from = from ?? historyScalar(cFrom);
                            to = to ?? historyScalar(cTo);
                        } else {
                            pushChange(key, cTo, cFrom);
                        }
                    } else if (key.toLowerCase() === "status" && (!to || historyScalar(val) === to)) {
                        to = to ?? historyScalar(val);
                    } else {
                        pushChange(key, val);
                    }
                });
            }

            // Unknown top-level scalars and unwrapped nested containers.
            const collectExtras = (obj: Record<string, unknown>, skipKnown: boolean) => {
                Object.entries(obj).forEach(([key, val]) => {
                    if (skipKnown && HISTORY_KNOWN_KEYS.has(key)) return;
                    if (/(^|[a-z])Id$|_id$/.test(key) || key === "id") return;
                    if (skipKnown && HISTORY_NESTED_KEYS.includes(key)) return;
                    if (key === "status") {
                        const v = historyScalar(val);
                        if (v !== null && v !== to) pushChange("status", v);
                        return;
                    }
                    if (Array.isArray(val)) {
                        const joined = val.map(historyScalar).filter((x): x is string => x !== null).join(", ");
                        if (joined) pushChange(key, joined);
                        return;
                    }
                    pushChange(key, val);
                });
            };
            collectExtras(r, true);
            HISTORY_NESTED_KEYS.forEach((k) => {
                const nested = r[k];
                if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                    collectExtras(nested as Record<string, unknown>, false);
                }
            });

            const detailRaw = historyFirst(r, ["detail", "description", "message", "details"]);

            return {
                id: String(r.id ?? r._id ?? `row-${i}`),
                type: String(historyFirst(r, ["type", "action", "event", "eventType"]) ?? "").toUpperCase(),
                studentId: asId(r.studentId ?? r.student),
                studentName: historyPerson(r.studentName ?? r.student),
                studentPhone: historyScalar(historyFirst(r, ["studentPhone", "phone"]) ?? student.phone),
                groupId: r.groupId !== undefined && r.groupId !== null ? asId(r.groupId) : groupRefIsId ? String(r.group) : asId(group.id),
                groupName: historyPerson(r.groupName ?? (typeof r.group === "string" && !groupRefIsId ? r.group : group.name)),
                groupCode: historyScalar(historyFirst(r, ["groupCode", "code", "uid"]) ?? group.code ?? group.uid),
                detail: historyScalar(detailRaw) ?? "",
                transition: from || to ? { from, to } : null,
                activatedFrom: historyScalar(historyFirst(r, ["activatedFrom", "activatedAt"])),
                changes,
                createdAt: String(historyFirst(r, ["createdAt", "timestamp", "date", "created_at"]) ?? ""),
                actor: historyPerson(historyFirst(r, ["modifiedBy", "actor", "createdBy", "user", "performedBy", "changedBy"])),
            };
        });
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
//
// A boolean `false` is skipped rather than sent: multipart can only carry it
// as the string "false", which this backend's validator rejects or coerces to
// true (confirmed live for the same reason on PaymentMethod.isDefault — see
// appendPaymentMethodFormData in financeApi). Every boolean field on these
// endpoints (isAllGroup, studentDelete) defaults to false server-side, so
// omitting it is equivalent; `true` is still sent.
const appendStudentGroupFormData = (data: Record<string, string | number | boolean | undefined>): FormData => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === false) return;
        formData.append(key, String(value));
    });
    return formData;
};

// Freeze/unfreeze diagnostics. The request (method, url, multipart fields) is
// logged in dev builds only; a FAILED call is always logged with the HTTP
// status and the backend's response body, so "freeze doesn't work" can be
// answered from the browser console (or its Network tab) without guessing.
// Nothing sensitive is included — no auth header, no token.
const describeFormFields = (formData: FormData): Record<string, string> => {
    const fields: Record<string, string> = {};
    formData.forEach((value, key) => { fields[key] = typeof value === "string" ? value : `[file ${value.name}]`; });
    return fields;
};

const logStudentGroupAction = async (
    label: string,
    url: string,
    fields: Record<string, string>,
    queryFulfilled: Promise<{ data: unknown; meta?: unknown }>,
) => {
    if (import.meta.env.DEV) console.info(`[${label}] request`, { method: "POST", url, fields });
    try {
        const { data, meta } = await queryFulfilled;
        if (import.meta.env.DEV) {
            console.info(`[${label}] response`, { status: (meta as { response?: Response } | undefined)?.response?.status, data });
        }
    } catch (e) {
        const rejection = e as { error?: { status?: unknown; data?: unknown }; meta?: { response?: Response } };
        console.error(`[${label}] FAILED`, {
            method: "POST",
            url,
            fields,
            status: rejection.error?.status ?? rejection.meta?.response?.status,
            response: rejection.error?.data ?? rejection.error,
        });
    }
};

// GET /groups/excel query string — only appends filters that are actually
// set, same convention as the analogous *Excel endpoints in financeApi.
const buildGroupsExcelQueryString = (args: GroupsExcelQueryArgs = {}): string => {
    const qs = new URLSearchParams();
    if (args.search) qs.set("search", args.search);
    if (args.status) qs.set("status", args.status);
    if (args.page) qs.set("page", String(args.page));
    if (args.limit) qs.set("limit", String(args.limit));
    if (args.branchId) qs.set("branchId", args.branchId);
    if (args.courseId) qs.set("courseId", args.courseId);
    if (args.teacherId) qs.set("teacherId", args.teacherId);
    if (args.daysType) qs.set("daysType", args.daysType);
    if (args.startDate) qs.set("startDate", args.startDate);
    if (args.endDate) qs.set("endDate", args.endDate);
    if (args.tagId) qs.set("tagId", args.tagId);
    return qs.toString();
};

export const groupsApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allGroups: builder.query<groupsResponse, groupsRequest>({
            query: ({ page = 1, limit = 10, tagId } = {}) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                // Same tagId convention as studentsApi's allStudents, for the
                // Tags filter on the Groups list.
                if (tagId) params.set("tagId", tagId);
                return { url: `${PATHS.GROUPS}?${params.toString()}`, method: "GET" };
            },
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
            // Contract re-checked against Swagger ("Talabani guruhga
            // biriktirish"): multipart/form-data with studentId* + groupId*
            // required, status (PROBATION | ACTIVE), joinedAt and
            // paymentStartDate as YYYY-MM-DD, customPrice as a number (so
            // sent as its plain string form), discountReason. FormData is
            // passed as-is so the browser sets the multipart boundary header
            // itself (no manual Content-Type); empty/NaN values are omitted so
            // optional fields never arrive as ""/"NaN".
            query: (data) => {
                const formData = new FormData();
                (Object.keys(data) as (keyof AddStudentToGroupRequest)[]).forEach((key) => {
                    const value = data[key];
                    if (value === undefined || value === null || value === "") return;
                    if (typeof value === "number" && !Number.isFinite(value)) return;
                    formData.append(key, String(value));
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
            onQueryStarted: ({ id, startDate, endDate, reason }, { queryFulfilled }) =>
                logStudentGroupAction(
                    "freezeStudentGroup",
                    `${PATHS.STUDENT_GROUPS}/${id}/freeze`,
                    describeFormFields(appendStudentGroupFormData({ startDate, endDate, reason })),
                    queryFulfilled,
                ),
            invalidatesTags: ["studentGroup", "group", "student"],
        }),
        // POST /student-groups/{id}/unfreeze — Swagger: multipart/form-data
        // with `endDate` (YYYY-MM-DD, when the freeze ends). Accepts a bare
        // membership id (StudentProfile) or {id, endDate}; the FormData is
        // always sent (empty when no date is given) so the multipart body the
        // endpoint declares is never missing, and no Content-Type is set by
        // hand so the browser adds the boundary itself.
        unfreezeStudentGroup: builder.mutation<StudentGroupActionResponse, string | UnfreezeStudentGroupRequest>({
            query: (arg) => {
                const { id, endDate } = typeof arg === "string" ? { id: arg, endDate: undefined } : arg;
                return {
                    url: `${PATHS.STUDENT_GROUPS}/${id}/unfreeze`,
                    method: "POST",
                    body: appendStudentGroupFormData({ endDate }),
                };
            },
            onQueryStarted: (arg, { queryFulfilled }) => {
                const { id, endDate } = typeof arg === "string" ? { id: arg, endDate: undefined } : arg;
                return logStudentGroupAction(
                    "unfreezeStudentGroup",
                    `${PATHS.STUDENT_GROUPS}/${id}/unfreeze`,
                    describeFormFields(appendStudentGroupFormData({ endDate })),
                    queryFulfilled,
                );
            },
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
