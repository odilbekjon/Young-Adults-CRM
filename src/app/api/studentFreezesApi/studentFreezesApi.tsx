import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    StudentFreezesRequest,
    StudentFreezesResult,
    StudentFreezeRecord,
    CreateStudentFreezeRequest,
    UpdateStudentFreezeRequest,
    StudentFreezeMutationResponse,
} from "./types";

type Row = Record<string, unknown>;

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (archivesApi/
// salariesApi'dagi bir xil naqsh).
const pickList = (raw: unknown, ...keys: string[]): Row[] => {
    if (Array.isArray(raw)) return raw as Row[];
    if (!raw || typeof raw !== "object") return [];
    const container = raw as Row;
    for (const key of ["data", ...keys]) {
        if (Array.isArray(container[key])) return container[key] as Row[];
    }
    const nested = container.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        for (const key of keys) {
            if (Array.isArray((nested as Row)[key])) return (nested as Row)[key] as Row[];
        }
    }
    return [];
};

const pickObject = (raw: unknown): Row => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const container = raw as Row;
    const nested = container.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Row;
    return container;
};

const str = (...candidates: unknown[]): string => {
    for (const value of candidates) {
        if (typeof value === "string" && value) return value;
        if (typeof value === "number") return String(value);
        if (value && typeof value === "object") {
            const name = (value as Row).name ?? (value as Row).fullName;
            if (typeof name === "string" && name) return name;
        }
    }
    return "";
};

const strOrNull = (...candidates: unknown[]): string | null => {
    for (const value of candidates) {
        if (typeof value === "string" && value) return value;
        if (value && typeof value === "object") {
            const id = (value as Row).id;
            if (typeof id === "string" && id) return id;
        }
    }
    return null;
};

const num = (...candidates: unknown[]): number => {
    for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
            return Number(value);
        }
    }
    return 0;
};

const normalizeRecord = (r: Row, i: number): StudentFreezeRecord => ({
    id: str(r.id, r._id) || String(i),
    studentId: strOrNull(r.studentId, r.student) ?? "",
    studentName: str(r.studentName, r.student),
    studentPhone: str(r.studentPhone, (r.student as Row)?.phone),
    groupId: strOrNull(r.groupId, r.group),
    groupName: str(r.groupName, r.group),
    studentGroupId: strOrNull(r.studentGroupId),
    startDate: str(r.startDate, r.from).slice(0, 10),
    endDate: r.endDate ? str(r.endDate, r.to).slice(0, 10) : null,
    reason: str(r.reason, r.comment),
    status: str(r.status, r.state).toUpperCase() || "ACTIVE",
    createdAt: r.createdAt ? str(r.createdAt) : null,
});

const normalizeList = (raw: unknown): StudentFreezesResult => {
    const rows = pickList(raw, "freezes", "rows", "items").map(normalizeRecord);
    const meta = ((raw as Row)?.meta ?? {}) as Row;
    const total = num(meta.total, meta.totalItems) || rows.length;
    const limit = num(meta.limit) || rows.length || 10;
    return {
        rows,
        meta: {
            total,
            page: num(meta.page) || 1,
            limit,
            totalPages: num(meta.totalPages) || Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
    };
};

const buildQueryString = (args: StudentFreezesRequest = {}): string => {
    const params = new URLSearchParams();
    if (args.studentId) params.set("studentId", args.studentId);
    if (args.groupId) params.set("groupId", args.groupId);
    if (args.status) params.set("status", args.status);
    params.set("page", String(args.page ?? 1));
    params.set("limit", String(args.limit ?? 10));
    return params.toString();
};

// Swagger: POST/PATCH declare multipart/form-data.
const appendFreezeFormData = (data: Record<string, string | undefined>): FormData => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") formData.append(key, value);
    });
    return formData;
};

export const studentFreezesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        studentFreezes: builder.query<StudentFreezesResult, StudentFreezesRequest | void>({
            query: (args) => ({
                url: `${PATHS.STUDENT_FREEZES}?${buildQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeList(response),
            providesTags: ["studentFreeze"],
        }),
        studentFreezeById: builder.query<StudentFreezeRecord, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_FREEZES}/${id}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeRecord(pickObject(response), 0),
            providesTags: ["studentFreeze"],
        }),
        createStudentFreeze: builder.mutation<StudentFreezeMutationResponse, CreateStudentFreezeRequest>({
            query: ({ studentId, groupId, studentGroupId, startDate, endDate, reason }) => ({
                url: PATHS.STUDENT_FREEZES,
                method: "POST",
                body: appendFreezeFormData({ studentId, groupId, studentGroupId, startDate, endDate, reason }),
            }),
            // Also invalidates "group" — freezing changes the student's active
            // status within that group's membership (SingleGroup reads this).
            invalidatesTags: ["studentFreeze", "student", "group"],
        }),
        updateStudentFreeze: builder.mutation<StudentFreezeMutationResponse, UpdateStudentFreezeRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.STUDENT_FREEZES}/${id}`,
                method: "PATCH",
                body: appendFreezeFormData(data),
            }),
            invalidatesTags: ["studentFreeze"],
        }),
        // DELETE /student-freezes/{id} — "Muzlatishni o'chiradi va talabaning
        // statusini qayta aktiv holatga keltirishni ta'minlaydi", hence also
        // invalidating "student".
        deleteStudentFreeze: builder.mutation<StudentFreezeMutationResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENT_FREEZES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["studentFreeze", "student", "group"],
        }),
    }),
});

export const {
    useStudentFreezesQuery,
    useLazyStudentFreezesQuery,
    useLazyStudentFreezeByIdQuery,
    useCreateStudentFreezeMutation,
    useUpdateStudentFreezeMutation,
    useDeleteStudentFreezeMutation,
} = studentFreezesApi;
