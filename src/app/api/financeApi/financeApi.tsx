import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    CreatePaymentRequest,
    UpdatePaymentRequest,
    PaymentResponse,
    FinanceChartQueryArgs,
    FinanceChartMonth,
    FinanceChartResponse,
    DebtorsQueryArgs,
    DebtorRow,
    DebtorsResult,
    PaymentMethod,
    PaymentMethodsResponse,
    ExpenseCategory,
    ExpenseCategoriesResponse,
    FinanceListQueryArgs,
    FinanceListMeta,
    ExpenseRow,
    ExpensesResult,
    PaymentRow,
    PaymentsListResult,
    PaymentDetail,
    FinanceStats,
    WithdrawalRow,
    WithdrawalsResult,
    CreateExpenseCategoryRequest,
    CreateExpenseCategoryResponse,
    CreateExpenseRequest,
    CreateExpenseResponse,
    CreatePaymentMethodRequest,
    CreatePaymentMethodResponse,
    UpdatePaymentMethodRequest,
    CreateWithdrawalRequest,
    CreateWithdrawalResponse,
    FinanceTotalResult,
    DebtorReceipt,
    UpdateExpenseCategoryRequest,
    FinanceDeleteResponse,
} from "./types";

const appendPaymentFormData = (formData: FormData, data: Partial<CreatePaymentRequest>) => {
    const { receiptUrl, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (receiptUrl) formData.append("receiptUrl", receiptUrl);
};

const appendPaymentMethodFormData = (formData: FormData, data: CreatePaymentMethodRequest) => {
    formData.append("name", data.name);
    if (data.code !== undefined && data.code !== null) formData.append("code", data.code);
    if (data.isDefault !== undefined && data.isDefault !== null) formData.append("isDefault", String(data.isDefault));
    if (data.branchId) formData.append("branchId", data.branchId);
};

const appendUpdatePaymentMethodFormData = (data: Omit<UpdatePaymentMethodRequest, "id">) => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.code !== undefined) formData.append("code", data.code);
    if (data.status !== undefined) formData.append("status", data.status);
    if (data.isDefault !== undefined) formData.append("isDefault", String(data.isDefault));
    return formData;
};

const appendExpenseCategoryFormData = (data: { name?: string; branchId?: string }) => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.branchId) formData.append("branchId", data.branchId);
    return formData;
};

const appendUpdateExpenseCategoryFormData = (data: Omit<UpdateExpenseCategoryRequest, "id">) => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.status !== undefined) formData.append("status", data.status);
    return formData;
};

const appendWithdrawalFormData = (data: CreateWithdrawalRequest) => {
    const formData = new FormData();
    formData.append("recipientName", data.recipientName);
    formData.append("amount", String(data.amount));
    formData.append("paymentMethodId", data.paymentMethodId);
    formData.append("branchId", data.branchId);
    if (data.date) formData.append("date", data.date);
    if (data.reason) formData.append("reason", data.reason);
    return formData;
};

const appendExpenseFormData = (formData: FormData, data: Partial<CreateExpenseRequest>) => {
    const { receiptUrl, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (receiptUrl) formData.append("receiptUrl", receiptUrl);
};

const asString = (raw: unknown): string =>
    raw === undefined || raw === null ? "" : String(raw);

const asId = (raw: unknown): string => {
    if (raw && typeof raw === "object") {
        return String((raw as Record<string, unknown>).id ?? "");
    }
    return raw === undefined || raw === null ? "" : String(raw);
};

// Confirmed live (2026-09): money fields on this backend (payment.amount,
// course.price, ...) aren't always plain numbers — some come back as a
// serialized decimal object ({s: sign, e: exponent, d: [digits]}, matching
// decimal.js's internal shape), which `Number(...)` on its own turns into
// NaN and silently coerces to 0. GroupCourse.price already established
// `.d[0]` as the actual amount for this exact shape (see groupsApi's
// GroupCoursePrice) — every payment/expense/withdrawal row in "All
// payments" showed "0 UZS" before this because of it.
const asMoney = (raw: unknown): number => {
    if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).d)) {
        return Number((raw as { d: unknown[] }).d[0]) || 0;
    }
    return Number(raw) || 0;
};

