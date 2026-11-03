import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch, type SentRequest } from "../../../../test/fetchStub";
import { renderWithStore } from "../../../../test/renderWithStore";
import { baseApi } from "../../../../app/api/baseApi";
import { store } from "../../../../app/store";
import { ToastProvider } from "../../../../Context/ToastContext";
import { AllPayments } from "./allPayments";
import { fmt } from "./format";

vi.mock("../../../../Context/BranchContext", () => ({ useBranch: () => ({ branchLabel: "All branches" }) }));

// The Intl grouping uses a non-breaking space; Testing Library's matcher
// normalizes whitespace, so the expected text is normalized the same way.
const money = (n: number) => fmt(n).replace(/\s/g, " ");

const payment = (id: string, over: Record<string, unknown> = {}) => ({
  id, amount: 400_000, date: "2026-11-03", status: null, createdAt: "2026-11-03T08:00:00.000Z",
  student: { id: `s-${id}`, name: `Student ${id}` }, group: { id: "g1", name: "Deep Science" },
  paymentMethod: { id: "m1", name: "Cash" }, createdBy: { name: "Maksuda" }, ...over,
});

const PAYMENTS = [
  payment("p1"),
  payment("p2", { amount: 250_000, group: { id: "g2", name: "Kids English" }, paymentMethod: { id: "m2", name: "Click" }, createdBy: { name: "Dilnoza" } }),
  payment("p3", { amount: 100_000, date: "2026-11-05", status: "REFUNDED" }),
];

const GROUPS = [
  { id: "g1", name: "Deep Science", courseId: "c1", course: { id: "c1", name: "IELTS" }, teachers: [{ id: "t1", name: "Anvar" }] },
  { id: "g2", name: "Kids English", courseId: "c2", course: { id: "c2", name: "Kids" }, teachers: [{ id: "t2", name: "Malika" }] },
];

const answer = (request: SentRequest) => {
  const { pathname } = new URL(request.url);
  if (pathname.endsWith("/finance/payments")) {
    return jsonResponse({ success: true, data: PAYMENTS, meta: { total: PAYMENTS.length, page: 1, limit: 1000, totalPages: 1 } });
  }
  if (pathname.endsWith("/finance/payment-methods")) {
    return jsonResponse({ success: true, data: [{ id: "m1", name: "Cash" }, { id: "m2", name: "Click" }] });
  }
  if (pathname.endsWith("/finance/chart")) {
    return jsonResponse({ success: true, data: [{ month: "Nov", monthNumber: 11, totalPayments: 1, totalExpenses: 1, totalSalaries: 1, totalWithdrawals: 1, netProfit: 5_000_000 }] });
  }
  if (pathname.endsWith("/groups")) {
    return jsonResponse({ success: true, data: GROUPS, meta: { total: 2, page: 1, limit: 100, totalPages: 1 } });
  }
  return jsonResponse({ success: true, data: {} });
};

const paymentListRequests = (requests: SentRequest[]) =>
  requests.filter((r) => r.method === "GET" && new URL(r.url).pathname.endsWith("/finance/payments"));

const renderPage = (url = "/finance/payments") =>
  renderWithStore(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider><AllPayments /></ToastProvider>
    </MemoryRouter>,
  );

// "Total Revenue" card value: the card's heading is followed by its amount.
const revenueCard = () => screen.getByText("Total Revenue:").parentElement as HTMLElement;
const netProfitCard = () => screen.getByText("Total Net Profit:").parentElement as HTMLElement;

