import { describe, expect, it } from "vitest";
import type { PaymentMethod, PaymentRow } from "../../../../app/api/financeApi/types";
import { netProfitDetails } from "./netProfitDetails";

const method = (id: string, name: string, over: Partial<PaymentMethod> = {}): PaymentMethod => ({ id, name, ...over });
const payment = (amount: number, methodId: string | null, methodName = ""): PaymentRow => ({
  id: `p-${amount}-${methodId}`, amount, studentId: null, studentName: "", studentPhone: "", groupId: null, groupName: "",
  paymentMethodId: methodId, paymentMethodName: methodName, branchId: null, branchName: null, date: "2026-11-03", notes: "",
  provider: null, transactionId: null, receiptUrl: null, createdBy: null, status: null,
});

const METHODS = [method("m1", "Bank account"), method("m2", "Cash"), method("m3", "Click"), method("m4", "UZCARD"), method("m5", "Payme")];

// The numbers of the design: revenue 18 972 000, net profit 18 722 000, UZCARD at -250 000.
const DESIGN = {
  methods: METHODS,
  payments: [payment(900_000, "m1"), payment(14_307_000, "m2"), payment(3_765_000, "m3")],
  outflows: [{ id: "m4", name: "UZCARD", amount: 250_000 }],
  salaries: 0,
  netProfit: 18_722_000,
};

describe("netProfitDetails", () => {
  it("is the net of every payment method: what it took in minus what went out through it", () => {
    const lines = netProfitDetails(DESIGN);

    expect(lines.map((l) => [l.name, l.amount])).toEqual([
      ["Bank account", 900_000], ["Cash", 14_307_000], ["Click", 3_765_000], ["UZCARD", -250_000], ["Payme", 0],
    ]);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(18_722_000);
  });

  it("keeps the backend's order of the methods, and lists the ones with nothing in them", () => {
    const lines = netProfitDetails({ ...DESIGN, payments: [], outflows: [], netProfit: 0 });

    expect(lines.map((l) => l.name)).toEqual(["Bank account", "Cash", "Click", "UZCARD", "Payme"]);
    expect(lines.every((l) => l.amount === 0 && l.kind === "method")).toBe(true);
  });

  it("takes a payment or an expense that names its method only by name to that method", () => {
    const lines = netProfitDetails({
      ...DESIGN,
      payments: [payment(100, null, " cash ")],
      outflows: [{ id: null, name: "CASH", amount: 30 }],
      netProfit: 70,
    });

    expect(lines.find((l) => l.name === "Cash")?.amount).toBe(70);
  });

  it("gives the salaries one line of their own, as money out", () => {
    const lines = netProfitDetails({ ...DESIGN, salaries: 2_000_000, netProfit: 16_722_000 });

    expect(lines.filter((l) => l.kind === "salaries")).toEqual([{ key: "salaries", name: "", amount: -2_000_000, kind: "salaries" }]);
    expect(lines.some((l) => l.kind === "other")).toBe(false);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(16_722_000);
  });

  it("puts what no method explains into one 'other' line, so the lines always add up to the net profit", () => {
    // A payment of a method that is not on the list, and a profit the rows do not reach.
    const lines = netProfitDetails({ ...DESIGN, payments: [...DESIGN.payments, payment(500_000, "gone", "Old card")], netProfit: 18_722_000 + 500_000 });

    expect(lines.filter((l) => l.kind === "other")).toEqual([{ key: "other", name: "", amount: 500_000, kind: "other" }]);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(19_222_000);
  });

  it("leaves a switched-off or removed method out while it holds nothing, and keeps it when it does", () => {
    const methods = [method("m1", "Cash"), method("m2", "Old", { status: "INACTIVE" }), method("m3", "Gone", { deletedAt: "2026-01-01T00:00:00Z" })];

    expect(netProfitDetails({ methods, payments: [], outflows: [], salaries: 0, netProfit: 0 }).map((l) => l.name)).toEqual(["Cash"]);
    expect(
      netProfitDetails({ methods, payments: [payment(5, "m2"), payment(7, "m3")], outflows: [], salaries: 0, netProfit: 12 }).map((l) => [l.name, l.amount]),
    ).toEqual([["Cash", 0], ["Old", 5], ["Gone", 7]]);
  });

  it("is only an 'other' line when no methods are known", () => {
    expect(netProfitDetails({ methods: [], payments: [payment(10, "m1")], outflows: [], salaries: 0, netProfit: 10 })).toEqual([
      { key: "other", name: "", amount: 10, kind: "other" },
    ]);
  });
});