// Backend's exact row shape isn't documented beyond the endpoint
// description, so each field is read from a few plausible name variants
// (flat or nested under student/group objects) — same defensive approach
// used for attendancesApi's report normalizer.
const normalizeDebtorRow = (raw: unknown, index: number): DebtorRow => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const student = (obj.student ?? {}) as Record<string, unknown>;
    const group = (obj.group ?? {}) as Record<string, unknown>;
    // Confirmed live (2026-09): GET /finance/debtors actually returns a
    // plural `groups: [{id, name, courseName, status}]` array (a debtor can
    // be enrolled in more than one), not the singular group/groupName this
    // was originally guessed as — so groupId/groupName always came back
    // empty and every row showed "—" regardless of real enrollment.
    const groupsArray = Array.isArray(obj.groups) ? (obj.groups as Record<string, unknown>[]) : [];

    return {
        id: asString(obj.id ?? obj.studentId ?? student.id ?? `row-${index}`),
        studentId: asId(obj.studentId ?? student.id ?? obj.id) || null,
        name: asString(obj.name ?? student.name ?? obj.studentName),
        phone: asString(obj.phone ?? student.phone ?? obj.studentPhone),
        groupId: asId(obj.groupId ?? group.id ?? groupsArray[0]?.id ?? (typeof obj.group === "string" ? obj.group : undefined)) || null,
        groupName: asString(
            obj.groupName ?? group.name ?? (typeof obj.group === "string" ? obj.group : "")
        ) || groupsArray.map((g) => asString(g.name)).filter(Boolean).join(", "),
        balance: asMoney(obj.balance ?? obj.debt ?? obj.amount),
        status: obj.status ? asString(obj.status) : null,
    };
};

const normalizeDebtorRows = (raw: unknown): DebtorRow[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item, index) => normalizeDebtorRow(item, index));
};

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...]} ko'rinishida
// qaytarishi mumkin — branchesApi/teachersApi'dagi bir xil naqsh.
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

// Query-string builder shared by the paginated finance list endpoints
// (expenses, payments registry, withdrawals) — same param set as debtors.
const buildFinanceListQueryString = (args: FinanceListQueryArgs): string => {
    const qs = new URLSearchParams();
    qs.set("page", String(args.page ?? 1));
    qs.set("limit", String(args.limit ?? 20));
    if (args.branchId) qs.set("branchId", args.branchId);
    if (args.startDate) qs.set("startDate", args.startDate);
    if (args.endDate) qs.set("endDate", args.endDate);
    if (args.search) qs.set("search", args.search);
    if (args.categoryId) qs.set("categoryId", args.categoryId);
    if (args.paymentMethodId) qs.set("paymentMethodId", args.paymentMethodId);
    return qs.toString();
};

const normalizeListMeta = (raw: unknown): FinanceListMeta => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
        total: Number(obj.total ?? 0) || 0,
        page: Number(obj.page ?? 1) || 1,
        limit: Number(obj.limit ?? 20) || 20,
        totalPages: Number(obj.totalPages ?? 0) || 0,
    };
};

// Backend's exact row shape for /finance/expenses isn't documented beyond
// the endpoint description, so it's read from a few plausible name variants
// (flat or nested under category/paymentMethod objects) — same defensive
// approach as normalizeDebtorRow.
const normalizeExpenseRow = (raw: unknown, index: number): ExpenseRow => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const category = (obj.category ?? {}) as Record<string, unknown>;
    const method = (obj.paymentMethod ?? {}) as Record<string, unknown>;
    const creator = (obj.createdBy ?? obj.creator ?? {}) as Record<string, unknown>;

    return {
        id: asString(obj.id ?? `row-${index}`),
        amount: asMoney(obj.amount),
        categoryId: asId(obj.categoryId ?? category.id) || null,
        categoryName: asString(obj.categoryName ?? category.name),
        paymentMethodId: asId(obj.paymentMethodId ?? method.id) || null,
        paymentMethodName: asString(obj.paymentMethodName ?? method.name),
        branchId: asId(obj.branchId) || null,
        // Backend can return a full ISO timestamp here (confirmed for
        // attendance dates — see attendancesApi's same `.slice(0, 10)`), and
        // fmtDate()'s naive `split("-").reverse()` would otherwise mangle
        // the day segment with a trailing time/offset.
        date: obj.date ? asString(obj.date).slice(0, 10) : null,
        description: asString(obj.title ?? obj.description ?? obj.notes),
        createdBy: asString(creator.name ?? obj.createdBy) || null,
        createdAt: obj.createdAt ? asString(obj.createdAt) : undefined,
    };
};

