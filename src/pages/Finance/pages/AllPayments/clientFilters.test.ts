import { describe, expect, it } from "vitest";
import type { PaymentRow } from "../../../../app/api/financeApi/types";
import {
  EMPTY_FILTERS, buildGroupDirectory, countedPayments, createdLocalDate, filterPayments, hasClientFilters,
  hasPaymentFilters, parseAmountFilter, sortPayments, sumAmounts, toOptions, totalsByMethod,
  type PaymentFilters,
} from "./clientFilters";

const row = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: "p1", amount: 400_000, studentId: "s1", studentName: "Ali", studentPhone: "", groupId: "g1", groupName: "Deep Science",
  paymentMethodId: "m1", paymentMethodName: "Cash", branchId: null, branchName: null, date: "2026-11-03", notes: "",
  provider: null, transactionId: null, receiptUrl: null, createdBy: "Maksuda", createdAt: "2026-11-03T08:00:00.000Z",
  status: null, ...over,
});

const filters = (over: Partial<PaymentFilters> = {}): PaymentFilters => ({ ...EMPTY_FILTERS, ...over });

const directory = buildGroupDirectory([
  { id: "g1", courseId: "c1", teachers: [{ id: "t1" }, { id: "t2" }] },
  { id: "g2", course: { id: "c2" }, teachers: [{ id: "t2" }] },
  { id: "g3", courseId: "c2", teachers: null },
]);

describe("buildGroupDirectory", () => {
  it("maps each group to its course and teacher ids", () => {
    expect(directory.g1).toEqual({ courseId: "c1", teacherIds: ["t1", "t2"] });
    expect(directory.g2).toEqual({ courseId: "c2", teacherIds: ["t2"] });
    expect(directory.g3).toEqual({ courseId: "c2", teacherIds: [] });
  });
});

describe("parseAmountFilter", () => {
  it("reads digits, ignoring the spaces of a formatted number", () => {
    expect(parseAmountFilter("400000")).toBe(400_000);
    expect(parseAmountFilter("400 000")).toBe(400_000);
    expect(parseAmountFilter("400 000")).toBe(400_000);
    expect(parseAmountFilter("1,250,000")).toBe(1_250_000);
  });

  it("is null for anything that is not a number", () => {
    expect(parseAmountFilter("")).toBeNull();
    expect(parseAmountFilter("abc")).toBeNull();
    expect(parseAmountFilter("12a")).toBeNull();
  });
});

describe("hasClientFilters / hasPaymentFilters", () => {
  it("is false for the plain monthly view", () => {
    const month = filters({ startDate: "2026-11-01", endDate: "2026-11-30" });
    expect(hasClientFilters(month)).toBe(false);
    expect(hasPaymentFilters(month)).toBe(false);
  });

  it("flags every filter the page applies itself", () => {
    (["groupId", "courseId", "teacherId", "amount", "staff", "createdFrom", "createdTo"] as const).forEach((key) => {
      expect(hasClientFilters(filters({ [key]: "x" }))).toBe(true);
    });
    expect(hasClientFilters(filters({ search: "ali", paymentMethodId: "m1" }))).toBe(false);
  });

  it("counts the server-side search and method as payment filters too", () => {
    expect(hasPaymentFilters(filters({ search: "ali" }))).toBe(true);
    expect(hasPaymentFilters(filters({ search: "   " }))).toBe(false);
    expect(hasPaymentFilters(filters({ paymentMethodId: "m1" }))).toBe(true);
  });
});

describe("createdLocalDate", () => {
  it("is the viewer's calendar day, not the UTC day", () => {
    // 01:30 on 3 November in Asia/Tashkent is 20:30 on 2 November UTC.
    expect(createdLocalDate("2026-11-02T20:30:00.000Z")).toBe("2026-11-03");
    expect(createdLocalDate("2026-11-03T08:00:00.000Z")).toBe("2026-11-03");
  });

  it("is null without a usable timestamp", () => {
    expect(createdLocalDate(undefined)).toBeNull();
    expect(createdLocalDate(null)).toBeNull();
    expect(createdLocalDate("")).toBeNull();
    expect(createdLocalDate("garbage")).toBeNull();
  });
});

