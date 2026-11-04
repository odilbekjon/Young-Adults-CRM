import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "./index";
import { coursesApi } from "../coursesApi";
import { groupsApi } from "../groupsApi";
import { teachersApi } from "../teachersApi";
import { setSelectedBranchId } from "../../store/branchSlice";
import { createTestStore } from "../../../test/testStore";
import { holdRequests, jsonResponse, stubFetch, type HeldRequest } from "../../../test/fetchStub";

// baseApi keeps its request limiter (in-flight counters, wait queue) at module
// level, so every test must leave nothing running: whatever is still held is
// answered in afterEach.
let outstanding: HeldRequest[] = [];

afterEach(() => {
  vi.useRealTimers();
  for (const entry of outstanding) entry.respond();
  outstanding = [];
});

const hold = () => {
  const stub = holdRequests();
  outstanding = stub.held;
  return stub;
};

// Real-timer pause, for asserting that something did NOT happen.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 25));

const urlOf = (entry: HeldRequest) => entry.request.url.replace(API_BASE_URL, "");

describe("baseApi request headers", () => {
  it("sends the stored access token, the selected branch and the UI language", async () => {
    localStorage.setItem("ACCESS_TOKEN", "tok-123");
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("branch-7"));
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(`${API_BASE_URL}/groups/select`);
    expect(requests[0].method).toBe("GET");
    expect(requests[0].headers.get("authorization")).toBe("Bearer tok-123");
    expect(requests[0].headers.get("x-branch-id")).toBe("branch-7");
    expect(requests[0].headers.get("x-lang")).toBe("en");
  });

  it("sends no Authorization and no branch header when nothing is stored or selected", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests[0].headers.has("authorization")).toBe(false);
    expect(requests[0].headers.has("x-branch-id")).toBe(false);
  });

  it("scopes a course list to the selected branch like every other read (a course belongs to one branch)", async () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("branch-7"));
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(coursesApi.endpoints.allCourses.initiate());

    expect(requests[0].url).toBe(`${API_BASE_URL}/courses`);
    expect(requests[0].headers.get("x-branch-id")).toBe("branch-7");
  });

  it("keeps a branch header the request names itself", async () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("branch-7"));
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.groupsByCourse.initiate("course-1"));

    expect(requests[0].headers.get("x-branch-id")).toBe("all");
  });
});

describe("baseApi rate-limit (HTTP 429) retry", () => {
  const tooMany = (retryAfter?: string) =>
    new Response(JSON.stringify({ error: "Too many parallel requests" }), {
      status: 429,
      headers: retryAfter ? { "Retry-After": retryAfter } : {},
    });

  it("waits for the Retry-After seconds and then re-sends the request", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    let calls = 0;
    const { requests } = stubFetch(() => (++calls === 1 ? tooMany("2") : jsonResponse({ data: [{ id: "g1", name: "A" }] })));

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    await vi.advanceTimersByTimeAsync(1_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    const result = await pending;
    expect(result.data).toEqual([{ id: "g1", name: "A" }]);
    expect(result.error).toBeUndefined();
  });

  it("caps a long Retry-After at 5 seconds", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    let calls = 0;
    const { requests } = stubFetch(() => (++calls === 1 ? tooMany("30") : jsonResponse({ data: [] })));

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    await vi.advanceTimersByTimeAsync(4_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);
    await pending;
  });

  it("backs off 400ms, then 800ms when the server names no delay", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // jitter factor of exactly 1
    const store = createTestStore();
    let calls = 0;
    const { requests } = stubFetch(() => (++calls <= 2 ? tooMany() : jsonResponse({ data: [] })));

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    await vi.advanceTimersByTimeAsync(399);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(799);
    expect(requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(3);
    await pending;
  });

  it("retries a write as well (a 429 is refused before the handler runs)", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    let calls = 0;
    const { requests } = stubFetch(() => (++calls === 1 ? tooMany("1") : jsonResponse({ success: true })));

    const pending = store.dispatch(groupsApi.endpoints.deleteGroup.initiate("g1"));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(requests.map((r) => r.method)).toEqual(["DELETE", "DELETE"]);
    expect((await pending).error).toBeUndefined();
  });

  it("gives up after 4 retries and reports the 429", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    const { requests } = stubFetch(() => tooMany("1"));

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await pending;
    expect(requests).toHaveLength(5); // the first send + 4 retries
    expect(result.error).toMatchObject({ status: 429 });
  });
});

