import type { GroupDay } from "../app/api/groupsApi/types";

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
