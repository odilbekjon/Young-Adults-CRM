import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "./index";
import { groupsApi } from "../groupsApi";
import { teachersApi } from "../teachersApi";
import { createTestStore } from "../../../test/testStore";
import { holdRequests, type HeldRequest } from "../../../test/fetchStub";

// baseApi keeps its request limiter (in-flight counters, wait queue) at module
// level, so every test must leave nothing running.
let outstanding: HeldRequest[] = [];

afterEach(() => {
  for (const entry of outstanding) entry.respond();
  outstanding = [];
});

const hold = () => {
  const stub = holdRequests();
  outstanding = stub.held;
  return stub;
};

// Real-timer pause, so each dispatch is queued before the next one is made.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 25));

// Answers everything held, and whatever that sets off in turn (a write refetches
// the queries it invalidates), until the limiter is idle again.
const drain = async (held: HeldRequest[]) => {
  for (let seen = -1; seen !== held.length; ) {
    seen = held.length;
    held.forEach((entry) => entry.respond());
    await settle();
  }
};

const urlOf = (entry: HeldRequest) => entry.request.url.replace(API_BASE_URL, "");

// Six requests to six different endpoints: every slot is taken and nothing else
// can start until one of them is answered.
const fillAllSlots = (store: ReturnType<typeof createTestStore>) => [
  store.dispatch(groupsApi.endpoints.groupsSelect.initiate()),
  store.dispatch(groupsApi.endpoints.allGroups.initiate({})),
  store.dispatch(groupsApi.endpoints.groupById.initiate("g1")),
  store.dispatch(groupsApi.endpoints.groupHistory.initiate("g1")),
  store.dispatch(groupsApi.endpoints.groupComments.initiate("g1")),
  store.dispatch(teachersApi.endpoints.allTeachers.initiate()),
];

describe("baseApi request priority", () => {
  it("lets a read that asks for priority go ahead of the reads already waiting, and a write ahead of both", async () => {
    const { held } = hold();
    const store = createTestStore();
    const fill = fillAllSlots(store);
    await vi.waitFor(() => expect(held).toHaveLength(6));

    // queued in this order: an ordinary read, two urgent reads, a write, another ordinary read
    const queued: Array<PromiseLike<unknown>> = [store.dispatch(groupsApi.endpoints.groupById.initiate("g2"))];
    await settle();
    queued.push(store.dispatch(groupsApi.endpoints.studentGroups.initiate({ status: "ACTIVE", page: 2, limit: 1000, priority: "high" })));
    await settle();
    queued.push(store.dispatch(groupsApi.endpoints.studentGroups.initiate({ status: "ACTIVE", page: 3, limit: 1000, priority: "high" })));
    await settle();
    queued.push(store.dispatch(groupsApi.endpoints.toggleGroupStatus.initiate("g1")));
    await settle();
    queued.push(store.dispatch(groupsApi.endpoints.groupById.initiate("g3")));
    await settle();
    expect(held).toHaveLength(6);

    const started: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      held[i].respond();
      await vi.waitFor(() => expect(held).toHaveLength(7 + i));
      const next = held[6 + i];
      started.push(next.request.method === "GET" ? urlOf(next).replace(/&limit=1000|status=ACTIVE&/g, "") : `${next.request.method} ${urlOf(next)}`);
    }

    expect(started).toEqual([
      "PATCH /groups/g1/toggle-status",
      "/student-groups?page=2",
      "/student-groups?page=3",
      "/groups/g2",
      "/groups/g3",
    ]);

    await drain(held);
    await Promise.all([...fill, ...queued]);
  });

  it("does not let urgent reads past the 3-per-endpoint cap, nor hold back other endpoints", async () => {
    const { held } = hold();
    const store = createTestStore();
    const urgent = [1, 2, 3, 4, 5].map((page) =>
      store.dispatch(groupsApi.endpoints.studentGroups.initiate({ status: "ACTIVE", page, limit: 1000, priority: "high" })),
    );
    await vi.waitFor(() => expect(held).toHaveLength(3));
    await settle();
    expect(held).toHaveLength(3);

    // an ordinary read of another endpoint still starts at once (3 of the 6 slots are free)
    const other = store.dispatch(teachersApi.endpoints.allTeachers.initiate());
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(urlOf(held[3])).toMatch(/^\/teachers\?/);

    held.forEach((entry) => entry.respond());
    await vi.waitFor(() => expect(held).toHaveLength(6));
    await drain(held);
    await Promise.all([...urgent, other]);
  });

  it("changes nothing for reads that do not ask for it: they keep their arrival order", async () => {
    const { held } = hold();
    const store = createTestStore();
    const fill = fillAllSlots(store);
    await vi.waitFor(() => expect(held).toHaveLength(6));

    const queued: Array<PromiseLike<unknown>> = [];
    for (const id of ["g2", "g3", "g4"]) {
      queued.push(store.dispatch(groupsApi.endpoints.groupById.initiate(id)));
      await settle();
    }
    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(7));
    held[1].respond();
    await vi.waitFor(() => expect(held).toHaveLength(8));
    held[2].respond();
    await vi.waitFor(() => expect(held).toHaveLength(9));
    expect([6, 7, 8].map((i) => urlOf(held[i]))).toEqual(["/groups/g2", "/groups/g3", "/groups/g4"]);

    await drain(held);
    await Promise.all([...fill, ...queued]);
  });

  it("never lets a write ask for priority: a write is always ahead of reads anyway", async () => {
    const { held } = hold();
    const store = createTestStore();
    const fill = fillAllSlots(store);
    await vi.waitFor(() => expect(held).toHaveLength(6));

    const urgentRead = store.dispatch(groupsApi.endpoints.studentGroups.initiate({ status: "ACTIVE", page: 2, limit: 1000, priority: "high" }));
    await settle();
    const write = store.dispatch(groupsApi.endpoints.deleteGroup.initiate("g9"));
    await settle();

    held[0].respond();
    await vi.waitFor(() => expect(held).toHaveLength(7));
    expect(held[6].request.method).toBe("DELETE");

    await drain(held);
    await Promise.all([...fill, urgentRead, write]);
  });
});
