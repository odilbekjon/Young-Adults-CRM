import { isCompletedPaymentStatus } from "../../../../app/api/financeApi";
import type { PaymentRow } from "../../../../app/api/financeApi/types";
import { toLocalISODate } from "../../../../utils/localDate";

// Every filter of the All payments page. The first four (dates, search, payment
// method) are sent to GET /finance/payments; the rest are applied here, on the
// complete list of the period, because that endpoint has no parameter for them.
export interface PaymentFilters {
  startDate: string;
  endDate: string;
  search: string;
  paymentMethodId: string;
  groupId: string;
  courseId: string;
  teacherId: string;
  amount: string;
  staff: string;
  createdFrom: string;
  createdTo: string;
}

export const EMPTY_FILTERS: PaymentFilters = {
  startDate: "", endDate: "", search: "", paymentMethodId: "",
  groupId: "", courseId: "", teacherId: "", amount: "", staff: "", createdFrom: "", createdTo: "",
};

export interface Option {
  id: string;
  name: string;
}

// Group -> its course and teachers (from GET /groups); a payment only carries its group.
export type GroupDirectory = Record<string, { courseId: string; teacherIds: string[]; teachers: Option[] }>;

interface DirectoryGroup {
  id: string;
  courseId?: string | null;
  course?: { id?: string | null } | null;
  teachers?: { id: string; name?: string | null }[] | null;
}

export const buildGroupDirectory = (groups: DirectoryGroup[]): GroupDirectory => {
  const directory: GroupDirectory = {};
  groups.forEach((g) => {
    const teachers = (g.teachers ?? []).map((t) => ({ id: t.id, name: t.name ?? "" }));
    directory[g.id] = {
      courseId: g.courseId ?? g.course?.id ?? "",
      teacherIds: teachers.map((t) => t.id),
      teachers,
    };
  });
  return directory;
};

// The teachers of a payment's group: the group's own list (GET /groups) wins,
// the ones the payment row itself carries are the fallback. [] when unknown.
export const teachersOfPayment = (p: PaymentRow, directory: GroupDirectory): Option[] => {
  const fromGroup = p.groupId ? directory[p.groupId]?.teachers : undefined;
  return fromGroup?.length ? fromGroup : (p.teachers ?? []);
};

// "Anvar, Malika" — "" when the payment's group (and so its teacher) is unknown.
export const teacherNamesOf = (p: PaymentRow, directory: GroupDirectory): string =>
  teachersOfPayment(p, directory).map((t) => t.name).filter(Boolean).join(", ");

// The course of a payment's group (the payment's own course when its group is not known).
const courseIdOf = (p: PaymentRow, directory: GroupDirectory): string =>
  (p.groupId ? directory[p.groupId]?.courseId : "") || p.courseId || "";

// What the staff filter compares: the id of whoever recorded the payment (two
// staff members with the same name stay apart), their name when the backend
// sent no id. "" when the payment names nobody.
export const staffKeyOf = (p: PaymentRow): string =>
  p.createdById || (p.createdBy ? `name:${p.createdBy}` : "");

