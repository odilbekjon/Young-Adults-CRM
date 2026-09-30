import type { StudentFinanceHistoryEntry } from "../../../app/api/studentsApi/types";
import type { PaymentRow } from "../../../app/api/financeApi/types";
import { isCompletedPaymentStatus } from "../../../app/api/financeApi";

// One row of the Payments table. "system" = a monthly group charge computed
// by the backend (GET /students/{id}/finance-history `debts`), "payment" = a
// real payment (finance-history `payments`, enriched with the matching
// GET /students/{id}/payments row for its id/creator/group/status).
export interface PaymentTx {
  key: string;
  kind: "system" | "payment";
  date: string;
  amount: number;
  groupId: string | null;
  groupName: string | null;
  // payment: the method's display name; system: the charge description
  // ("13 les. 01.09.2026—29.09.2026").
  comment: string | null;
  notes: string | null;
  creator: string | null;
  // Full timestamp when the backend supplied one (else null — never guessed).
  createdAt: string | null;
  paymentId: string | null;
  paymentMethodId: string | null;
  status: string | null;
}

const day = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);
const hasTime = (iso: string) => iso.length > 10;

// Flattens every month's debts + payments into one newest-first list.
//
// finance-history payment entries carry no id, so each is matched to a real
// payment row by same-day + same-amount (preferring the same method name);
// every real row is consumed at most once, so two identical same-day payments
// map to two different ids instead of both to the first one. Real payments
// that are refunded/cancelled and therefore absent from finance-history are
// appended as muted rows so the history still shows they existed.
export const buildTransactions = (history: StudentFinanceHistoryEntry[], payments: PaymentRow[]): PaymentTx[] => {
  const rows: PaymentTx[] = [];
  const used = new Set<string>();

  history.forEach((month, mi) => {
    month.debts.forEach((d, i) => {
      rows.push({
        key: `system-${mi}-${i}`,
        kind: "system",
        date: d.date,
        amount: d.amount,
        groupId: d.groupId || null,
        groupName: d.groupName || null,
        comment: d.description || null,
        notes: null,
        creator: d.author || null,
        createdAt: hasTime(d.date) ? d.date : null,
        paymentId: null,
        paymentMethodId: null,
        status: null,
      });
    });

    month.payments.forEach((p, i) => {
      const candidates = payments.filter(
        (r) => !used.has(r.id) && day(r.date) === day(p.date) && Math.abs(r.amount - p.amount) < 1
      );
      const matched =
        candidates.find((r) => r.paymentMethodName && r.paymentMethodName === p.method) ?? candidates[0];
      if (matched) used.add(matched.id);
      rows.push({
        key: `payment-${mi}-${i}`,
        kind: "payment",
        date: p.date,
        amount: p.amount,
        groupId: matched?.groupId || null,
        groupName: matched?.groupName || null,
        comment: p.method || matched?.paymentMethodName || null,
        notes: p.notes || matched?.notes || null,
        creator: matched?.createdBy || p.author || null,
        createdAt: matched?.createdAt ?? (hasTime(p.date) ? p.date : null),
        paymentId: matched?.id ?? null,
        paymentMethodId: matched?.paymentMethodId || null,
        status: matched?.status || null,
      });
    });
  });

  payments.forEach((r) => {
    if (used.has(r.id) || isCompletedPaymentStatus(r.status)) return;
    rows.push({
      key: `void-${r.id}`,
      kind: "payment",
      date: r.date ?? r.createdAt ?? "",
      amount: r.amount,
      groupId: r.groupId || null,
      groupName: r.groupName || null,
      comment: r.paymentMethodName || null,
      notes: r.notes || null,
      creator: r.createdBy || null,
      createdAt: r.createdAt ?? null,
      paymentId: r.id,
      paymentMethodId: r.paymentMethodId || null,
      status: r.status,
    });
  });

  return rows.sort((a, b) => {
    const da = day(a.date);
    const db = day(b.date);
    if (da !== db) return da < db ? 1 : -1;
    const ta = a.createdAt ?? a.date;
    const tb = b.createdAt ?? b.date;
    return ta < tb ? 1 : ta > tb ? -1 : 0;
  });
};
