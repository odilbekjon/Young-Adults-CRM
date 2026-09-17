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
} from "./types";

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
} = studentsApi;
