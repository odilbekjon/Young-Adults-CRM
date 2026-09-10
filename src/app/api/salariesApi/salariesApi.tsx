import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    PayrollsRequest,
    PayrollsResult,
    PayrollRow,
    PayrollDetail,
    PayrollDetailItem,
    SalarySetting,
    TeacherSalaryRow,
    CalculateSalariesRequest,
    PayPayrollRequest,
    SalaryMutationResponse,
} from "./types";

type Row = Record<string, unknown>;

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (archivesApi/
// reportsApi'dagi bir xil naqsh).
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

const numOrNull = (...candidates: unknown[]): number | null => {
    for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
            return Number(value);
        }
    }
    return null;
};

// Swagger's own wording gives the period/status field names (periodYear,
// periodMonth, status: DRAFT|PUBLISHED|PAID), so those are read first.
const normalizePayrollRow = (r: Row, i: number): PayrollRow => ({
    id: str(r.id, r._id) || String(i),
    teacherId: str(r.teacherId, (r.teacher as Row)?.id),
    teacherName: str(r.teacherName, r.teacher, r.fullName, r.name),
    periodYear: numOrNull(r.periodYear, r.year),
    periodMonth: numOrNull(r.periodMonth, r.month),
    status: str(r.status, r.state).toUpperCase(),
    totalAmount: num(r.totalAmount, r.total, r.amount, r.calculatedAmount, r.sum),
    paidAmount: num(r.paidAmount, r.paid),
    branchName: str(r.branchName, r.branch),
});

