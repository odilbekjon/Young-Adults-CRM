// YYYY-MM-DD of a Date in the viewer's LOCAL calendar. `toISOString()` is UTC,
// so in UTC+5 it still reports "yesterday" between 00:00 and 05:00 — a payment
// made at 02:00 on the 1st would be dated the last day of the previous month.
export const toLocalISODate = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayLocalISO = (): string => toLocalISODate(new Date());
