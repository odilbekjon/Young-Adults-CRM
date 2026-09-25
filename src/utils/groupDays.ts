import type { GroupDay } from "../app/api/groupsApi/types";
import { parseTrainingDate } from "./formatTrainingDate";

// Odd/Even days follow the common Mon/Wed/Fri vs Tue/Thu/Sat convention
// (Uzbek: Toq/Juft kunlar) used by language-center scheduling; Weekend is
// Sat+Sun and Every day is all 7. Not a backend contract — purely a UI
// convenience for the quick day-picker used on Groups/SingleGroup's edit
// forms and the Groups list's Days filter.
export const DAYS_PRESETS: Record<string, GroupDay[]> = {
  "Odd days":     ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "Even days":    ["TUESDAY", "THURSDAY", "SATURDAY"],
  "Weekend days": ["SATURDAY", "SUNDAY"],
  "Every day":    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
};

// Reverse of DAYS_PRESETS — matches a concrete day list back to its preset
// name (order-insensitive), or "Other" for anything custom/manual.
export const classifyDayList = (dayList: GroupDay[]): string => {
  if (dayList.length === 0) return "";
  for (const [presetName, preset] of Object.entries(DAYS_PRESETS)) {
    if (preset.length === dayList.length && preset.every((d) => dayList.includes(d))) return presetName;
  }
  return "Other";
};

// Classifies a group's schedule into one of 5 display buckets used by both
// the Groups list's Days filter and the edit forms' quick day-picker.
// EVEN/ODD come straight from the backend's daysType; "Every day"/"Weekend
// days" are inferred from the concrete GroupDay[] list since the backend
// has no daysType value for them.
export const classifyDays = (daysType: string, dayList: GroupDay[]): string => {
  if (dayList.length === 7) return "Every day";
  const weekendOnly = dayList.length > 0 && dayList.every((d) => d === "SATURDAY" || d === "SUNDAY");
  if (weekendOnly) return "Weekend days";
  if (daysType === "EVEN") return "Even days";
  if (daysType === "ODD") return "Odd days";
  if (daysType || dayList.length > 0) return "Other";
  return "—";
};

// 08:00–20:00 in 1-hour steps, for the Lesson start time quick-picker used
// on Groups' create modal and SingleGroup's edit drawer.
export const TIME_OPTIONS: string[] = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, "0")}:00`);

// Date.getDay() -> GroupDay, so a scheduled-weekday list can be checked
// against a plain calendar date without a day-name lookup table duplicated
// at every call site.
const WEEKDAY_BY_JS_DAY: GroupDay[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];

// A group's explicit `days` list is the source of truth when present;
// `daysType` (EVEN/ODD) is only a fallback for groups that were only ever
// given that flag and no concrete day list.
export const getScheduledWeekdays = (
  daysType: string | null | undefined,
  dayList: GroupDay[] | null | undefined
): GroupDay[] => {
  if (dayList && dayList.length > 0) return dayList;
  if (daysType === "EVEN") return DAYS_PRESETS["Even days"];
  if (daysType === "ODD") return DAYS_PRESETS["Odd days"];
  return [];
};

export interface GroupScheduleLike {
  daysType?: string | null;
  days?: GroupDay[] | null;
  trainingStart?: string | null;
  trainingEnd?: string | null;
}

// Day-of-month numbers (1-based) in `year`/`month` (month is 0-indexed, same
// as Date) that fall on the group's scheduled weekdays AND inside
// [trainingStart, trainingEnd] when those are set. Used as the Attendance
// grid's fallback lesson-day list (SingleGroup and StudentProfile) whenever
// the backend's per-month lesson-dates endpoint returns nothing — so the
// grid still only shows the group's real class days instead of every
// calendar day in the month.
export const getScheduledDaysInMonth = (
  year: number,
  month: number,
  schedule: GroupScheduleLike
): number[] => {
  const weekdays = getScheduledWeekdays(schedule.daysType, schedule.days);
  if (weekdays.length === 0) return [];

  const start = parseTrainingDate(schedule.trainingStart);
  const end = parseTrainingDate(schedule.trainingEnd);
  const startKey = start ? start.year * 10000 + start.month * 100 + start.day : null;
  const endKey = end ? end.year * 10000 + end.month * 100 + end.day : null;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const result: number[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const weekday = WEEKDAY_BY_JS_DAY[new Date(year, month, day).getDay()];
    if (!weekdays.includes(weekday)) continue;
    const dayKey = year * 10000 + (month + 1) * 100 + day;
    if (startKey !== null && dayKey < startKey) continue;
    if (endKey !== null && dayKey > endKey) continue;
    result.push(day);
  }
  return result;
};
