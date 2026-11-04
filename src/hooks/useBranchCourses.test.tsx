import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../app/api/baseApi";
import { setSelectedBranchId } from "../app/store/branchSlice";
import { createTestStore } from "../test/testStore";
import { jsonResponse, stubFetch, type SentRequest } from "../test/fetchStub";
import { useBranchCourses } from "./useBranchCourses";

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";

const course = (id: string, branchId: string) => ({ id, name: id, status: "ACTIVE", branchId });
const ALL = [course("ielts-1", IELTS), course("ielts-2", IELTS), course("grammar-1", GRAMMAR)];

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// A server that does NOT honour the branch: it always answers with every course.
const everyCourse = () => jsonResponse({ success: true, data: ALL });

const setup = (selected: string | null, options?: Parameters<typeof useBranchCourses>[0]) => {
  const store = createTestStore();
  if (selected) store.dispatch(setSelectedBranchId(selected));
  const stub = stubFetch(everyCourse);
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const view = renderHook(() => useBranchCourses(options), { wrapper });
  return { store, ...stub, ...view };
};

describe("useBranchCourses", () => {
  it("asks for the header's branch", async () => {
    const { result, requests } = setup(IELTS);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(path(requests[0])).toBe(`/courses?branchId=${IELTS}`);
    expect(requests[0].headers.get("x-branch-id")).toBe(IELTS);
  });

  it("keeps only that branch's courses even when the server ignores the branch", async () => {
    const { result } = setup(IELTS);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.courses.map((c) => c.id)).toEqual(["ielts-1", "ielts-2"]);
  });

  it("lists every branch's courses on 'All branches'", async () => {
    const { result, requests } = setup(null);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.courses).toHaveLength(3);
    expect(requests[0].headers.has("x-branch-id")).toBe(false);
  });

  it("follows the header when the branch changes, without showing the previous branch meanwhile", async () => {
    const { result, store, requests } = setup(IELTS);
    await waitFor(() => expect(result.current.courses).toHaveLength(2));

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(result.current.courses.map((c) => c.id)).toEqual(["grammar-1"]));
    expect(requests.map(path)).toEqual([`/courses?branchId=${IELTS}`, `/courses?branchId=${GRAMMAR}`]);
  });

  it("uses a branch of the screen's own before the header's", async () => {
    const { result, requests } = setup(IELTS, { branchId: GRAMMAR });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(path(requests[0])).toBe(`/courses?branchId=${GRAMMAR}`);
    expect(result.current.courses.map((c) => c.id)).toEqual(["grammar-1"]);
  });

  it("reads nothing while skipped", async () => {
    const { requests } = setup(IELTS, { skip: true });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(requests).toHaveLength(0);
  });
});