// The sum filter holds digits only ("400000"); spaces (the grouping of a
// formatted number, non-breaking ones included) and commas are ignored.
// null = nothing usable typed.
export const parseAmountFilter = (raw: string): number | null => {
  const digits = raw.replace(/[\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  return Number(digits);
};

// Filters this page applies itself (not sent to the backend).
export const hasClientFilters = (f: PaymentFilters): boolean =>
  Boolean(f.groupId || f.courseId || f.teacherId || f.amount.trim() || f.staff || f.createdFrom || f.createdTo);

// Anything besides the date range — what stops the period-wide net profit
// figure from describing the rows on screen.
export const hasPaymentFilters = (f: PaymentFilters): boolean =>
  hasClientFilters(f) || Boolean(f.search.trim() || f.paymentMethodId);

// The viewer's calendar day a payment was recorded on (createdAt is a UTC
// timestamp: 02:00 in Tashkent on the 1st is still the 31st in UTC).
export const createdLocalDate = (createdAt: string | undefined | null): string | null => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : toLocalISODate(d);
};

// "04.11.2026 09:47:27" — the moment a payment was recorded, on the viewer's clock.
export const createdLocalDateTime = (createdAt: string | undefined | null): string | null => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const sameMoney = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

export const filterPayments = (rows: PaymentRow[], f: PaymentFilters, directory: GroupDirectory): PaymentRow[] => {
  if (!hasClientFilters(f)) return rows;
  const amount = f.amount.trim() ? parseAmountFilter(f.amount) : null;
  // A typed sum that isn't a number can't match anything.
  if (f.amount.trim() && amount === null) return [];

  return rows.filter((p) => {
    if (f.groupId && p.groupId !== f.groupId) return false;
    if (f.courseId && courseIdOf(p, directory) !== f.courseId) return false;
    if (f.teacherId && !teachersOfPayment(p, directory).some((t) => t.id === f.teacherId)) return false;
    if (amount !== null && !sameMoney(p.amount, amount)) return false;
    if (f.staff && staffKeyOf(p) !== f.staff) return false;
    if (f.createdFrom || f.createdTo) {
      const created = createdLocalDate(p.createdAt);
      if (!created) return false;
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
    }
    return true;
  });
};

export type SortKey = "date" | "name" | "sum" | "method" | "teacher" | "staff";
export type SortDir = "asc" | "desc";
export interface PaymentSort {
  key: SortKey;
  dir: SortDir;
}

// Newest payment first: its own date, then when it was recorded.
export const DEFAULT_SORT: PaymentSort = { key: "date", dir: "desc" };

const newestFirst = (a: PaymentRow, b: PaymentRow): number =>
  (b.date ?? "").localeCompare(a.date ?? "") || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

// A stable order however the backend paged the list. The date column sorts by the
// payment's own date (then when it was recorded); every other column sorts by
// what the table shows in it, rows with nothing there always last, and rows that
// tie keep the newest-first order whichever way the column is sorted.
export const sortPayments = (
  rows: PaymentRow[],
  sort: PaymentSort = DEFAULT_SORT,
  directory: GroupDirectory = {},
): PaymentRow[] => {
  const sign = sort.dir === "asc" ? 1 : -1;
  const text = (p: PaymentRow): string => {
    if (sort.key === "name") return p.studentName;
    if (sort.key === "method") return p.paymentMethodName;
    if (sort.key === "teacher") return teacherNamesOf(p, directory);
    return p.createdBy ?? "";
  };
  const compare = (a: PaymentRow, b: PaymentRow): number => {
    if (sort.key === "date") return sort.dir === "desc" ? newestFirst(a, b) : newestFirst(b, a);
    if (sort.key === "sum") return sign * (a.amount - b.amount) || newestFirst(a, b);
    const left = text(a);
    const right = text(b);
    if (!left && right) return 1;
    if (left && !right) return -1;
    return (left && right ? sign * collator.compare(left, right) : 0) || newestFirst(a, b);
  };
  return [...rows].sort(compare);
};

// Refunded / cancelled / pending payments are listed but are not money received.
export const countedPayments = (rows: PaymentRow[]): PaymentRow[] => rows.filter((p) => isCompletedPaymentStatus(p.status));

export const sumAmounts = (rows: PaymentRow[]): number => rows.reduce((sum, p) => sum + p.amount, 0);

export interface MethodTotal {
  id: string;
  name: string;
  amount: number;
}

// Money received per payment method, biggest first (methods with nothing paid
// through them are left out).
export const totalsByMethod = (rows: PaymentRow[]): MethodTotal[] => {
  const byKey = new Map<string, MethodTotal>();
  rows.forEach((p) => {
    const id = p.paymentMethodId || p.paymentMethodName || "";
    const entry = byKey.get(id) ?? { id, name: p.paymentMethodName || "—", amount: 0 };
    entry.amount += p.amount;
    byKey.set(id, entry);
  });
  return [...byKey.values()].filter((m) => m.amount !== 0).sort((a, b) => b.amount - a.amount);
};

// Dropdown options: unique by id, empty ones dropped, A-Z by name.
export const toOptions = (items: Array<{ id?: string | null; name?: string | null }>): Option[] => {
  const byId = new Map<string, Option>();
  items.forEach((item) => {
    if (item.id && item.name && !byId.has(item.id)) byId.set(item.id, { id: item.id, name: item.name });
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
};
