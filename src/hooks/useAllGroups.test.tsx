import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../app/api/baseApi";
import { createTestStore } from "../test/testStore";
import { jsonResponse, stubFetch, type SentRequest } from "../test/fetchStub";
import { useAllGroups } from "./useAllGroups";

describe("useAllGroups", () => {
  const group = (id: string, status = "ACTIVE") => ({ id, name: `Group ${id}`, status });
  const pageOf = (request: SentRequest) => Number(new URL(request.url).searchParams.get("page"));
  const idsOf = (groups: Array<{ id: string }>) => groups.map((g) => g.id);

  const setup = (handler: (request: SentRequest) => Response | Promise<Response>, options?: Parameters<typeof useAllGroups>[0]) => {
    const store = createTestStore();
    const stub = stubFetch(handler);
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const view = renderHook(() => useAllGroups(options), { wrapper });
    return { ...stub, ...view };
  };

  it("returns every group of a single page, archived and completed ones included", async () => {
    const { result } = setup(() =>
      jsonResponse({
        data: [group("g1"), group("g2", "ARCHIVE"), group("g3", "COMPLETED"), group("g4", "INACTIVE")],
        meta: { totalPages: 1 },
      }),
    );

    await waitFor(() => expect(result.current.groups).toHaveLength(4));
    expect(idsOf(result.current.groups)).toEqual(["g1", "g2", "g3", "g4"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("asks for the first page with the maximum page size and no status or teacher narrowing", async () => {
    const { requests, result } = setup(() => jsonResponse({ data: [group("g1")], meta: { totalPages: 1 } }));

    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(`${API_BASE_URL}/groups?page=1&limit=100`);
  });

  it("reads the later pages too, one request at a time, and is loading until the last one is in", async () => {
    let inFlight = 0;
    let mostInFlight = 0;
    const { requests, result } = setup(async (request) => {
      inFlight += 1;
      mostInFlight = Math.max(mostInFlight, inFlight);
      const page = pageOf(request);
      // The later pages are slow enough to be seen "in progress".
      if (page > 1) await new Promise((resolve) => setTimeout(resolve, 120));
      inFlight -= 1;
      return jsonResponse({ data: [group(`p${page}-active`), group(`p${page}-old`, "ARCHIVE")], meta: { totalPages: 3 } });
    });

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.groups).toHaveLength(6));
    expect(idsOf(result.current.groups)).toEqual(["p1-active", "p1-old", "p2-active", "p2-old", "p3-active", "p3-old"]);
    expect(requests.map(pageOf)).toEqual([1, 2, 3]);
    expect(mostInFlight).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("is not stopped at 10 pages: a group on page 12 is read as well", async () => {
    const { requests, result } = setup((request) => jsonResponse({ data: [group(`p${pageOf(request)}`)], meta: { totalPages: 12 } }));

    await waitFor(() => expect(result.current.groups).toHaveLength(12));
    expect(requests.map(pageOf)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("keeps the pages read so far when a later page fails", async () => {
    const { result } = setup((request) => {
      const page = pageOf(request);
      if (page === 3) return jsonResponse({ error: "boom" }, { status: 500 });
      return jsonResponse({ data: [group(`p${page}`)], meta: { totalPages: 4 } });
    });

    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    expect(idsOf(result.current.groups)).toEqual(["p1", "p2"]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("sends no request and returns nothing when skipped", async () => {
    const { requests, result } = setup(() => jsonResponse({ data: [group("g1")] }), { skip: true });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).toHaveLength(0);
    expect(result.current.groups).toEqual([]);
  });
});
