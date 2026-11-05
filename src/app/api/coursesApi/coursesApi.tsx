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
    AllCoursesRequest,
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
        // GET /courses. A course belongs to ONE branch, so a list follows the branch
        // picked in the header. `branchId` says which branch the list is for:
        //  - a branch id: that branch's courses - named in the query AND in this
        //    request's x-branch-id (same belt-and-braces as students/teachers),
        //  - "all": every branch's courses whatever the header says (an explicit
        //    x-branch-id: all, as groupsApi's by-course does) - for looking a
        //    course up by id, which must see courses of any branch. Only an
        //    account that may see every branch (CEO) can rely on being answered:
        //    the group forms therefore name the branch the group belongs to
        //    instead (Groups.tsx), so a branch director / admin gets courses too,
        //  - omitted: whatever the header alone decides (baseApi attaches it, and
        //    attaches nothing on "All branches").
        // Each course carries its branchId, so a caller can narrow the answer
        // again itself (utils/groupBranch.ts) and not trust the server to have done it.
        allCourses: builder.query<CoursesResponse, AllCoursesRequest | void>({
            query: (args) => {
                const branchId = args?.branchId;
                if (!branchId) return { url: PATHS.COURSES, method: "GET" };
                if (branchId === "all") return { url: PATHS.COURSES, method: "GET", headers: branchHeader("all") };
                return {
                    url: `${PATHS.COURSES}?branchId=${encodeURIComponent(branchId)}`,
                    method: "GET",
                    headers: branchHeader(branchId),
                };
            },
            transformResponse: (response: CoursesResponse) => ({
                ...response,
                data: normalizeList<CoursesResponse["data"][number]>(response.data),
            }),
            providesTags: ["course"],
        }),
        // GET /courses/select — simplified dropdown list (id, name, code,
        // months, ...) used by filters/pickers. branchId is required by Swagger:
        // the selected branch id, or "all" for every branch (callers pass the
        // header's branch, "all" on "All branches"). The list is cached per
        // branch. Its items carry no branchId, so unlike /courses it cannot be
        // narrowed again on this side - it relies on the server honouring it.
        coursesSelect: builder.query<CourseSelectOption[], CoursesSelectRequest | void>({
            query: (args) => ({
                url: `${PATHS.COURSES}/select?branchId=${encodeURIComponent(args?.branchId || "all")}`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) => normalizeList<CourseSelectOption>(response?.data),
            providesTags: ["course"],
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
