// types.ts — shared types for Dashboard

export type ScheduleTab = "odd" | "even" | "other";
export type ScheduleOrientation = "horizontal" | "vertical";

export interface ScheduleEvent {
  id: string;
  room: string;
  /** minutes from 00:00 */
  start: number;
  duration: number;
  groupName: string;
  courseName: string;
  teacher: string;
  /** "6 jul – 6 nov", derived from the group's real trainingStart/trainingEnd */
  dateRange: string;
  /** Real active membership count (student-groups, not the legacy GET /groups relation) */
  students: number;
  /** Real room capacity, 0 when the room has none set */
  maxStudents: number;
  color: string;
  /** "3 days left" — only set when trainingEnd is within DAYS_LEFT_THRESHOLD */
  daysLeftLabel?: string;
  days: Array<"odd" | "even" | "other">;
}

export interface StatCard {
  key: string;
  label: string;
  value: number;
  route: string;
  /** optional filter query param added to route */
  filter?: string;
}
