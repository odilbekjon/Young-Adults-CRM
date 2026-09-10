import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    studentByIdResponse,
    studentsRequest,
    studentsResponse,
    CreateStudentRequest,
    UpdateStudentRequest,
    StudentResponse,
    DeleteStudentResponse,
    TransferStudentBranchRequest,
    TransferStudentBranchResponse,
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
            query: ({ page = 1, limit = 10, search, branchId }) => {
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
                return {
                    url: `${PATHS.STUDENTS}?${params.toString()}`,
                    method: "GET"
                };
            },
            providesTags: ["student"],
        }),
        studentById: builder.query<studentByIdResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}`,
                method: "GET"
            }),
            providesTags: ["student"],
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
        deleteStudent: builder.mutation<DeleteStudentResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["student"],
        }),
        transferStudentBranch: builder.mutation<TransferStudentBranchResponse, TransferStudentBranchRequest>({
            query: ({ id, newBranchId, reason }) => ({
                url: `${PATHS.STUDENTS}/${id}/transfer-branch`,
                method: "POST",
                body: reason ? { newBranchId, reason } : { newBranchId },
            }),
            invalidatesTags: ["student"],
        }),
    })
})

export const {
    useAllStudentsQuery,
    useStudentByIdQuery,
    useLazyStudentByIdQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
    useTransferStudentBranchMutation,
} = studentsApi;
