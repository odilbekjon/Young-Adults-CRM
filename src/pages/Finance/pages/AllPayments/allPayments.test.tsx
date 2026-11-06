import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
  paymentMethod: { id: "m1", name: "Cash" }, createdBy: { id: "u1", name: "Maksuda" }, ...over,
});

const PAYMENTS = [
  payment("p1"),
  payment("p2", { amount: 250_000, group: { id: "g2", name: "Kids English" }, paymentMethod: { id: "m2", name: "Click" }, createdBy: { id: "u2", name: "Dilnoza" } }),
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

const revenueCard = () => screen.getByTestId("revenue-card");
const netProfitCard = () => screen.getByTestId("net-profit-card");

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

  it("lays the page out as statistics, then the filters, then the table", async () => {
    stubFetch(answer);
    renderPage();

    const title = await screen.findByRole("heading", { name: "All payments" });
    const revenue = revenueCard();
    const netProfit = netProfitCard();
    const chart = await screen.findByText("Payments per day");
    const firstFilter = screen.getByText("Date from");
    const filtersToggle = screen.getByRole("button", { name: "Filters" });
    const tableHead = screen.getByRole("columnheader", { name: "Date" });

    const before = (a: Element, b: Element) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    [title, revenue, netProfit, chart, firstFilter, filtersToggle, tableHead].reduce((previous, next) => {
      before(previous, next);
      return next;
    });
    // The statistics are not inside the filter form.
    const form = screen.getByRole("button", { name: "Filter" }).closest("form") as HTMLElement;
    expect(form.contains(revenue)).toBe(false);
    expect(form.contains(chart)).toBe(false);
    // Every filter of the design is there, a label above each.
    ["Date from", "Date to", "Name or Phone", "Select group", "Course", "Teacher", "Payment type", "Sum", "Staff Name", "From created date", "To created date"].forEach((label) => {
      expect(within(form).getByText(label)).toBeTruthy();
    });
  });

  it("has no 'This month' summary or per-method cards between the statistics and the filters", async () => {
    const { requests } = stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    expect(screen.queryByText("This month")).toBeNull();
    expect(screen.queryByText("By payment method")).toBeNull();
    expect(screen.queryByText("62%")).toBeNull();
    // The summary's own request is not made any more.
    expect(requests.some((r) => new URL(r.url).pathname.endsWith("/finance/stats"))).toBe(false);
    // What stays: the revenue and net-profit cards, the chart, the filters, the table.
    expect(screen.getByText("Payments per day")).toBeTruthy();
    expect(screen.getByText("Date from")).toBeTruthy();
    expect(screen.getByText("Student p1")).toBeTruthy();
  });

  it("has a Filters button above the table that hides and shows the filters (shown by default)", async () => {
    stubFetch(answer);
    renderPage();
    expect(await screen.findByText("Date from")).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Filters" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Date from")).toBeNull());
    expect(screen.queryByRole("button", { name: "Filter" })).toBeNull();
    // The table and the statistics stay.
    expect(screen.getByText("Student p1")).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(await screen.findByText("Date from")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter" })).toBeTruthy();
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
    sessionStorage.setItem("ya-crm:state:allPayments:v3:day", JSON.stringify(day));
    sessionStorage.setItem("ya-crm:state:allPayments:v3:applied", JSON.stringify(filters));
    sessionStorage.setItem("ya-crm:state:allPayments:v3:draft", JSON.stringify(filters));
  };

  it("keeps the period picked earlier today", async () => {
    save("2026-11-03", "2026-10-01", "2026-10-31");
    const { requests } = stubFetch(answer);
    renderPage();

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    expect(new URL(paymentListRequests(requests)[0].url).searchParams.get("startDate")).toBe("2026-10-01");
    expect(screen.getByText("01.10.2026")).toBeTruthy();
  });

  it("ignores filters saved by an older version of the page (the staff filter held a name then)", async () => {
    const old = { startDate: "2026-10-01", endDate: "2026-10-31", search: "", paymentMethodId: "", groupId: "", courseId: "", teacherId: "", amount: "", staff: "Dilnoza", createdFrom: "", createdTo: "" };
    sessionStorage.setItem("ya-crm:state:allPayments:v2:day", JSON.stringify("2026-11-03"));
    sessionStorage.setItem("ya-crm:state:allPayments:v2:applied", JSON.stringify(old));
    sessionStorage.setItem("ya-crm:state:allPayments:v2:draft", JSON.stringify(old));
    const { requests } = stubFetch(answer);
    renderPage();

    await waitFor(() => expect(paymentListRequests(requests)).toHaveLength(1));
    expect(new URL(paymentListRequests(requests)[0].url).searchParams.get("startDate")).toBe("2026-11-01");
    expect(await screen.findByText("Student p2")).toBeTruthy();
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

    fireEvent.change((await screen.findByRole("option", { name: "Dilnoza" })).closest("select")!, { target: { value: "u2" } });
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

// ─── The table, its teacher column and its sorting ───────────────────────────

// Answers like `answer`, with other payments and/or a paged GET /groups.
const serve = (
  { payments = PAYMENTS, groupPages }: {
    payments?: unknown[];
    groupPages?: (page: number) => { data: unknown[]; totalPages: number };
  } = {},
) => (request: SentRequest) => {
  const { pathname, searchParams } = new URL(request.url);
  if (pathname.endsWith("/finance/payments")) {
    return jsonResponse({ success: true, data: payments, meta: { total: payments.length, page: 1, limit: 1000, totalPages: 1 } });
  }
  if (pathname.endsWith("/groups") && groupPages) {
    const page = Number(searchParams.get("page"));
    const { data, totalPages } = groupPages(page);
    return jsonResponse({ success: true, data, meta: { total: data.length, page, limit: 100, totalPages } });
  }
  return answer(request);
};

const rowOf = (studentName: string) => screen.getByText(studentName).closest("tr") as HTMLElement;
// Cells of a body row: date, student, sum, payment type, teacher, comment, staff, refund.
const cellOf = (row: HTMLElement, index: number) => row.querySelectorAll("td")[index] as HTMLElement;
const studentOrder = () => [...document.querySelectorAll("tbody tr")].map((tr) => tr.querySelectorAll("td")[1]?.textContent);
const headerButton = (name: string) => within(screen.getByRole("columnheader", { name })).getByRole("button");
const groupRequests = (requests: SentRequest[]) =>
  requests.filter((r) => r.method === "GET" && new URL(r.url).pathname.endsWith("/groups"));

describe("AllPayments: table", () => {
  it("has the columns of the design, in order", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p1");

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Date", "Student name", "Sum", "Payment type", "Teacher", "Comment", "Staff", ""]);
    // Date is the sort column from the start: newest first.
    expect(screen.getByRole("columnheader", { name: "Date" }).getAttribute("aria-sort")).toBe("descending");
  });

  it("shows the teachers of each payment group, the row number before the date, and who recorded it and when", async () => {
    stubFetch(serve({
      payments: [
        payment("p1", { notes: "March fee", createdAt: "2026-11-04T04:47:27.000Z" }),
        payment("p2", { group: { id: "g2", name: "Kids English" } }),
      ],
      groupPages: () => ({
        data: [{ ...GROUPS[0], teachers: [{ id: "t1", name: "Anvar" }, { id: "t3", name: "Sarvar" }] }, GROUPS[1]],
        totalPages: 1,
      }),
    }));
    renderPage();
    await screen.findByText("Student p1");

    const first = rowOf("Student p1");
    expect(cellOf(first, 0).textContent).toBe("1.03.11.2026");
    await waitFor(() => expect(cellOf(first, 4).textContent).toBe("Anvar, Sarvar"));
    expect(cellOf(first, 5).textContent).toBe("March fee");
    expect(cellOf(first, 6).textContent).toBe("Maksuda04.11.2026 09:47:27");
    expect(cellOf(rowOf("Student p2"), 4).textContent).toBe("Malika");
  });

  it("shows a dash instead of a teacher when the group of the payment is not known", async () => {
    stubFetch(serve({ payments: [payment("p9", { group: { id: "g404", name: "Deleted group" } })] }));
    renderPage();
    await screen.findByText("Student p9");

    await waitFor(() => expect(cellOf(rowOf("Student p9"), 4).textContent).toBe("—"));
  });

  it("opens the student profile when a row is clicked, but not from the refund button", async () => {
    stubFetch(answer);
    renderWithStore(
      <MemoryRouter initialEntries={["/finance/payments"]}>
        <ToastProvider>
          <Routes>
            <Route path="/finance/payments" element={<AllPayments />} />
            <Route path="/students/:id" element={<div>Student profile page</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await screen.findByText("Student p1");

    fireEvent.click(within(rowOf("Student p1")).getByRole("button"));
    expect(await screen.findByText("Refund this payment? This action cannot be undone.")).toBeTruthy();
    expect(screen.queryByText("Student profile page")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByText("Student p2"));
    expect(await screen.findByText("Student profile page")).toBeTruthy();
  });

  it("keeps a refunded payment struck through with its status and no refund button", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p3");

    const voided = rowOf("Student p3");
    expect(within(voided).getByText("refunded")).toBeTruthy();
    expect(within(voided).queryByRole("button")).toBeNull();
    expect(cellOf(voided, 2).querySelector(".line-through")).not.toBeNull();
    expect(within(rowOf("Student p1")).getByRole("button")).toBeTruthy();
  });
});

describe("AllPayments: sorting", () => {
  it("lists the newest payment first until a header is clicked", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p1");

    // p3 is dated the 5th, p1 and p2 the 3rd.
    expect(studentOrder()).toEqual(["Student p3", "Student p1", "Student p2"]);
  });

  it("sorts by sum, and a second click flips the direction", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p1");

    fireEvent.click(headerButton("Sum"));
    expect(studentOrder()).toEqual(["Student p3", "Student p2", "Student p1"]); // 100k, 250k, 400k
    expect(screen.getByRole("columnheader", { name: "Sum" }).getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByRole("columnheader", { name: "Date" }).getAttribute("aria-sort")).toBeNull();

    fireEvent.click(headerButton("Sum"));
    expect(studentOrder()).toEqual(["Student p1", "Student p2", "Student p3"]);
    expect(screen.getByRole("columnheader", { name: "Sum" }).getAttribute("aria-sort")).toBe("descending");
  });

  it("sorts by date (oldest first on the second click), student name, payment type, teacher and staff", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p1");
    // The teacher column needs the groups.
    await waitFor(() => expect(cellOf(rowOf("Student p1"), 4).textContent).toBe("Anvar"));

    fireEvent.click(headerButton("Date"));
    expect(studentOrder()).toEqual(["Student p1", "Student p2", "Student p3"]);

    fireEvent.click(headerButton("Student name"));
    expect(studentOrder()).toEqual(["Student p1", "Student p2", "Student p3"]);
    fireEvent.click(headerButton("Student name"));
    expect(studentOrder()).toEqual(["Student p3", "Student p2", "Student p1"]);

    // Cash (p3, p1 - newest first among equals), then Click (p2).
    fireEvent.click(headerButton("Payment type"));
    expect(studentOrder()).toEqual(["Student p3", "Student p1", "Student p2"]);
    fireEvent.click(headerButton("Payment type"));
    expect(studentOrder()).toEqual(["Student p2", "Student p3", "Student p1"]);

    // Anvar teaches p3 and p1, Malika p2.
    fireEvent.click(headerButton("Teacher"));
    expect(studentOrder()).toEqual(["Student p3", "Student p1", "Student p2"]);
    fireEvent.click(headerButton("Teacher"));
    expect(studentOrder()).toEqual(["Student p2", "Student p3", "Student p1"]);

    // Dilnoza recorded p2, Maksuda p3 and p1.
    fireEvent.click(headerButton("Staff"));
    expect(studentOrder()).toEqual(["Student p2", "Student p3", "Student p1"]);
    fireEvent.click(headerButton("Staff"));
    expect(studentOrder()).toEqual(["Student p3", "Student p1", "Student p2"]);
  });

  it("works together with the filters", async () => {
    stubFetch(answer);
    renderPage();
    await screen.findByText("Student p1");

    fireEvent.change((await screen.findByRole("option", { name: "Deep Science" })).closest("select")!, { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() => expect(screen.queryByText("Student p2")).toBeNull());

    fireEvent.click(headerButton("Sum"));
    expect(studentOrder()).toEqual(["Student p3", "Student p1"]);
    // Dropping the filter keeps the chosen order.
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByText("Student p2");
    expect(studentOrder()).toEqual(["Student p3", "Student p2", "Student p1"]);
  });

  it("goes back to page 1 when the order changes, and sorts every page, not just the one on screen", async () => {
    const many = Array.from({ length: 120 }, (_, i) => {
      const n = i + 1;
      // q1 is the oldest and the cheapest; q120 the newest and the dearest.
      return payment(`q${n}`, { amount: n * 1000, createdAt: `2026-11-03T08:${String(n % 60).padStart(2, "0")}:00.000Z`, date: `2026-11-${String(1 + Math.floor((n - 1) / 6)).padStart(2, "0")}` });
    });
    stubFetch(serve({ payments: many }));
    renderPage();
    await screen.findByText("Student q120");

    // Newest first, fifty to a page: 120 payments are three pages.
    expect(studentOrder()).toHaveLength(50);
    fireEvent.click(screen.getByRole("button", { name: "Go to page 3" }));
    expect(await screen.findByText("Student q1")).toBeTruthy();
    expect(studentOrder()).toHaveLength(20);

    fireEvent.click(headerButton("Sum"));
    expect(screen.getByText("Showing", { exact: false }).textContent).toContain("1–50");
    expect(studentOrder()[0]).toBe("Student q1");
    expect(studentOrder()).toHaveLength(50);
    // The dearest payment is on the last page, not lost.
    fireEvent.click(screen.getByRole("button", { name: "Go to page 3" }));
    expect(await screen.findByText("Student q120")).toBeTruthy();
  });
});