describe("baseApi concurrency limits", () => {
  it("lets at most 3 reads of one endpoint run at once and starts the next as a slot frees", async () => {
    const { held } = hold();
    const store = createTestStore();
    const reads = ["g1", "g2", "g3", "g4", "g5"].map((id) => store.dispatch(groupsApi.endpoints.groupById.initiate(id)));

    await vi.waitFor(() => expect(held).toHaveLength(3));
    await settle();
    expect(held).toHaveLength(3);
    expect(held.map(urlOf)).toEqual(["/groups/g1", "/groups/g2", "/groups/g3"]);

    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(urlOf(held[3])).toBe("/groups/g4");

    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(5));
    expect(urlOf(held[4])).toBe("/groups/g5");

    held.forEach((entry) => entry.respond());
    await Promise.all(reads);
  });

  it("lets at most 2 writes of one endpoint run at once", async () => {
    const { held } = hold();
    const store = createTestStore();
    const writes = ["g1", "g2", "g3", "g4"].map((id) => store.dispatch(groupsApi.endpoints.deleteGroup.initiate(id)));

    await vi.waitFor(() => expect(held).toHaveLength(2));
    await settle();
    expect(held).toHaveLength(2);
    expect(held.every((entry) => entry.request.method === "DELETE")).toBe(true);

    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(3));

    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(4));

    held.forEach((entry) => entry.respond());
    await Promise.all(writes);
  });

  it("counts reads and writes of the same route against one budget", async () => {
    const { held } = hold();
    const store = createTestStore();
    const reads = ["g1", "g2", "g3"].map((id) => store.dispatch(groupsApi.endpoints.groupById.initiate(id)));
    await vi.waitFor(() => expect(held).toHaveLength(3));

    // 3 requests to groups/:id are in flight, so a write (limit 2) has to wait.
    const write = store.dispatch(groupsApi.endpoints.deleteGroup.initiate("g9"));
    await settle();
    expect(held).toHaveLength(3);

    // one slot frees: 2 in flight, still not below the write limit of 2
    held[0].respond();
    await settle();
    expect(held).toHaveLength(3);

    // a second slot frees: 1 in flight, the write may go
    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(held[3].request.method).toBe("DELETE");

    held.forEach((entry) => entry.respond());
    await Promise.all([...reads, write]);
  });

  it("does not let a busy endpoint hold back other endpoints", async () => {
    const { held } = hold();
    const store = createTestStore();
    const reads = ["g1", "g2", "g3", "g4"].map((id) => store.dispatch(groupsApi.endpoints.groupById.initiate(id)));
    await vi.waitFor(() => expect(held).toHaveLength(3));

    const teachers = store.dispatch(teachersApi.endpoints.allTeachers.initiate());
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(urlOf(held[3])).toMatch(/^\/teachers\?/);

    held.forEach((entry) => entry.respond());
    await vi.waitFor(() => expect(held).toHaveLength(5)); // the queued g4
    held[4].respond();
    await Promise.all([...reads, teachers]);
  });

  it("keeps at most 6 requests in flight overall", async () => {
    const { held } = hold();
    const store = createTestStore();
    const calls = [
      store.dispatch(groupsApi.endpoints.groupsSelect.initiate()),
      store.dispatch(groupsApi.endpoints.allGroups.initiate({})),
      store.dispatch(groupsApi.endpoints.groupById.initiate("g1")),
      store.dispatch(groupsApi.endpoints.groupHistory.initiate("g1")),
      store.dispatch(groupsApi.endpoints.groupComments.initiate("g1")),
      store.dispatch(groupsApi.endpoints.studentGroups.initiate()),
      store.dispatch(teachersApi.endpoints.allTeachers.initiate()),
      store.dispatch(teachersApi.endpoints.teachersSelect.initiate({ branchId: "all" })),
    ];

    await vi.waitFor(() => expect(held).toHaveLength(6));
    await settle();
    expect(held).toHaveLength(6);

    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(7));
    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(8));

    held.forEach((entry) => entry.respond());
    await Promise.all(calls);
  });

  it("lets a write jump ahead of queued reads", async () => {
    const { held } = hold();
    const store = createTestStore();
    const fill = [
      store.dispatch(groupsApi.endpoints.groupsSelect.initiate()),
      store.dispatch(groupsApi.endpoints.allGroups.initiate({})),
      store.dispatch(groupsApi.endpoints.groupById.initiate("g1")),
      store.dispatch(groupsApi.endpoints.groupHistory.initiate("g1")),
      store.dispatch(groupsApi.endpoints.groupComments.initiate("g1")),
      store.dispatch(groupsApi.endpoints.studentGroups.initiate()),
    ];
    await vi.waitFor(() => expect(held).toHaveLength(6));

    // The read is queued first, the write after it.
    const queuedRead = store.dispatch(teachersApi.endpoints.allTeachers.initiate());
    await settle();
    const queuedWrite = store.dispatch(groupsApi.endpoints.toggleGroupStatus.initiate("g1"));
    await settle();
    expect(held).toHaveLength(6);

    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(7));
    expect(held[6].request.method).toBe("PATCH");

    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(8));
    expect(urlOf(held[7])).toMatch(/^\/teachers\?/);

    held.forEach((entry) => entry.respond());
    await Promise.all([...fill, queuedRead, queuedWrite]);
  });

  it("drops a request that is cancelled while it is still waiting for a slot", async () => {
    const { held } = hold();
    const store = createTestStore();
    const running = ["g1", "g2", "g3"].map((id) => store.dispatch(groupsApi.endpoints.groupById.initiate(id)));
    await vi.waitFor(() => expect(held).toHaveLength(3));

    const waiting = store.dispatch(groupsApi.endpoints.groupById.initiate("g4"));
    await settle();
    waiting.abort();

    held[0].respond();
    await settle();
    // the freed slot went to the cancelled request, which was never sent
    expect(held).toHaveLength(3);

    // and the slot it passed on is free again for a new request
    const next = store.dispatch(groupsApi.endpoints.groupById.initiate("g5"));
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(urlOf(held[3])).toBe("/groups/g5");

    held.forEach((entry) => entry.respond());
    await Promise.all([...running, next]);
  });
});

