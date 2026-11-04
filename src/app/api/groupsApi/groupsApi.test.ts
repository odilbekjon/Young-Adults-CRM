import { describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { extractHistoryList, groupsApi, normalizeHistory } from "./groupsApi";
import { setSelectedBranchId } from "../../store/branchSlice";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, readFormData, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "");

describe("groupsApi.assignStudentsToGroup", () => {
  it("posts a JSON body with the status and dates, and keeps the group id in the URL only", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.assignStudentsToGroup.initiate({
        id: "g1",
        studentIds: ["s1", "s2"],
        status: "PROBATION",
        joinedAt: "2026-05-01",
      }),
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/groups/g1/students/assign");
    expect(requests[0].headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(requests[0].body)).toEqual({ studentIds: ["s1", "s2"], status: "PROBATION", joinedAt: "2026-05-01" });
  });

  it("sends only the student ids when no status is given", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g1", studentIds: ["s1"] }));

    expect(JSON.parse(requests[0].body)).toEqual({ studentIds: ["s1"] });
  });

  it("refreshes the cached group lists afterwards", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    const subscription = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());
    await subscription;
    expect(requests.filter((r) => r.method === "GET")).toHaveLength(1);

    await store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g1", studentIds: ["s1"] }));

    await vi.waitFor(() => expect(requests.filter((r) => r.method === "GET" && path(r.url) === "/groups/select")).toHaveLength(2));
    subscription.unsubscribe();
  });
});

describe("groupsApi.groupsSelect", () => {
  const select = async (body: unknown) => {
    const store = createTestStore();
    stubFetch(() => jsonResponse(body));
    return (await store.dispatch(groupsApi.endpoints.groupsSelect.initiate())).data;
  };

  it("reads a plain array under data", async () => {
    expect(await select({ data: [{ id: "g1", name: "A1" }, { id: "g2", name: "B2" }] })).toEqual([
      { id: "g1", name: "A1" },
      { id: "g2", name: "B2" },
    ]);
  });

  it("reads a {data, meta} envelope under data", async () => {
    expect(await select({ data: { data: [{ id: "g1", name: "A1" }], meta: { total: 1 } } })).toEqual([{ id: "g1", name: "A1" }]);
  });

  it("falls back to an empty list when the body has no list", async () => {
    expect(await select({})).toEqual([]);
    expect(await select({ data: null })).toEqual([]);
    expect(await select({ data: "oops" })).toEqual([]);
  });
});

describe("groupsApi.allGroups", () => {
  it("asks for the page, the limit and the teacher", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.allGroups.initiate({ page: 2, limit: 100, teacherId: "t1" }));

    expect(path(requests[0].url)).toBe("/groups?page=2&limit=100&teacherId=t1");
  });

  it("defaults to the first page of 10 and adds no empty filters", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.allGroups.initiate({}));

    expect(path(requests[0].url)).toBe("/groups?page=1&limit=10");
  });

  it("keeps the envelope (meta) and normalizes data to an array", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: true, data: { data: [{ id: "g1", status: "ACTIVE" }] }, meta: { totalPages: 3 } }));

    const { data } = await store.dispatch(groupsApi.endpoints.allGroups.initiate({}));

    expect(data?.data).toEqual([{ id: "g1", status: "ACTIVE" }]);
    expect(data?.meta).toEqual({ totalPages: 3 });
  });
});

describe("groupsApi.groupsByCourse", () => {
  const loadByCourse = async (rows: unknown[]) => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: rows }));
    const { data } = await store.dispatch(groupsApi.endpoints.groupsByCourse.initiate("course 1"));
    return { data, requests };
  };

  it("encodes the course id and is not narrowed to one branch", async () => {
    const { requests } = await loadByCourse([]);
    expect(path(requests[0].url)).toBe("/groups/by-course?courseId=course%201");
    expect(requests[0].headers.get("x-branch-id")).toBe("all");
  });

  it("maps a row with teachers, upper-cases daysType and defaults the missing fields", async () => {
    const { data } = await loadByCourse([
      {
        id: "g1",
        name: "Morning",
        status: "ACTIVE",
        courseId: "c1",
        daysType: "odd",
        days: ["MONDAY", "WEDNESDAY"],
        time: "10:00",
        trainingStart: "2026-01-01T00:00:00.000Z",
        trainingEnd: "2026-04-01T00:00:00.000Z",
        teachers: [{ name: "Aziz" }, "Bobur"],
      },
      { name: "Bare" },
    ]);

    expect(data?.[0]).toEqual({
      id: "g1",
      name: "Morning",
      status: "ACTIVE",
      courseId: "c1",
      daysType: "ODD",
      days: ["MONDAY", "WEDNESDAY"],
      time: "10:00",
      trainingStart: "2026-01-01T00:00:00.000Z",
      trainingEnd: "2026-04-01T00:00:00.000Z",
      teacherNames: ["Aziz", "Bobur"],
    });
    expect(data?.[1]).toEqual({
      id: "1", // falls back to the row index
      name: "Bare",
      status: "",
      courseId: "",
      daysType: "",
      days: [],
      time: null,
      trainingStart: null,
      trainingEnd: null,
      teacherNames: [],
    });
  });

  it("finds the teacher under teacherNames or a single teacher / teacherName field", async () => {
    const { data } = await loadByCourse([
      { id: "a", teacherNames: ["X", "Y"] },
      { id: "b", teacher: "Solo" },
      { id: "c", teacherName: "Named" },
      { id: "d", teacher: { name: "Nested" } },
    ]);
    expect(data?.map((g) => g.teacherNames)).toEqual([["X", "Y"], ["Solo"], ["Named"], ["Nested"]]);
  });
});