const normalizePayrolls = (raw: unknown): PayrollsResult => {
    const rows = pickList(raw, "payrolls", "rows", "items").map(normalizePayrollRow);
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

const normalizePayrollDetail = (raw: unknown): PayrollDetail => {
    const container = pickObject(raw);
    const items: PayrollDetailItem[] = pickList(
        container.items ?? container.details ?? container.lines ?? container.groups ?? raw,
        "items",
        "details",
        "lines",
        "groups",
        "students"
    ).map((r, i) => ({
        id: str(r.id, r._id) || String(i),
        groupName: str(r.groupName, r.group, r.courseName, r.course),
        studentName: str(r.studentName, r.student),
        lessons: numOrNull(r.lessons, r.lessonsCount, r.totalLessons),
        attended: numOrNull(r.attended, r.present, r.attendedLessons),
        missed: numOrNull(r.missed, r.absent, r.missedLessons),
        rate: numOrNull(r.rate, r.settingAmount, r.settingValue),
        amount: num(r.amount, r.estimatedAmount, r.total, r.sum),
        calcSetting: str(r.calcSetting, r.setting, r.scope),
        salaryType: str(r.salaryType, r.type),
        formula: str(r.formula, r.calculation, r.description),
    }));

    return { ...normalizePayrollRow(container, 0), items };
};

// The settings list mixes global rates with teacher/course/group/student
// specific ones; when the backend doesn't label the scope explicitly it is
// derived from whichever relation is actually populated.
const normalizeSettings = (raw: unknown): SalarySetting[] =>
    pickList(raw, "settings", "rows", "items").map((r, i) => {
        const teacherName = str(r.teacherName, r.teacher);
        const courseName = str(r.courseName, r.course);
        const groupName = str(r.groupName, r.group);
        const studentName = str(r.studentName, r.student);
        const explicitScope = str(r.calcSetting, r.scope, r.level, r.appliesTo);
        const derivedScope =
            studentName ? "Student" :
            groupName ? "Group" :
            courseName ? "Course" :
            teacherName ? "Teacher" : "Default";
        return {
            id: str(r.id, r._id) || String(i),
            calcSetting: explicitScope || derivedScope,
            salaryType: str(r.salaryType, r.type, r.calculationType),
            amount: (r.amount ?? r.value ?? r.rate ?? "") as number | string,
            courseName,
            groupName,
            teacherName,
            studentName,
            createdBy: str(r.createdBy, r.createdByName, r.author),
            updatedAt: str(r.updatedAt, r.modifiedAt, r.createdAt),
        };
    });

const normalizeTeacherSalaries = (raw: unknown): TeacherSalaryRow[] =>
    pickList(raw, "payrolls", "salaries", "rows", "items").map((r, i) => ({
        id: str(r.id, r._id) || String(i),
        periodYear: numOrNull(r.periodYear, r.year),
        periodMonth: numOrNull(r.periodMonth, r.month),
        status: str(r.status, r.state).toUpperCase(),
        totalAmount: num(r.totalAmount, r.total, r.amount, r.sum),
        paidAmount: num(r.paidAmount, r.paid),
        paidAt: str(r.paidAt, r.paymentDate, r.updatedAt),
    }));

const buildPayrollsQueryString = (args: PayrollsRequest = {}): string => {
    const params = new URLSearchParams();
    params.set("page", String(args.page ?? 1));
    params.set("limit", String(args.limit ?? 10));
    if (args.year) params.set("year", String(args.year));
    if (args.month) params.set("month", String(args.month));
    if (args.status) params.set("status", args.status);
    if (args.branchId) params.set("branchId", args.branchId);
    return params.toString();
};

export const salariesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        salaryPayrolls: builder.query<PayrollsResult, PayrollsRequest | void>({
            query: (args) => ({
                url: `${PATHS.SALARIES}/payrolls?${buildPayrollsQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizePayrolls(response),
            providesTags: ["salary"],
        }),
        salaryPayrollById: builder.query<PayrollDetail, string>({
            query: (id) => ({
                url: `${PATHS.SALARIES}/payrolls/${id}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizePayrollDetail(response),
            providesTags: ["salary"],
        }),
        // GET /salaries/payrolls/excel — same filters as the list, file
        // response. Lazy Blob query, the same approach financeApi already uses
        // for its excel endpoints.
        salaryPayrollsExcel: builder.query<Blob, PayrollsRequest | void>({
            query: (args) => ({
                url: `${PATHS.SALARIES}/payrolls/excel?${buildPayrollsQueryString(args ?? {})}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        salarySettings: builder.query<SalarySetting[], void>({
            query: () => ({
                url: `${PATHS.SALARIES}/settings`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeSettings(response),
            providesTags: ["salary"],
        }),
        teacherSalaries: builder.query<TeacherSalaryRow[], string>({
            query: (teacherId) => ({
                url: `${PATHS.SALARIES}/teacher/${teacherId}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeTeacherSalaries(response),
            providesTags: ["salary"],
        }),
        // POST /salaries/calculate — Swagger declares multipart/form-data.
        calculateSalaries: builder.mutation<SalaryMutationResponse, CalculateSalariesRequest>({
            query: ({ year, month, branchId }) => {
                const formData = new FormData();
                formData.append("year", String(year));
                formData.append("month", String(month));
                if (branchId) formData.append("branchId", branchId);
                return {
                    url: `${PATHS.SALARIES}/calculate`,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["salary"],
        }),
        // POST /salaries/payrolls/{id}/publish — no request body.
        publishSalaryPayroll: builder.mutation<SalaryMutationResponse, string>({
            query: (id) => ({
                url: `${PATHS.SALARIES}/payrolls/${id}/publish`,
                method: "POST",
            }),
            invalidatesTags: ["salary"],
        }),
        // POST /salaries/payrolls/{id}/pay — multipart/form-data. paidAmount is
        // optional ("bo'sh bo'lsa jami hisoblangan summa olinadi"), so it is
        // omitted rather than sent empty. Swagger states this also writes an
        // Expense row into finance, hence the "payment" invalidation.
        paySalaryPayroll: builder.mutation<SalaryMutationResponse, PayPayrollRequest>({
            query: ({ id, paymentMethodId, paidAmount }) => {
                const formData = new FormData();
                formData.append("paymentMethodId", paymentMethodId);
                if (paidAmount !== undefined && paidAmount !== null) {
                    formData.append("paidAmount", String(paidAmount));
                }
                return {
                    url: `${PATHS.SALARIES}/payrolls/${id}/pay`,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["salary", "payment"],
        }),
        deleteSalarySetting: builder.mutation<SalaryMutationResponse, string>({
            query: (id) => ({
                url: `${PATHS.SALARIES}/settings/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["salary"],
        }),
    }),
});

export const {
    useSalaryPayrollsQuery,
    useSalaryPayrollByIdQuery,
    useLazySalaryPayrollsExcelQuery,
    useSalarySettingsQuery,
    useTeacherSalariesQuery,
    useCalculateSalariesMutation,
    usePublishSalaryPayrollMutation,
    usePaySalaryPayrollMutation,
    useDeleteSalarySettingMutation,
} = salariesApi;
