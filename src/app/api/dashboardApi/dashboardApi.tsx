import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    DashboardStatsResponse,
    ScheduleResponse,
    AttendanceStatsResponse,
    RecentActivitiesResponse,
    TeacherPerformanceResponse,
} from "./types";

// No mutation invalidates "dashboard" itself, so each query also provides the
// tags of the data its figures are computed from: whatever the user changes
// there (a payment, a student, an attendance mark...) refreshes the dashboard
// instead of the cache serving the old numbers until its window ends.
export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        dashboardStats: builder.query<DashboardStatsResponse, void>({
            query: () => ({
                url: PATHS.STATS,
                method: "GET"
            }),
            providesTags: ["dashboard", "group", "student"],
        }),
        dashboardSchedule: builder.query<ScheduleResponse, void>({
            query: () => ({
                url: PATHS.SCHEDULE,
                method: "GET"
            }),
            providesTags: ["dashboard", "group"],
        }),
        dashboardAttendanceStats: builder.query<AttendanceStatsResponse, void>({
            query: () => ({
                url: PATHS.ATTENDANCE_STATS,
                method: "GET"
            }),
            providesTags: ["dashboard", "attendance"],
        }),
        dashboardRecentActivities: builder.query<RecentActivitiesResponse, void>({
            query: () => ({
                url: PATHS.RECENT_ACTIVITIES,
                method: "GET"
            }),
            providesTags: ["dashboard", "payment", "student", "group", "lead", "attendance"],
        }),
        dashboardTeacherPerformance: builder.query<TeacherPerformanceResponse, void>({
            query: () => ({
                url: PATHS.TEACHER_PERFORMANCE,
                method: "GET"
            }),
            providesTags: ["dashboard", "teacher", "group", "attendance"],
        }),
    })
})

export const {
    useDashboardStatsQuery,
    useDashboardScheduleQuery,
    useDashboardAttendanceStatsQuery,
    useDashboardRecentActivitiesQuery,
    useDashboardTeacherPerformanceQuery,
} = dashboardApi;
