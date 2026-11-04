import { describe, expect, it } from "vitest";
import type { PaymentRow } from "../../../../app/api/financeApi/types";
import {
  DEFAULT_SORT, EMPTY_FILTERS, buildGroupDirectory, countedPayments, createdLocalDate, createdLocalDateTime, filterPayments,
  hasClientFilters, hasPaymentFilters, parseAmountFilter, sortPayments, staffKeyOf, sumAmounts, teacherNamesOf, toOptions,
  totalsByMethod,
  type PaymentFilters, type PaymentSort,
} from "./clientFilters";

const row = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: "p1", amount: 400_000, studentId: "s1", studentName: "Ali", studentPhone: "", groupId: "g1", groupName: "Deep Science",
  paymentMethodId: "m1", paymentMethodName: "Cash", branchId: null, branchName: null, date: "2026-11-03", notes: "",
  provider: null, transactionId: null, receiptUrl: null, createdBy: "Maksuda", createdAt: "2026-11-03T08:00:00.000Z",
  status: null, ...over,
});

const filters = (over: Partial<PaymentFilters> = {}): PaymentFilters => ({ ...EMPTY_FILTERS, ...over });

const directory = buildGroupDirectory([
  { id: "g1", courseId: "c1", teachers: [{ id: "t1", name: "Anvar" }, { id: "t2", name: "Malika" }] },
  { id: "g2", course: { id: "c2" }, teachers: [{ id: "t2", name: "Malika" }] },
  { id: "g3", courseId: "c2", teachers: null },
]);

describe("buildGroupDirectory", () => {
  it("maps each group to its course and teachers", () => {
    expect(directory.g1).toEqual({
      courseId: "c1", teacherIds: ["t1", "t2"], teachers: [{ id: "t1", name: "Anvar" }, { id: "t2", name: "Malika" }],
    });
    expect(directory.g2).toEqual({ courseId: "c2", teacherIds: ["t2"], teachers: [{ id: "t2", name: "Malika" }] });
    expect(directory.g3).toEqual({ courseId: "c2", teacherIds: [], teachers: [] });
  });
});

describe("teacherNamesOf", () => {
  it("lists the teachers of the payment's group, comma-separated", () => {
    expect(teacherNamesOf(row({ groupId: "g1" }), directory)).toBe("Anvar, Malika");
    expect(teacherNamesOf(row({ groupId: "g2" }), directory)).toBe("Malika");
  });

  it("is empty when the group has no teacher or is not known", () => {
    expect(teacherNamesOf(row({ groupId: "g3" }), directory)).toBe("");
    expect(teacherNamesOf(row({ groupId: "g404" }), directory)).toBe("");
    expect(teacherNamesOf(row({ groupId: null }), directory)).toBe("");
  });

  it("falls back to the teachers the payment itself carries", () => {
    const own = row({ groupId: "g404", teachers: [{ id: "t9", name: "Zafar" }] });
    expect(teacherNamesOf(own, directory)).toBe("Zafar");
    // ...but the group's own list wins when there is one.
    expect(teacherNamesOf({ ...own, groupId: "g2" }, directory)).toBe("Malika");
  });

  it("leaves out a teacher without a name instead of printing a gap", () => {
    const unnamed = buildGroupDirectory([{ id: "g1", teachers: [{ id: "t1" }, { id: "t2", name: "Malika" }] }]);
    expect(teacherNamesOf(row({ groupId: "g1" }), unnamed)).toBe("Malika");
  });
});

describe("staffKeyOf", () => {
  it("is the creator's id, so two people with the same name stay apart", () => {
    expect(staffKeyOf(row({ createdById: "u1", createdBy: "Ali" }))).toBe("u1");
    expect(staffKeyOf(row({ createdById: "u2", createdBy: "Ali" }))).toBe("u2");
  });

  it("falls back to the name, and is empty for an anonymous payment", () => {
    expect(staffKeyOf(row({ createdById: null, createdBy: "Ali" }))).toBe("name:Ali");
    expect(staffKeyOf(row({ createdById: null, createdBy: null }))).toBe("");
  });
});

