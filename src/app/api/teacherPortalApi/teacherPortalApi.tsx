import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    TeacherPortalDashboard,
    TeacherPortalGender,
    TeacherPortalGroup,
    TeacherPortalGroupDetail,
    TeacherPortalGroupStudent,
    TeacherPortalProfile,
    TeacherPortalSalaryRow,
    TeacherPortalScheduleItem,
    UpdateTeacherPortalProfileRequest,
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

// A count that the backend may send either as a number or as the list itself.
const countOrNull = (...candidates: unknown[]): number | null => {
    for (const value of candidates) {
        if (Array.isArray(value)) return value.length;
        const n = numOrNull(value);
        if (n !== null) return n;
    }
    return null;
};

const strList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v !== "") : [];

// "2000-05-17T00:00:00.000Z" -> "2000-05-17" (what <input type="date"> wants).
const dateOnly = (value: unknown): string | null => {
    const s = strOrNull(value);
    return s ? s.slice(0, 10) : null;
};

const normalizeDashboard = (r: Row): TeacherPortalDashboard => ({
    todayLessonsCount: countOrNull(r.todayLessonsCount, r.todayLessons, r.lessonsToday, r.todayLessonCount) ?? 0,
    totalStudentsCount: countOrNull(r.totalStudentsCount, r.studentsCount, r.totalStudents, r.activeStudentsCount) ?? 0,
    activeGroupsCount: countOrNull(r.activeGroupsCount, r.groupsCount, r.activeGroups, r.totalGroupsCount) ?? 0,
});

// The roster endpoint may return plain students or membership rows that wrap
// one ({ student: {...}, status }) — both are flattened here.
const normalizeGroupStudent = (raw: Row): TeacherPortalGroupStudent => {
    const inner = raw.student && typeof raw.student === "object" ? (raw.student as Row) : null;
    const r = inner ? { ...raw, ...inner } : raw;
    return {
        id: str(inner?.id, raw.studentId, r.id, r._id),
        name: str(r.name, r.fullName),
        phone: strOrNull(r.phone, r.phoneNumber),
        status: str(raw.status, r.status).toUpperCase(),
    };
};

