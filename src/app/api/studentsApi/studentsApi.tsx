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
            query: ({ page = 1, limit = 10 }) => ({
                url: `${PATHS.STUDENTS}?page=${page}&limit=${limit}`,
                method: "GET"
            }),
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
    })
})

export const {
    useAllStudentsQuery,
    useStudentByIdQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
} = studentsApi;
