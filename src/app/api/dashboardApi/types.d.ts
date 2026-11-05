// GET /dashboard/stats - every figure of the Dashboard's stat cards in ONE answer,
// scoped to the branch in the x-branch-id header. Each figure comes under a long
// name and a short alias (activeStudentsCount / students, ...), listed as
// Swagger documents them. All optional: an older backend sent only the first two.
export interface DashboardStats {
  activeStudentsCount: number;
  activeGroupsCount: number;
  activeLeadsCount?: number;
  debtorsCount?: number;
  trialLessonStudentsCount?: number;
  // Students who paid this month / how many payments that was (the card shows
  // the payments; paidThisMonthCount is the same figure as paidThisMonthPaymentsCount).
  paidThisMonthStudentsCount?: number;
  paidThisMonthPaymentsCount?: number;
  paidThisMonthCount?: number;
  leftActiveGroupsCount?: number;
  leftActiveGroupsThisMonthCount?: number;
  leftTrialLessonsCount?: number;
  // Active memberships (a student in two groups counts twice), not students.
  activeStudentGroupsCount?: number;
  cancelledLeadsCount?: number;
  // The short aliases of the figures above.
  leads?: number;
  students?: number;
  groups?: number;
  debtors?: number;
  trial?: number;
  paid?: number;
  leftActive?: number;
  leftTrial?: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

// GET /dashboard/schedule?daysType=ODD|EVEN|MIXED|OTHER&branchId= - one row per
// group: where and when it meets and who teaches it. No dates, headcount or room
// capacity: the Dashboard reads those from the groups list.
export interface ScheduleItem {
  groupId: string;
  groupName: string;
  courseName: string;
  roomName: string;
  time: string | null;
  days: string[];
  daysType: string;
  teachers: string;
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  data: ScheduleItem[];
}

// GET /dashboard/attendance-stats - the attendance rate of the whole centre.
export interface AttendanceStats {
  percentage: number;
  present: number;
  absent: number;
  // Present + absent: every mark that was made.
  total?: number;
}

export interface AttendanceStatsResponse {
  success: boolean;
  message: string;
  data: AttendanceStats;
}

// GET /dashboard/recent-activities - type is USER_CREATED, GROUP_CREATED or LEAD_CREATED.
export interface RecentActivity {
  type: string;
  message: string;
  date: string;
}

export interface RecentActivitiesResponse {
  success: boolean;
  message: string;
  data: RecentActivity[];
}

// GET /dashboard/teacher-performance - ranked by activityScore.
export interface TeacherPerformance {
  id: string;
  name: string;
  activeGroups: number;
  activityScore: number;
}

export interface TeacherPerformanceResponse {
  success: boolean;
  message: string;
  data: TeacherPerformance[];
}