describe("AllPayments: fifty rows a page", () => {
  const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => payment(`r${i + 1}`, { createdAt: `2026-11-03T08:${String(i % 60).padStart(2, "0")}:00.000Z` }));

  it("lists up to fifty payments on a page and pages the rest", async () => {
    stubFetch(serve({ payments: rowsOf(55) }));
    renderPage();
    // Newest first, so r55 is on page 1 and r1 (the oldest) is among the last five.
    await screen.findByText("Student r55");

    expect(studentOrder()).toHaveLength(50);
    expect(screen.getByText("Showing", { exact: false }).textContent).toContain("1–50");
    expect(screen.getByText("Showing", { exact: false }).textContent).toContain("55");
    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => expect(studentOrder()).toHaveLength(5));
    expect(screen.getByText("Showing", { exact: false }).textContent).toContain("51–55");
  });

  it("shows no pagination for fifty payments or fewer", async () => {
    stubFetch(serve({ payments: rowsOf(50) }));
    renderPage();
    await screen.findByText("Student r1");

    expect(studentOrder()).toHaveLength(50);
    expect(screen.queryByRole("button", { name: "Go to page 2" })).toBeNull();
  });
});

// ─── Filters against what the backend really sends ───────────────────────────

describe("AllPayments: staff filter", () => {
  const realistic = [
    payment("s1", { createdBy: { id: "u1", firstName: "Maksuda", lastName: "Karimova" }, createdAt: "2026-11-04T04:47:27.000Z" }),
    payment("s2", { createdBy: { id: "u2", fullName: "Dilnoza Aliyeva" } }),
    payment("s3", { createdBy: "3", creator: { name: "Bobur" } }),
    payment("s4", { createdBy: { id: "u4", name: "Sardor" } }),
    payment("s5", { createdBy: { id: "u5", name: "Sardor" } }),
    payment("s6", { createdBy: { id: "u6" } }),
  ];

  it("shows the name of whoever recorded the payment, whichever way the backend spells it", async () => {
    stubFetch(serve({ payments: realistic }));
    renderPage();
    await screen.findByText("Student s1");

    expect(cellOf(rowOf("Student s1"), 6).textContent).toBe("Maksuda Karimova04.11.2026 09:47:27");
    expect(cellOf(rowOf("Student s2"), 6).textContent).toContain("Dilnoza Aliyeva");
    expect(cellOf(rowOf("Student s3"), 6).textContent).toContain("Bobur");
    // An id with no name is a dash, never "[object Object]" or the id.
    expect(cellOf(rowOf("Student s6"), 6).textContent).toMatch(/^—/);
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
    expect(screen.queryByText("u6")).toBeNull();
  });

  it("lists each staff member once by id, two people with the same name apart, and filters by the one picked", async () => {
    stubFetch(serve({ payments: realistic }));
    renderPage();
    await screen.findByText("Student s1");

    const select = (await screen.findByRole("option", { name: "Maksuda Karimova" })).closest("select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Select", "Bobur", "Dilnoza Aliyeva", "Maksuda Karimova", "Sardor", "Sardor"]);

    fireEvent.change(select, { target: { value: "u4" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() => expect(screen.queryByText("Student s1")).toBeNull());
    expect(studentOrder()).toEqual(["Student s4"]);

    // A staff member whose id sits in `createdBy` and whose name in a separate `creator` object.
    fireEvent.change(select, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() => expect(screen.queryByText("Student s4")).toBeNull());
    expect(studentOrder()).toEqual(["Student s3"]);
  });

  it("narrows the cards and the chart along with the table", async () => {
    stubFetch(serve({ payments: realistic }));
    renderPage();
    await within(revenueCard()).findByText(money(2_400_000));

    fireEvent.change((await screen.findByRole("option", { name: "Dilnoza Aliyeva" })).closest("select")!, { target: { value: "u2" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(400_000));
    expect(screen.getByText("Payments per day")).toBeTruthy();
    expect(within(netProfitCard()).getByText("—")).toBeTruthy();
  });

  it("submits the filters with the form (Enter in a field), not only with the button", async () => {
    stubFetch(answer);
    renderPage();
    await within(revenueCard()).findByText(money(650_000));

    fireEvent.change((await screen.findByRole("option", { name: "Kids English" })).closest("select")!, { target: { value: "g2" } });
    fireEvent.submit(screen.getByRole("button", { name: "Filter" }).closest("form") as HTMLElement);
    await within(revenueCard()).findByText(money(250_000));
  });
});

describe("AllPayments: teacher and course filters over every group", () => {
  // 100 groups fill the first page of GET /groups; the group of payment `late` is on the second.
  const filler = Array.from({ length: 100 }, (_, i) => ({
    id: `f${i}`, name: `Filler ${i}`, courseId: "c1", course: { id: "c1", name: "IELTS" }, teachers: [{ id: "t1", name: "Anvar" }],
  }));
  const lateGroup = {
    id: "g101", name: "Late Group", status: "ARCHIVE", courseId: "c9", course: { id: "c9", name: "Late Course" },
    teachers: [{ id: "t9", name: "Zafar" }],
  };
  const payments = [
    payment("early", { group: { id: "f1", name: "Filler 1" } }),
    payment("late", { group: { id: "g101", name: "Late Group" } }),
  ];
  const groupPages = (page: number) => ({ data: page === 1 ? filler : [lateGroup], totalPages: 2 });

  it("reads every page of groups, so a group past the first 100 (even an archived one) has its teacher", async () => {
    const { requests } = stubFetch(serve({ payments, groupPages }));
    renderPage();
    await screen.findByText("Student early");

    await waitFor(() => expect(cellOf(rowOf("Student late"), 4).textContent).toBe("Zafar"));
    expect(cellOf(rowOf("Student early"), 4).textContent).toBe("Anvar");
    expect(groupRequests(requests).map((r) => new URL(r.url).searchParams.get("page"))).toEqual(["1", "2"]);
  });

  it("offers the teacher and the course of that group, and filters by them", async () => {
    stubFetch(serve({ payments, groupPages }));
    renderPage();
    await screen.findByText("Student early");

    const teacherSelect = (await screen.findByRole("option", { name: "Zafar" })).closest("select")!;
    fireEvent.change(teacherSelect, { target: { value: "t9" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() => expect(screen.queryByText("Student early")).toBeNull());
    expect(studentOrder()).toEqual(["Student late"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByText("Student early");
    fireEvent.change((await screen.findByRole("option", { name: "Late Course" })).closest("select")!, { target: { value: "c9" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() => expect(screen.queryByText("Student early")).toBeNull());
    expect(studentOrder()).toEqual(["Student late"]);
  });

  it("uses the teachers and course a payment carries itself when GET /groups does not know its group", async () => {
    stubFetch(serve({
      payments: [payment("own", { group: { id: "g404", name: "Old group", course: { id: "c5", name: "Old Course" }, teachers: [{ id: "t5", name: "Nodira" }] } })],
    }));
    renderPage();
    await screen.findByText("Student own");

    expect(cellOf(rowOf("Student own"), 4).textContent).toBe("Nodira");
    fireEvent.change((await screen.findByRole("option", { name: "Nodira" })).closest("select")!, { target: { value: "t5" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await within(revenueCard()).findByText(money(400_000));
    expect(screen.getByText("Student own")).toBeTruthy();
  });
});


// ─── Details under Total Net Profit ──────────────────────────────────────────

describe("AllPayments: net profit details", () => {
  const METHODS = [{ id: "m1", name: "Cash" }, { id: "m2", name: "Click" }, { id: "m3", name: "UZCARD" }, { id: "m4", name: "Humo" }];
  // The same methods as the backend can send them: Click listed three times (a copy per branch).
  const REPEATED_METHODS = [
    { id: "m1", name: "Cash" }, { id: "m2", name: "Click" }, { id: "m2b", name: "click" }, { id: "m3", name: "UZCARD" },
    { id: "m2c", name: "Click" }, { id: "m4", name: "Humo" },
  ];
  const listOf = (rows: unknown[]) =>
    jsonResponse({ success: true, data: rows, meta: { total: rows.length, page: 1, limit: 1000, totalPages: 1 } });
  const outflow = (id: string, amount: number, methodId: string, methodName: string) => ({ id, amount, paymentMethod: { id: methodId, name: methodName } });

  // Cash took 400 000 and paid 50 000 out; Click took 250 000 and paid 100 000 out; UZCARD only paid 50 000 out.
  // 650 000 in, 150 000 of expenses, 50 000 of withdrawals: 450 000 of net profit.
  const backend = (chart: Record<string, unknown> = {}, expenses?: () => Response, methods: unknown[] = METHODS) => (request: SentRequest) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/finance/payment-methods")) return jsonResponse({ success: true, data: methods });
    if (pathname.endsWith("/finance/chart")) {
      return jsonResponse({
        success: true,
        data: [{ month: "Nov", monthNumber: 11, totalPayments: 650_000, totalExpenses: 150_000, totalSalaries: 0, totalWithdrawals: 50_000, netProfit: 450_000, ...chart }],
      });
    }
    if (pathname.endsWith("/finance/expenses")) {
      return expenses ? expenses() : listOf([outflow("e1", 100_000, "m2", "Click"), outflow("e2", 50_000, "m3", "UZCARD")]);
    }
    if (pathname.endsWith("/finance/withdrawals")) return listOf([outflow("w1", 50_000, "m1", "Cash")]);
    return answer(request);
  };

  const outflowRequests = (requests: SentRequest[]) =>
    requests.filter((r) => /\/finance\/(expenses|withdrawals)$/.test(new URL(r.url).pathname));
  const detailsButton = () => within(netProfitCard()).getByRole("button", { name: "Details" });
  const lines = () => within(netProfitCard()).queryAllByTestId("net-profit-line").map((li) => (li.textContent ?? "").replace(/\s/g, " "));
  const open = async () => {
    await within(netProfitCard()).findByText(money(450_000));
    fireEvent.click(detailsButton());
  };

  it("has a Details dropdown under Total Net Profit, closed until it is asked for", async () => {
    const { requests } = stubFetch(backend());
    renderPage();
    await within(netProfitCard()).findByText(money(450_000));

    expect(detailsButton().getAttribute("aria-expanded")).toBe("false");
    expect(lines()).toEqual([]);
    // Nothing is read for it before it is opened.
    expect(outflowRequests(requests)).toEqual([]);
    // It sits below the figure and the period, inside the net profit card only.
    const figure = within(netProfitCard()).getByText(/Total Net Profit/);
    expect(figure.compareDocumentPosition(detailsButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(revenueCard()).queryByRole("button", { name: "Details" })).toBeNull();
  });

  it("opens to the net of every payment method: what it took in minus what went out through it", async () => {
    stubFetch(backend());
    renderPage();
    await open();

    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(detailsButton().getAttribute("aria-expanded")).toBe("true");
    expect(lines()).toEqual([
      `Cash: ${money(350_000)} UZS`,
      `Click: ${money(150_000)} UZS`,
      `UZCARD: ${money(-50_000)} UZS`,
      `Humo: 0 UZS`,
    ]);
    // Together they are the Total Net Profit above.
    expect(350_000 + 150_000 - 50_000).toBe(450_000);
  });

  it("lists a payment method once, even when the backend lists it several times", async () => {
    stubFetch(backend({}, undefined, REPEATED_METHODS));
    renderPage();
    await open();

    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(lines()).toEqual([
      `Cash: ${money(350_000)} UZS`,
      `Click: ${money(150_000)} UZS`,
      `UZCARD: ${money(-50_000)} UZS`,
      `Humo: 0 UZS`,
    ]);
  });

  it("closes again on a second click", async () => {
    stubFetch(backend());
    renderPage();
    await open();
    await waitFor(() => expect(lines()).toHaveLength(4));

    fireEvent.click(detailsButton());

    await waitFor(() => expect(lines()).toEqual([]));
    expect(detailsButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("reads the expenses and withdrawals of the period on screen, once", async () => {
    const { requests } = stubFetch(backend());
    renderPage();
    await open();
    await waitFor(() => expect(lines()).toHaveLength(4));

    const asked = outflowRequests(requests);
    expect(asked.map((r) => new URL(r.url).pathname.split("/").pop())).toEqual(["expenses", "withdrawals"]);
    asked.forEach((r) => {
      const params = new URL(r.url).searchParams;
      expect(params.get("startDate")).toBe("2026-11-01");
      expect(params.get("endDate")).toBe("2026-11-30");
    });

    // Closing and opening it again does not ask again.
    fireEvent.click(detailsButton());
    await waitFor(() => expect(lines()).toEqual([]));
    fireEvent.click(detailsButton());
    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(outflowRequests(requests)).toHaveLength(2);
  });

  it("shows the salaries as a line of their own, as money out", async () => {
    stubFetch(backend({ totalSalaries: 30_000, netProfit: 420_000 }));
    renderPage();
    await within(netProfitCard()).findByText(money(420_000));
    fireEvent.click(detailsButton());

    await waitFor(() => expect(lines()).toHaveLength(5));
    expect(lines()[4]).toBe(`Salaries: ${money(-30_000)} UZS`);
    expect(lines().some((l) => l.startsWith("Other"))).toBe(false);
  });

  it("shows what no method explains as 'Other', so the lines add up to the figure above", async () => {
    stubFetch(backend({ netProfit: 460_000 }));
    renderPage();
    await within(netProfitCard()).findByText(money(460_000));
    fireEvent.click(detailsButton());

    await waitFor(() => expect(lines()).toHaveLength(5));
    expect(lines()[4]).toBe(`Other: ${money(10_000)} UZS`);
  });

  it("says so, and can try again, when the expenses cannot be read", async () => {
    let broken = true;
    stubFetch(backend({}, () => (broken ? jsonResponse({ success: false, error: ["Boom"] }, { status: 500 }) : listOf([outflow("e1", 100_000, "m2", "Click"), outflow("e2", 50_000, "m3", "UZCARD")]))));
    renderPage();
    await open();

    expect(await within(netProfitCard()).findByText("Could not load the details.")).toBeTruthy();
    expect(lines()).toEqual([]);

    broken = false;
    fireEvent.click(within(netProfitCard()).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(lines()).toHaveLength(4));
    expect(within(netProfitCard()).queryByText("Could not load the details.")).toBeNull();
  });

  it("is not offered where there is no net profit to explain (a partial month)", async () => {
    const { requests } = stubFetch(backend());
    renderPage("/finance/payments?startDate=2026-11-01&endDate=2026-11-03");
    await within(revenueCard()).findByText(money(650_000));

    expect(within(netProfitCard()).getByText("—")).toBeTruthy();
    expect(within(netProfitCard()).queryByRole("button", { name: "Details" })).toBeNull();
    expect(outflowRequests(requests)).toEqual([]);
  });
});
