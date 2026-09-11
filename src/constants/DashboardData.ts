// Palette cycled through when coloring schedule blocks by index.
export const SCHEDULE_COLORS = [
  "#a78bfa", "#34d399", "#fbbf24", "#f87171",
  "#60a5fa", "#f472b6", "#38bdf8", "#facc15",
];

// Backend only returns a lesson's start time, not its length — used as a
// reasonable default so schedule blocks render with a visible width.
export const DEFAULT_LESSON_DURATION = 60;

// Visible schedule window (minutes from 00:00).
export const SCHEDULE_TIME_START = 8 * 60;
export const SCHEDULE_TIME_END = 18 * 60 + 30;