const normalizeExpenseRows = (raw: unknown): ExpenseRow[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item, index) => normalizeExpenseRow(item, index));
};

// Backend's exact row shape for GET /finance/payments (registry) isn't
// documented beyond the endpoint description, so it's read defensively —
// same approach as normalizeDebtorRow.
const normalizePaymentRow = (raw: unknown, index: number): PaymentRow => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const student = (obj.student ?? {}) as Record<string, unknown>;
    const group = (obj.group ?? {}) as Record<string, unknown>;
    const method = (obj.paymentMethod ?? {}) as Record<string, unknown>;
    const creator = (obj.createdBy ?? obj.creator ?? {}) as Record<string, unknown>;

    return {
        id: asString(obj.id ?? `row-${index}`),
        amount: asMoney(obj.amount),
        studentId: asId(obj.studentId ?? student.id) || null,
        studentName: asString(obj.studentName ?? student.name),
        studentPhone: asString(obj.studentPhone ?? student.phone),
        groupId: asId(obj.groupId ?? group.id ?? (typeof obj.group === "string" ? obj.group : undefined)) || null,
        groupName: asString(obj.groupName ?? group.name ?? (typeof obj.group === "string" ? obj.group : "")),
        paymentMethodId: asId(obj.paymentMethodId ?? method.id) || null,
        paymentMethodName: asString(obj.paymentMethodName ?? method.name),
        branchId: asId(obj.branchId) || null,
        date: obj.date ? asString(obj.date).slice(0, 10) : null,
        notes: asString(obj.notes ?? obj.comment),
        createdBy: asString(creator.name ?? obj.createdBy) || null,
        createdAt: obj.createdAt ? asString(obj.createdAt) : undefined,
    };
};

const normalizePaymentRows = (raw: unknown): PaymentRow[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item, index) => normalizePaymentRow(item, index));
};

const normalizePaymentDetail = (raw: unknown): PaymentDetail => {
    const row = normalizePaymentRow(raw, 0);
    const obj = (raw ?? {}) as Record<string, unknown>;
    const branch = (obj.branch ?? {}) as Record<string, unknown>;
    return {
        ...row,
        receiptUrl: obj.receiptUrl ? asString(obj.receiptUrl) : null,
        checkNumber: asString(
            obj.checkNumber ?? obj.checkNo ?? obj.receiptNumber ?? obj.receiptNo ?? obj.number
        ) || null,
        branchName: asString(obj.branchName ?? branch.name) || null,
    };
};

// Backend's exact row shape for /finance/withdrawals isn't documented
// beyond the endpoint description, so it's read defensively.
const normalizeWithdrawalRow = (raw: unknown, index: number): WithdrawalRow => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const creator = (obj.createdBy ?? obj.creator ?? {}) as Record<string, unknown>;

    return {
        id: asString(obj.id ?? `row-${index}`),
        amount: asMoney(obj.amount),
        branchId: asId(obj.branchId) || null,
        date: obj.date ? asString(obj.date).slice(0, 10) : null,
        comment: asString(obj.comment ?? obj.notes ?? obj.description),
        createdBy: asString(creator.name ?? obj.createdBy) || null,
        createdAt: obj.createdAt ? asString(obj.createdAt) : undefined,
    };
};

const normalizeWithdrawalRows = (raw: unknown): WithdrawalRow[] => {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item, index) => normalizeWithdrawalRow(item, index));
};

const normalizeFinanceTotal = (raw: unknown): FinanceTotalResult => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    if (typeof raw === "number") return { total: raw };
    return { total: asMoney(obj.total ?? obj.sum ?? obj.amount) };
};

const normalizeDebtorReceipt = (raw: unknown): DebtorReceipt => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const student = (obj.student ?? {}) as Record<string, unknown>;
    const group = (obj.group ?? {}) as Record<string, unknown>;
    const branch = (obj.branch ?? {}) as Record<string, unknown>;

    return {
        studentId: asId(obj.studentId ?? student.id ?? obj.id) || null,
        name: asString(obj.name ?? student.name ?? obj.studentName),
        phone: asString(obj.phone ?? student.phone ?? obj.studentPhone),
        groupName: asString(obj.groupName ?? group.name ?? (typeof obj.group === "string" ? obj.group : "")),
        balance: asMoney(obj.balance ?? obj.debt ?? obj.amount),
        branchName: asString(obj.branchName ?? branch.name) || null,
        createdAt: obj.createdAt ? asString(obj.createdAt) : undefined,
    };
};

