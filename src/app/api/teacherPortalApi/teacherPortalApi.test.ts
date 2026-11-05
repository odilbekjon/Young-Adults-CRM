import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { isArchivedGroupStatus, isExpiredGroup, teacherPortalApi } from "./teacherPortalApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";

// Every test runs on Saturday 31 October 2026, midday, local time (the suite runs
// in Asia/Tashkent). Only Date is faked, so fetch and promises behave normally.
const setNow = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  vi.setSystemTime(new Date(year, month - 1, day, hour, minute));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(2026, 10, 31);
});

// Each call gets a fresh store, so nothing is served from a previous call's cache.
const loadGroups = async (body: unknown) => {
  const store = createTestStore();
  const { requests } = stubFetch(() => jsonResponse(body));
  const { data } = await store.dispatch(teacherPortalApi.endpoints.teacherPortalGroups.initiate());
  return { groups: data ?? [], requests };
};

const loadGroupStudents = async (body: unknown) => {
  const store = createTestStore();
  const { requests } = stubFetch(() => jsonResponse(body));
  const { data } = await store.dispatch(teacherPortalApi.endpoints.teacherPortalGroupStudents.initiate("g1"));
  return { students: data ?? [], requests };
};

const loadGroupById = async (body: unknown) => {
  const store = createTestStore();
  const { requests } = stubFetch(() => jsonResponse(body));
  const { data } = await store.dispatch(teacherPortalApi.endpoints.teacherPortalGroupById.initiate("g1"));
  return { group: data, requests };
};

const loadSchedule = async (body: unknown) => {
  const store = createTestStore();
  const { requests } = stubFetch(() => jsonResponse(body));
  const { data } = await store.dispatch(teacherPortalApi.endpoints.teacherPortalSchedule.initiate());
  return { items: data ?? [], requests };
};

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
const path = (url: string) => url.replace(API_BASE_URL, "");

const ENDED_GROUP_STATUSES = ["ARCHIVE", "ARCHIVED", "INACTIVE", "DELETED", "COMPLETED", "FINISHED", "CLOSED"];

describe("isArchivedGroupStatus", () => {
  it.each(ENDED_GROUP_STATUSES)("treats %s as ended", (status) => {
    expect(isArchivedGroupStatus(status)).toBe(true);
  });

  it.each(ENDED_GROUP_STATUSES.map((s) => s.toLowerCase()))("ignores the case: %s is ended too", (status) => {
    expect(isArchivedGroupStatus(status)).toBe(true);
  });

  it("accepts mixed case", () => {
    expect(isArchivedGroupStatus("Archived")).toBe(true);
  });

  it.each(["ACTIVE", "active", "PROBATION", "FROZEN", "PAUSED", "SOMETHING_NEW", "", "ARCHIV"])(
    "keeps a group whose status is %j visible",
    (status) => {
      expect(isArchivedGroupStatus(status)).toBe(false);
    },
  );

  it("keeps a group visible when it has no status at all", () => {
    expect(isArchivedGroupStatus(undefined)).toBe(false);
    expect(isArchivedGroupStatus(null)).toBe(false);
  });
});

