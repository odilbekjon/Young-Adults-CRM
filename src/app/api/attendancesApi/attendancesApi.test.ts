import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { attendancesApi } from "./attendancesApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";
import { extractApiError } from "../../../utils/extractApiError";

const path = (url: string) => url.replace(API_BASE_URL, "");

// Every test runs on Tuesday 3 November 2026, 00:30 local time (the suite runs in
// Asia/Tashkent) — when UTC still says 2 November. Only Date is faked, so fetch
// and promises behave normally.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 0, 30));
});

const record = (date: string, studentId = "s1") => ({ studentId, groupId: "g1", date, status: "PRESENT" as const });

const save = async (...dates: string[]) => {
  const store = createTestStore();
  const { requests } = stubFetch(() => jsonResponse({ success: true }));
  const result = await store.dispatch(
    attendancesApi.endpoints.saveAttendance.initiate({ records: dates.map((date) => record(date)) }),
  );
  return { result, requests };
};

describe("attendancesApi.saveAttendance", () => {
  it("posts today's mark as JSON", async () => {
    const { result, requests } = await save("2026-11-03");

    expect(result).toEqual({ data: { success: true } });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/attendances");
    expect(requests[0].headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(requests[0].body)).toEqual({ records: [record("2026-11-03")] });
  });

  it("still posts a mark for a past day", async () => {
    const { result, requests } = await save("2026-11-02");

    expect(result).toEqual({ data: { success: true } });
    expect(requests).toHaveLength(1);
  });

  it.each([
    ["tomorrow", "2026-11-04"],
    ["the last day of this month", "2026-11-30"],
    ["the first day of next month", "2026-12-01"],
    ["a far-future month", "2030-06-15"],
  ])("sends nothing for %s (%s), for any role", async (_name, date) => {
    const { result, requests } = await save(date);

    expect(requests).toHaveLength(0);
    expect(result.error).toBeDefined();
    expect(extractApiError(result.error)).toContain(date);
  });

  it("refuses the whole batch when a single record is in the future", async () => {
    const { result, requests } = await save("2026-11-02", "2026-11-03", "2026-11-04");

    expect(requests).toHaveLength(0);
    expect(extractApiError(result.error)).toContain("2026-11-04");
  });

  it("passes a backend rejection through untouched", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: false, error: "Student is frozen" }, { status: 400 }));

    const result = await store.dispatch(
      attendancesApi.endpoints.saveAttendance.initiate({ records: [record("2026-11-03")] }),
    );

    expect(result.error).toMatchObject({ status: 400 });
    expect(extractApiError(result.error)).toBe("Student is frozen");
  });

  it("refreshes the cached attendance afterwards", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    const subscription = store.dispatch(
      attendancesApi.endpoints.groupAttendance.initiate({ groupId: "g1", month: "2026-11" }),
    );
    await subscription;
    expect(requests.filter((r) => r.method === "GET")).toHaveLength(1);

    await store.dispatch(attendancesApi.endpoints.saveAttendance.initiate({ records: [record("2026-11-03")] }));

    await vi.waitFor(() => expect(requests.filter((r) => r.method === "GET")).toHaveLength(2));
    subscription.unsubscribe();
  });
});
