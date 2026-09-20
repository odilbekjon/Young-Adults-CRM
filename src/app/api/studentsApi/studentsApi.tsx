import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    studentByIdResponse,
    studentsRequest,
    studentsResponse,
    StudentsExcelQueryArgs,
    CreateStudentRequest,
    UpdateStudentRequest,
    StudentResponse,
    DeleteStudentResponse,
    ToggleStudentStatusResponse,
    TransferStudentBranchRequest,
    TransferStudentBranchResponse,
    StudentGroupMembership,
    StudentGroupMembershipsResponse,
    UpdateStudentStatusRequest,
    UpdateStudentStatusResponse,
    StudentComment,
    StudentHistoryEntry,
    StudentSmsEntry,
    StudentSmsHistoryRequest,
    StudentPaymentsRequest,
    StudentPaymentsResult,
    StudentFinanceHistoryEntry,
} from "./types";

const asString = (raw: unknown): string | null => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === "object") return String((raw as Record<string, unknown>).name ?? (raw as Record<string, unknown>).id ?? "") || null;
    return String(raw);
};

// Backend's exact envelope for GET /students/{id}/comments isn't documented
// beyond a 200 status — normalized the same defensive way as groupsApi's
// normalizeComments.
const normalizeStudentComments = (raw: unknown): StudentComment[] => {
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

// GET /students/{id}/history — same defensive normalization as groupsApi's
// normalizeHistory (undocumented envelope beyond a bare 200).
const normalizeStudentHistory = (raw: unknown): StudentHistoryEntry[] => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.history)
        ? container.history
        : Array.isArray(container.events)
        ? container.events
        : Array.isArray(container.data)
        ? container.data
        : [];
    return (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        type: String(r.type ?? r.action ?? r.event ?? "").toUpperCase(),
        detail: String(r.detail ?? r.description ?? r.message ?? ""),
        createdAt: String(r.createdAt ?? r.timestamp ?? r.date ?? ""),
        actor: asString(r.modifiedBy ?? r.actor ?? r.createdBy ?? r.user),
    }));
};

const normalizeStudentSmsHistory = (raw: unknown): StudentSmsEntry[] => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.rows)
        ? container.rows
        : Array.isArray(container.data)
        ? container.data
        : [];
    return (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        text: String(r.text ?? r.message ?? r.content ?? ""),
        status: (r.status as string | undefined) ?? null,
        createdAt: String(r.createdAt ?? r.sentAt ?? r.date ?? ""),
    }));
};

// GET /students/{id}/payments' own summary block (totalPaid/totalCharged/
// balance/totalDebt) shares field names with GET /students/{id} — rows are
// normalized the same shape as financeApi's PaymentRow so PaymentsTable
// (StudentProfile) can consume either source interchangeably.
const normalizeStudentPayments = (raw: unknown): StudentPaymentsResult => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const dataBlock = (container.data ?? container) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(dataBlock)
        ? dataBlock
        : Array.isArray(dataBlock.rows)
        ? dataBlock.rows
        : Array.isArray(dataBlock.payments)
        ? dataBlock.payments
        : [];
    const rows = (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        amount: Number(r.amount) || 0,
        studentId: asString(r.studentId ?? r.student),
        studentName: String(r.studentName ?? ""),
        studentPhone: String(r.studentPhone ?? ""),
        groupId: asString(r.groupId ?? r.group),
        groupName: String(r.groupName ?? ""),
        paymentMethodId: asString(r.paymentMethodId ?? r.paymentMethod),
        paymentMethodName: String(r.paymentMethodName ?? ""),
        branchId: asString(r.branchId),
        date: (r.date as string | undefined) ?? null,
        notes: String(r.notes ?? r.comment ?? ""),
        createdBy: asString(r.createdBy),
        createdAt: r.createdAt as string | undefined,
    }));
    const meta = (container.meta ?? dataBlock.meta ?? {}) as Record<string, unknown>;
    const total = Number(meta.total ?? meta.totalItems) || rows.length;
    const limit = Number(meta.limit) || rows.length || 10;
    return {
        rows,
        summary: {
            totalPaid: Number(dataBlock.totalPaid) || 0,
            totalCharged: Number(dataBlock.totalCharged) || 0,
            balance: Number(dataBlock.balance) || 0,
            totalDebt: Number(dataBlock.totalDebt) || 0,
        },
        meta: {
            total,
            page: Number(meta.page) || 1,
            limit,
            totalPages: Number(meta.totalPages) || Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
    };
};