describe("baseApi timeouts", () => {
  it("aborts a read the server never answers after 60 s, tries once more, then reports TIMEOUT_ERROR", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    const { requests } = stubFetch(() => new Promise<Response>(() => {}));

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    await vi.advanceTimersByTimeAsync(59_999);
    expect(requests).toHaveLength(1);

    // 60 s: aborted. After a 2 s pause the single retry goes out.
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(60_000);
    const result = await pending;
    expect(result.error).toMatchObject({ status: "TIMEOUT_ERROR" });
    expect(requests).toHaveLength(2);
  });

  it("gives a write 180 s and never re-sends it", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    const { requests } = stubFetch(() => new Promise<Response>(() => {}));

    const pending = store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g1", studentIds: ["s1"] }));

    await vi.advanceTimersByTimeAsync(179_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    // long enough for any retry to have shown up
    await vi.advanceTimersByTimeAsync(60_000);

    const result = await pending;
    expect(result.error).toMatchObject({ status: "TIMEOUT_ERROR" });
    expect(requests).toHaveLength(1);
  });

  it("releases the slot of a timed-out request so later requests are not stuck behind it", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    let hung = true;
    const { requests } = stubFetch(() => (hung ? new Promise<Response>(() => {}) : jsonResponse({ data: [] })));

    const first = store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g1", studentIds: ["s1"] }));
    const second = store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g2", studentIds: ["s2"] }));
    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(2);

    // Both write slots of the endpoint are taken by hung requests: a third waits.
    const third = store.dispatch(groupsApi.endpoints.assignStudentsToGroup.initiate({ id: "g3", studentIds: ["s3"] }));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(requests).toHaveLength(2);

    hung = false;
    await vi.advanceTimersByTimeAsync(180_000);
    await Promise.all([first, second]);

    expect(requests).toHaveLength(3);
    expect(requests[2].url).toBe(`${API_BASE_URL}/groups/g3/students/assign`);
    expect((await third).error).toBeUndefined();
  });
});

