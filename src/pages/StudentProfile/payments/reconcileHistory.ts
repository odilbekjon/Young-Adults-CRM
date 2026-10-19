import type { StudentFinanceHistoryEntry } from "../../../app/api/studentsApi/types";

const day = (iso: string) => (iso ?? "").slice(0, 10);

// The profile's headline balance (GET /students/{id}.balance) is the single
// figure everything else is keyed off, but GET /students/{id}/finance-history
// can list more monthly charges than that balance accounts for — e.g. a
// student who owes ONE month (300 000) showing a 300 000 "system" charge for
// every month back to the group's start, so the ledger, the monthly cards and
// the receipts repeat the same debt over and over.
//
// This drops the surplus: when the ledger's net (payments − charges) is lower
// than the real balance, the OLDEST unpaid charges are removed until the two
// agree (only whole charges, never a payment, never a partial amount). When
// the ledger already agrees with — or shows less debt than — the balance it is
// returned untouched. Months are re-totalled and running balances recomputed.
export const reconcileFinanceHistory = (
  history: StudentFinanceHistoryEntry[],
  balance: number
): StudentFinanceHistoryEntry[] => {
  if (!Number.isFinite(balance) || history.length === 0) return history;

  const paid = history.reduce((sum, m) => sum + m.payments.reduce((s, p) => s + p.amount, 0), 0);
  const charged = history.reduce((sum, m) => sum + m.debts.reduce((s, d) => s + d.amount, 0), 0);
  let excess = balance - (paid - charged);
  if (excess <= 1) return history;

  // Oldest charges first; each is identified by its position in `history`.
  const charges = history
    .flatMap((m, mi) => m.debts.map((d, di) => ({ mi, di, amount: d.amount, date: day(d.date) })))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const dropped = new Set<string>();
  for (const c of charges) {
    if (c.amount <= 0 || c.amount > excess + 1) break;
    dropped.add(`${c.mi}:${c.di}`);
    excess -= c.amount;
    if (excess <= 1) break;
  }
  if (dropped.size === 0) return history;

  const trimmed = history
    .map((m, mi) => {
      const debts = m.debts.filter((_, di) => !dropped.has(`${mi}:${di}`));
      const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
      const totalPaid = m.payments.reduce((s, p) => s + p.amount, 0);
      return { ...m, debts, totalDebt, totalPaid, monthBalance: totalPaid - totalDebt };
    })
    .filter((m) => m.debts.length > 0 || m.payments.length > 0);

  // Running balance: cumulative from the oldest month up.
  const chronological = [...trimmed].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  let running = 0;
  const runningByMonth = new Map<string, number>();
  chronological.forEach((m) => {
    running += m.monthBalance;
    runningByMonth.set(m.month, running);
  });
  return trimmed.map((m) => ({ ...m, runningBalance: runningByMonth.get(m.month) ?? m.runningBalance }));
};
