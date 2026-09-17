import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    CoursesResponse,
    CourseResponse,
    CreateCourseRequest,
    UpdateCourseRequest,
    DeleteCourseResponse,
    ToggleCourseStatusResponse,
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
        // PATCH /courses/{id}/toggle-status (Swagger) — flips the course
        // between ACTIVE and INACTIVE (archive) without touching its groups,
        // unlike deleteCourse below (DELETE /courses/{id}), which the backend
        // rejects outright while any group still references the course.
        toggleCourseStatus: builder.mutation<ToggleCourseStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.COURSES}/${id}/toggle-status`,
                method: "PATCH",
            }),
            invalidatesTags: ["course"],
        }),
        // DELETE /courses/{id} — Swagger: hard delete, rejected (409) if the
        // course still has groups. Reserved for permanently removing an
        // already-archived (INACTIVE) course.
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
    useToggleCourseStatusMutation,
    useDeleteCourseMutation,
} = coursesApi;