describe("baseApi transport errors", () => {
  it("retries a read that failed at transport level after 2 s", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    let calls = 0;
    const { requests } = stubFetch(() => {
      if (++calls === 1) throw new TypeError("Failed to fetch");
      return jsonResponse({ data: [{ id: "g1", name: "A" }] });
    });

    const pending = store.dispatch(groupsApi.endpoints.groupsSelect.initiate());
    await vi.advanceTimersByTimeAsync(1_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);

    const result = await pending;
    expect(requests).toHaveLength(2);
    expect(result.data).toEqual([{ id: "g1", name: "A" }]);
  });

  it("does not re-send a write that failed at transport level", async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    const { requests } = stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    const pending = store.dispatch(groupsApi.endpoints.deleteGroup.initiate("g1"));
    await vi.advanceTimersByTimeAsync(60_000);

    const result = await pending;
    expect(requests).toHaveLength(1);
    expect(result.error).toMatchObject({ status: "FETCH_ERROR" });
  });

  it("treats an HTTP error status as final and passes the backend body through", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: false, error: "Group not found" }, { status: 404 }));

    const result = await store.dispatch(groupsApi.endpoints.groupById.initiate("g1"));

    expect(requests).toHaveLength(1);
    expect(result.error).toMatchObject({ status: 404, data: { error: "Group not found" } });
  });
});

describe("baseApi session refresh on 401", () => {
  const refreshReply = jsonResponse({ data: { token: "new-access", refreshToken: "new-refresh" } });

  beforeEach(() => {
    localStorage.setItem("ACCESS_TOKEN", "old-access");
    localStorage.setItem("REFRESH_TOKEN", "old-refresh");
  });

  it("renews the token once and repeats the request with it", async () => {
    const store = createTestStore();
    const { requests } = stubFetch((req) => {
      if (req.url.endsWith("/auth/refresh")) return refreshReply.clone();
      return req.headers.get("authorization") === "Bearer old-access"
        ? jsonResponse({ error: "Unauthorized" }, { status: 401 })
        : jsonResponse({ data: [{ id: "g1", name: "A" }] });
    });

    const result = await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests.map((r) => r.url.replace(API_BASE_URL, ""))).toEqual(["/groups/select", "/auth/refresh", "/groups/select"]);
    expect(requests[1].method).toBe("POST");
    expect(requests[1].body).toContain("old-refresh");
    expect(requests[2].headers.get("authorization")).toBe("Bearer new-access");
    expect(result.data).toEqual([{ id: "g1", name: "A" }]);
    // the rotated tokens are kept for the next 401
    expect(localStorage.getItem("ACCESS_TOKEN")).toBe("new-access");
    expect(localStorage.getItem("REFRESH_TOKEN")).toBe("new-refresh");
    expect(store.getState().auth.token).toBe("new-access");
  });

  it("shares one refresh between requests that fail with 401 at the same time", async () => {
    const store = createTestStore();
    const { requests } = stubFetch((req) => {
      if (req.url.endsWith("/auth/refresh")) return refreshReply.clone();
      return req.headers.get("authorization") === "Bearer old-access"
        ? jsonResponse({ error: "Unauthorized" }, { status: 401 })
        : jsonResponse({ data: [] });
    });

    await Promise.all([
      store.dispatch(groupsApi.endpoints.groupsSelect.initiate()),
      store.dispatch(teachersApi.endpoints.allTeachers.initiate()),
      store.dispatch(groupsApi.endpoints.allGroups.initiate({})),
    ]);

    expect(requests.filter((r) => r.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(requests).toHaveLength(7); // 3 rejected + 1 refresh + 3 repeated
  });

  it("logs the user out when the refresh is refused", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ error: "Unauthorized" }, { status: 401 }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests.map((r) => r.url.replace(API_BASE_URL, ""))).toEqual(["/groups/select", "/auth/refresh"]);
    // The session is wiped: tokens in storage and in Redux, and the query cache
    // (logout resets it, so the failed read leaves no entry behind either).
    expect(localStorage.getItem("ACCESS_TOKEN")).toBeNull();
    expect(localStorage.getItem("REFRESH_TOKEN")).toBeNull();
    expect(store.getState().auth.token).toBeNull();
    expect(Object.keys(store.getState().baseApi.queries)).toHaveLength(0);
  });

  it("logs the user out without calling the backend when there is no refresh token", async () => {
    localStorage.removeItem("REFRESH_TOKEN");
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ error: "Unauthorized" }, { status: 401 }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests).toHaveLength(1);
    expect(localStorage.getItem("ACCESS_TOKEN")).toBeNull();
  });
});
