export interface DashboardStats {
  activeStudentsCount: number;
  activeGroupsCount: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

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

export interface AttendanceStats {
  percentage: number;
  present: number;
  absent: number;
}

export interface AttendanceStatsResponse {
  success: boolean;
  message: string;
  data: AttendanceStats;
}

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