describe("groupsApi.studentGroups", () => {
  const load = async (body: unknown, args?: Parameters<typeof groupsApi.endpoints.studentGroups.initiate>[0]) => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse(body));
    const { data } = await store.dispatch(groupsApi.endpoints.studentGroups.initiate(args));
    return { data, requests };
  };

  it("builds the query string from the filters that are set, always with page and limit", async () => {
    const { requests } = await load({ data: [] }, { groupId: "g1", status: "PROBATION", page: 2 });
    expect(path(requests[0].url)).toBe("/student-groups?groupId=g1&status=PROBATION&page=2&limit=10");
  });

  it("defaults to page 1 of 10 without arguments", async () => {
    const { requests } = await load({ data: [] });
    expect(path(requests[0].url)).toBe("/student-groups?page=1&limit=10");
  });

  it("normalizes a flat row: upper-cased status, null for missing optional fields", async () => {
    const { data } = await load({
      data: [
        {
          id: "sg1",
          studentId: "s1",
          studentName: "Ali",
          studentPhone: "+998915179774",
          groupId: "g1",
          groupName: "A1",
          status: "probation",
          joinedAt: "2026-05-01",
          customPrice: 250000,
          reason: "Left the city",
          reasonId: "r1",
        },
      ],
    });

    expect(data?.rows[0]).toEqual({
      id: "sg1",
      studentId: "s1",
      studentName: "Ali",
      studentPhone: "+998915179774",
      groupId: "g1",
      groupName: "A1",
      status: "PROBATION",
      joinedAt: "2026-05-01",
      exitedAt: null,
      paymentStartDate: null,
      customPrice: 250000,
      discountReason: null,
      createdAt: null,
      updatedAt: null,
      reason: "Left the city",
      reasonId: "r1",
      comment: null,
      processedBy: null,
    });
  });

  it("reads a nested student and group object", async () => {
    const { data } = await load({
      data: [{ id: "sg2", student: { id: "s2", name: "Vali", phone: "901234567" }, group: { id: "g2", name: "B2" }, status: "FROZEN" }],
    });

    expect(data?.rows[0]).toMatchObject({
      studentId: "s2",
      studentName: "Vali",
      studentPhone: "901234567",
      groupId: "g2",
      groupName: "B2",
      status: "FROZEN",
    });
  });

  it("keeps a custom price only when it is a number", async () => {
    const { data } = await load({ data: [{ id: "a", customPrice: "100" }, { id: "b", customPrice: 0 }] });
    expect(data?.rows.map((r) => r.customPrice)).toEqual([null, 0]);
  });

  it("accepts a bare array, {data} or {rows} as the list", async () => {
    expect((await load([{ id: "a" }])).data?.rows.map((r) => r.id)).toEqual(["a"]);
    expect((await load({ data: [{ id: "b" }] })).data?.rows.map((r) => r.id)).toEqual(["b"]);
    expect((await load({ rows: [{ id: "c" }] })).data?.rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("takes paging from meta, and derives it from the rows when meta is absent", async () => {
    const withMeta = await load({ data: [{ id: "a" }], meta: { total: 45, page: 2, limit: 20 } });
    expect(withMeta.data?.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });

    const withoutMeta = await load({ data: [{ id: "a" }, { id: "b" }] });
    expect(withoutMeta.data?.meta).toEqual({ total: 2, page: 1, limit: 2, totalPages: 1 });

    const empty = await load({ data: [] });
    expect(empty.data?.meta).toEqual({ total: 0, page: 1, limit: 10, totalPages: 1 });
  });
});