describe("isExpiredGroup", () => {
  // Today is 2026-10-31.
  it.each([
    ["2026-10-30", true], // yesterday
    ["2026-10-31", false], // ends today: still meets today
    ["2026-11-01", false], // tomorrow
    ["2025-12-31", true],
    ["2027-01-01", false],
    ["2026-09-30", true], // an earlier month is smaller even though 30 > 1
    ["2026-10-01", true],
  ])("trainingEnd %s -> expired: %s", (trainingEnd, expired) => {
    expect(isExpiredGroup(trainingEnd)).toBe(expired);
  });

  it.each([
    ["2026-10-30T00:00:00.000Z", true],
    ["2026-10-31T00:00:00.000Z", false],
    ["2026-11-01T00:00:00.000Z", false],
    ["2026-10-30T23:59:59+05:00", true],
    ["2026-10-31T00:00:00+05:00", false],
    ["2026-10-31T23:59:59-05:00", false],
  ])("reads only the date of the datetime %s -> expired: %s", (trainingEnd, expired) => {
    expect(isExpiredGroup(trainingEnd)).toBe(expired);
  });

  it.each([[null], [undefined], [""], ["not a date"], ["31.10.2025"], ["2025/10/01"]])(
    "never hides a group whose end date is %j",
    (trainingEnd) => {
      expect(isExpiredGroup(trainingEnd)).toBe(false);
    },
  );

  it("still counts a group that ends today as running at 23:30 local time", () => {
    setNow(2026, 10, 31, 23, 30);
    expect(isExpiredGroup("2026-10-31")).toBe(false);
    expect(isExpiredGroup("2026-10-30")).toBe(true);
  });

  it("uses the local day just after midnight, while UTC is still the previous day", () => {
    // 00:30 on 1 November local time is 19:30 on 31 October UTC.
    setNow(2026, 11, 1, 0, 30);
    expect(isExpiredGroup("2026-10-31")).toBe(true);
    expect(isExpiredGroup("2026-11-01")).toBe(false);

    // and 00:30 on 31 October local is still 30 October in UTC
    setNow(2026, 10, 31, 0, 30);
    expect(isExpiredGroup("2026-10-30")).toBe(true);
    expect(isExpiredGroup("2026-10-31")).toBe(false);
  });

  it("reads today on every call, not once at load", () => {
    expect(isExpiredGroup("2026-10-31")).toBe(false);
    setNow(2026, 11, 1);
    expect(isExpiredGroup("2026-10-31")).toBe(true);
    setNow(2026, 10, 1);
    expect(isExpiredGroup("2026-10-31")).toBe(false);
  });

  it("crosses a year end correctly", () => {
    setNow(2026, 12, 31);
    expect(isExpiredGroup("2026-12-31")).toBe(false);
    setNow(2027, 1, 1);
    expect(isExpiredGroup("2026-12-31")).toBe(true);
  });
});

