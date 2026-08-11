import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    DashboardStatsResponse,
    ScheduleResponse,
    AttendanceStatsResponse,
    RecentActivitiesResponse,
    TeacherPerformanceResponse,
} from "./types";

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        dashboardStats: builder.query<DashboardStatsResponse, void>({
            query: () => ({
                url: PATHS.STATS,
                method: "GET"
            }),
            providesTags: ["dashboard"],
        }),
        dashboardSchedule: builder.query<ScheduleResponse, void>({
            query: () => ({
                url: PATHS.SCHEDULE,
                method: "GET"
            }),
            providesTags: ["dashboard"],
        }),
        dashboardAttendanceStats: builder.query<AttendanceStatsResponse, void>({
            query: () => ({
                url: PATHS.ATTENDANCE_STATS,
                method: "GET"
            }),
            providesTags: ["dashboard"],
        }),
        dashboardRecentActivities: builder.query<RecentActivitiesResponse, void>({
            query: () => ({
                url: PATHS.RECENT_ACTIVITIES,
                method: "GET"
            }),
            providesTags: ["dashboard"],
        }),
        dashboardTeacherPerformance: builder.query<TeacherPerformanceResponse, void>({
            query: () => ({
                url: PATHS.TEACHER_PERFORMANCE,
                method: "GET"
            }),
            providesTags: ["dashboard"],
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
