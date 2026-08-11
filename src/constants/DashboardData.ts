// Monthly revenue chart data — no backend endpoint exists for this yet.
export const MONTHLY_REVENUE: { month: string; value: number }[] = [
  { month: "Sep 23", value: 5000000 },   { month: "Oct 23", value: 8000000 },
  { month: "Dec 23", value: 15000000 },  { month: "Jan 24", value: 25000000 },
  { month: "Feb 24", value: 38000000 },  { month: "Mar 24", value: 55000000 },
  { month: "Apr 24", value: 70000000 },  { month: "May 24", value: 65000000 },
  { month: "Jun 24", value: 72000000 },  { month: "Jul 24", value: 78000000 },
  { month: "Aug 24", value: 80000000 },  { month: "Sep 24", value: 82000000 },
  { month: "Oct 24", value: 86000000 },  { month: "Nov 24", value: 90000000 },
  { month: "Dec 24", value: 88000000 },  { month: "Jan 25", value: 92000000 },
  { month: "Feb 25", value: 95000000 },  { month: "Mar 25", value: 110000000 },
  { month: "Apr 25", value: 148000000 }, { month: "May 25", value: 105000000 },
  { month: "Jun 25", value: 108000000 }, { month: "Jul 25", value: 112000000 },
  { month: "Aug 25", value: 115000000 }, { month: "Sep 25", value: 120000000 },
  { month: "Oct 25", value: 125000000 }, { month: "Nov 25", value: 128000000 },
  { month: "Dec 25", value: 130000000 }, { month: "Jan 26", value: 135000000 },
  { month: "Feb 26", value: 140000000 }, { month: "Mar 26", value: 142000000 },
  { month: "Apr 26", value: 145000000 }, { month: "May 26", value: 138000000 },
];

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