describe("groupsApi.studentGroupById", () => {
  it("unwraps a {data: row} envelope", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: true, data: { id: "sg1", status: "active", groupId: "g1" } }));

    const { data } = await store.dispatch(groupsApi.endpoints.studentGroupById.initiate("sg1"));

    expect(data).toMatchObject({ id: "sg1", status: "ACTIVE", groupId: "g1" });
  });

  it("accepts the row itself", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ id: "sg9", status: "FROZEN" }));

    const { data } = await store.dispatch(groupsApi.endpoints.studentGroupById.initiate("sg9"));

    expect(data).toMatchObject({ id: "sg9", status: "FROZEN" });
  });
});

describe("groupsApi membership writes", () => {
  it("PATCHes a membership's status and billing date in one multipart request", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.updateStudentGroup.initiate({ id: "sg1", status: "ACTIVE", paymentStartDate: "2026-06-01" }),
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("PATCH");
    expect(path(requests[0].url)).toBe("/student-groups/sg1");
    expect(requests[0].headers.get("content-type")).toContain("multipart/form-data");
    expect(await readFormData(requests[0])).toEqual([
      ["status", "ACTIVE"],
      ["paymentStartDate", "2026-06-01"],
    ]);
  });

  it("leaves out empty strings and undefined fields from the multipart body", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.updateStudentGroup.initiate({ id: "sg1", status: "ACTIVE", discountReason: "", joinedAt: undefined }));

    expect(await readFormData(requests[0])).toEqual([["status", "ACTIVE"]]);
  });

  it("sends a boolean flag only when it is true (multipart cannot carry false)", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.updateStudentGroupStatus.initiate({ id: "sg1", status: "INACTIVE", reason: "Moved", isAllGroup: false, studentDelete: true }),
    );

    expect(path(requests[0].url)).toBe("/student-groups/sg1/status");
    expect(requests[0].method).toBe("PATCH");
    expect(await readFormData(requests[0])).toEqual([
      ["status", "INACTIVE"],
      ["reason", "Moved"],
      ["studentDelete", "true"],
    ]);
  });

  it("freezes with the dates and reason as multipart fields", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.freezeStudentGroup.initiate({ id: "sg1", startDate: "2026-06-01", endDate: "2026-07-01", reason: "Holiday" }),
    );

    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/student-groups/sg1/freeze");
    expect(await readFormData(requests[0])).toEqual([
      ["startDate", "2026-06-01"],
      ["endDate", "2026-07-01"],
      ["reason", "Holiday"],
    ]);
  });

  it("unfreezes from a bare membership id as well as from {id, endDate}", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.unfreezeStudentGroup.initiate("sg1"));
    await store.dispatch(groupsApi.endpoints.unfreezeStudentGroup.initiate({ id: "sg2", endDate: "2026-08-01" }));

    expect(path(requests[0].url)).toBe("/student-groups/sg1/unfreeze");
    expect(await readFormData(requests[0])).toEqual([]);
    expect(path(requests[1].url)).toBe("/student-groups/sg2/unfreeze");
    expect(await readFormData(requests[1])).toEqual([["endDate", "2026-08-01"]]);
  });

  it("logs a failed freeze with the backend's reason instead of swallowing it", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createTestStore();
    stubFetch(() => jsonResponse({ error: "Student is already frozen" }, { status: 409 }));

    const result = await store.dispatch(
      groupsApi.endpoints.freezeStudentGroup.initiate({ id: "sg1", startDate: "2026-06-01" }),
    );

    expect(result).toMatchObject({ error: { status: 409, data: { error: "Student is already frozen" } } });
    await vi.waitFor(() => expect(errorLog).toHaveBeenCalled());
    expect(errorLog.mock.calls[0][0]).toBe("[freezeStudentGroup] FAILED");
  });

  it("graduates a trial student with a body-less POST", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.graduateTrialStudentGroup.initiate("sg1"));

    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/student-groups/sg1/graduate-trial");
    expect(requests[0].body).toBe("");
  });

  it("transfers a student with the reason always present in the JSON body", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.transferStudent.initiate({ id: "g1", studentId: "s1", newGroupId: "g2", reason: "Level up" }),
    );

    expect(path(requests[0].url)).toBe("/groups/g1/students/transfer");
    expect(JSON.parse(requests[0].body)).toEqual({ studentId: "s1", newGroupId: "g2", reason: "Level up" });
  });

  it("removes a student with DELETE /groups/{id}/students/{studentId}", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.removeStudentFromGroup.initiate({ id: "g1", studentId: "s1" }));

    expect(requests[0].method).toBe("DELETE");
    expect(path(requests[0].url)).toBe("/groups/g1/students/s1");
  });
});