const normalizeGroup = (r: Row): TeacherPortalGroup => {
    const course = (r.course ?? {}) as Row;
    return {
        id: str(r.id, r._id, r.groupId),
        name: str(r.name, r.groupName),
        courseName: str(r.courseName, course.name),
        daysType: strOrNull(r.daysType),
        time: strOrNull(r.time, r.startTime),
        studentsCount: countOrNull(r.studentsCount, r.totalStudents, r.activeStudentsCount, r.students) ?? 0,
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

const normalizeGender = (value: unknown): TeacherPortalGender | null => {
    const g = typeof value === "string" ? value.toUpperCase() : "";
    return g === "MALE" || g === "FEMALE" ? g : null;
};

const normalizeProfile = (r: Row): TeacherPortalProfile => {
    const branch = (r.branch ?? {}) as Row;
    // branches may be [{id,name}] or [{branch:{id,name}}] (same variants the
    // admin teacher/user endpoints use) — both are accepted.
    const branches = pickList(r.branches, "branches")
        .map((b) => {
            const inner = (b.branch && typeof b.branch === "object" ? b.branch : b) as Row;
            return { id: str(inner.id, inner._id), name: str(inner.name) };
        })
        .filter((b) => b.name);
    return {
        id: str(r.id, r._id),
        name: str(r.name),
        phone: strOrNull(r.phone),
        email: strOrNull(r.email),
        photo: strOrNull(r.photo),
        specialization: strOrNull(r.specialization),
        gender: normalizeGender(r.gender),
        birthdate: dateOnly(r.birthdate ?? r.birthDate ?? r.dateOfBirth),
        branches,
        branchName: strOrNull(r.branchName, branch.name) ?? branches[0]?.name ?? null,
    };
};

const normalizeSalaryRow = (r: Row, i: number): TeacherPortalSalaryRow => ({
    id: str(r.id, r._id) || String(i),
    periodYear: numOrNull(r.periodYear, r.year),
    periodMonth: numOrNull(r.periodMonth, r.month),
    status: str(r.status, r.state).toUpperCase(),
    totalAmount: num(r.totalAmount, r.total, r.amount, r.sum),
    paidAmount: num(r.paidAmount, r.paid),
    paidAt: str(r.paidAt, r.paymentDate, r.updatedAt),
});

const normalizeScheduleItem = (r: Row): TeacherPortalScheduleItem => {
    const group = (r.group && typeof r.group === "object" ? r.group : {}) as Row;
    const groupText = typeof r.group === "string" ? r.group : "";
    const room = (r.room && typeof r.room === "object" ? r.room : {}) as Row;
    const roomText = typeof r.room === "string" ? r.room : "";
    const course = (r.course ?? {}) as Row;
    const teachers = Array.isArray(r.teachers)
        ? (r.teachers as unknown[]).map((x) => str(x)).filter(Boolean).join(", ")
        : str(r.teachers, r.teacherName, r.teacher);
    return {
        groupId: str(r.groupId, group.id, groupText),
        groupName: str(r.groupName, group.name, groupText),
        courseName: str(r.courseName, course.name, group.courseName),
        roomName: str(r.roomName, room.name, roomText),
        day: str(r.day, r.dayOfWeek).toUpperCase(),
        days: strList(r.days).map((d) => d.toUpperCase()),
        daysType: str(r.daysType, group.daysType).toUpperCase(),
        time: strOrNull(r.time, r.startTime, group.time),
        teachers,
        trainingStart: strOrNull(r.trainingStart, group.trainingStart),
        trainingEnd: strOrNull(r.trainingEnd, group.trainingEnd),
        studentsCount: countOrNull(r.studentsCount, r.students, group.studentsCount),
        maxStudents: numOrNull(r.maxStudents, r.capacity, room.capacity),
    };
};

// Only defined, non-empty values go into the multipart body — an empty
// password field in particular must never be sent. Content-Type is
// deliberately left unset so the browser adds the multipart boundary itself.
const buildProfileFormData = (data: UpdateTeacherPortalProfileRequest): FormData => {
    const formData = new FormData();
    if (data.photo) formData.append("photo", data.photo);
    if (data.password) formData.append("password", data.password);
    if (data.gender) formData.append("gender", data.gender);
    if (data.birthdate) formData.append("birthdate", data.birthdate);
    return formData;
};

export const teacherPortalApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /teacher-portal/dashboard — "O'qituvchi statistikasi"
        teacherPortalDashboard: builder.query<TeacherPortalDashboard, void>({
            query: () => ({ url: PATHS.DASHBOARD, method: "GET" }),
            transformResponse: (response: unknown) => normalizeDashboard(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        // GET /teacher-portal/groups — "O'zining guruhlari". Also feeds the
        // TEACHER sidebar's group list.
        teacherPortalGroups: builder.query<TeacherPortalGroup[], void>({
            query: () => ({ url: PATHS.GROUPS, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "groups").map(normalizeGroup),
            providesTags: ["teacherPortal"],
        }),
        // GET /teacher-portal/groups/{id} — "Guruh ma'lumotlari"
        teacherPortalGroupById: builder.query<TeacherPortalGroupDetail, string>({
            query: (id) => ({ url: `${PATHS.GROUPS}/${id}`, method: "GET" }),
            transformResponse: (response: unknown) => normalizeGroupDetail(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        // GET /teacher-portal/groups/{id}/students — "Guruhdagi o'quvchilar ro'yxati"
        teacherPortalGroupStudents: builder.query<TeacherPortalGroupStudent[], string>({
            query: (id) => ({ url: `${PATHS.GROUPS}/${id}/students`, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "students").map(normalizeGroupStudent),
            providesTags: ["teacherPortal"],
        }),
        // GET /teacher-portal/profile — "Shaxsiy profil"
        teacherPortalProfile: builder.query<TeacherPortalProfile, void>({
            query: () => ({ url: PATHS.PROFILE, method: "GET" }),
            transformResponse: (response: unknown) => normalizeProfile(pickObject(response)),
            providesTags: ["teacherPortal"],
        }),
        // PATCH /teacher-portal/profile — multipart/form-data. Also refreshes
        // GET /auth/me (tag "user"), which feeds the header avatar/name.
        teacherPortalUpdateProfile: builder.mutation<unknown, UpdateTeacherPortalProfileRequest>({
            query: (data) => ({ url: PATHS.PROFILE, method: "PATCH", body: buildProfileFormData(data) }),
            invalidatesTags: ["teacherPortal", "user"],
        }),
        // GET /teacher-portal/salaries — "O'qituvchining e'lon qilingan oyliklari"
        teacherPortalSalaries: builder.query<TeacherPortalSalaryRow[], void>({
            query: () => ({ url: PATHS.SALARIES, method: "GET" }),
            transformResponse: (response: unknown) =>
                pickList(response, "salaries", "payrolls", "rows", "items").map(normalizeSalaryRow),
            providesTags: ["teacherPortal"],
        }),
        // GET /teacher-portal/schedule — "O'zining dars jadvali"
        teacherPortalSchedule: builder.query<TeacherPortalScheduleItem[], void>({
            query: () => ({ url: PATHS.SCHEDULE, method: "GET" }),
            transformResponse: (response: unknown) => pickList(response, "schedule", "items").map(normalizeScheduleItem),
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
    useTeacherPortalUpdateProfileMutation,
    useTeacherPortalSalariesQuery,
    useTeacherPortalScheduleQuery,
} = teacherPortalApi;
