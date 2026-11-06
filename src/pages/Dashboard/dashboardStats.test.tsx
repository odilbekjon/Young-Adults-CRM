import { configure, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { Dashboard } from "./Dashboard";
import { statCounts } from "./dashboardStats";

// The stat cards end to end: the page's real queries over a stubbed backend.

// The whole Dashboard is mounted here, so on a busy machine (the full suite runs
// dozens of files at once) a first render can outlast the default 1 s waitFor /
// 5 s test limits.
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });

// What GET /dashboard/stats answered in Swagger.
const SWAGGER_STATS = {
  activeLeadsCount: 0, activeStudentsCount: 1830, activeGroupsCount: 108, debtorsCount: 1649,
  trialLessonStudentsCount: 67, paidThisMonthStudentsCount: 152, paidThisMonthPaymentsCount: 155,
  paidThisMonthCount: 155, leftActiveGroupsCount: 52, leftActiveGroupsThisMonthCount: 15,
  leftTrialLessonsCount: 76, activeStudentGroupsCount: 1706, cancelledLeadsCount: 0,
  leads: 0, students: 1830, groups: 108, debtors: 1649, trial: 67, paid: 155, leftActive: 52, leftTrial: 76,
};

interface Gate { promise: Promise<void>; open: () => void }
const gate = (): Gate => {
  let open = () => {};
  const promise = new Promise<void>((resolve) => { open = resolve; });
  return { promise, open };
};

const pathOf = (request: SentRequest) => new URL(request.url).pathname.replace("/api/v1/", "");

const makeBackend = (stats: () => Response | Promise<Response> = () => jsonResponse({ success: true, message: "", data: SWAGGER_STATS })) =>
  async (request: SentRequest) => {
    const path = pathOf(request);
    if (path === "dashboard/stats") return stats();
    if (path === "dashboard/attendance-stats") return jsonResponse({ data: { percentage: 91, present: 1016, absent: 105, total: 1121 } });
    if (path.startsWith("dashboard/")) return jsonResponse({ data: [] });
    if (path === "finance/chart") return jsonResponse({ data: [] });
    if (path === "groups" || path === "student-groups") {
      return jsonResponse({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 1 } });
    }
    return jsonResponse({ data: {} });
  };

const renderDashboard = () =>
  renderWithStore(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );

// The card of a stat, found by its label.
const LABELS = [
  "Active leads", "Active students", "Groups", "Debtors",
  "In a trial lesson", "Paid during the month", "Left active group", "Left after trial period",
] as const;
const card = (label: string) => screen.getAllByText(label).map((el) => el.parentElement as HTMLElement).find((el) => el.querySelector("p + p"))!;
const valueOf = (label: string) => {
  const texts = Array.from(card(label).querySelectorAll("p"));
  return texts[texts.length - 1]?.textContent;
};
const hasSpinner = (label: string) => card(label).querySelector("[role=progressbar]") !== null;

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

afterEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("Dashboard stat cards", () => {
  it("shows all eight figures of the one /dashboard/stats answer", async () => {
    stubFetch(makeBackend());
    renderDashboard();

    await waitFor(() => expect(valueOf("Active students")).toBe("1830"));
    expect(LABELS.map(valueOf)).toEqual(["0", "1830", "108", "1649", "67", "155", "52", "76"]);
  });

  it("asks for those figures once, and downloads no list to count them", async () => {
    const { requests } = stubFetch(makeBackend());
    renderDashboard();
    await waitFor(() => expect(valueOf("Active students")).toBe("1830"));
    // let every other card on the page finish asking as well
    await waitFor(() => expect(requests.some((r) => pathOf(r) === "dashboard/schedule")).toBe(true));

    const paths = requests.map((r) => `${pathOf(r)}${new URL(r.url).search}`);
    expect(paths.filter((p) => p === "dashboard/stats")).toHaveLength(1);
    for (const list of ["leads", "finance/debtors", "finance/payments", "students", "reports"]) {
      expect(paths.filter((p) => p === list || p.startsWith(`${list}?`) || p.startsWith(`${list}/`))).toEqual([]);
    }
    // the membership lists of the active / trial students are not read either
    expect(paths.filter((p) => /status=(ACTIVE|PROBATION)/.test(p))).toEqual([]);
  });

  it("keeps every card on a spinner until the answer is in, then fills them together", async () => {
    const stats = gate();
    stubFetch(makeBackend(async () => {
      await stats.promise;
      return jsonResponse({ success: true, message: "", data: SWAGGER_STATS });
    }));
    renderDashboard();

    await waitFor(() => expect(LABELS.every(hasSpinner)).toBe(true));

    stats.open();
    await waitFor(() => expect(valueOf("Active students")).toBe("1830"));
    expect(LABELS.some(hasSpinner)).toBe(false);
    expect(LABELS.map(valueOf)).toEqual(["0", "1830", "108", "1649", "67", "155", "52", "76"]);
  });

  it("reads the short names when that is all the answer carries", async () => {
    stubFetch(makeBackend(() => jsonResponse({
      success: true, message: "",
      data: { leads: 4, students: 30, groups: 5, debtors: 6, trial: 7, paid: 8, leftActive: 9, leftTrial: 10 },
    })));
    renderDashboard();

    await waitFor(() => expect(valueOf("Active students")).toBe("30"));
    expect(LABELS.map(valueOf)).toEqual(["4", "30", "5", "6", "7", "8", "9", "10"]);
  });

  it("shows a dash, not a made-up 0, for a figure the answer leaves out", async () => {
    stubFetch(makeBackend(() => jsonResponse({ success: true, message: "", data: { activeStudentsCount: 30, activeGroupsCount: 5 } })));
    renderDashboard();

    await waitFor(() => expect(valueOf("Active students")).toBe("30"));
    expect(LABELS.map(valueOf)).toEqual(["—", "30", "5", "—", "—", "—", "—", "—"]);
  });

  it("shows a dash on every card when the answer cannot be read", async () => {
    stubFetch(makeBackend(() => jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 })));
    renderDashboard();

    await waitFor(() => expect(LABELS.some(hasSpinner)).toBe(false));
    expect(LABELS.map(valueOf)).toEqual(Array(8).fill("—"));
  });
});

describe("Dashboard stat cards: where they lead", () => {
  const Where = () => <span data-testid="where">{useLocation().pathname}</span>;
  const renderWithRoutes = () =>
    renderWithStore(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<div>ANOTHER PAGE</div>} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );

  it("opens the page of a card that has one", async () => {
    stubFetch(makeBackend());
    renderWithRoutes();
    await waitFor(() => expect(valueOf("Groups")).toBe("108"));

    fireEvent.click(card("Groups"));

    expect(await screen.findByText("ANOTHER PAGE")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/groups");
  });

  it("leaves the Debtors card where it is: its page (Finance > Debtors) is hidden for now", async () => {
    stubFetch(makeBackend());
    renderWithRoutes();
    await waitFor(() => expect(valueOf("Debtors")).toBe("1649"));

    fireEvent.click(card("Debtors"));

    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
    expect(screen.queryByText("ANOTHER PAGE")).toBeNull();
    expect(getComputedStyle(card("Debtors")).cursor).toBe("default");
  });
});

describe("statCounts", () => {
  it("prefers the long name and falls back to the alias", () => {
    expect(statCounts({ activeStudentsCount: 5, students: 9, activeGroupsCount: 1, groups: 2 })).toMatchObject({ students: 5, groups: 1 });
    expect(statCounts({ activeStudentsCount: 5, activeGroupsCount: 1, debtors: 7 })).toMatchObject({ debtors: 7 });
  });

  it("counts the payments of the month, whichever of its three names the backend used", () => {
    const base = { activeStudentsCount: 0, activeGroupsCount: 0 };
    expect(statCounts({ ...base, paidThisMonthCount: 155, paidThisMonthStudentsCount: 152 }).paid).toBe(155);
    expect(statCounts({ ...base, paidThisMonthPaymentsCount: 155 }).paid).toBe(155);
    expect(statCounts({ ...base, paid: 155 }).paid).toBe(155);
  });

  it("keeps a real 0, and gives null for a missing figure", () => {
    const counts = statCounts({ activeStudentsCount: 0, activeGroupsCount: 0, activeLeadsCount: 0 });
    expect(counts.leads).toBe(0);
    expect(counts.debtors).toBeNull();
    expect(statCounts(undefined).students).toBeNull();
  });
});
