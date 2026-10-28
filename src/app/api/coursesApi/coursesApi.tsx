import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    CoursesResponse,
    CourseResponse,
    CreateCourseRequest,
    UpdateCourseRequest,
    DeleteCourseResponse,
    ToggleCourseStatusResponse,
    BulkDeleteCoursesRequest,
    BulkToggleCourseStatusRequest,
    BulkCoursesResponse,
    CourseSelectOption,
    CoursesSelectRequest,
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

// Swagger (POST /courses): the course's branch "is taken from the branch
// selector or the token" — i.e. from x-branch-id, with the body's branchId
// required alongside. The form can pick any branch, not the one selected in the
// header (or none at all on "All branches"), so a write is scoped to the
// course's own branch. Otherwise the backend works with the wrong branch, e.g.
// answering "a course with this name already exists in this branch" because the
// name is taken in the selector's/token's branch.
const branchHeader = (branchId: string) => ({ "x-branch-id": branchId });

export const coursesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Courses are shared by all branches, so the list is never scoped to the
        // selected branch (baseApi also leaves x-branch-id off GET /courses).
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
        // GET /courses/select — simplified dropdown list (id, name, code,
        // months, ...) used by filters/pickers. branchId is required by
        // Swagger: required branchId — always "all", since courses are shared
        // by every branch (the arg is kept so callers stay unchanged).
        coursesSelect: builder.query<CourseSelectOption[], CoursesSelectRequest | void>({
            query: () => ({
                url: `${PATHS.COURSES}/select?branchId=all`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeList<CourseSelectOption>(response?.data),
            providesTags: ["course"],
            serializeQueryArgs: ({ endpointName }) => endpointName,
        }),
        createCourse: builder.mutation<CourseResponse, CreateCourseRequest>({
            query: ({ name, price, branchId, code, months, lessonDuration, lessonsPerMonth, description }) => {
                const formData = new FormData();
                formData.append("name", name);
                if (price !== undefined) formData.append("price", String(price));
                formData.append("branchId", branchId);
                if (code !== undefined && code !== "") formData.append("code", code);
                if (months !== undefined) formData.append("months", String(months));
                if (lessonDuration !== undefined) formData.append("lessonDuration", String(lessonDuration));
                if (lessonsPerMonth !== undefined) formData.append("lessonsPerMonth", String(lessonsPerMonth));
                if (description !== undefined && description !== "") formData.append("description", description);
                return {
                    url: PATHS.COURSES,
                    method: "POST",
                    body: formData,
                    headers: branchHeader(branchId),
                };
            },
            invalidatesTags: ["course"],
        }),
        updateCourse: builder.mutation<CourseResponse, UpdateCourseRequest>({
            query: ({ id, name, price, branchId, code, months, lessonDuration, lessonsPerMonth, description }) => {
                const formData = new FormData();
                if (name !== undefined) formData.append("name", name);
                if (price !== undefined) formData.append("price", String(price));
                if (branchId !== undefined) formData.append("branchId", branchId);
                if (code !== undefined && code !== "") formData.append("code", code);
                if (months !== undefined) formData.append("months", String(months));
                if (lessonDuration !== undefined) formData.append("lessonDuration", String(lessonDuration));
                if (lessonsPerMonth !== undefined) formData.append("lessonsPerMonth", String(lessonsPerMonth));
                if (description !== undefined && description !== "") formData.append("description", description);
                return {
                    url: `${PATHS.COURSES}/${id}`,
                    method: "PATCH",
                    body: formData,
                    headers: branchId ? branchHeader(branchId) : undefined,
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
        // PATCH /courses/bulk-toggle-status — one request for the whole selection.
        // The ids may belong to different branches, so it isn't scoped to the
        // branch selected in the header.
        bulkToggleCourseStatus: builder.mutation<BulkCoursesResponse, BulkToggleCourseStatusRequest>({
            query: (body) => ({
                url: `${PATHS.COURSES}/bulk-toggle-status`,
                method: "PATCH",
                body,
                headers: branchHeader("all"),
            }),
            invalidatesTags: ["course"],
        }),
        // POST /courses/bulk-delete — hard delete of the given courses (the
        // backend refuses those that still have active groups).
        bulkDeleteCourses: builder.mutation<BulkCoursesResponse, BulkDeleteCoursesRequest>({
            query: (body) => ({
                url: `${PATHS.COURSES}/bulk-delete`,
                method: "POST",
                body,
                headers: branchHeader("all"),
            }),
            invalidatesTags: ["course"],
        }),
    })
})

export const {
    useAllCoursesQuery,
    useCoursesSelectQuery,
    useCreateCourseMutation,
    useUpdateCourseMutation,
    useToggleCourseStatusMutation,
    useDeleteCourseMutation,
    useBulkToggleCourseStatusMutation,
    useBulkDeleteCoursesMutation,
} = coursesApi;
