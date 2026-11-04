import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { API_BASE_URL } from "../app/api/baseApi";
import { createTestStore } from "../test/testStore";
import { holdRequests, jsonResponse, stubFetch, type HeldRequest, type SentRequest } from "../test/fetchStub";
import { useActiveStudentCount } from "./useActiveStudentCount";

// baseApi keeps its request limiter at module level, so a test that holds
// requests must answer whatever is still pending before the next one starts.
let outstanding: HeldRequest[] = [];
afterEach(() => {
  for (const entry of outstanding) entry.respond();
  outstanding = [];
});

const PAGE_SIZE = 1000;

// A membership row as GET /student-groups sends it.
const membership = (studentId: string, groupId = "g1") => ({ id: `${studentId}-${groupId}`, studentId, groupId, status: "ACTIVE" });

// The envelope of one page of GET /student-groups.
const membershipPage = (rows: unknown[], page: number, totalPages: number) =>
  jsonResponse({ data: rows, meta: { total: totalPages * PAGE_SIZE, page, limit: PAGE_SIZE, totalPages } });

// The envelope of GET /students (the ACTIVE accounts).
const accountsResponse = (ids: string[], total = ids.length) =>
  jsonResponse({ data: ids.map((id) => ({ id, name: `Student ${id}` })), meta: { total, page: 1, limit: 3000, totalPages: 1 } });

const url = (request: SentRequest) => new URL(request.url);
const pageOf = (request: SentRequest) => Number(url(request).searchParams.get("page"));
const isMemberships = (request: SentRequest) => url(request).pathname.endsWith("/student-groups");
const isAccounts = (request: SentRequest) => url(request).pathname.endsWith("/students");

// Ids s1..sN.
const ids = (count: number, from = 1) => Array.from({ length: count }, (_, i) => `s${from + i}`);

// A school whose ACTIVE memberships are spread over `pages` pages: page p holds
// the students given by pageStudents(p). `accounts` is the ACTIVE accounts list.
const school = (pages: number, pageStudents: (page: number) => string[], accounts: string[]) => (request: SentRequest): Response => {
  if (isAccounts(request)) return accountsResponse(accounts);
  const page = pageOf(request);
  return membershipPage(pageStudents(page).map((id) => membership(id)), page, pages);
};

const setup = (handler: (request: SentRequest) => Response | Promise<Response>, branchId?: string) => {
  const store = createTestStore();
  const stub = stubFetch(handler);
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const view = renderHook(({ branch }: { branch?: string }) => useActiveStudentCount(branch), { wrapper, initialProps: { branch: branchId } });
  return { ...stub, ...view, store, wrapper };
};

// Same, with every request held until the test answers it.
const setupHeld = (branchId?: string) => {
  const store = createTestStore();
  const stub = holdRequests();
  outstanding = stub.held;
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const view = renderHook(({ branch }: { branch?: string }) => useActiveStudentCount(branch), { wrapper, initialProps: { branch: branchId } });
  return { ...stub, ...view, store, wrapper };
};

const heldWhere = (held: HeldRequest[], test: (request: SentRequest) => boolean) => held.filter((entry) => test(entry.request));
const waitForHeld = (held: HeldRequest[], count: number, test: (request: SentRequest) => boolean = isMemberships) =>
  waitFor(() => expect(heldWhere(held, test)).toHaveLength(count));
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

