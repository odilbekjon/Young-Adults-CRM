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
  dateRange: string;
  students: number;
  maxStudents: number;
  color: string;
  tag?: string;
  tagColor?: string;
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