describe("filterPayments", () => {
  const rows = [
    row({ id: "a", groupId: "g1", amount: 400_000, createdBy: "Maksuda", createdAt: "2026-11-03T08:00:00.000Z" }),
    row({ id: "b", groupId: "g2", amount: 250_000, createdBy: "Dilnoza", createdAt: "2026-11-05T08:00:00.000Z" }),
    row({ id: "c", groupId: "g3", amount: 400_000, createdBy: "Maksuda", createdAt: "2026-11-10T08:00:00.000Z" }),
    row({ id: "d", groupId: null, amount: 100_000, createdBy: null, createdAt: undefined }),
  ];
  const ids = (list: PaymentRow[]) => list.map((p) => p.id);

  it("returns everything when no filter of this page is set", () => {
    expect(filterPayments(rows, filters({ search: "x", paymentMethodId: "m1" }), directory)).toBe(rows);
  });

  it("filters by group", () => {
    expect(ids(filterPayments(rows, filters({ groupId: "g2" }), directory))).toEqual(["b"]);
  });

  it("filters by the course of the payment's group", () => {
    expect(ids(filterPayments(rows, filters({ courseId: "c2" }), directory))).toEqual(["b", "c"]);
    expect(ids(filterPayments(rows, filters({ courseId: "c1" }), directory))).toEqual(["a"]);
  });

  it("filters by a teacher of the payment's group", () => {
    expect(ids(filterPayments(rows, filters({ teacherId: "t2" }), directory))).toEqual(["a", "b"]);
    expect(ids(filterPayments(rows, filters({ teacherId: "t1" }), directory))).toEqual(["a"]);
  });

  it("drops a payment whose group is unknown when a course or teacher is asked for", () => {
    expect(ids(filterPayments(rows, filters({ courseId: "c1" }), {}))).toEqual([]);
    expect(ids(filterPayments(rows, filters({ teacherId: "t1" }), {}))).toEqual([]);
  });

  it("filters by the exact sum, typed plain or grouped", () => {
    expect(ids(filterPayments(rows, filters({ amount: "400000" }), directory))).toEqual(["a", "c"]);
    expect(ids(filterPayments(rows, filters({ amount: "250 000" }), directory))).toEqual(["b"]);
    expect(ids(filterPayments(rows, filters({ amount: "399999" }), directory))).toEqual([]);
  });

  it("matches nothing for a sum that is not a number", () => {
    expect(filterPayments(rows, filters({ amount: "abc" }), directory)).toEqual([]);
  });

  it("filters by the staff member who recorded the payment", () => {
    expect(ids(filterPayments(rows, filters({ staff: "Maksuda" }), directory))).toEqual(["a", "c"]);
  });

  it("filters by the day the payment was recorded, both ends included", () => {
    expect(ids(filterPayments(rows, filters({ createdFrom: "2026-11-05" }), directory))).toEqual(["b", "c"]);
    expect(ids(filterPayments(rows, filters({ createdTo: "2026-11-05" }), directory))).toEqual(["a", "b"]);
    expect(ids(filterPayments(rows, filters({ createdFrom: "2026-11-05", createdTo: "2026-11-05" }), directory))).toEqual(["b"]);
  });

  it("reads the created day in the viewer's timezone, not UTC", () => {
    const late = row({ id: "late", createdAt: "2026-11-02T20:30:00.000Z" });
    expect(ids(filterPayments([late], filters({ createdFrom: "2026-11-03", createdTo: "2026-11-03" }), directory))).toEqual(["late"]);
    expect(ids(filterPayments([late], filters({ createdTo: "2026-11-02" }), directory))).toEqual([]);
  });

  it("drops a payment with no created timestamp when a created date is asked for", () => {
    expect(ids(filterPayments(rows, filters({ createdFrom: "2026-01-01" }), directory))).not.toContain("d");
  });

  it("combines filters (all must hold)", () => {
    expect(ids(filterPayments(rows, filters({ staff: "Maksuda", courseId: "c2" }), directory))).toEqual(["c"]);
    expect(ids(filterPayments(rows, filters({ staff: "Maksuda", amount: "250000" }), directory))).toEqual([]);
  });
});

describe("sortPayments", () => {
  it("puts the newest payment first: by its date, then by when it was recorded", () => {
    const sorted = sortPayments([
      row({ id: "old", date: "2026-11-01", createdAt: "2026-11-01T09:00:00.000Z" }),
      row({ id: "new-early", date: "2026-11-03", createdAt: "2026-11-03T05:00:00.000Z" }),
      row({ id: "new-late", date: "2026-11-03", createdAt: "2026-11-03T09:00:00.000Z" }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(["new-late", "new-early", "old"]);
  });

  it("does not touch the list it is given", () => {
    const input = [row({ id: "a", date: "2026-11-01" }), row({ id: "b", date: "2026-11-02" })];
    sortPayments(input);
    expect(input.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("countedPayments / sumAmounts", () => {
  it("leaves out refunded, cancelled and pending payments — only received money counts", () => {
    const list = [
      row({ id: "ok", amount: 100, status: null }),
      row({ id: "ok2", amount: 200, status: "COMPLETED" }),
      row({ id: "refunded", amount: 400, status: "REFUNDED" }),
      row({ id: "pending", amount: 800, status: "pending" }),
    ];
    const counted = countedPayments(list);
    expect(counted.map((p) => p.id)).toEqual(["ok", "ok2"]);
    expect(sumAmounts(counted)).toBe(300);
    expect(sumAmounts([])).toBe(0);
  });
});

describe("totalsByMethod", () => {
  it("adds up each payment method, biggest first", () => {
    const totals = totalsByMethod([
      row({ id: "1", amount: 100, paymentMethodId: "m1", paymentMethodName: "Cash" }),
      row({ id: "2", amount: 300, paymentMethodId: "m2", paymentMethodName: "Click" }),
      row({ id: "3", amount: 250, paymentMethodId: "m1", paymentMethodName: "Cash" }),
    ]);
    expect(totals).toEqual([
      { id: "m1", name: "Cash", amount: 350 },
      { id: "m2", name: "Click", amount: 300 },
    ]);
  });

  it("leaves out methods that nothing was paid through", () => {
    expect(totalsByMethod([row({ amount: 0 })])).toEqual([]);
    expect(totalsByMethod([])).toEqual([]);
  });
});

describe("toOptions", () => {
  it("keeps each id once, drops empty ones and sorts by name", () => {
    expect(
      toOptions([
        { id: "2", name: "Beta" },
        { id: "1", name: "Alpha" },
        { id: "2", name: "Beta again" },
        { id: "", name: "No id" },
        { id: "3", name: "" },
        { id: null, name: "Null id" },
        { id: "4", name: undefined },
      ]),
    ).toEqual([
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ]);
  });
});
