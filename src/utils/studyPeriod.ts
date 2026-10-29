import { addMonthsToIsoDate, parseTrainingDate, type ParsedTrainingDate } from "./formatTrainingDate";

// Whole calendar months, then whole weeks (and the days left over) — the units a
// group's length is talked about in.
export interface StudySpan {
  months: number;
  weeks: number;
  days: number;
}

export type StudyPeriod =
  | { state: "notStarted"; total: StudySpan | null }
  | { state: "running"; elapsed: StudySpan; total: StudySpan | null }
  | { state: "finished"; total: StudySpan | null };

const MS_PER_DAY = 86_400_000;

const toIso = ({ year, month, day }: ParsedTrainingDate): string =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const dayNumber = ({ year, month, day }: ParsedTrainingDate): number => Date.UTC(year, month - 1, day) / MS_PER_DAY;

// Integer arithmetic on the parsed y/m/d, like the rest of the training-date
// helpers: a Date in the viewer's timezone could shift a day. Months are counted
// with the same end-of-month clamping as addMonthsToIsoDate (Jan 31 + 1 month =
// Feb 28), so a span that ends on the date a course would end reads as whole months.
const spanBetween = (from: ParsedTrainingDate, to: ParsedTrainingDate): StudySpan => {
  const fromIso = toIso(from);
  const toIsoDate = toIso(to);
  const reaches = (months: number) => (addMonthsToIsoDate(fromIso, months) ?? "9999-12-31") <= toIsoDate;

  let months = Math.max((to.year - from.year) * 12 + (to.month - from.month), 0);
  while (months > 0 && !reaches(months)) months -= 1;
  while (reaches(months + 1)) months += 1;

  const anchor = parseTrainingDate(addMonthsToIsoDate(fromIso, months)) ?? from;
  const days = Math.max(dayNumber(to) - dayNumber(anchor), 0);
  return { months, weeks: Math.floor(days / 7), days: days % 7 };
};

// How long a group studies in total (training start -> end) and how much of it
// has passed by `todayIso`. Null when the group has no usable start date.
export const getStudyPeriod = (startIso: string | null | undefined, endIso: string | null | undefined, todayIso: string): StudyPeriod | null => {
  const start = parseTrainingDate(startIso);
  const today = parseTrainingDate(todayIso);
  if (!start || !today) return null;
  const end = parseTrainingDate(endIso);
  const total = end ? spanBetween(start, end) : null;

  if (dayNumber(today) < dayNumber(start)) return { state: "notStarted", total };
  if (end && dayNumber(today) >= dayNumber(end)) return { state: "finished", total };
  return { state: "running", elapsed: spanBetween(start, today), total };
};