describe("parseAmountFilter", () => {
  it("reads digits, ignoring the spaces of a formatted number", () => {
    expect(parseAmountFilter("400000")).toBe(400_000);
    expect(parseAmountFilter("400 000")).toBe(400_000);
    expect(parseAmountFilter("400 000")).toBe(400_000);
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

describe("createdLocalDateTime", () => {
  it("is the day and time on the viewer's clock", () => {
    // 04:47:27 UTC is 09:47:27 in Asia/Tashkent.
    expect(createdLocalDateTime("2026-11-04T04:47:27.000Z")).toBe("04.11.2026 09:47:27");
    // 20:30 UTC on the 2nd is already the 3rd in Tashkent.
    expect(createdLocalDateTime("2026-11-02T20:30:05.000Z")).toBe("03.11.2026 01:30:05");
  });

  it("is null without a usable timestamp", () => {
    expect(createdLocalDateTime(undefined)).toBeNull();
    expect(createdLocalDateTime("")).toBeNull();
    expect(createdLocalDateTime("garbage")).toBeNull();
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

  it("uses the course and teachers a payment carries when its group is not in the directory", () => {
    const own = [
      row({ id: "x", groupId: "g404", courseId: "c7", teachers: [{ id: "t9", name: "Zafar" }] }),
      row({ id: "y", groupId: "g404" }),
    ];
    expect(ids(filterPayments(own, filters({ teacherId: "t9" }), directory))).toEqual(["x"]);
    expect(ids(filterPayments(own, filters({ courseId: "c7" }), directory))).toEqual(["x"]);
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

  it("filters by the staff member who recorded the payment (by name when there is no id)", () => {
    expect(ids(filterPayments(rows, filters({ staff: "name:Maksuda" }), directory))).toEqual(["a", "c"]);
  });

  it("filters by the creator's id: a namesake is not the same staff member", () => {
    const people = [
      row({ id: "u1-a", createdById: "u1", createdBy: "Ali" }),
      row({ id: "u2-a", createdById: "u2", createdBy: "Ali" }),
      row({ id: "u1-b", createdById: "u1", createdBy: "Ali" }),
    ];
    expect(ids(filterPayments(people, filters({ staff: "u1" }), directory))).toEqual(["u1-a", "u1-b"]);
    expect(ids(filterPayments(people, filters({ staff: "u2" }), directory))).toEqual(["u2-a"]);
    expect(ids(filterPayments(people, filters({ staff: "name:Ali" }), directory))).toEqual([]);
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
    expect(ids(filterPayments(rows, filters({ staff: "name:Maksuda", courseId: "c2" }), directory))).toEqual(["c"]);
    expect(ids(filterPayments(rows, filters({ staff: "name:Maksuda", amount: "250000" }), directory))).toEqual([]);
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

  describe("by a column", () => {
    const list = [
      row({ id: "a", date: "2026-11-02", amount: 300, studentName: "Charos", paymentMethodName: "Naqd", createdBy: "Maksuda", groupId: "g1" }),
      row({ id: "b", date: "2026-11-03", amount: 100, studentName: "asila", paymentMethodName: "Click", createdBy: "Dilnoza", groupId: "g2" }),
      row({ id: "c", date: "2026-11-01", amount: 200, studentName: "Botir", paymentMethodName: "Payme", createdBy: null, groupId: "g3" }),
    ];
    const sorted = (sort: PaymentSort) => sortPayments(list, sort, directory).map((p) => p.id);

    it("starts from the default: date, newest first", () => {
      expect(DEFAULT_SORT).toEqual({ key: "date", dir: "desc" });
      expect(sorted(DEFAULT_SORT)).toEqual(["b", "a", "c"]);
      expect(sorted({ key: "date", dir: "asc" })).toEqual(["c", "a", "b"]);
    });

    it("sorts by the student's name, ignoring case", () => {
      expect(sorted({ key: "name", dir: "asc" })).toEqual(["b", "c", "a"]);
      expect(sorted({ key: "name", dir: "desc" })).toEqual(["a", "c", "b"]);
    });

    it("sorts by the sum as a number", () => {
      expect(sorted({ key: "sum", dir: "asc" })).toEqual(["b", "c", "a"]);
      expect(sorted({ key: "sum", dir: "desc" })).toEqual(["a", "c", "b"]);
    });

    it("sorts by the payment type", () => {
      expect(sorted({ key: "method", dir: "asc" })).toEqual(["b", "a", "c"]);
      expect(sorted({ key: "method", dir: "desc" })).toEqual(["c", "a", "b"]);
    });

    it("sorts by the teacher's name, a payment with no teacher always last", () => {
      // g1 -> Anvar, Malika; g2 -> Malika; g3 -> nobody
      expect(sorted({ key: "teacher", dir: "asc" })).toEqual(["a", "b", "c"]);
      expect(sorted({ key: "teacher", dir: "desc" })).toEqual(["b", "a", "c"]);
    });

    it("sorts by the staff member, a payment with no creator always last", () => {
      expect(sorted({ key: "staff", dir: "asc" })).toEqual(["b", "a", "c"]);
      expect(sorted({ key: "staff", dir: "desc" })).toEqual(["a", "b", "c"]);
    });

    it("keeps payments that tie in newest-first order, whichever way the column goes", () => {
      const ties = [
        row({ id: "old", amount: 100, date: "2026-11-01" }),
        row({ id: "new", amount: 100, date: "2026-11-03" }),
      ];
      expect(sortPayments(ties, { key: "sum", dir: "asc" }).map((p) => p.id)).toEqual(["new", "old"]);
      expect(sortPayments(ties, { key: "sum", dir: "desc" }).map((p) => p.id)).toEqual(["new", "old"]);
    });
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