describe("teacherPortalGroups", () => {
  it("asks for GET /teacher-portal/groups", async () => {
    const { requests } = await loadGroups({ data: [] });
    expect(requests[0].method).toBe("GET");
    expect(path(requests[0].url)).toBe("/teacher-portal/groups");
  });

  describe("archived and closed groups", () => {
    it.each([...ENDED_GROUP_STATUSES, ...ENDED_GROUP_STATUSES.map((s) => s.toLowerCase())])("drops a group with status %s", async (status) => {
      const { groups } = await loadGroups({ data: [{ id: "gone", status }, { id: "kept", status: "ACTIVE" }] });
      expect(ids(groups)).toEqual(["kept"]);
    });

    it("reads the status from groupStatus when status is absent", async () => {
      const { groups } = await loadGroups({ data: [{ id: "gone", groupStatus: "Archived" }, { id: "kept", groupStatus: "ACTIVE" }] });
      expect(ids(groups)).toEqual(["kept"]);
    });

    it.each([[undefined], [null], [""], ["PAUSED"], ["SOMETHING_NEW"], ["PROBATION"], ["ACTIVE"], ["active"]])(
      "keeps a group whose status is %j",
      async (status) => {
        const { groups } = await loadGroups({ data: [{ id: "g1", name: "Morning", status }] });
        expect(ids(groups)).toEqual(["g1"]);
      },
    );

    it("upper-cases the status it reports", async () => {
      const { groups } = await loadGroups({ data: [{ id: "g1", status: "active" }] });
      expect(groups[0].status).toBe("ACTIVE");
    });
  });

  describe("expired groups", () => {
    it.each([
      ["2026-10-30", false],
      ["2026-10-31", true],
      ["2026-11-01", true],
      ["2025-01-01", false],
    ])("trainingEnd %s -> kept: %s", async (trainingEnd, kept) => {
      const { groups } = await loadGroups({ data: [{ id: "g1", status: "ACTIVE", trainingEnd }] });
      expect(ids(groups)).toEqual(kept ? ["g1"] : []);
    });

    it.each([[undefined], [null], [""], ["not a date"], ["31.10.2025"]])("keeps a group whose end date is %j", async (trainingEnd) => {
      const { groups } = await loadGroups({ data: [{ id: "g1", status: "ACTIVE", trainingEnd }] });
      expect(ids(groups)).toEqual(["g1"]);
    });

    it("keeps a group with no end date field at all", async () => {
      const { groups } = await loadGroups({ data: [{ id: "g1", name: "Open-ended" }] });
      expect(ids(groups)).toEqual(["g1"]);
      expect(groups[0].trainingEnd).toBeNull();
    });

    it.each([
      ["2026-10-31T00:00:00.000Z", true],
      ["2026-10-30T00:00:00.000Z", false],
      ["2026-10-31T00:00:00+05:00", true],
      ["2026-10-30T23:59:59+05:00", false],
      ["2026-11-01T00:00:00.000Z", true],
    ])("datetime end %s -> kept: %s", async (trainingEnd, kept) => {
      const { groups } = await loadGroups({ data: [{ id: "g1", trainingEnd }] });
      expect(ids(groups)).toEqual(kept ? ["g1"] : []);
    });

    it("reads the end date from the alternative field names", async () => {
      const past = "2026-10-01";
      const { groups } = await loadGroups({
        data: [
          { id: "a", endDate: past },
          { id: "b", trainingEndDate: past },
          { id: "c", endsAt: past },
          { id: "d", endDate: "2026-12-01" },
        ],
      });
      expect(ids(groups)).toEqual(["d"]);
    });

    it("decides at 23:30 local time that a group ending today still runs", async () => {
      setNow(2026, 10, 31, 23, 30);
      const { groups } = await loadGroups({
        data: [{ id: "today", trainingEnd: "2026-10-31" }, { id: "yesterday", trainingEnd: "2026-10-30" }],
      });
      expect(ids(groups)).toEqual(["today"]);
    });

    it("drops it as soon as the local date turns over, even though UTC is still the old day", async () => {
      setNow(2026, 11, 1, 0, 30);
      const { groups } = await loadGroups({ data: [{ id: "g1", trainingEnd: "2026-10-31" }] });
      expect(groups).toEqual([]);
    });

    it("reads today on every call: the same group is kept today and gone a day later", async () => {
      const body = { data: [{ id: "g1", name: "Last day today", status: "ACTIVE", trainingEnd: "2026-10-31" }] };

      expect(ids((await loadGroups(body)).groups)).toEqual(["g1"]);

      setNow(2026, 11, 1);
      expect(ids((await loadGroups(body)).groups)).toEqual([]);
    });

    it("applies both rules together", async () => {
      const { groups } = await loadGroups({
        data: [
          { id: "ok", status: "ACTIVE", trainingEnd: "2026-12-31" },
          { id: "archived", status: "ARCHIVED", trainingEnd: "2026-12-31" },
          { id: "expired", status: "ACTIVE", trainingEnd: "2026-01-31" },
          { id: "both", status: "CLOSED", trainingEnd: "2026-01-31" },
        ],
      });
      expect(ids(groups)).toEqual(["ok"]);
    });
  });

  describe("response shapes", () => {
    it("accepts a bare array", async () => {
      const { groups } = await loadGroups([{ id: "g1", name: "A", status: "ACTIVE" }, { id: "g2", name: "B", status: "ARCHIVED" }]);
      expect(ids(groups)).toEqual(["g1"]);
    });

    it("accepts the list under data or groups", async () => {
      expect(ids((await loadGroups({ data: [{ id: "g1" }] })).groups)).toEqual(["g1"]);
      expect(ids((await loadGroups({ groups: [{ id: "g2" }] })).groups)).toEqual(["g2"]);
    });

    it("returns an empty list for a body without one", async () => {
      expect((await loadGroups({})).groups).toEqual([]);
      expect((await loadGroups({ data: null })).groups).toEqual([]);
    });

    it("unwraps { group: {...}, status } rows, taking the group's own id and name", async () => {
      const { groups } = await loadGroups({
        data: [
          { id: "link-1", group: { id: "g1", name: "Morning", status: "ACTIVE", trainingEnd: "2026-12-01" }, status: "ACTIVE" },
          { group: { id: "g2", name: "Old" }, status: "ARCHIVED" }, // status only on the wrapper
          { group: { id: "g3", name: "Closed", status: "closed" } }, // status only on the group
          { group: { id: "g4", name: "Ended", trainingEnd: "2026-10-01T00:00:00.000Z" } }, // expired
          { group: { id: "g5", name: "Plain" } },
        ],
      });

      expect(ids(groups)).toEqual(["g1", "g5"]);
      expect(groups[0]).toMatchObject({ id: "g1", name: "Morning", status: "ACTIVE", trainingEnd: "2026-12-01" });
    });
  });

  describe("studentsCount", () => {
    const countOf = async (row: Record<string, unknown>) => (await loadGroups({ data: [{ id: "g1", ...row }] })).groups[0].studentsCount;
    const member = (status: string, id = status) => ({ id, name: id, status });

    it("counts the live members of an embedded roster instead of a bare count that may include leavers", async () => {
      expect(
        await countOf({ studentsCount: 10, students: [member("ACTIVE", "a"), member("PROBATION", "b"), member("FROZEN", "c"), member("INACTIVE", "d")] }),
      ).toBe(3);
    });

    it("does not count INACTIVE or DELETED members, whichever field carries the status", async () => {
      expect(
        await countOf({
          students: [
            member("ACTIVE", "a"),
            member("DELETED", "b"),
            { id: "c", status: "ACTIVE", studentGroupStatus: "INACTIVE" },
            { id: "d", student: { id: "s4" }, status: "DELETED" },
            { id: "e", student: { id: "s5" }, status: "PROBATION" },
          ],
        }),
      ).toBe(2);
    });

    it("is 0 when the roster has members but none of them is live", async () => {
      expect(await countOf({ studentsCount: 2, students: [member("INACTIVE", "a"), member("DELETED", "b")] })).toBe(0);
    });

    it("uses the numeric count when there is no list", async () => {
      expect(await countOf({ studentsCount: 7 })).toBe(7);
      expect(await countOf({ studentsCount: "12" })).toBe(12);
      expect(await countOf({ totalStudents: 4 })).toBe(4);
      expect(await countOf({ activeStudentsCount: 3 })).toBe(3);
      expect(await countOf({ studentsCount: 7, totalStudents: 9 })).toBe(7);
    });

    it("accepts the count in the students field itself", async () => {
      expect(await countOf({ students: 9 })).toBe(9);
    });

    it("is 0 when the group says nothing about its students", async () => {
      expect(await countOf({})).toBe(0);
    });

    it("falls back to the numeric count when the embedded list is empty, and to 0 without one", async () => {
      expect(await countOf({ students: [], studentsCount: 5 })).toBe(5);
      expect(await countOf({ students: [] })).toBe(0);
    });

    it("counts the roster of a wrapped { group, students } row", async () => {
      const { groups } = await loadGroups({
        data: [{ group: { id: "g1", name: "A", studentsCount: 20 }, students: [member("ACTIVE", "a"), member("INACTIVE", "b")] }],
      });
      expect(groups[0].studentsCount).toBe(1);
    });
  });
});

