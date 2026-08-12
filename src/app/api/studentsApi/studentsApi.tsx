import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { studentByIdResponse, studentsRequest, studentsResponse } from "./types";

export const studentsApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allStudents: builder.query<studentsResponse, studentsRequest>({
            query: ({ page = 1, limit = 10 }) => ({
                url: `${PATHS.STUDENTS}?page=${page}&limit=${limit}`,
                method: "GET"
            }),
        }),
        studentById: builder.query<studentByIdResponse, string>({
            query: (id) => ({
                url: `${PATHS.STUDENTS}/${id}`,
                method: "GET"
            }),
        }),
    })
})

export const { useAllStudentsQuery, useStudentByIdQuery } = studentsApi;