describe("groupsApi.createGroup", () => {
  it("sends array fields with the [] suffix so one item still arrives as an array", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.createGroup.initiate({
        name: "Morning",
        courseId: "c1",
        roomId: "",
        time: "10:00",
        days: ["MONDAY", "FRIDAY"],
        teacherIds: ["t1"],
        studentIds: [],
      }),
    );

    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/groups");
    expect(await readFormData(requests[0])).toEqual([
      ["name", "Morning"],
      ["courseId", "c1"],
      ["time", "10:00"],
      ["days[]", "MONDAY"],
      ["days[]", "FRIDAY"],
      ["teacherIds[]", "t1"],
    ]);
  });

  it("names the branch the group is created in with the x-branch-id header, not in the body", async () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("b-grammar"));
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.createGroup.initiate({ name: "Morning", courseId: "c1", branchId: "b-ielts" }),
    );

    // the request's own branch wins over the one picked in the header selector
    expect(requests[0].headers.get("x-branch-id")).toBe("b-ielts");
    expect(await readFormData(requests[0])).toEqual([
      ["name", "Morning"],
      ["courseId", "c1"],
    ]);
  });

  it("keeps using the header selector's branch when the caller names none", async () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("b-grammar"));
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(groupsApi.endpoints.createGroup.initiate({ name: "Morning", courseId: "c1" }));

    expect(requests[0].headers.get("x-branch-id")).toBe("b-grammar");
  });

  it("sends the named branch even when no branch is selected (All branches)", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(
      groupsApi.endpoints.createGroup.initiate({ name: "Morning", courseId: "c1", branchId: "b-grammar" }),
    );

    expect(requests[0].headers.get("x-branch-id")).toBe("b-grammar");
  });
});

describe("normalizeHistory", () => {
  it("accepts a bare array and maps the well-known fields", () => {
    const rows = normalizeHistory([
      {
        id: "h1",
        type: "student_added",
        createdAt: "2026-05-01T10:00:00.000Z",
        user: { name: "Admin" },
        student: { id: "s1", name: "Ali", phone: "+998915179774" },
        group: { id: "g1", name: "A1" },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "h1",
      type: "STUDENT_ADDED",
      title: "",
      actor: "Admin",
      studentId: "s1",
      studentName: "Ali",
      studentPhone: "+998915179774",
      groupId: "g1",
      groupName: "A1",
      createdAt: "2026-05-01T10:00:00.000Z",
      transition: null,
    });
  });

  it("keeps a ready-made localized sentence in `action` as the title when there is no machine type", () => {
    const [row] = normalizeHistory([{ id: "h2", action: "Mevericks guruhiga biriktirildi", date: "2026-05-01", user: { name: "X" } }]);
    expect(row.title).toBe("Mevericks guruhiga biriktirildi");
    expect(row.createdAt).toBe("2026-05-01");
    expect(row.actor).toBe("X");
  });

  it("turns explicit old/new status into a transition and trims a midnight-UTC timestamp to a date", () => {
    const [row] = normalizeHistory([
      { id: "h3", type: "STATUS_CHANGED", oldStatus: "PROBATION", newStatus: "ACTIVE", activatedFrom: "2026-06-01T00:00:00.000Z" },
    ]);
    expect(row.transition).toEqual({ from: "PROBATION", to: "ACTIVE" });
    expect(row.activatedFrom).toBe("2026-06-01");
  });

  it("splits a changes block into field changes and a status transition", () => {
    const [row] = normalizeHistory([
      {
        id: "h4",
        type: "UPDATED",
        changes: [
          { field: "name", from: "A", to: "B" },
          { field: "status", from: "ACTIVE", to: "FROZEN" },
        ],
      },
    ]);
    expect(row.changes).toEqual([{ key: "name", label: "Name", value: "B", from: "A" }]);
    expect(row.transition).toEqual({ from: "ACTIVE", to: "FROZEN" });
  });

  it("finds the rows under the usual wrapper keys, one level deep as well", () => {
    expect(extractHistoryList([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(extractHistoryList({ history: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(extractHistoryList({ data: { rows: [{ id: 3 }], meta: {} } })).toEqual([{ id: 3 }]);
    expect(extractHistoryList({ data: { items: [{ id: 4 }] } })).toEqual([{ id: 4 }]);
  });

  it("returns an empty list for anything that has no rows, and skips non-object rows", () => {
    expect(normalizeHistory(null)).toEqual([]);
    expect(normalizeHistory("nope")).toEqual([]);
    expect(normalizeHistory({})).toEqual([]);
    expect(normalizeHistory([null, 5, { id: "ok" }]).map((r) => r.id)).toEqual(["ok"]);
  });
});
