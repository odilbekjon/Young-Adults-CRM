import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    AttendanceReportRequest,
    AttendanceReportRow,
    ConversionReportRequest,
    ConversionReportResult,
    ConversionReportLead,
    LeadsReportRequest,
    LeadsReportResult,
    LeftStudentsReportRequest,
    LeftStudentsReportResult,
    ReportBreakdownItem,
} from "./types";

type Row = Record<string, unknown>;

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...]} yoki nomlangan
// konteyner ichida qaytarishi mumkin — barchasini massivga normallashtiramiz
// (archivesApi/groupsApi'dagi bir xil naqsh).
const pickList = (raw: unknown, ...keys: string[]): Row[] => {
    if (Array.isArray(raw)) return raw as Row[];
    if (!raw || typeof raw !== "object") return [];
    const container = raw as Row;
    for (const key of ["data", ...keys]) {
        const value = container[key];
        if (Array.isArray(value)) return value as Row[];
    }
    // One level deeper: {data: {items: [...]}}
    const nested = container.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        for (const key of keys) {
            const value = (nested as Row)[key];
            if (Array.isArray(value)) return value as Row[];
        }
    }
    return [];
};

// Returns the object that actually holds the report payload, whether the
// backend wraps it in {data: {...}} or returns it at the top level.
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
            const name = (value as Row).name ?? (value as Row).fullName ?? (value as Row).title;
            if (typeof name === "string" && name) return name;
        }
    }
    return "";
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

// A pre-aggregated breakdown ([{name, value}] and its common spellings).
const toBreakdown = (raw: unknown): ReportBreakdownItem[] =>
    (Array.isArray(raw) ? (raw as Row[]) : []).map((r) => ({
        name: str(r.name, r.label, r.key, r.title, r.teacher, r.course, r.reason, r.month) || "—",
        value: num(r.value, r.count, r.total, r.amount, r.quantity),
    }));

// Fallback when the backend returns raw rows instead of an aggregate: count
// occurrences of a field, preserving first-seen order.
const groupCount = (rows: Row[], read: (row: Row) => string): ReportBreakdownItem[] => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
        const key = read(row) || "—";
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts, ([name, value]) => ({ name, value }));
};

const monthKey = (value: unknown): string => {
    const raw = str(value);
    // Both "2026-05-13" and "2026-05-13T00:00:00.000Z" reduce to "2026-05".
    return raw.length >= 7 ? raw.slice(0, 7) : "";
};

const buildQueryString = (args: Record<string, string | undefined>): string => {
    const params = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    return params.toString();
};

// ── Normalizers ──────────────────────────────────────────────────────────────
// Swagger's `orderBy` enum (studentName, status, groupName, attendance) is the
// only documented evidence of this response's field names, so those are read
// first, with the usual nested/alternate spellings as fallbacks.
const normalizeAttendanceRows = (raw: unknown): AttendanceReportRow[] =>
    pickList(raw, "rows", "items", "students", "report").map((r, i) => ({
        id: str(r.id, r.studentId, r._id) || String(i),
        studentName: str(r.studentName, r.student, r.name, r.fullName),
        status: str(r.status, r.studentStatus, r.state),
        groupName: str(r.groupName, r.group),
        attendance: (r.attendance ?? r.attended ?? r.present ?? null) as AttendanceReportRow["attendance"],
    }));

const normalizeConversion = (raw: unknown): ConversionReportResult => {
    const container = pickObject(raw);
    const leads: ConversionReportLead[] = pickList(raw, "leads", "rows", "items").map((r, i) => ({
        id: str(r.id, r.leadId, r._id) || String(i),
        fullName: str(r.fullName, r.name, r.leadName, r.student),
        phone: str(r.phone, r.phoneNumber, r.contact),
        status: str(r.status, r.stage, r.state, r.section),
        staffName: str(r.staffName, r.user, r.userName, r.employee, r.manager, r.createdBy),
    }));

    // Funnel totals when the backend supplies them; otherwise the page derives
    // the counts from `leads` rather than inventing numbers here.
    const rawStages = container.stages ?? container.funnel ?? container.stageCounts ?? container.counts;
    const stageCounts: Record<string, number> = {};
    if (Array.isArray(rawStages)) {
        (rawStages as Row[]).forEach((s) => {
            const name = str(s.name, s.stage, s.status, s.label);
            if (name) stageCounts[name.toLowerCase()] = num(s.value, s.count, s.total);
        });
    } else if (rawStages && typeof rawStages === "object") {
        Object.entries(rawStages as Row).forEach(([name, value]) => {
            stageCounts[name.toLowerCase()] = num(value);
        });
    }

    return { leads, stageCounts };
};

