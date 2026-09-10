import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    TeacherPortalDashboard,
    TeacherPortalGroup,
    TeacherPortalGroupDetail,
    TeacherPortalGroupStudent,
    TeacherPortalProfile,
    TeacherPortalSalaryRow,
    TeacherPortalScheduleItem,
} from "./types";

type Row = Record<string, unknown>;

// Same defensive-normalization approach as studentPortalApi's pickList/
// pickObject — every /teacher-portal/* endpoint shows no response schema
// in Swagger, only a "200" status.
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

const numOrNull = (...candidates: unknown[]): number | null => {
    for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
            return Number(value);
        }
    }
    return null;
};

const normalizeDashboard = (r: Row): TeacherPortalDashboard => ({
    todayLessonsCount: num(r.todayLessonsCount, r.todayLessons, r.lessonsToday),
    totalStudentsCount: num(r.totalStudentsCount, r.studentsCount, r.totalStudents),
    activeGroupsCount: num(r.activeGroupsCount, r.groupsCount, r.activeGroups),
});

const normalizeGroupStudent = (r: Row): TeacherPortalGroupStudent => ({
    id: str(r.id, r._id),
    name: str(r.name, r.fullName),
    phone: strOrNull(r.phone),
});

const normalizeGroup = (r: Row): TeacherPortalGroup => {
    const course = (r.course ?? {}) as Row;
    const studentsRaw = pickList(r.students, "students");
    return {
        id: str(r.id, r._id),
        name: str(r.name, r.groupName),
        courseName: str(r.courseName, course.name),
        daysType: strOrNull(r.daysType),
        time: strOrNull(r.time),
        studentsCount: num(r.studentsCount, r.totalStudents) || studentsRaw.length,
    };
};

const normalizeGroupDetail = (r: Row): TeacherPortalGroupDetail => {
    const room = (r.room ?? {}) as Row;
    const studentsRaw = pickList(r.students, "students");
    return {
        ...normalizeGroup(r),
        roomName: strOrNull(r.roomName, room.name),
        trainingStart: strOrNull(r.trainingStart),
        trainingEnd: strOrNull(r.trainingEnd),
        students: studentsRaw.map(normalizeGroupStudent),
    };
};

const normalizeProfile = (r: Row): TeacherPortalProfile => {
    const branch = (r.branch ?? {}) as Row;
    return {
        id: str(r.id, r._id),
        name: str(r.name),
        phone: strOrNull(r.phone),
        email: strOrNull(r.email),
        photo: strOrNull(r.photo),
        specialization: strOrNull(r.specialization),
        branchName: strOrNull(r.branchName, branch.name),
    };
};

const normalizeSalaryRow = (r: Row, i: number): TeacherPortalSalaryRow => ({
    id: str(r.id, r._id) || String(i),
    periodYear: numOrNull(r.periodYear, r.year),
    periodMonth: numOrNull(r.periodMonth, r.month),
    status: str(r.status).toUpperCase(),
    totalAmount: num(r.totalAmount, r.amount),
    paidAmount: num(r.paidAmount, r.paid),
});

const normalizeScheduleItem = (r: Row): TeacherPortalScheduleItem => ({
    groupId: str(r.groupId, r.group),
    groupName: str(r.groupName, r.group),
    day: str(r.day, r.dayOfWeek),
    time: strOrNull(r.time),
});

export const teacherPortalApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        teacherPortalDashboard: builder.query<TeacherPortalDashboard, void>({
            query: () => ({ url: PATHS.DASHBOARD, method: "GET" }),
            transformResponse: (response: unknown) => normalizeDashboard(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalGroups: builder.query<TeacherPortalGroup[], void>({
            query: () => ({ url: PATHS.GROUPS, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "groups").map(normalizeGroup),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalGroupById: builder.query<TeacherPortalGroupDetail, string>({
            query: (id) => ({ url: `${PATHS.GROUPS}/${id}`, method: "GET" }),
            transformResponse: (response: unknown) => normalizeGroupDetail(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalGroupStudents: builder.query<TeacherPortalGroupStudent[], string>({
            query: (id) => ({ url: `${PATHS.GROUPS}/${id}/students`, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "students").map(normalizeGroupStudent),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalProfile: builder.query<TeacherPortalProfile, void>({
            query: () => ({ url: PATHS.PROFILE, method: "GET" }),
            transformResponse: (response: unknown) => normalizeProfile(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalSalaries: builder.query<TeacherPortalSalaryRow[], void>({
            query: () => ({ url: PATHS.SALARIES, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "salaries", "payrolls").map(normalizeSalaryRow),
            providesTags: ["teacherPortal"],
        }),
        teacherPortalSchedule: builder.query<TeacherPortalScheduleItem[], void>({
            query: () => ({ url: PATHS.SCHEDULE, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "schedule").map(normalizeScheduleItem),
            providesTags: ["teacherPortal"],
        }),
    }),
});

export const {
    useTeacherPortalDashboardQuery,
    useTeacherPortalGroupsQuery,
    useTeacherPortalGroupByIdQuery,
    useTeacherPortalGroupStudentsQuery,
    useTeacherPortalProfileQuery,
    useTeacherPortalSalariesQuery,
    useTeacherPortalScheduleQuery,
} = teacherPortalApi;