describe("useActiveStudentCount - the exact figure", () => {
  it("counts the distinct students over every page, each student once however many groups they study in", async () => {
    // s1 studies in two groups (twice on page 1, once more on page 3), s2 on pages 1 and 2.
    const { result } = setup((request) => {
      if (isAccounts(request)) return accountsResponse(ids(10));
      const page = pageOf(request);
      const rows = {
        1: [membership("s1", "g1"), membership("s1", "g2"), membership("s2", "g1"), membership("s3", "g1")],
        2: [membership("s2", "g2"), membership("s4", "g1")],
        3: [membership("s1", "g3"), membership("s5", "g1"), membership("s6", "g1")],
      }[page] ?? [];
      return membershipPage(rows, page, 3);
    });

    await waitFor(() => expect(result.current.count).toBe(6));
    expect(result.current).toEqual({ count: 6, provisional: 6, isLoading: false, isError: false });
  });

  it("is a single request per list when everything fits on one page", async () => {
    const { requests, result } = setup(school(1, () => ["s1", "s2"], ["s1", "s2", "s3"]));

    await waitFor(() => expect(result.current.count).toBe(2));
    expect(requests.map((r) => r.url.replace(API_BASE_URL, "")).sort()).toEqual([
      "/student-groups?status=ACTIVE&page=1&limit=1000",
      "/students?page=1&limit=3000&status=ACTIVE",
    ]);
  });

  it("leaves out students whose account is not ACTIVE (archived students never count)", async () => {
    // s2 and s4 still hold an ACTIVE membership but are not in the ACTIVE accounts list.
    const { result } = setup(school(2, (page) => (page === 1 ? ["s1", "s2", "s3"] : ["s4", "s5"]), ["s1", "s3", "s5", "s9"]));

    await waitFor(() => expect(result.current.count).toBe(3));
  });

  it("ignores membership rows without a student or a group", async () => {
    const { result } = setup((request) => {
      if (isAccounts(request)) return accountsResponse(["s1", "s2"]);
      return membershipPage([membership("s1"), { id: "x", studentId: "", groupId: "g1", status: "ACTIVE" }, { id: "y", studentId: "s2", groupId: "", status: "ACTIVE" }], 1, 1);
    });

    await waitFor(() => expect(result.current.count).toBe(1));
  });

  it("counts 0 when nobody has an ACTIVE membership", async () => {
    const { result } = setup(school(1, () => [], ["s1"]));

    await waitFor(() => expect(result.current.count).toBe(0));
    expect(result.current.isLoading).toBe(false);
  });

  it("falls back to the memberships alone when the accounts list failed", async () => {
    const { result } = setup((request) => (isAccounts(request) ? jsonResponse({ error: "boom" }, { status: 500 }) : membershipPage([membership("s1"), membership("s2")], 1, 1)));

    await waitFor(() => expect(result.current.count).toBe(2));
    expect(result.current.isError).toBe(false);
  });

  it("falls back to the memberships alone when there are more accounts than the list holds", async () => {
    // 3000 rows requested, 5000 ACTIVE accounts exist: the list cannot narrow anything.
    const { result } = setup((request) =>
      isAccounts(request) ? accountsResponse(["s1"], 5000) : membershipPage([membership("s1"), membership("s2"), membership("s3")], 1, 1),
    );

    await waitFor(() => expect(result.current.count).toBe(3));
  });
});