const normalizeFinanceStats = (raw: unknown): FinanceStats => {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
        totalIncomeThisMonth: asMoney(obj.totalIncomeThisMonth),
        totalExpensesThisMonth: asMoney(obj.totalExpensesThisMonth),
        totalSalariesThisMonth: asMoney(obj.totalSalariesThisMonth),
        netProfitThisMonth: asMoney(obj.netProfitThisMonth),
    };
};

export const financeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createPayment: builder.mutation<PaymentResponse, CreatePaymentRequest>({
            query: (data) => {
                const formData = new FormData();
                appendPaymentFormData(formData, data);
                return {
                    url: PATHS.PAYMENTS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["payment", "student", "group"],
        }),
        // PATCH /finance/payments/{id} — see UpdatePaymentRequest's doc comment
        // for how its existence was confirmed.
        updatePayment: builder.mutation<PaymentResponse, UpdatePaymentRequest>({
            query: ({ id, ...data }) => {
                const formData = new FormData();
                appendPaymentFormData(formData, data);
                return {
                    url: `${PATHS.PAYMENTS}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["payment", "student", "group"],
        }),
        financeChart: builder.query<FinanceChartMonth[], FinanceChartQueryArgs>({
            query: ({ year, branchId }) => {
                const qs = new URLSearchParams();
                qs.set("year", String(year));
                if (branchId) qs.set("branchId", branchId);
                return {
                    url: `${PATHS.CHART}?${qs.toString()}`,
                    method: "GET",
                };
            },
            transformResponse: (response: FinanceChartResponse) => response?.data ?? [],
            providesTags: ["payment"],
        }),
        debtors: builder.query<DebtorsResult, DebtorsQueryArgs>({
            query: (args) => ({
                url: `${PATHS.DEBTORS}?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown; meta?: unknown }) => {
                // TEMP DEBUG — remove once the real row shape is confirmed.
                if (import.meta.env.DEV) console.log("[financeApi] debtors raw response:", response);
                return {
                    rows: normalizeDebtorRows(response?.data),
                    meta: normalizeListMeta(response?.meta),
                };
            },
            providesTags: ["payment", "student"],
        }),
        debtorsTotal: builder.query<FinanceTotalResult, DebtorsQueryArgs>({
            query: (args) => ({
                url: `${PATHS.DEBTORS}/total?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeFinanceTotal(response?.data),
            providesTags: ["payment", "student"],
        }),
        // GET /finance/debtors/excel — downloads the current (filtered) debtors
        // list as a file. Modeled as a lazy query returning a Blob, same
        // approach as attendancesApi's groupAttendanceExcel.
        debtorsExcel: builder.query<Blob, DebtorsQueryArgs>({
            query: (args) => ({
                url: `${PATHS.DEBTORS}/excel?${buildFinanceListQueryString(args)}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /finance/debtors/{studentId}/receipt — the student's full current
        // debt/payment balance, for printing.
        debtorReceipt: builder.query<DebtorReceipt, string>({
            query: (studentId) => ({
                url: `${PATHS.DEBTORS}/${studentId}/receipt`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeDebtorReceipt(response?.data),
            providesTags: ["payment", "student"],
        }),
        paymentMethods: builder.query<PaymentMethod[], void>({
            query: () => ({
                url: PATHS.PAYMENT_METHODS,
                method: "GET",
            }),
            transformResponse: (response: PaymentMethodsResponse | PaymentMethod[]) =>
                normalizeList<PaymentMethod>(response),
            providesTags: ["payment"],
        }),
        createPaymentMethod: builder.mutation<PaymentMethod, CreatePaymentMethodRequest>({
            query: (data) => {
                const formData = new FormData();
                appendPaymentMethodFormData(formData, data);
                return {
                    url: PATHS.PAYMENT_METHODS,
                    method: "POST",
                    body: formData,
                };
            },
            transformResponse: (response: CreatePaymentMethodResponse | PaymentMethod) =>
                (response && typeof response === "object" && "data" in response)
                    ? (response as CreatePaymentMethodResponse).data
                    : (response as PaymentMethod),
            invalidatesTags: ["payment"],
        }),
        updatePaymentMethod: builder.mutation<PaymentMethod, UpdatePaymentMethodRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.PAYMENT_METHODS}/${id}`,
                method: "PATCH",
                body: appendUpdatePaymentMethodFormData(data),
            }),
            transformResponse: (response: CreatePaymentMethodResponse | PaymentMethod) =>
                (response && typeof response === "object" && "data" in response)
                    ? (response as CreatePaymentMethodResponse).data
                    : (response as PaymentMethod),
            invalidatesTags: ["payment"],
        }),
        deletePaymentMethod: builder.mutation<FinanceDeleteResponse, string>({
            query: (id) => ({
                url: `${PATHS.PAYMENT_METHODS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["payment"],
        }),
        expenseCategories: builder.query<ExpenseCategory[], void>({
            query: () => ({
                url: PATHS.EXPENSE_CATEGORIES,
                method: "GET",
            }),
            transformResponse: (response: ExpenseCategoriesResponse | ExpenseCategory[]) =>
                normalizeList<ExpenseCategory>(response),
            providesTags: ["payment"],
        }),
        // Swagger labels this endpoint's body as multipart/form-data (same as
        // createExpense/createPaymentMethod) — previously sent as a plain
        // JSON object, which doesn't match the documented content-type.
        createExpenseCategory: builder.mutation<ExpenseCategory, CreateExpenseCategoryRequest>({
            query: (data) => ({
                url: PATHS.EXPENSE_CATEGORIES,
                method: "POST",
                body: appendExpenseCategoryFormData(data),
            }),
            transformResponse: (response: CreateExpenseCategoryResponse | ExpenseCategory) =>
                (response && typeof response === "object" && "data" in response)
                    ? (response as CreateExpenseCategoryResponse).data
                    : (response as ExpenseCategory),
            invalidatesTags: ["payment"],
        }),
        updateExpenseCategory: builder.mutation<ExpenseCategory, UpdateExpenseCategoryRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.EXPENSE_CATEGORIES}/${id}`,
                method: "PATCH",
                body: appendUpdateExpenseCategoryFormData(data),
            }),
            transformResponse: (response: CreateExpenseCategoryResponse | ExpenseCategory) =>
                (response && typeof response === "object" && "data" in response)
                    ? (response as CreateExpenseCategoryResponse).data
                    : (response as ExpenseCategory),
            invalidatesTags: ["payment"],
        }),
        deleteExpenseCategory: builder.mutation<FinanceDeleteResponse, string>({
            query: (id) => ({
                url: `${PATHS.EXPENSE_CATEGORIES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["payment"],
        }),
        createExpense: builder.mutation<CreateExpenseResponse, CreateExpenseRequest>({
            query: (data) => {
                const formData = new FormData();
                appendExpenseFormData(formData, data);
                return {
                    url: PATHS.EXPENSES,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["payment"],
        }),
        deleteExpense: builder.mutation<FinanceDeleteResponse, string>({
            query: (id) => ({
                url: `${PATHS.EXPENSES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["payment"],
        }),
        expenses: builder.query<ExpensesResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.EXPENSES}?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown; meta?: unknown }) => ({
                rows: normalizeExpenseRows(response?.data),
                meta: normalizeListMeta(response?.meta),
            }),
            providesTags: ["payment"],
        }),
        expensesTotal: builder.query<FinanceTotalResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.EXPENSES}/total?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeFinanceTotal(response?.data),
            providesTags: ["payment"],
        }),
        // GET /finance/expenses/excel — downloads the current (filtered)
        // expenses list as a file. Same lazy-Blob approach as debtorsExcel.
        expensesExcel: builder.query<Blob, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.EXPENSES}/excel?${buildFinanceListQueryString(args)}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        paymentsList: builder.query<PaymentsListResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.PAYMENTS}?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown; meta?: unknown }) => ({
                rows: normalizePaymentRows(response?.data),
                meta: normalizeListMeta(response?.meta),
            }),
            providesTags: ["payment"],
        }),
        paymentById: builder.query<PaymentDetail, string>({
            query: (id) => ({
                url: `${PATHS.PAYMENTS}/${id}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) => {
                // TEMP DEBUG — remove once the real checkNumber/branch field names are confirmed.
                if (import.meta.env.DEV) console.log("[financeApi] payment detail raw response:", response);
                return normalizePaymentDetail(response?.data);
            },
            providesTags: ["payment"],
        }),
        // GET /finance/payments/{id}/receipt — the dedicated print endpoint
        // ("bitta to'lov bo'yicha chop etish uchun kerakli barcha
        // ma'lumotlarni qaytaradi"), distinct from the plain detail endpoint
        // above. This is what PaymentReceiptModal is backed by.
        paymentReceipt: builder.query<PaymentDetail, string>({
            query: (id) => ({
                url: `${PATHS.PAYMENTS}/${id}/receipt`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizePaymentDetail(response?.data),
            providesTags: ["payment"],
        }),
        paymentsTotal: builder.query<FinanceTotalResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.PAYMENTS}/total?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeFinanceTotal(response?.data),
            providesTags: ["payment"],
        }),
        // GET /finance/payments/excel — downloads the current (filtered)
        // payments registry as a file. Same lazy-Blob approach as debtorsExcel.
        paymentsExcel: builder.query<Blob, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.PAYMENTS}/excel?${buildFinanceListQueryString(args)}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // DELETE /finance/payments/{id} — "Xato kiritilgan to'lovni bekor
        // qiladi (status: REFUNDED) va audit log yozadi." A refund/soft-delete,
        // not a hard delete, but modeled the same way as the other Finance
        // DELETE endpoints since Swagger gives no distinct response shape.
        deletePayment: builder.mutation<FinanceDeleteResponse, string>({
            query: (id) => ({
                url: `${PATHS.PAYMENTS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["payment", "student"],
        }),
        financeStats: builder.query<FinanceStats, void>({
            query: () => ({
                url: PATHS.STATS,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeFinanceStats(response?.data),
            providesTags: ["payment"],
        }),
        withdrawals: builder.query<WithdrawalsResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.WITHDRAWALS}?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown; meta?: unknown }) => ({
                rows: normalizeWithdrawalRows(response?.data),
                meta: normalizeListMeta(response?.meta),
            }),
            providesTags: ["payment"],
        }),
        withdrawalsTotal: builder.query<FinanceTotalResult, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.WITHDRAWALS}/total?${buildFinanceListQueryString(args)}`,
                method: "GET",
            }),
            transformResponse: (response: { success: boolean; data: unknown }) =>
                normalizeFinanceTotal(response?.data),
            providesTags: ["payment"],
        }),
        // GET /finance/withdrawals/excel — downloads the current (filtered)
        // withdrawals list as a file. Same lazy-Blob approach as debtorsExcel.
        withdrawalsExcel: builder.query<Blob, FinanceListQueryArgs>({
            query: (args) => ({
                url: `${PATHS.WITHDRAWALS}/excel?${buildFinanceListQueryString(args)}`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // Swagger labels this endpoint's body as multipart/form-data (same as
        // createExpense/createPaymentMethod) — previously sent as a plain
        // JSON object, which doesn't match the documented content-type.
        createWithdrawal: builder.mutation<CreateWithdrawalResponse, CreateWithdrawalRequest>({
            query: (data) => ({
                url: PATHS.WITHDRAWALS,
                method: "POST",
                body: appendWithdrawalFormData(data),
            }),
            invalidatesTags: ["payment"],
        }),
        deleteWithdrawal: builder.mutation<FinanceDeleteResponse, string>({
            query: (id) => ({
                url: `${PATHS.WITHDRAWALS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["payment"],
        }),
    })
})

export const {
    useCreatePaymentMutation,
    useUpdatePaymentMutation,
    useFinanceChartQuery,
    useDebtorsQuery,
    useDebtorsTotalQuery,
    useLazyDebtorsExcelQuery,
    useDebtorReceiptQuery,
    usePaymentMethodsQuery,
    useCreatePaymentMethodMutation,
    useUpdatePaymentMethodMutation,
    useDeletePaymentMethodMutation,
    useExpenseCategoriesQuery,
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    useDeleteExpenseCategoryMutation,
    useExpensesQuery,
    useExpensesTotalQuery,
    useLazyExpensesExcelQuery,
    useCreateExpenseMutation,
    useDeleteExpenseMutation,
    usePaymentsListQuery,
    usePaymentByIdQuery,
    usePaymentReceiptQuery,
    usePaymentsTotalQuery,
    useLazyPaymentsExcelQuery,
    useDeletePaymentMutation,
    useFinanceStatsQuery,
    useWithdrawalsQuery,
    useWithdrawalsTotalQuery,
    useLazyWithdrawalsExcelQuery,
    useCreateWithdrawalMutation,
    useDeleteWithdrawalMutation,
} = financeApi;