describe("teacherPortalGroupStudents", () => {
  it("asks for GET /teacher-portal/groups/{id}/students", async () => {
    const { requests } = await loadGroupStudents({ data: [] });
    expect(requests[0].method).toBe("GET");
    expect(path(requests[0].url)).toBe("/teacher-portal/groups/g1/students");
  });

  describe("members who left", () => {
    it.each(["INACTIVE", "DELETED", "inactive", "deleted"])("drops a member whose status is %s", async (status) => {
      const { students } = await loadGroupStudents({ data: [{ id: "gone", name: "Gone", status }, { id: "kept", name: "Kept", status: "ACTIVE" }] });
      expect(ids(students)).toEqual(["kept"]);
    });

    it("drops a member whose group status says INACTIVE even when the plain status still says ACTIVE", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "gone", status: "ACTIVE", studentGroupStatus: "INACTIVE" }, { id: "kept", status: "ACTIVE" }],
      });
      expect(ids(students)).toEqual(["kept"]);
    });

    it("drops a nested membership row by its membership status", async () => {
      const { students } = await loadGroupStudents({
        data: [
          { id: "m1", student: { id: "s1", name: "Gone", status: "ACTIVE" }, status: "DELETED" },
          { id: "m2", student: { id: "s2", name: "Kept", status: "ACTIVE" }, status: "ACTIVE" },
        ],
      });
      expect(ids(students)).toEqual(["s2"]);
    });

    it("keeps trial, frozen and active members", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "a", status: "PROBATION" }, { id: "b", status: "FROZEN" }, { id: "c", status: "ACTIVE" }, { id: "d" }],
      });
      expect(ids(students)).toEqual(["a", "b", "c", "d"]);
    });
  });

  describe("membership status", () => {
    const statusOf = async (row: Record<string, unknown>) => (await loadGroupStudents({ data: [{ id: "s1", name: "Ali", ...row }] })).students[0].status;

    it("reads studentGroupStatus first: a flat ACTIVE row in a trial lesson comes out as PROBATION", async () => {
      expect(await statusOf({ status: "ACTIVE", studentGroupStatus: "PROBATION" })).toBe("PROBATION");
    });

    it("prefers studentGroupStatus over membershipStatus", async () => {
      expect(await statusOf({ status: "ACTIVE", membershipStatus: "FROZEN", studentGroupStatus: "PROBATION" })).toBe("PROBATION");
    });

    it("reads membershipStatus when there is no studentGroupStatus", async () => {
      expect(await statusOf({ status: "ACTIVE", membershipStatus: "FROZEN" })).toBe("FROZEN");
    });

    it("falls back to the plain status, upper-cased", async () => {
      expect(await statusOf({ status: "frozen" })).toBe("FROZEN");
      expect(await statusOf({ status: "ACTIVE" })).toBe("ACTIVE");
    });

    it("is an empty string when the row carries no status", async () => {
      expect(await statusOf({})).toBe("");
    });

    it("skips an empty studentGroupStatus instead of reporting it", async () => {
      expect(await statusOf({ status: "ACTIVE", studentGroupStatus: "", membershipStatus: null })).toBe("ACTIVE");
    });

    it("takes the membership status of a nested row over the account status of the student", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "m1", student: { id: "s1", name: "Ali", status: "ACTIVE" }, status: "PROBATION" }],
      });
      expect(students[0].status).toBe("PROBATION");
    });

    it("reads a studentGroupStatus carried by the nested student too", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "m1", student: { id: "s1", name: "Ali", studentGroupStatus: "FROZEN" }, status: "ACTIVE" }],
      });
      expect(students[0].status).toBe("FROZEN");
    });

    it("uses the nested student's own status when the membership row has none", async () => {
      const { students } = await loadGroupStudents({ data: [{ id: "m1", student: { id: "s1", name: "Ali", status: "frozen" } }] });
      expect(students[0].status).toBe("FROZEN");
    });
  });

  describe("student id", () => {
    it("is the student's own id on a plain student row", async () => {
      const { students } = await loadGroupStudents({ data: [{ id: "s1", name: "Ali" }] });
      expect(students[0].id).toBe("s1");
    });

    it("is the nested student's id, never the membership row's id", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "membership-9", student: { id: "student-4", name: "Vali", phone: "901234567" }, status: "ACTIVE" }],
      });
      expect(students[0]).toMatchObject({ id: "student-4", name: "Vali", phone: "901234567" });
    });

    it("is studentId on a flat membership row, with the flat name and phone fields", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "membership-7", studentId: "student-5", studentName: "Zara", studentPhone: "+998915179774", status: "PROBATION" }],
      });
      expect(students[0]).toMatchObject({ id: "student-5", name: "Zara", phone: "+998915179774", status: "PROBATION" });
    });

    it("falls back to a numeric id", async () => {
      const { students } = await loadGroupStudents({ data: [{ id: 42, name: "Num" }] });
      expect(students[0].id).toBe("42");
    });
  });

  describe("other fields", () => {
    it("reads balance (number, string or decimal.js object), the join date and the comment", async () => {
      const { students } = await loadGroupStudents({
        data: [
          { id: "a", name: "A", balance: -150000, groupsStart: "2026-09-01", paymentStartDate: "2026-09-05", joinedAt: "2026-09-10", comment: "Late payer" },
          { id: "b", name: "B", balance: "25000", paymentStartDate: "2026-09-05", joinedAt: "2026-09-10" },
          { id: "c", name: "C", balance: { s: -1, e: 6, d: [1200000] }, joinedAt: "2026-09-10" },
          { id: "d", name: "D" },
        ],
      });

      expect(students.map((s) => s.balance)).toEqual([-150000, 25000, -1200000, null]);
      expect(students.map((s) => s.activatedAt)).toEqual(["2026-09-01", "2026-09-05", "2026-09-10", null]);
      expect(students[0].comment).toBe("Late payer");
      expect(students[1].comment).toBeNull();
    });

    it("prefers the nested student's createdAt over the membership row's", async () => {
      const { students } = await loadGroupStudents({
        data: [{ id: "m1", createdAt: "2026-09-10", student: { id: "s1", name: "Ali", createdAt: "2025-01-02" } }],
      });
      expect(students[0].createdAt).toBe("2025-01-02");
    });
  });

  describe("debtor flag", () => {
    const debtorOf = async (row: Record<string, unknown>) =>
      (await loadGroupStudents({ data: [{ id: "s1", name: "Ali", ...row }] })).students[0].debtor;

    it("is true for a negative balance, false for zero or a positive one (number, string or decimal.js)", async () => {
      expect(await debtorOf({ balance: -1 })).toBe(true);
      expect(await debtorOf({ balance: "-150000" })).toBe(true);
      expect(await debtorOf({ balance: { s: -1, e: 6, d: [1200000] } })).toBe(true);
      expect(await debtorOf({ balance: 0 })).toBe(false);
      expect(await debtorOf({ balance: 25000 })).toBe(false);
    });

    it("reads an explicit boolean flag when there is no balance", async () => {
      expect(await debtorOf({ isDebtor: true })).toBe(true);
      expect(await debtorOf({ debtor: true })).toBe(true);
      expect(await debtorOf({ hasDebt: true })).toBe(true);
      expect(await debtorOf({ isDebtor: false })).toBe(false);
    });

    it("reads a DEBTOR status (finance, student or account status) when there is nothing more exact", async () => {
      expect(await debtorOf({ financeStatus: "DEBTOR" })).toBe(true);
      expect(await debtorOf({ studentStatus: "debtor", studentGroupStatus: "ACTIVE" })).toBe(true);
      expect(await debtorOf({ status: "DEBTOR" })).toBe(true);
      expect(await debtorOf({ financeStatus: "DEBT_FREE" })).toBeNull();
    });

    it("lets the signed balance decide over a flag or a status", async () => {
      expect(await debtorOf({ balance: 5000, isDebtor: true, studentStatus: "DEBTOR" })).toBe(false);
      expect(await debtorOf({ balance: -5000, isDebtor: false })).toBe(true);
    });

    it("reads the balance of a nested student row", async () => {
      const { students } = await loadGroupStudents({ data: [{ id: "m1", student: { id: "s1", name: "Ali", balance: -10 } }] });
      expect(students[0].debtor).toBe(true);
    });

    it("is null (unknown, NOT 'no debt') when the row says nothing about money", async () => {
      expect(await debtorOf({})).toBeNull();
      expect(await debtorOf({ status: "ACTIVE", studentGroupStatus: "ACTIVE" })).toBeNull();
    });
  });

  describe("this group's own dates", () => {
    it("reads joinedAt and paymentStartDate separately, with no account-wide fallback", async () => {
      const { students } = await loadGroupStudents({
        data: [
          { id: "a", name: "A", groupsStart: "2026-01-01", joinedAt: "2026-09-10", paymentStartDate: "2026-09-05" },
          { id: "b", name: "B", groupsStart: "2026-01-01", joinedAt: "2026-09-10" },
          { id: "c", name: "C", groupsStart: "2026-01-01" },
        ],
      });

      expect(students.map((s) => s.joinedAt)).toEqual(["2026-09-10", "2026-09-10", null]);
      expect(students.map((s) => s.paymentStartDate)).toEqual(["2026-09-05", null, null]);
    });
  });

  describe("response shapes", () => {
    it("accepts a bare array, data or students", async () => {
      expect(ids((await loadGroupStudents([{ id: "a" }])).students)).toEqual(["a"]);
      expect(ids((await loadGroupStudents({ data: [{ id: "b" }] })).students)).toEqual(["b"]);
      expect(ids((await loadGroupStudents({ students: [{ id: "c" }] })).students)).toEqual(["c"]);
    });

    it("returns an empty list for an empty body", async () => {
      expect((await loadGroupStudents({})).students).toEqual([]);
    });
  });
});

