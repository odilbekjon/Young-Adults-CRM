import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    StudentPortalAttendanceRecord,
    StudentPortalBalance,
    StudentPortalDashboard,
    StudentPortalGroup,
    StudentPortalGroupTeacher,
    StudentPortalPayment,
    StudentPortalComment,
    StudentPortalProfile,
    StudentPortalScheduleItem,
} from "./types";

type Row = Record<string, unknown>;

// Same defensive-normalization approach as groupsApi's normalizeStudentGroupRecord/
// normalizeHistory and studentFreezesApi — every /student-portal/* endpoint except
// attendances shows no response schema in Swagger, only a "200" status.
const pickList = (raw: unknown, ...keys: string[]): Row[] => {
    if (Array.isArray(raw)) return raw as Row[];
    if (!raw || typeof raw !== "object") return [];
    const container = raw as Row;
    for (const key of ["data", ...keys]) {
        if (Array.isArray(container[key])) return container[key] as Row[];
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
            const name = (value as Row).name;
            if (typeof name === "string" && name) return name;
        }
    }
    return "";
};

const strOrNull = (...candidates: unknown[]): string | null => {
    for (const value of candidates) {
        if (typeof value === "string" && value) return value;
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

const normalizeAttendanceRecord = (r: Row): StudentPortalAttendanceRecord => ({
    date: str(r.date).slice(0, 10),
    groupName: str(r.groupName, r.group),
    status: str(r.status).toUpperCase(),
    reason: strOrNull(r.reason),
});

const normalizeBalance = (r: Row): StudentPortalBalance => ({
    balance: num(r.balance, r.currentBalance),
    paidAmount: num(r.paidAmount, r.totalPaid, r.paid),
    debt: num(r.debt, r.qarz, r.debtAmount),
});

const normalizeDashboard = (r: Row): StudentPortalDashboard => ({
    attendancePercentage: num(r.attendancePercentage, r.attendancePercent, r.percentage),
    activeCoursesCount: num(r.activeCoursesCount, r.activeGroupsCount, r.coursesCount),
});

const normalizeTeacher = (r: Row): StudentPortalGroupTeacher => ({
    id: str(r.id, r._id),
    name: str(r.name, r.fullName),
});

const normalizeGroup = (r: Row): StudentPortalGroup => {
    const course = (r.course ?? {}) as Row;
    const teachersRaw = Array.isArray(r.teachers) ? (r.teachers as Row[]) : [];
    return {
        id: str(r.id, r._id),
        name: str(r.name, r.groupName),
        courseName: str(r.courseName, course.name),
        daysType: strOrNull(r.daysType),
        time: strOrNull(r.time),
        teachers: teachersRaw.map(normalizeTeacher),
    };
};

const normalizePayment = (r: Row, i: number): StudentPortalPayment => ({
    id: str(r.id, r._id) || String(i),
    amount: num(r.amount, r.sum),
    method: strOrNull(r.method, r.paymentMethod),
    date: strOrNull(r.date, r.paidAt, r.createdAt)?.slice(0, 10) ?? null,
    comment: strOrNull(r.comment),
});

const normalizeComment = (r: Row, i: number): StudentPortalComment => ({
    id: str(r.id, r._id) || String(i),
    text: str(r.text, r.comment, r.message),
    author: strOrNull(r.author, r.createdBy, r.modifiedBy),
    createdAt: strOrNull(r.createdAt),
});

const normalizeProfile = (r: Row): StudentPortalProfile => {
    const branch = (r.branch ?? {}) as Row;
    const commentsRaw = pickList(r.comments, "comments");
    return {
        id: str(r.id, r._id),
        name: str(r.name),
        phone: strOrNull(r.phone),
        email: strOrNull(r.email),
        photo: strOrNull(r.photo),
        branchName: strOrNull(r.branchName, branch.name),
        comments: commentsRaw.length ? commentsRaw.map(normalizeComment) : [],
    };
};

const normalizeScheduleItem = (r: Row): StudentPortalScheduleItem => ({
    groupId: str(r.groupId, r.group),
    groupName: str(r.groupName, r.group),
    day: str(r.day, r.dayOfWeek),
    time: strOrNull(r.time),
});

export const studentPortalApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        studentPortalAttendances: builder.query<StudentPortalAttendanceRecord[], void>({
            query: () => ({ url: PATHS.ATTENDANCES, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response).map(normalizeAttendanceRecord),
            providesTags: ["studentPortal"],
        }),
        studentPortalBalance: builder.query<StudentPortalBalance, void>({
            query: () => ({ url: PATHS.BALANCE, method: "GET" }),
            transformResponse: (response: unknown) => normalizeBalance(pickObject(response)),
            providesTags: ["studentPortal"],
        }),
        studentPortalDashboard: builder.query<StudentPortalDashboard, void>({
            query: () => ({ url: PATHS.DASHBOARD, method: "GET" }),
            transformResponse: (response: unknown) => normalizeDashboard(pickObject(response)),
            providesTags: ["studentPortal"],
        }),
        studentPortalGroups: builder.query<StudentPortalGroup[], void>({
            query: () => ({ url: PATHS.GROUPS, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "groups").map(normalizeGroup),
            providesTags: ["studentPortal"],
        }),
        studentPortalPayments: builder.query<StudentPortalPayment[], void>({
            query: () => ({ url: PATHS.PAYMENTS, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "payments").map(normalizePayment),
            providesTags: ["studentPortal"],
        }),
        studentPortalProfile: builder.query<StudentPortalProfile, void>({
            query: () => ({ url: PATHS.PROFILE, method: "GET" }),
            transformResponse: (response: unknown) => normalizeProfile(pickObject(response)),
            providesTags: ["studentPortal"],
        }),
        studentPortalSchedule: builder.query<StudentPortalScheduleItem[], void>({
            query: () => ({ url: PATHS.SCHEDULE, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "schedule").map(normalizeScheduleItem),
            providesTags: ["studentPortal"],
        }),
    }),
});

export const {
    useStudentPortalAttendancesQuery,
    useStudentPortalBalanceQuery,
    useStudentPortalDashboardQuery,
    useStudentPortalGroupsQuery,
    useStudentPortalPaymentsQuery,
    useStudentPortalProfileQuery,
    useStudentPortalScheduleQuery,
} = studentPortalApi;
