import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../app/api/baseApi";
import { createTestStore } from "../test/testStore";
import { jsonResponse, stubFetch, type SentRequest } from "../test/fetchStub";
import { isActiveGroup, useActiveGroups } from "./useActiveGroups";

describe("isActiveGroup", () => {
  it("is true only for ACTIVE groups", () => {
    expect(isActiveGroup({ status: "ACTIVE" })).toBe(true);
  });

  it("ignores the case of the status", () => {
    expect(isActiveGroup({ status: "active" })).toBe(true);
    expect(isActiveGroup({ status: "Active" })).toBe(true);
  });

  it("is false for archived, inactive, completed and unknown statuses", () => {
    for (const status of ["INACTIVE", "ARCHIVED", "ARCHIVE", "COMPLETED", "DELETED", "PROBATION", ""]) {
      expect(isActiveGroup({ status }), status).toBe(false);
    }
  });

  it("is false when the group has no status", () => {
    expect(isActiveGroup({})).toBe(false);
    expect(isActiveGroup({ status: null })).toBe(false);
    expect(isActiveGroup({ status: undefined })).toBe(false);
  });
});

describe("useActiveGroups", () => {
  const group = (id: string, status: string) => ({ id, name: `Group ${id}`, status });
  const pageOf = (request: SentRequest) => Number(new URL(request.url).searchParams.get("page"));
  const idsOf = (groups: Array<{ id: string }>) => groups.map((g) => g.id);

  const setup = (handler: (request: SentRequest) => Response | Promise<Response>, options?: Parameters<typeof useActiveGroups>[0]) => {
    const store = createTestStore();
    const stub = stubFetch(handler);
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const view = renderHook(() => useActiveGroups(options), { wrapper });
    return { ...stub, ...view };
  };

  it("returns only the running groups of a single page", async () => {
    const { result } = setup(() =>
      jsonResponse({
        data: [group("g1", "ACTIVE"), group("g2", "INACTIVE"), group("g3", "active"), group("g4", "COMPLETED"), group("g5", "ARCHIVED")],
        meta: { totalPages: 1 },
      }),
    );

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
    expect(idsOf(result.current)).toEqual(["g1", "g3"]);
  });

  it("asks for the first page with the maximum page size, narrowed to the teacher when one is given", async () => {
    const { requests, result } = setup(() => jsonResponse({ data: [group("g1", "ACTIVE")], meta: { totalPages: 1 } }), { teacherId: "t1" });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(`${API_BASE_URL}/groups?page=1&limit=100&teacherId=t1`);
  });

  it("reads the later pages too, so an active group past page 1 is not lost", async () => {
    const { requests, result } = setup((request) => {
      const page = pageOf(request);
      return jsonResponse({ data: [group(`p${page}-active`, "ACTIVE"), group(`p${page}-old`, "INACTIVE")], meta: { totalPages: 3 } });
    });

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(idsOf(result.current)).toEqual(["p1-active", "p2-active", "p3-active"]);
    expect(requests.map(pageOf)).toEqual([1, 2, 3]);
  });

  it("stops after 10 pages even when the backend reports more", async () => {
    const { requests, result } = setup((request) => jsonResponse({ data: [group(`p${pageOf(request)}`, "ACTIVE")], meta: { totalPages: 500 } }));

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(requests.map(pageOf)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("keeps the pages read so far when a later page fails", async () => {
    const { result } = setup((request) => {
      const page = pageOf(request);
      if (page === 3) return jsonResponse({ error: "boom" }, { status: 500 });
      return jsonResponse({ data: [group(`p${page}`, "ACTIVE")], meta: { totalPages: 4 } });
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(idsOf(result.current)).toEqual(["p1", "p2"]);
  });

  it("sends no request and returns nothing when skipped", async () => {
    const { requests, result } = setup(() => jsonResponse({ data: [group("g1", "ACTIVE")] }), { skip: true });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).toHaveLength(0);
    expect(result.current).toEqual([]);
  });
});