describe("teacherPortalGroupById", () => {
  it("asks for GET /teacher-portal/groups/{id}", async () => {
    const { requests } = await loadGroupById({ data: { id: "g1" } });
    expect(path(requests[0].url)).toBe("/teacher-portal/groups/g1");
  });

  it("keeps the live members of the embedded roster, with student ids and membership statuses", async () => {
    const { group } = await loadGroupById({
      data: {
        id: "g1",
        name: "Morning",
        status: "ACTIVE",
        students: [
          { id: "s1", name: "Ali", status: "ACTIVE", studentGroupStatus: "PROBATION" },
          { id: "m2", student: { id: "s2", name: "Vali", status: "ACTIVE" }, status: "FROZEN" },
          { id: "s3", name: "Gone", status: "INACTIVE" },
          { id: "s4", name: "Deleted", status: "ACTIVE", studentGroupStatus: "DELETED" },
          { id: "m5", studentId: "s5", studentName: "Zara", status: "ACTIVE" },
        ],
      },
    });

    expect(group?.students.map((s) => [s.id, s.status])).toEqual([
      ["s1", "PROBATION"],
      ["s2", "FROZEN"],
      ["s5", "ACTIVE"],
    ]);
  });

  it("counts the same live members in studentsCount, ignoring a bare count that includes leavers", async () => {
    const { group } = await loadGroupById({
      data: { id: "g1", studentsCount: 9, students: [{ id: "s1", status: "ACTIVE" }, { id: "s2", status: "DELETED" }, { id: "s3", status: "FROZEN" }] },
    });

    expect(group?.studentsCount).toBe(2);
    expect(group?.students).toHaveLength(2);
  });

  it("reads a { group, students } wrapper", async () => {
    const { group } = await loadGroupById({
      data: { group: { id: "g1", name: "Morning", status: "active" }, students: [{ id: "s1", name: "Ali" }, { id: "s2", name: "Gone", status: "DELETED" }] },
    });

    expect(group).toMatchObject({ id: "g1", name: "Morning", status: "ACTIVE", studentsCount: 1 });
    expect(ids(group?.students ?? [])).toEqual(["s1"]);
  });

  it("has an empty roster when none is sent", async () => {
    const { group } = await loadGroupById({ data: { id: "g1", name: "Morning", studentsCount: 6 } });

    expect(group?.students).toEqual([]);
    expect(group?.studentsCount).toBe(6);
  });
});

