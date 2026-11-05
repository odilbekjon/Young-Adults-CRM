import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../app/api/baseApi";
import { store } from "../app/store";
import { setToken } from "../app/store/authSlice";
import { setSelectedBranchId } from "../app/store/branchSlice";
import { jsonResponse, stubFetch, type SentRequest } from "../test/fetchStub";
import { useEveryBranchCourses } from "./useEveryBranchCourses";

vi.setConfig({ testTimeout: 20_000 });

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";
const BRANCHES = [
  { id: IELTS, name: "YA IELTS Campus", status: "ACTIVE" },
  { id: GRAMMAR, name: "Grammar Campus", status: "ACTIVE" },
];

const course = (id: string, name: string, branchId: string, status = "ACTIVE") => ({
  id, name, status, branchId, price: 100000, branch: BRANCHES.find((b) => b.id === branchId),
});

const CEO_ME = { id: "u-ceo", role: "SUPERADMIN", roles: [], rolePermissions: [], branchIds: [], branches: [] };
const directorOf = (...own: typeof BRANCHES) => ({
  id: "u-director", role: "ADMIN", roles: ["ADMIN"], rolePermissions: [],
  branchIds: own.map((b) => b.id), branches: own.map((b) => ({ branchId: b.id, branch: b })),
});

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// A backend that honours the branch named in the query / x-branch-id and, as it does
// for an account that may not see every branch at once, refuses "all".
const backend = (me: unknown, courses: () => ReturnType<typeof course>[]) => (request: SentRequest) => {
  const p = path(request);
  if (p.startsWith("/auth/me")) return jsonResponse({ success: true, data: me });
  if (p.startsWith("/auth/sidebar")) return jsonResponse({ success: true, data: { allAccess: false, labels: [] } });
  if (p.startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
  if (p.startsWith("/courses")) {
    const named = new URL(request.url).searchParams.get("branchId") ?? request.headers.get("x-branch-id");
    if (named === "all") return jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 });
    return jsonResponse({ success: true, data: courses().filter((c) => !named || c.branchId === named) });
  }
  return jsonResponse({ success: true, data: [] });
};

const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

const COURSES = [
  course("c-ielts", "IELTS Intensive", IELTS),
  course("c-grammar", "Grammar Basic", GRAMMAR),
  course("c-grammar-2", "Grammar Advanced", GRAMMAR),
];

const courseReads = (requests: SentRequest[]) => requests.filter((r) => path(r).startsWith("/courses"));
const names = (courses: { name: string }[]) => courses.map((c) => c.name).sort();

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
  store.dispatch(setToken("test-token"));
});

describe("useEveryBranchCourses", () => {
  it("gives a CEO the courses of every active branch, one explicit request per branch", async () => {
    const { requests } = stubFetch(backend(CEO_ME, () => COURSES));
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });

    await waitFor(() => expect(names(result.current.courses)).toEqual(["Grammar Advanced", "Grammar Basic", "IELTS Intensive"]));

    expect(courseReads(requests).map(path).sort()).toEqual([`/courses?branchId=${GRAMMAR}`, `/courses?branchId=${IELTS}`]);
    expect(courseReads(requests).some((r) => r.headers.get("x-branch-id") === "all")).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("gives a branch director their own branch's courses, although 'all' is refused to them", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    const { requests } = stubFetch(backend(directorOf(BRANCHES[1]), () => COURSES));
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });

    await waitFor(() => expect(names(result.current.courses)).toEqual(["Grammar Advanced", "Grammar Basic"]));

    expect(courseReads(requests).map(path)).toEqual([`/courses?branchId=${GRAMMAR}`]);
    expect(courseReads(requests)[0].headers.get("x-branch-id")).toBe(GRAMMAR);
  });

  it("combines the branches of an account that works in several", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend(directorOf(...BRANCHES), () => COURSES));
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });

    await waitFor(() => expect(result.current.courses).toHaveLength(3));
    expect(result.current.data?.data).toHaveLength(3);
  });

  it("is loading - not empty - until the account and its branches are known", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch(backend(directorOf(BRANCHES[1]), () => COURSES));
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.courses).toHaveLength(2);
  });

  it("follows the shared cache: a course archived elsewhere shows its new status here", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    let courses = COURSES;
    stubFetch(backend(directorOf(BRANCHES[1]), () => courses));
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });
    await waitFor(() => expect(result.current.courses.find((c) => c.id === "c-grammar")?.status).toBe("ACTIVE"));

    courses = COURSES.map((c) => (c.id === "c-grammar" ? { ...c, status: "INACTIVE" } : c));
    act(() => {
      store.dispatch(baseApi.util.invalidateTags(["course"]));
    });

    await waitFor(() => expect(result.current.courses.find((c) => c.id === "c-grammar")?.status).toBe("INACTIVE"));
    // the refresh happened behind the data already shown: never back to a spinner
    expect(result.current.isLoading).toBe(false);
  });

  it("asks for nothing while skipped", async () => {
    const { requests } = stubFetch(backend(directorOf(BRANCHES[1]), () => COURSES));
    const { result } = renderHook(() => useEveryBranchCourses({ skip: true }), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(courseReads(requests)).toHaveLength(0);
    expect(result.current).toMatchObject({ data: undefined, courses: [], isLoading: false });
  });

  it("reports an error when every branch's list was refused", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch((request) =>
      path(request).startsWith("/courses")
        ? jsonResponse({ success: false, error: ["boom"], statusCode: 500 }, { status: 500 })
        : backend(directorOf(BRANCHES[1]), () => COURSES)(request),
    );
    const { result } = renderHook(() => useEveryBranchCourses(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
