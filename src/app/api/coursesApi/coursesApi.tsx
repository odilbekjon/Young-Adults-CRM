import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    CoursesResponse,
    CourseResponse,
    CreateCourseRequest,
    UpdateCourseRequest,
    DeleteCourseResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz.
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

export const coursesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allCourses: builder.query<CoursesResponse, void>({
            query: () => ({
                url: PATHS.COURSES,
                method: "GET"
            }),
            transformResponse: (response: CoursesResponse) => ({
                ...response,
                data: normalizeList<CoursesResponse["data"][number]>(response.data),
            }),
            providesTags: ["course"],
        }),
        createCourse: builder.mutation<CourseResponse, CreateCourseRequest>({
            query: ({ name, price, branchId }) => {
                const formData = new FormData();
                formData.append("name", name);
                if (price !== undefined) formData.append("price", String(price));
                formData.append("branchId", branchId);
                return {
                    url: PATHS.COURSES,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["course"],
        }),
        updateCourse: builder.mutation<CourseResponse, UpdateCourseRequest>({
            query: ({ id, name, price, branchId }) => {
                const formData = new FormData();
                if (name !== undefined) formData.append("name", name);
                if (price !== undefined) formData.append("price", String(price));
                if (branchId !== undefined) formData.append("branchId", branchId);
                return {
                    url: `${PATHS.COURSES}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["course"],
        }),
        deleteCourse: builder.mutation<DeleteCourseResponse, string>({
            query: (id) => ({
                url: `${PATHS.COURSES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["course"],
        }),
    })
})

export const {
    useAllCoursesQuery,
    useCreateCourseMutation,
    useUpdateCourseMutation,
    useDeleteCourseMutation,
} = coursesApi;