beforeEach(() => {
  sessionStorage.clear();
  store.dispatch(baseApi.util.resetApiState());
  // Only the clock is faked, so waitFor keeps working. "Today" is 3 November 2026.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AllPayments: monthly view", () => {
  it("opens on the current month, first to last day, and asks the backend for exactly that", async () => {
    const { requests } = stubFetch(answer);
    renderPage();

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    const params = new URL(paymentListRequests(requests)[0].url).searchParams;
    expect(params.get("startDate")).toBe("2026-11-01");
    expect(params.get("endDate")).toBe("2026-11-30");
    expect(screen.getByText("01.11.2026")).toBeTruthy();
    expect(screen.getByText("30.11.2026")).toBeTruthy();
    // The cards state the same period.
    expect(within(revenueCard()).getByText(/01\.11\.2026 — 30\.11\.2026/)).toBeTruthy();
    expect(within(netProfitCard()).getByText(/01\.11\.2026 — 30\.11\.2026/)).toBeTruthy();
  });

  it("puts the filters above the summary cards and the chart", async () => {
    stubFetch(answer);
    renderPage();

    const filters = await screen.findByText("Date from");
    const revenue = screen.getByText("Total Revenue:");
    expect(filters.compareDocumentPosition(revenue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Every filter of the design is there.
    const form = screen.getByRole("button", { name: "Filter" }).closest("form") as HTMLElement;
    ["Date to", "Name or Phone", "Select group", "Course", "Teacher", "Method pay", "Sum", "Staff Name", "From created date", "To created date"].forEach((label) => {
      expect(within(form).getByText(label)).toBeTruthy();
    });
  });

  it("totals the money received in the period — a refunded payment is listed but not counted", async () => {
    stubFetch(answer);
    renderPage();

    expect(await within(revenueCard()).findByText(money(650_000))).toBeTruthy();
    // All three payments are in the table, the refunded one flagged.
    expect(screen.getByText("Student p1")).toBeTruthy();
    expect(screen.getByText("Student p3")).toBeTruthy();
    expect(screen.getByText("refunded")).toBeTruthy();
    expect(screen.getByText("Showing", { exact: false }).textContent).toContain("3");
    // The chart is the per-day view of the month.
    expect(screen.getByText("Payments per day")).toBeTruthy();
    // One card per payment method, from the same rows: Cash 400 000 of 650 000, Click 250 000.
    expect(screen.getByText("62%")).toBeTruthy();
    expect(screen.getByText("38%")).toBeTruthy();
  });

  it("shows the backend's net profit for a whole month", async () => {
    stubFetch(answer);
    renderPage();

    expect(await within(netProfitCard()).findByText(money(5_000_000))).toBeTruthy();
  });

  it("shows no net profit for a partial month (the Dashboard link: month start to today)", async () => {
    const { requests } = stubFetch(answer);
    renderPage("/finance/payments?startDate=2026-11-01&endDate=2026-11-03");

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    const params = new URL(paymentListRequests(requests)[0].url).searchParams;
    expect(params.get("startDate")).toBe("2026-11-01");
    expect(params.get("endDate")).toBe("2026-11-03");
    expect(await within(revenueCard()).findByText(money(650_000))).toBeTruthy();
    expect(within(netProfitCard()).getByText("—")).toBeTruthy();
    expect(requests.some((r) => new URL(r.url).pathname.endsWith("/finance/chart"))).toBe(false);
  });
});

describe("AllPayments: filters saved for a refresh", () => {
  const save = (day: string, startDate: string, endDate: string) => {
    const filters = { startDate, endDate, search: "", paymentMethodId: "", groupId: "", courseId: "", teacherId: "", amount: "", staff: "", createdFrom: "", createdTo: "" };
    sessionStorage.setItem("ya-crm:state:allPayments:v2:day", JSON.stringify(day));
    sessionStorage.setItem("ya-crm:state:allPayments:v2:applied", JSON.stringify(filters));
    sessionStorage.setItem("ya-crm:state:allPayments:v2:draft", JSON.stringify(filters));
  };

  it("keeps the period picked earlier today", async () => {
    save("2026-11-03", "2026-10-01", "2026-10-31");
    const { requests } = stubFetch(answer);
    renderPage();

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    expect(new URL(paymentListRequests(requests)[0].url).searchParams.get("startDate")).toBe("2026-10-01");
    expect(screen.getByText("01.10.2026")).toBeTruthy();
  });

  it("falls back to the current month when they were saved on an earlier day", async () => {
    save("2026-10-31", "2026-10-01", "2026-10-31");
    const { requests } = stubFetch(answer);
    renderPage();

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    const params = new URL(paymentListRequests(requests)[0].url).searchParams;
    expect(params.get("startDate")).toBe("2026-11-01");
    expect(params.get("endDate")).toBe("2026-11-30");
  });
});

describe("AllPayments: filters drive the table, the cards and the chart", () => {
  it("filters by group on this side: table and revenue follow, no new payments request", async () => {
    const { requests } = stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    const groupSelect = (await screen.findByRole("option", { name: "Kids English" })).closest("select")!;
    fireEvent.change(groupSelect, { target: { value: "g2" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    await within(revenueCard()).findByText(money(250_000));
    expect(screen.queryByText("Student p1")).toBeNull();
    expect(screen.getByText("Student p2")).toBeTruthy();
    expect(paymentListRequests(requests)).toHaveLength(1);
    // Net profit describes the whole business, so a payment filter hides it.
    expect(within(netProfitCard()).getByText("—")).toBeTruthy();
  });

  it("filters by teacher and course together", async () => {
    stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    const setSelect = async (optionName: string, value: string) =>
      fireEvent.change((await screen.findByRole("option", { name: optionName })).closest("select")!, { target: { value } });

    await setSelect("Anvar", "t1");
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(400_000));
    expect(screen.queryByText("Student p2")).toBeNull();

    await setSelect("Kids", "c2");
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    // Teacher Anvar teaches IELTS, not Kids: nothing matches both.
    await waitFor(() => expect(screen.getByText("No payments found")).toBeTruthy());
    expect(within(revenueCard()).getByText("0")).toBeTruthy();
  });

  it("filters by the staff member who recorded the payment and by the exact sum", async () => {
    stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    fireEvent.change((await screen.findByRole("option", { name: "Dilnoza" })).closest("select")!, { target: { value: "Dilnoza" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(250_000));
    expect(screen.queryByText("Student p1")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await within(revenueCard()).findByText(money(650_000));

    // Typed grouped or plain, the sum is kept as digits.
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "400 000" } });
    expect((screen.getByPlaceholderText("Amount") as HTMLInputElement).value).toBe(fmt(400_000));
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(400_000));
    expect(screen.queryByText("Student p2")).toBeNull();
  });

  it("sends the date range and payment method to the backend and reloads", async () => {
    const { requests } = stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    fireEvent.change((await screen.findByRole("option", { name: "Click" })).closest("select")!, { target: { value: "m2" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(2));
    expect(new URL(paymentListRequests(requests)[1].url).searchParams.get("paymentMethodId")).toBe("m2");
  });

  it("Reset returns to the current month with nothing else filtered", async () => {
    stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    fireEvent.change((await screen.findByRole("option", { name: "Kids English" })).closest("select")!, { target: { value: "g2" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(250_000));

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await within(revenueCard()).findByText(money(650_000));
    expect(screen.getByText("01.11.2026")).toBeTruthy();
    expect(screen.getByText("30.11.2026")).toBeTruthy();
  });

  it("refuses an Excel export that would ignore the filters applied on this side", async () => {
    stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    const exportButton = () => screen.getByLabelText("Export to Excel").querySelector("button") as HTMLButtonElement;
    expect(exportButton().disabled).toBe(false);

    fireEvent.change((await screen.findByRole("option", { name: "Kids English" })).closest("select")!, { target: { value: "g2" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(250_000));

    const blocked = screen.getByLabelText(/Excel export covers/).querySelector("button") as HTMLButtonElement;
    expect(blocked.disabled).toBe(true);
  });
});

describe("AllPayments: a period that can't be shown in full", () => {
  it("says so instead of drawing a chart from part of the payments", async () => {
    stubFetch((request) =>
      new URL(request.url).pathname.endsWith("/finance/payments")
        ? jsonResponse({ success: true, data: [payment("p1")], meta: { total: 30_000, page: 1, limit: 1000, totalPages: 30 } })
        : answer(request),
    );
    renderPage();

    expect((await screen.findAllByText(/too many payments \(30000\)/)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Payments per day")).toBeNull();
    expect(screen.queryByText("Student p1")).toBeNull();
  });

  it("offers a retry when the payments fail to load", async () => {
    stubFetch((request) =>
      new URL(request.url).pathname.endsWith("/finance/payments") ? jsonResponse({ message: "boom" }, { status: 500 }) : answer(request),
    );
    renderPage();

    expect(await screen.findByText("Failed to load chart data.")).toBeTruthy();
    expect(screen.getByText("Failed to load payments")).toBeTruthy();
  });
});
