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

// Group -> its course and teachers (from GET /groups); a payment only carries its group.
export type GroupDirectory = Record<string, { courseId: string; teacherIds: string[] }>;

interface DirectoryGroup {
  id: string;
  courseId?: string | null;
  course?: { id?: string | null } | null;
  teachers?: { id: string }[] | null;
}

export const buildGroupDirectory = (groups: DirectoryGroup[]): GroupDirectory => {
  const directory: GroupDirectory = {};
  groups.forEach((g) => {
    directory[g.id] = { courseId: g.courseId ?? g.course?.id ?? "", teacherIds: (g.teachers ?? []).map((t) => t.id) };
  });
  return directory;
};

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

const sameMoney = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

export const filterPayments = (rows: PaymentRow[], f: PaymentFilters, directory: GroupDirectory): PaymentRow[] => {
  if (!hasClientFilters(f)) return rows;
  const amount = f.amount.trim() ? parseAmountFilter(f.amount) : null;
  // A typed sum that isn't a number can't match anything.
  if (f.amount.trim() && amount === null) return [];

  return rows.filter((p) => {
    if (f.groupId && p.groupId !== f.groupId) return false;
    const group = p.groupId ? directory[p.groupId] : undefined;
    if (f.courseId && group?.courseId !== f.courseId) return false;
    if (f.teacherId && !group?.teacherIds.includes(f.teacherId)) return false;
    if (amount !== null && !sameMoney(p.amount, amount)) return false;
    if (f.staff && p.createdBy !== f.staff) return false;
    if (f.createdFrom || f.createdTo) {
      const created = createdLocalDate(p.createdAt);
      if (!created) return false;
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
    }
    return true;
  });
};

// Newest payment first (its own date, then when it was recorded) — a stable
// order however the backend paged the list.
export const sortPayments = (rows: PaymentRow[]): PaymentRow[] =>
  [...rows].sort(
    (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

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

export interface Option {
  id: string;
  name: string;
}

// Dropdown options: unique by id, empty ones dropped, A-Z by name.
export const toOptions = (items: Array<{ id?: string | null; name?: string | null }>): Option[] => {
  const byId = new Map<string, Option>();
  items.forEach((item) => {
    if (item.id && item.name && !byId.has(item.id)) byId.set(item.id, { id: item.id, name: item.name });
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
};