const normalizeLeadsReport = (raw: unknown): LeadsReportResult => {
    const container = pickObject(raw);
    const rows = pickList(raw, "leads", "rows", "items");

    const bySource = container.bySource ?? container.sources ?? container.sourceStats;
    const byMonth = container.byMonth ?? container.months ?? container.monthly ?? container.monthStats;

    const sourceBreakdown = Array.isArray(bySource)
        ? toBreakdown(bySource)
        : groupCount(rows, (r) => str(r.source, r.sourceName, r.leadSource));

    const monthBreakdown = Array.isArray(byMonth)
        ? toBreakdown(byMonth)
        : groupCount(rows, (r) => monthKey(r.createdAt ?? r.date ?? r.leadDate)).sort((a, b) =>
              a.name.localeCompare(b.name)
          );

    const total = num(container.total, container.count, container.totalLeads) || rows.length ||
        sourceBreakdown.reduce((sum, item) => sum + item.value, 0);

    return { total, bySource: sourceBreakdown, byMonth: monthBreakdown };
};

const normalizeLeftStudents = (raw: unknown): LeftStudentsReportResult => {
    const container = pickObject(raw);
    const rows = pickList(raw, "students", "rows", "items", "leftStudents");

    const read = (aggregateKeys: string[], rowRead: (row: Row) => string): ReportBreakdownItem[] => {
        for (const key of aggregateKeys) {
            if (Array.isArray(container[key])) return toBreakdown(container[key]);
        }
        return groupCount(rows, rowRead);
    };

    const byTeacher = read(["byTeacher", "teachers", "teacherStats"], (r) => str(r.teacherName, r.teacher));
    const byCourse = read(["byCourse", "courses", "courseStats"], (r) => str(r.courseName, r.course));
    const byReason = read(["byReason", "reasons", "reasonStats"], (r) => str(r.reasonName, r.reason));
    const byMonth = read(["byMonth", "months", "monthly", "monthStats"], (r) =>
        monthKey(r.leftAt ?? r.archivedAt ?? r.date ?? r.createdAt)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const total = num(container.total, container.count) || rows.length ||
        byTeacher.reduce((sum, item) => sum + item.value, 0);

    return { total, byTeacher, byCourse, byMonth, byReason };
};

export const reportsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /reports/attendance
        reportAttendance: builder.query<AttendanceReportRow[], AttendanceReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/attendance?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    groupId: args?.groupId,
                    orderBy: args?.orderBy,
                })}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeAttendanceRows(response),
            providesTags: ["report"],
        }),
        // GET /reports/attendance/excel — same filters, file response. Modeled
        // as a lazy Blob query, the same approach financeApi/attendancesApi
        // already use for their excel endpoints.
        reportAttendanceExcel: builder.query<Blob, AttendanceReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/attendance/excel?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    groupId: args?.groupId,
                    orderBy: args?.orderBy,
                })}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /reports/conversion
        reportConversion: builder.query<ConversionReportResult, ConversionReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/conversion?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    sourceId: args?.sourceId,
                    userId: args?.userId,
                    branchId: args?.branchId,
                })}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeConversion(response),
            providesTags: ["report"],
        }),
        reportConversionExcel: builder.query<Blob, ConversionReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/conversion/excel?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    sourceId: args?.sourceId,
                    userId: args?.userId,
                    branchId: args?.branchId,
                })}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /reports/leads
        reportLeads: builder.query<LeadsReportResult, LeadsReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/leads?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    status: args?.status,
                })}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeLeadsReport(response),
            providesTags: ["report"],
        }),
        reportLeadsExcel: builder.query<Blob, LeadsReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/leads/excel?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    status: args?.status,
                })}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /reports/left-students
        reportLeftStudents: builder.query<LeftStudentsReportResult, LeftStudentsReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/left-students?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    groupId: args?.groupId,
                })}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeLeftStudents(response),
            providesTags: ["report"],
        }),
        reportLeftStudentsExcel: builder.query<Blob, LeftStudentsReportRequest | void>({
            query: (args) => ({
                url: `${PATHS.REPORTS}/left-students/excel?${buildQueryString({
                    startDate: args?.startDate,
                    endDate: args?.endDate,
                    branchId: args?.branchId,
                    groupId: args?.groupId,
                })}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
    }),
});

export const {
    useReportAttendanceQuery,
    useLazyReportAttendanceExcelQuery,
    useReportConversionQuery,
    useLazyReportConversionExcelQuery,
    useReportLeadsQuery,
    useLazyReportLeadsExcelQuery,
    useReportLeftStudentsQuery,
    useLazyReportLeftStudentsExcelQuery,
} = reportsApi;