describe("teacherPortalSchedule", () => {
  const lesson = (extra: Record<string, unknown> = {}) => ({ groupId: "g1", groupName: "Morning", day: "monday", time: "10:00", ...extra });
  const groupIds = (items: Array<{ groupId: string }>) => items.map((item) => item.groupId);

  it("asks for GET /teacher-portal/schedule and maps a plain row", async () => {
    const { items, requests } = await loadSchedule({
      data: [lesson({ courseName: "English", roomName: "101", teachers: ["Aziz", "Bobur"], trainingStart: "2026-09-01", trainingEnd: "2026-12-01", maxStudents: 12 })],
    });

    expect(path(requests[0].url)).toBe("/teacher-portal/schedule");
    expect(items[0]).toMatchObject({
      groupId: "g1",
      groupName: "Morning",
      courseName: "English",
      roomName: "101",
      day: "MONDAY",
      daysType: "ODD",
      time: "10:00",
      teachers: "Aziz, Bobur",
      trainingStart: "2026-09-01",
      trainingEnd: "2026-12-01",
      maxStudents: 12,
    });
  });

  describe("archived groups", () => {
    it.each(ENDED_GROUP_STATUSES)("drops a lesson whose groupStatus is %s", async (status) => {
      const { items } = await loadSchedule({ data: [lesson({ groupId: "gone", groupStatus: status }), lesson({ groupId: "kept", groupStatus: "ACTIVE" })] });
      expect(groupIds(items)).toEqual(["kept"]);
    });

    it.each(ENDED_GROUP_STATUSES.map((s) => s.toLowerCase()))("drops a lesson whose group.status is %s", async (status) => {
      const { items } = await loadSchedule({
        data: [lesson({ groupId: "gone", group: { id: "gone", status } }), lesson({ groupId: "kept", group: { id: "kept", status: "ACTIVE" } })],
      });
      expect(groupIds(items)).toEqual(["kept"]);
    });

    it("keeps a lesson whose group status is missing or unfamiliar", async () => {
      const { items } = await loadSchedule({
        data: [
          lesson({ groupId: "none" }),
          lesson({ groupId: "weird", groupStatus: "PAUSED" }),
          lesson({ groupId: "nested-weird", group: { id: "nested-weird", status: "SOMETHING_NEW" } }),
          lesson({ groupId: "text-group", group: "Evening" }),
        ],
      });
      expect(groupIds(items)).toEqual(["none", "weird", "nested-weird", "text-group"]);
    });
  });

  describe("finished training periods", () => {
    it("drops a lesson whose own trainingEnd is in the past", async () => {
      const { items } = await loadSchedule({
        data: [lesson({ groupId: "past", trainingEnd: "2026-10-30" }), lesson({ groupId: "kept", trainingEnd: "2026-12-01" })],
      });
      expect(groupIds(items)).toEqual(["kept"]);
    });

    it("drops a lesson whose group.trainingEnd is in the past", async () => {
      const { items } = await loadSchedule({
        data: [
          lesson({ groupId: "past", group: { id: "past", trainingEnd: "2026-10-30T00:00:00.000Z" } }),
          lesson({ groupId: "kept", group: { id: "kept", trainingEnd: "2026-12-01T00:00:00.000Z" } }),
        ],
      });
      expect(groupIds(items)).toEqual(["kept"]);
    });

    it("keeps a lesson of a group that ends today or tomorrow, has no end date, or an unreadable one", async () => {
      const { items } = await loadSchedule({
        data: [
          lesson({ groupId: "today", trainingEnd: "2026-10-31" }),
          lesson({ groupId: "tomorrow", trainingEnd: "2026-11-01" }),
          lesson({ groupId: "open" }),
          lesson({ groupId: "empty", trainingEnd: "" }),
          lesson({ groupId: "garbage", trainingEnd: "soon" }),
          lesson({ groupId: "nested-today", group: { id: "nested-today", trainingEnd: "2026-10-31T00:00:00+05:00" } }),
        ],
      });
      expect(groupIds(items)).toEqual(["today", "tomorrow", "open", "empty", "garbage", "nested-today"]);
    });

    it("lets the row's own trainingEnd win over the group's", async () => {
      const { items } = await loadSchedule({
        data: [
          lesson({ groupId: "row-wins", trainingEnd: "2026-12-01", group: { id: "row-wins", trainingEnd: "2026-01-01" } }),
          lesson({ groupId: "row-expired", trainingEnd: "2026-01-01", group: { id: "row-expired", trainingEnd: "2026-12-01" } }),
        ],
      });
      expect(groupIds(items)).toEqual(["row-wins"]);
    });

    it("reads today on every call", async () => {
      const body = { data: [lesson({ groupId: "g1", trainingEnd: "2026-10-31" })] };
      expect(groupIds((await loadSchedule(body)).items)).toEqual(["g1"]);

      setNow(2026, 11, 1);
      expect(groupIds((await loadSchedule(body)).items)).toEqual([]);
    });

    it("applies the archived and the finished rule independently", async () => {
      const { items } = await loadSchedule({
        data: [
          lesson({ groupId: "ok" }),
          lesson({ groupId: "archived", groupStatus: "ARCHIVED" }),
          lesson({ groupId: "finished", trainingEnd: "2026-01-01" }),
        ],
      });
      expect(groupIds(items)).toEqual(["ok"]);
    });
  });

  describe("studentsCount", () => {
    const member = (status: string, id = status) => ({ id, name: id, status });
    const countOf = async (extra: Record<string, unknown>) => (await loadSchedule({ data: [lesson(extra)] })).items[0].studentsCount;

    it("counts the live members of an embedded roster, not a bare count with leavers in it", async () => {
      expect(await countOf({ studentsCount: 10, students: [member("ACTIVE", "a"), member("PROBATION", "b"), member("INACTIVE", "c"), member("DELETED", "d")] })).toBe(2);
    });

    it("is 0 when every embedded member has left", async () => {
      expect(await countOf({ studentsCount: 5, students: [member("INACTIVE", "a")] })).toBe(0);
    });

    it("uses the numeric count when there is no list", async () => {
      expect(await countOf({ studentsCount: 6 })).toBe(6);
      expect(await countOf({ group: { id: "g1", studentsCount: 4 } })).toBe(4);
      expect(await countOf({ students: 8 })).toBe(8);
    });

    it("falls back to the numeric count when the embedded list is empty", async () => {
      expect(await countOf({ students: [], studentsCount: 4 })).toBe(4);
    });

    it("is null when the row says nothing about its students", async () => {
      expect(await countOf({})).toBeNull();
    });
  });

  describe("response shapes", () => {
    it("accepts a bare array, data, schedule or items", async () => {
      expect(groupIds((await loadSchedule([lesson({ groupId: "a" })])).items)).toEqual(["a"]);
      expect(groupIds((await loadSchedule({ data: [lesson({ groupId: "b" })] })).items)).toEqual(["b"]);
      expect(groupIds((await loadSchedule({ schedule: [lesson({ groupId: "c" })] })).items)).toEqual(["c"]);
      expect(groupIds((await loadSchedule({ items: [lesson({ groupId: "d" })] })).items)).toEqual(["d"]);
    });

    it("returns an empty list for an empty body", async () => {
      expect((await loadSchedule({})).items).toEqual([]);
    });
  });
});
