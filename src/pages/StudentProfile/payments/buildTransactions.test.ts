import { describe, expect, it } from "vitest";
import type { StudentFinanceHistoryEntry } from "../../../app/api/studentsApi/types";
import { buildTransactions } from "./buildTransactions";

const entry = (month: string, debtDates: string[], payments: StudentFinanceHistoryEntry["payments"] = []): StudentFinanceHistoryEntry => ({
  month,
  debts: debtDates.map((date) => ({
    type: "DEBT" as const, amount: 300000, groupId: "g1", groupName: "Deep Science", branchId: null, branchName: null,
    description: "Oylik guruh qarzi (Deep Science)", date, author: "Tizim (Avtomatik)",
  })),
  payments,
  totalDebt: 0, totalPaid: 0, monthBalance: 0, runningBalance: 0,
});

describe("buildTransactions", () => {
  it("gives a system charge the ledger month it is listed under", () => {
    const rows = buildTransactions([entry("2026-09", ["2026-09-01T00:00:00+05:00"])], []);

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("system");
    expect(rows[0].month).toBe("2026-09");
  });

  it("falls back to the month of the charge's own date when the ledger label is empty", () => {
    const rows = buildTransactions([entry("", ["2026-03-01T00:00:00+05:00"])], []);

    expect(rows[0].month).toBe("2026-03");
  });

  it("keeps each month's charge on its own month (same group, different months)", () => {
    const rows = buildTransactions(
      [entry("2026-09", ["2026-09-01T00:00:00+05:00"]), entry("2026-10", ["2026-10-01T00:00:00+05:00"])],
      [],
    );

    expect(rows.map((r) => r.month).sort()).toEqual(["2026-09", "2026-10"]);
  });

  it("still lists a payment under the month it appears in", () => {
    const rows = buildTransactions(
      [entry("2026-04", [], [{ type: "PAYMENT", amount: 170000, date: "2026-04-15T05:00:00+05:00", method: "Naqd pul", branchId: null, branchName: null, author: null, receiptUrl: null, notes: "First Payment" }])],
      [],
    );

    expect(rows[0].kind).toBe("payment");
    expect(rows[0].month).toBe("2026-04");
  });
});

describe("buildTransactions: pairing a ledger payment with its payment record", () => {
  const ledger = (date: string) =>
    entry("2026-04", [], [{ type: "PAYMENT", amount: 170000, date, method: "Naqd pul", branchId: null, branchName: null, author: null, receiptUrl: null, notes: null }]);
  const record = (date: string) => ({
    id: "p1", amount: 170000, studentId: "s1", studentName: "", studentPhone: "", groupId: "g1", groupName: "Deep Science",
    paymentMethodId: "m1", paymentMethodName: "Naqd pul", branchId: null, branchName: null, date, notes: "", provider: null,
    transactionId: null, receiptUrl: null, createdBy: null, status: "COMPLETED",
  });

  it("matches when both sides write the instant the same way", () => {
    const [row] = buildTransactions([ledger("2026-04-15T05:00:00+05:00")], [record("2026-04-15T05:00:00+05:00")]);

    expect(row.paymentId).toBe("p1");
  });

  it("matches when the payment record uses UTC and the ledger +05:00 (late evening local time)", () => {
    // 02:30 on the 16th in Tashkent is 21:30 on the 15th in UTC: cutting the strings gave two different days.
    const [row] = buildTransactions([ledger("2026-04-16T02:30:00+05:00")], [record("2026-04-15T21:30:00.000Z")]);

    expect(row.paymentId).toBe("p1");
    expect(row.paymentMethodId).toBe("m1");
  });

  it("does not match a payment of another day", () => {
    const [row] = buildTransactions([ledger("2026-04-16T10:00:00+05:00")], [record("2026-04-15T10:00:00.000Z")]);

    expect(row.paymentId).toBeNull();
  });
});