const normalizeStudentFinanceHistory = (raw: unknown): StudentFinanceHistoryEntry[] => {
    const container = (raw ?? {}) as Record<string, unknown>;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.rows)
        ? container.rows
        : Array.isArray(container.data)
        ? container.data
        : [];
    return (list as Record<string, unknown>[]).map((r, i) => ({
        id: String(r.id ?? r._id ?? i),
        month: String(r.month ?? r.period ?? r.date ?? ""),
        charged: Number(r.charged ?? r.debt ?? r.expected) || 0,
        paid: Number(r.paid ?? r.payment) || 0,
        balance: Number(r.balance) || 0,
        groupName: asString(r.groupName ?? r.group),
        receivedBy: asString(r.receivedBy ?? r.createdBy ?? r.processedBy),
    }));
};

const appendStudentFormData = (formData: FormData, data: Partial<CreateStudentRequest>) => {
    const { branchIds, ...rest } = data;
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (branchIds) branchIds.forEach((id) => formData.append("branchIds", id));
};

export const studentsApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allStudents: builder.query<studentsResponse, studentsRequest>({
            query: ({ page = 1, limit = 10, search, branchId, status }) => {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("limit", String(limit));
                // teachersApi/leadsApi/financeApi'da ishlatilgan bir xil "search"
                // convention — students endpointi buni qo'llab-quvvatlamasa ham,
                // natija Header qidiruvida client-side filter bilan qo'shimcha
                // tekshiriladi (Header.tsx'dagi StudentSearchBar).
                if (search) params.set("search", search);
                // x-branch-id header hamma so'rovga avtomatik qo'shiladi, lekin
                // teachersApi kabi bu yerda ham branchId'ni query param sifatida
                // aniq yuboramiz — faqat header'ga suyanish filialga tegishli
                // studentlarning ko'pchiligini yo'qotib qo'yayotgani aniqlangan
                // (guruh a'zoligi orqali filialga bog'langan studentlar GET
                // /students javobida chiqmayapti edi).
                if (branchId) params.set("branchId", branchId);
                // Swagger: GET /students' own `status` query param (ACTIVE/
                // INACTIVE) — without it the endpoint only returns ACTIVE
                // students, so this must be sent explicitly whenever the caller
                // wants archived (INACTIVE) students to show up at all.
                if (status) params.set("status", status);
                return {
                    url: `${PATHS.STUDENTS}?${params.toString()}`,
                    method: "GET"
                };
            },
            providesTags: ["student"],
        }),
        // GET /students/excel — downloads the (optionally filtered) students
        // list as a file. Same lazy-Blob approach as teachersApi's
        // teachersExcel / groupsApi's groupsExcel / financeApi's *Excel
        // endpoints — query params confirmed against Swagger (search,
        // status, page, limit, branchId).
        studentsExcel: builder.query<Blob, StudentsExcelQueryArgs | void>({
            query: ({ page, limit, search, status, branchId } = {}) => {
                const params = new URLSearchParams();
                if (page) params.set("page", String(page));
                if (limit) params.set("limit", String(limit));
                if (search) params.set("search", search);
                if (status) params.set("status", status);
                if (branchId) params.set("branchId", branchId);
                return {
                    url: `${PATHS.STUDENTS}/excel?${params.toString()}`,
                    method: "GET",
                    responseHandler: (response) => response.blob(),
                };
            },
        }),
        studentById: builder.query<studentByIdResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}`,
                method: "GET"
            }),
            providesTags: ["student"],
        }),
        // GET /students/{id}/groups — every group membership the student has
        // (currently studying, frozen, or trial), used by Student Profile's
        // Groups tab. This is distinct from GET /students (list) and GET
        // /students/{id} (StudentDetail), neither of which include per-group
        // status/course/teacher/dates — those pages previously fell back to
        // unrelated mock data for this.
        studentGroupMemberships: builder.query<StudentGroupMembership[], string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}/groups`,
                method: "GET",
            }),
            transformResponse: (response: StudentGroupMembershipsResponse) => response?.data ?? [],
            providesTags: ["student", "studentGroup"],
        }),
        createStudent: builder.mutation<StudentResponse, CreateStudentRequest>({
            query: (data) => {
                const formData = new FormData();
                appendStudentFormData(formData, data);
                return {
                    url: PATHS.STUDENTS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["student"],
        }),
        updateStudent: builder.mutation<StudentResponse, UpdateStudentRequest>({
            query: ({ id, ...data }) => {
                const formData = new FormData();
                appendStudentFormData(formData, data);
                return {
                    url: `${PATHS.STUDENTS}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["student"],
        }),
        // DELETE /students/{id} — Swagger: "Talabani tizimdan xavfsiz tarzda
        // butunlay o'chiradi. Agar talabaning faol guruhlari mavjud bo'lsa
        // xatolik qaytaradi." i.e. permanent delete; the backend itself
        // rejects it while the student still has active group memberships.
        // Distinct from toggleStudentStatus below, which archives (INACTIVE)
        // without deleting anything.
        deleteStudent: builder.mutation<DeleteStudentResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}`,
                method: "DELETE",
            }),
            // Also drops the student out of the Archive page (GET /archives)
            // whenever a permanent delete is issued directly from there.
            invalidatesTags: ["student", "archive"],
        }),
        toggleStudentStatus: builder.mutation<ToggleStudentStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            // Flipping status moves the student between the Students list and
            // the Archive page — both must refetch, not just "student".
            invalidatesTags: ["student", "archive"],
        }),
        transferStudentBranch: builder.mutation<TransferStudentBranchResponse, TransferStudentBranchRequest>({
            query: ({ id, newBranchId, reason }) => ({
                url: `${PATHS.STUDENTS}/${id}/transfer-branch`,
                method: "POST",
                body: reason ? { newBranchId, reason } : { newBranchId },
            }),
            // Per this endpoint's own doc comment above (TransferStudentBranchRequest
            // in types.d.ts), the backend ends the student's group memberships in
            // the old branch as part of this call — invalidating only "student"
            // left SingleGroup's own roster (useGroupByIdQuery/useStudentGroupsQuery,
            // tagged "group"/"studentGroup") stale, so the student kept showing in
            // their old group's page until an unrelated refetch happened to occur.
            invalidatesTags: ["student", "group", "studentGroup"],
        }),
        // POST /students/{id}/status — sets the student's account-wide status
        // (ACTIVE/INACTIVE/FROZEN/DEBTOR) and records `reason` to their
        // history, application/json body. Used instead of the blind
        // toggleStudentStatus whenever a reason needs to be attached (e.g.
        // SingleGroup's "remove student" dialog archiving them with the
        // selected reason/comment).
        updateStudentStatus: builder.mutation<UpdateStudentStatusResponse, UpdateStudentStatusRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.STUDENTS}/${id}/status`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["student", "archive"],
        }),
        // GET /students/{id}/comments — read-only (Swagger documents no POST
        // for this resource anywhere), see StudentComment's own doc comment.
        studentComments: builder.query<StudentComment[], string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}/comments`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentComments((response as { data?: unknown })?.data ?? response),
            providesTags: ["student"],
        }),
        studentHistory: builder.query<StudentHistoryEntry[], string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}/history`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentHistory((response as { data?: unknown })?.data ?? response),
            providesTags: ["student"],
        }),
        studentSmsHistory: builder.query<StudentSmsEntry[], StudentSmsHistoryRequest>({
            query: ({ id, ...args }) => {
                const params = new URLSearchParams();
                if (args.search) params.set("search", args.search);
                if (args.status) params.set("status", args.status);
                if (args.page) params.set("page", String(args.page));
                if (args.limit) params.set("limit", String(args.limit));
                if (args.branchId) params.set("branchId", args.branchId);
                return {
                    url: `${PATHS.STUDENTS}/${id}/sms-history?${params.toString()}`,
                    method: "GET",
                };
            },
            transformResponse: (response: unknown) => normalizeStudentSmsHistory((response as { data?: unknown })?.data ?? response),
            providesTags: ["student"],
        }),
        // GET /students/{id}/payments — the student's own payment registry
        // plus totals (totalPaid/totalCharged/balance/totalDebt), scoped
        // server-side by id rather than the name-search this app previously
        // had to do against the whole-branch GET /finance/payments registry.
        studentPayments: builder.query<StudentPaymentsResult, StudentPaymentsRequest>({
            query: ({ id, ...args }) => {
                const params = new URLSearchParams();
                if (args.page) params.set("page", String(args.page));
                if (args.limit) params.set("limit", String(args.limit));
                if (args.groupId) params.set("groupId", args.groupId);
                if (args.paymentMethodId) params.set("paymentMethodId", args.paymentMethodId);
                if (args.status) params.set("status", args.status);
                if (args.startDate) params.set("startDate", args.startDate);
                if (args.endDate) params.set("endDate", args.endDate);
                return {
                    url: `${PATHS.STUDENTS}/${id}/payments?${params.toString()}`,
                    method: "GET",
                };
            },
            transformResponse: (response: unknown) => normalizeStudentPayments(response),
            providesTags: ["student", "payment"],
        }),
        studentFinanceHistory: builder.query<StudentFinanceHistoryEntry[], string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}/finance-history`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStudentFinanceHistory((response as { data?: unknown })?.data ?? response),
            providesTags: ["student", "payment"],
        }),
    })
})

export const {
    useAllStudentsQuery,
    useLazyStudentsExcelQuery,
    useStudentByIdQuery,
    useLazyStudentByIdQuery,
    useStudentGroupMembershipsQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
    useToggleStudentStatusMutation,
    useTransferStudentBranchMutation,
    useUpdateStudentStatusMutation,
    useStudentCommentsQuery,
    useStudentHistoryQuery,
    useStudentSmsHistoryQuery,
    useStudentPaymentsQuery,
    useStudentFinanceHistoryQuery,
} = studentsApi;
