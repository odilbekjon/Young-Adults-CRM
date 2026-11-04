import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { Dashboard } from "./Dashboard";

// The "Active students" tile end to end: the page's real queries and hooks over a
// stubbed backend whose answers the test releases one by one.

const BACKEND_FIGURE = 412; // GET /dashboard/stats - a different definition, so it can be off

const membership = (studentId: string, groupId = "g1") => ({ id: `${studentId}-${groupId}`, studentId, groupId, status: "ACTIVE" });

interface Gate { promise: Promise<void>; open: () => void }
const gate = (): Gate => {
  let open = () => {};
  const promise = new Promise<void>((resolve) => { open = resolve; });
  return { promise, open };
};

// Memberships: 3 pages, 6 distinct students (s1 studies in two groups).
const PAGES: Record<number, unknown[]> = {
  1: [membership("s1", "g1"), membership("s1", "g2"), membership("s2")],
  2: [membership("s3"), membership("s4")],
  3: [membership("s5"), membership("s6")],
};
// s6's account is archived: the exact figure is 5, the provisional one (all memberships read) is 6.
const ACTIVE_ACCOUNTS = ["s1", "s2", "s3", "s4", "s5", "s9"];

const listMeta = (total: number, limit = 1) => ({ total, page: 1, limit, totalPages: 1 });

const makeBackend = (gates: { stats?: Gate; page1?: Gate; page2?: Gate; page3?: Gate; accounts?: Gate } = {}) => async (request: SentRequest) => {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/v1/", "");
  if (path === "dashboard/stats") {
    await gates.stats?.promise;
    return jsonResponse({ success: true, message: "", data: { activeStudentsCount: BACKEND_FIGURE, activeGroupsCount: 9 } });
  }
  if (path === "student-groups" && url.searchParams.get("status") === "ACTIVE") {
    const page = Number(url.searchParams.get("page"));
    await (page === 1 ? gates.page1 : page === 2 ? gates.page2 : gates.page3)?.promise;
    return jsonResponse({ data: PAGES[page] ?? [], meta: { total: 7, page, limit: 1000, totalPages: 3 } });
  }
  if (path === "student-groups") return jsonResponse({ data: [], meta: listMeta(0, 1000) });
  if (path === "students") {
    await gates.accounts?.promise;
    return jsonResponse({ data: ACTIVE_ACCOUNTS.map((id) => ({ id, name: id })), meta: { total: ACTIVE_ACCOUNTS.length, page: 1, limit: 3000, totalPages: 1 } });
  }
  if (path === "dashboard/attendance-stats") return jsonResponse({ data: { percentage: 90, present: 9, absent: 1 } });
  if (path.startsWith("dashboard/")) return jsonResponse({ data: [] });
  if (path === "leads" || path === "finance/debtors" || path === "finance/payments") return jsonResponse({ data: [], meta: listMeta(3) });
  if (path === "finance/chart") return jsonResponse({ data: [] });
  if (path === "groups") return jsonResponse({ data: [], meta: listMeta(0, 100) });
  return jsonResponse({ data: {} });
};

const renderDashboard = () =>
  renderWithStore(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );

// The element that holds the number inside the "Active students" tile.
const tile = () => screen.getByText("Active students").parentElement as HTMLElement;
const tileText = () => tile().textContent?.replace("Active students", "").replace(/\s+/g, " ").trim();
const busyValue = () => tile().querySelector("[aria-busy]") as HTMLElement | null;

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

afterEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("Dashboard: Active students tile", () => {
  it("shows the exact count with no estimate mark once everything is in", async () => {
    stubFetch(makeBackend());
    renderDashboard();

    await waitFor(() => expect(tileText()).toBe("5"));
    expect(busyValue()).toBeNull();
  });

  it("shows the backend's figure at once as a marked, dimmed estimate, then the memberships' figure, then the exact one in the same place", async () => {
    const page2 = gate();
    const accounts = gate();
    stubFetch(makeBackend({ page2, accounts }));
    renderDashboard();

    // page 2 is held back: only the backend's cheap figure exists
    await waitFor(() => expect(tileText()).toBe("≈ 412"));
    expect(busyValue()?.getAttribute("aria-busy")).toBe("true");
    expect(busyValue()?.querySelector("[role=progressbar]")).not.toBeNull();

    // every membership is read, the accounts list is still missing: the better estimate replaces it
    page2.open();
    await waitFor(() => expect(tileText()).toBe("≈ 6"));
    expect(busyValue()?.getAttribute("aria-busy")).toBe("true");

    // the accounts list lands: the exact figure, unmarked
    accounts.open();
    await waitFor(() => expect(tileText()).toBe("5"));
    expect(busyValue()).toBeNull();
  });

  it("shows a spinner, not a number, while neither the backend's figure nor the memberships have arrived", async () => {
    const stats = gate();
    const page1 = gate();
    stubFetch(makeBackend({ stats, page1 }));
    renderDashboard();

    await waitFor(() => expect(tile().querySelector("[role=progressbar]")).not.toBeNull());
    expect(tileText()).toBe("");

    stats.open();
    await waitFor(() => expect(tileText()).toBe("≈ 412"));
    page1.open();
    await waitFor(() => expect(tileText()).toBe("5"));
  });

  it("keeps the marked backend figure, without the dimming and spinner, when a membership page cannot be read", async () => {
    stubFetch(async (request) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/student-groups") && url.searchParams.get("status") === "ACTIVE" && url.searchParams.get("page") === "2") {
        return jsonResponse({ error: "boom" }, { status: 500 });
      }
      return makeBackend()(request);
    });
    renderDashboard();

    await waitFor(() => expect(tileText()).toBe("≈ 412"));
    // settled: not "refining" any more
    await waitFor(() => expect(busyValue()?.getAttribute("aria-busy")).toBe("false"));
    expect(busyValue()?.querySelector("[role=progressbar]")).toBeNull();
  });
});
