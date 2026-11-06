import { toLocalISODate } from "./localDate";

// The calendar day before an ISO date (YYYY-MM-DD), by plain y/m/d arithmetic so
// the viewer's time zone can never shift it.
export const dayBefore = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return toLocalISODate(new Date(year, month - 1, day - 1));
};

// The last day payment is calculated in the OLD group when the student leaves it
// on `moveFrom` (YYYY-MM-DD): the day before. Sent as the transfer's
// paymentEndDate it closes billing here on the day they leave - a move dated in the
// past would otherwise be billed here up to today as well.
//
// Nothing is sent for the NEW group: the student joins it on a trial lesson
// (PROBATION), where payment is not calculated, and billing starts only when staff
// activate them there, from the day they pick (see handleMoveStudent).
//
// `oldStart` is the day payment began in the old group (its paymentStartDate, or
// the day the student joined it). A move on or before it leaves no day to bill
// there, and an end date before the start is refused by the backend, so then
// undefined is returned and the backend closes the group itself.
export const transferEndDate = (moveFrom: string, oldStart?: string | null): string | undefined => {
  const end = dayBefore(moveFrom);
  const start = oldStart ? oldStart.slice(0, 10) : "";
  return start && end < start ? undefined : end;
};
