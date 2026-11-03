import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { financeApi, getTooManyPaymentsTotal } from "./financeApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch, type SentRequest } from "../../../test/fetchStub";

const paymentJson = (id: string, over: Record<string, unknown> = {}) => ({
  id, amount: 100_000, date: "2026-11-03", status: null, student: { id: "s1", name: "Ali" },
  group: { id: "g1", name: "Deep Science" }, paymentMethod: { id: "m1", name: "Cash" }, ...over,
});

const meta = (total: number, page: number, limit: number) => ({
  total, page, limit, totalPages: Math.ceil(total / limit),
});

const query = (request: SentRequest) => new URL(request.url).searchParams;
const path = (request: SentRequest) => new URL(request.url).pathname.replace(new URL(API_BASE_URL).pathname, "");

const NOVEMBER = { startDate: "2026-11-01", endDate: "2026-11-30", branchId: "b1" };

// Serves `all` the way the backend pages it: `limit` rows per page (capped at
// `cap`, like a backend with a maximum page size).
const pagedBackend = (all: ReturnType<typeof paymentJson>[], cap = Infinity) => (request: SentRequest) => {
  const params = query(request);
  const page = Number(params.get("page"));
  const limit = Math.min(Number(params.get("limit")), cap);
  return jsonResponse({
    success: true,
    data: all.slice((page - 1) * limit, page * limit),
    meta: meta(all.length, page, limit),
  });
};

describe("financeApi.paymentsRange", () => {
  it("loads a month in one request and sends only the filters it is given", async () => {
    const store = createTestStore();
    const all = [paymentJson("p1"), paymentJson("p2", { date: "2026-11-04" })];
    const { requests } = stubFetch(pagedBackend(all));

    const result = await store.dispatch(
      financeApi.endpoints.paymentsRange.initiate({ ...NOVEMBER, search: "ali", paymentMethodId: "m1" }),
    );

    expect(result.data?.rows.map((r) => r.id)).toEqual(["p1", "p2"]);
    expect(requests).toHaveLength(1);
    expect(path(requests[0])).toBe("/finance/payments");
    const params = query(requests[0]);
    expect(params.get("startDate")).toBe("2026-11-01");
    expect(params.get("endDate")).toBe("2026-11-30");
    expect(params.get("branchId")).toBe("b1");
    expect(params.get("search")).toBe("ali");
    expect(params.get("paymentMethodId")).toBe("m1");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("1000");
  });

  it("normalizes each row like the paged list does", async () => {
    const store = createTestStore();
    stubFetch(pagedBackend([paymentJson("p1", { amount: { s: 1, e: 5, d: [250000] }, status: "REFUNDED", date: "2026-11-03T00:00:00+05:00" })]));

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.data?.rows[0]).toMatchObject({
      id: "p1", amount: 250_000, studentName: "Ali", groupId: "g1", paymentMethodName: "Cash", date: "2026-11-03", status: "REFUNDED",
    });
  });

  it("is an empty list, not an error, for a period without payments", async () => {
    const store = createTestStore();
    stubFetch(pagedBackend([]));

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.error).toBeUndefined();
    expect(result.data?.rows).toEqual([]);
  });

  it("walks every page when the backend caps the page size, and merges them in order", async () => {
    const store = createTestStore();
    const all = Array.from({ length: 250 }, (_, i) => paymentJson(`p${i + 1}`));
    // The backend silently serves 100 per page however many were asked for.
    const { requests } = stubFetch(pagedBackend(all, 100));

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(requests.map((r) => query(r).get("page")).sort()).toEqual(["1", "2", "3"]);
    expect(result.data?.rows).toHaveLength(250);
    expect(new Set(result.data?.rows.map((r) => r.id)).size).toBe(250);
    expect(result.data?.rows[0].id).toBe("p1");
    expect(result.data?.rows[249].id).toBe("p250");
  });

  it("asks again with a smaller page when the backend rejects the big one", async () => {
    const store = createTestStore();
    const all = Array.from({ length: 150 }, (_, i) => paymentJson(`p${i + 1}`));
    const { requests } = stubFetch((request) =>
      Number(query(request).get("limit")) > 100
        ? jsonResponse({ message: "limit must not be greater than 100" }, { status: 400 })
        : pagedBackend(all)(request),
    );

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(requests.map((r) => query(r).get("limit"))).toEqual(["1000", "100", "100"]);
    expect(result.data?.rows).toHaveLength(150);
  });

  it("refuses to load a period with more payments than it keeps in the browser", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: [paymentJson("p1")], meta: meta(25_000, 1, 1000) }));

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.data).toBeUndefined();
    expect(getTooManyPaymentsTotal(result.error)).toBe(25_000);
    expect(requests).toHaveLength(1);
  });

  it("is an error — never a shortened list — when a later page fails", async () => {
    const store = createTestStore();
    const all = Array.from({ length: 250 }, (_, i) => paymentJson(`p${i + 1}`));
    stubFetch((request) =>
      query(request).get("page") === "2" ? jsonResponse({ message: "boom" }, { status: 500 }) : pagedBackend(all, 100)(request),
    );

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({ status: 500 });
    expect(getTooManyPaymentsTotal(result.error)).toBeNull();
  });

  it("is an error when the backend hands over fewer rows than it says exist", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: true, data: [paymentJson("p1"), paymentJson("p2")], meta: meta(3, 1, 1000) }));

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({ status: "CUSTOM_ERROR", error: "INCOMPLETE_PAYMENTS" });
  });

  it("counts a row that appears on two pages (a payment added meanwhile) once", async () => {
    const store = createTestStore();
    const first = Array.from({ length: 100 }, (_, i) => paymentJson(`p${i + 1}`));
    const second = [paymentJson("p100"), ...Array.from({ length: 50 }, (_, i) => paymentJson(`p${i + 101}`))];
    stubFetch((request) =>
      jsonResponse({
        success: true,
        data: query(request).get("page") === "1" ? first : second,
        meta: { total: 150, page: Number(query(request).get("page")), limit: 100, totalPages: 2 },
      }),
    );

    const result = await store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));

    expect(result.data?.rows).toHaveLength(150);
  });

  it("serves a payment change (refund) with a fresh request", async () => {
    const store = createTestStore();
    const { requests } = stubFetch((request) =>
      request.method === "DELETE" ? jsonResponse({ success: true }) : pagedBackend([paymentJson("p1")])(request),
    );

    const subscription = store.dispatch(financeApi.endpoints.paymentsRange.initiate(NOVEMBER));
    await subscription;
    await store.dispatch(financeApi.endpoints.deletePayment.initiate("p1"));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests.filter((r) => r.method === "GET" && path(r) === "/finance/payments")).toHaveLength(2);
    subscription.unsubscribe();
  });
});

describe("getTooManyPaymentsTotal", () => {
  it("reads the count off the 'too many' error and nothing else", () => {
    expect(getTooManyPaymentsTotal({ status: "CUSTOM_ERROR", error: "TOO_MANY_PAYMENTS", data: { total: 30_000 } })).toBe(30_000);
    expect(getTooManyPaymentsTotal({ status: "CUSTOM_ERROR", error: "INCOMPLETE_PAYMENTS" })).toBeNull();
    expect(getTooManyPaymentsTotal({ status: 500, data: {} })).toBeNull();
    expect(getTooManyPaymentsTotal(undefined)).toBeNull();
  });
});