describe("useActiveStudentCount - how the pages are requested", () => {
  it("asks for the other pages only once page 1 told how many there are, then all of them together", async () => {
    const { held, result } = setupHeld();

    // Nothing but page 1 (and the accounts list, which does not depend on it) goes out first.
    await waitForHeld(held, 1);
    await settle();
    expect(heldWhere(held, isMemberships).map((entry) => pageOf(entry.request))).toEqual([1]);

    heldWhere(held, isMemberships)[0].respond(membershipPage([membership("s1")], 1, 3));
    // Pages 2 and 3 are both on the wire; page 3 did not wait for page 2.
    await waitForHeld(held, 3);
    expect(heldWhere(held, isMemberships).map((entry) => pageOf(entry.request)).sort()).toEqual([1, 2, 3]);
    expect(result.current.count).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("has a page's whole batch in flight at once, up to the 3 reads the backend allows per endpoint", async () => {
    const { held, result } = setupHeld();
    await waitForHeld(held, 1);
    // 6 pages: page 1 and 5 more.
    heldWhere(held, isMemberships)[0].respond(membershipPage([membership("s1")], 1, 6));

    // page 1 is answered, so 3 more can run; the other 2 wait for a free slot.
    await waitForHeld(held, 4);
    await settle();
    expect(heldWhere(held, isMemberships)).toHaveLength(4);

    // each answered page hands its slot to the next waiting one, in page order
    heldWhere(held, isMemberships)[1].respond(membershipPage([membership("s2")], 2, 6));
    await waitForHeld(held, 5);
    heldWhere(held, isMemberships)[2].respond(membershipPage([membership("s3")], 3, 6));
    await waitForHeld(held, 6);
    expect(heldWhere(held, isMemberships).map((entry) => pageOf(entry.request))).toEqual([1, 2, 3, 4, 5, 6]);

    heldWhere(held, isMemberships).slice(3).forEach((entry, i) => entry.respond(membershipPage([membership(`s${4 + i}`)], 4 + i, 6)));
    held.filter((entry) => isAccounts(entry.request)).forEach((entry) => entry.respond(accountsResponse(ids(20))));

    await waitFor(() => expect(result.current.count).toBe(6));
  });

  it("reads pages 2..4 side by side instead of one after another", async () => {
    let running = 0;
    let mostAtOnce = 0;
    const { result } = setup(async (request) => {
      if (isAccounts(request)) return accountsResponse(ids(10));
      const page = pageOf(request);
      if (page > 1) {
        running += 1;
        mostAtOnce = Math.max(mostAtOnce, running);
        await new Promise((resolve) => setTimeout(resolve, 60));
        running -= 1;
      }
      return membershipPage([membership(`s${page}`)], page, 4);
    });

    await waitFor(() => expect(result.current.count).toBe(4));
    expect(mostAtOnce).toBe(3);
  });

  it("scopes every request to the branch", async () => {
    const { requests, result } = setup(school(2, (page) => [`s${page}`], ["s1", "s2"]), "b7");

    await waitFor(() => expect(result.current.count).toBe(2));
    expect(requests.length).toBe(3);
    requests.forEach((request) => expect(url(request).searchParams.get("branchId")).toBe("b7"));
  });

  it("starts over for another branch and never mixes in the first branch's pages", async () => {
    const handler = (request: SentRequest): Response => {
      const branch = url(request).searchParams.get("branchId");
      if (isAccounts(request)) return accountsResponse(ids(50));
      const page = pageOf(request);
      // branch A: 2 pages, s1 + s2; branch B: 3 pages, one student each (s11..s13)
      if (branch === "A") return membershipPage([membership(`s${page}`)], page, 2);
      return membershipPage([membership(`s${10 + page}`)], page, 3);
    };
    const { result, rerender } = setup(handler, "A");
    await waitFor(() => expect(result.current.count).toBe(2));

    rerender({ branch: "B" });
    await waitFor(() => expect(result.current.count).toBe(3));
    expect(result.current.isError).toBe(false);
  });

  it("keeps the downloaded lists across a remount: coming back costs no request", async () => {
    const { requests, result, unmount, wrapper } = setup(school(3, (page) => [`s${page}`], ids(10)));
    await waitFor(() => expect(result.current.count).toBe(3));
    const sent = requests.length;
    unmount();

    const again = renderHook(() => useActiveStudentCount(), { wrapper });
    await waitFor(() => expect(again.result.current.count).toBe(3));
    await settle();
    expect(requests).toHaveLength(sent);
  });

  it("gives up on an absurd page count instead of requesting hundreds of pages", async () => {
    const { requests, result } = setup((request) => (isAccounts(request) ? accountsResponse(ids(5)) : membershipPage([membership("s1")], 1, 5000)));

    await waitFor(() => expect(result.current.isError).toBe(true));
    await settle();
    expect(result.current.count).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(requests.filter(isMemberships)).toHaveLength(1);
  });
});

describe("useActiveStudentCount - while the exact figure is on its way", () => {
  it("is loading and has no figure before anything arrived", async () => {
    const { result, held } = setupHeld();
    await waitForHeld(held, 1);

    expect(result.current).toEqual({ count: null, provisional: null, isLoading: true, isError: false });
  });

  it("has no figure while later pages are missing - a first page alone would under-count", async () => {
    const { result, held } = setupHeld();
    await waitForHeld(held, 1);
    heldWhere(held, isMemberships)[0].respond(membershipPage([membership("s1")], 1, 2));
    held.filter((entry) => isAccounts(entry.request)).forEach((entry) => entry.respond(accountsResponse(ids(9))));
    await waitForHeld(held, 2);
    await settle();

    expect(result.current).toEqual({ count: null, provisional: null, isLoading: true, isError: false });
  });

  it("offers the distinct students of all memberships as a provisional figure while the accounts list is missing", async () => {
    const { result, held } = setupHeld();
    await waitForHeld(held, 1);
    heldWhere(held, isMemberships)[0].respond(membershipPage([membership("s1"), membership("s2"), membership("s2", "g2")], 1, 2));
    await waitForHeld(held, 2);
    heldWhere(held, isMemberships)[1].respond(membershipPage([membership("s3"), membership("s1", "g3")], 2, 2));

    await waitFor(() => expect(result.current.provisional).toBe(3));
    expect(result.current).toEqual({ count: null, provisional: 3, isLoading: true, isError: false });

    // the accounts list arrives: s2's account is archived, so the exact figure is lower than the provisional one
    held.filter((entry) => isAccounts(entry.request)).forEach((entry) => entry.respond(accountsResponse(["s1", "s3"])));
    await waitFor(() => expect(result.current.count).toBe(2));
    expect(result.current).toEqual({ count: 2, provisional: 2, isLoading: false, isError: false });
  });

  it("never offers a provisional figure below the exact one", async () => {
    const { result, held } = setupHeld();
    await waitForHeld(held, 1);
    heldWhere(held, isMemberships)[0].respond(membershipPage(ids(7).map((id) => membership(id)), 1, 1));
    await waitFor(() => expect(result.current.provisional).toBe(7));

    held.filter((entry) => isAccounts(entry.request)).forEach((entry) => entry.respond(accountsResponse(ids(7).slice(0, 4))));
    await waitFor(() => expect(result.current.count).toBe(4));
    expect(result.current.count).toBeLessThanOrEqual(7);
  });

  it("reports the first page failing as an error that is not loading any more", async () => {
    const { result } = setup((request) => (isAccounts(request) ? accountsResponse([]) : jsonResponse({ error: "boom" }, { status: 500 })));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toEqual({ count: null, provisional: null, isLoading: false, isError: true });
  });
});

describe("useActiveStudentCount - a later page fails", () => {
  it("gives no exact figure (a partial sum would under-count) and stops loading", async () => {
    const { result } = setup((request) => {
      if (isAccounts(request)) return accountsResponse(ids(20));
      const page = pageOf(request);
      if (page === 3) return jsonResponse({ error: "boom" }, { status: 500 });
      return membershipPage([membership(`s${page}`)], page, 4);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toEqual({ count: null, provisional: null, isLoading: false, isError: true });
  });

  it("settles as soon as one page fails, without waiting for the slow ones", async () => {
    const { result, held } = setupHeld();
    await waitForHeld(held, 1);
    heldWhere(held, isMemberships)[0].respond(membershipPage([membership("s1")], 1, 3));
    await waitForHeld(held, 3);

    heldWhere(held, isMemberships).find((entry) => pageOf(entry.request) === 2)!.respond(jsonResponse({ error: "boom" }, { status: 500 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    // page 3 never answered
    expect(result.current.isLoading).toBe(false);
  });

  it("tries again on the next visit: a failed page is not cached", async () => {
    let failPage3 = true;
    const school3 = (request: SentRequest): Response => {
      if (isAccounts(request)) return accountsResponse(ids(20));
      const page = pageOf(request);
      if (page === 3 && failPage3) return jsonResponse({ error: "boom" }, { status: 500 });
      return membershipPage([membership(`s${page}`)], page, 3);
    };
    const { result, unmount, wrapper } = setup(school3);
    await waitFor(() => expect(result.current.isError).toBe(true));
    unmount();

    failPage3 = false;
    const again = renderHook(() => useActiveStudentCount(), { wrapper });
    await waitFor(() => expect(again.result.current.count).toBe(3));
  });
});
