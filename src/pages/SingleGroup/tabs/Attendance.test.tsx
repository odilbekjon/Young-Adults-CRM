import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch, type FetchHandler, type SentRequest } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { baseApi } from "../../../app/api/baseApi";
import { store } from "../../../app/store";
import { ToastProvider } from "../../../Context/ToastContext";
import { Attendance } from "./Attendance";

const FUTURE = "Cannot mark attendance for a future date";

// The suite runs in Asia/Tashkent, so these are local moments. Only Date is
// faked: fetch, promises and the cells' hover timers behave normally.
const setNow = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  vi.setSystemTime(new Date(year, month - 1, day, hour, minute));

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(2026, 11, 3);
});

const students = [{ id: 1, realId: "s1", name: "Ali Valiyev", phone: "", active: true }];

// November 2026: lessons on the 2nd (past), 3rd (today), 4th and 5th (future).
// Any other month has no schedule, so the grid falls back to every calendar day.
const november: FetchHandler = (request) => {
  if (request.url.includes("/dates?month=2026-11")) {
    return jsonResponse({ data: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"] });
  }
  if (request.url.includes("/dates?")) return jsonResponse({ data: [] });
  return jsonResponse({ data: { table: [] } });
};

const posts = (requests: SentRequest[]) => requests.filter((r) => r.method === "POST");
const isEditable = (cell: Element) => cell.classList.contains("editable");

// The header's arrows, in order: Current, previous year, previous month, next
// month, next year (then the Excel export).
const NEXT_MONTH = 3;
const NEXT_YEAR = 4;
const press = (index: number) => fireEvent.click(screen.getAllByRole("button")[index]);

const renderGrid = async (handler: FetchHandler, cellCount: number, restrictToToday = false) => {
  const stub = stubFetch(handler);
  renderWithStore(
    <ToastProvider>
      <Attendance groupId="g1" students={students} restrictToToday={restrictToToday} />
    </ToastProvider>,
  );
  const row = (await screen.findByText("Ali Valiyev")).closest("tr") as HTMLElement;
  // The grid first shows every calendar day, until the lesson dates arrive.
  await waitFor(() => expect(row.querySelectorAll(".att-cell")).toHaveLength(cellCount));
  const cellsOf = () => Array.from(row.querySelectorAll<HTMLElement>(".att-cell"));
  return { ...stub, row, cellsOf, cells: cellsOf() };
};

describe("Attendance grid: a day that has not come yet is locked", () => {
  it("locks the future lesson days for staff, and keeps the past and today open", async () => {
    const { cells } = await renderGrid(november, 4);
    const [yesterday, today, tomorrow, dayAfter] = cells;

    expect(isEditable(yesterday)).toBe(true);
    expect(isEditable(today)).toBe(true);
    for (const cell of [tomorrow, dayAfter]) {
      expect(isEditable(cell)).toBe(false);
      expect(cell.getAttribute("aria-disabled")).toBe("true");
      expect(cell.getAttribute("title")).toBe(FUTURE);
      expect(cell.querySelector(".cell-value")?.classList.contains("future")).toBe(true);
    }
    expect(today.hasAttribute("aria-disabled")).toBe(false);
    expect(yesterday.hasAttribute("title")).toBe(false);
  });

  it("shows no was/not buttons on a future day, however long the pointer stays on it", async () => {
    const { cells, requests } = await renderGrid(november, 4);

    fireEvent.mouseEnter(cells[2]);
    fireEvent.mouseEnter(cells[3]);
    fireEvent.click(cells[2]);
    fireEvent.keyDown(cells[2], { key: "Enter" });

    expect(within(cells[2]).queryByRole("button")).toBeNull();
    expect(within(cells[3]).queryByRole("button")).toBeNull();
    expect(posts(requests)).toHaveLength(0);
  });

  it("still marks today", async () => {
    const { cells, requests } = await renderGrid(november, 4);

    fireEvent.mouseEnter(cells[1]);
    fireEvent.click(await within(cells[1]).findByRole("button", { name: "Was" }));

    await waitFor(() => expect(posts(requests)).toHaveLength(1));
    expect(JSON.parse(posts(requests)[0].body)).toEqual({
      records: [{ studentId: "s1", groupId: "g1", date: "2026-11-03", status: "PRESENT" }],
    });
  });

  it("does not change who may mark the past", async () => {
    const { cells, requests } = await renderGrid(november, 4);

    fireEvent.mouseEnter(cells[0]);
    fireEvent.click(await within(cells[0]).findByRole("button", { name: "Not" }));

    await waitFor(() => expect(posts(requests)).toHaveLength(1));
    expect(JSON.parse(posts(requests)[0].body).records[0]).toMatchObject({ date: "2026-11-02", status: "ABSENT" });
  });

  it("locks the future days for a teacher too, and opens only today", async () => {
    const { cells } = await renderGrid(november, 4, true);

    expect(isEditable(cells[0])).toBe(false); // past: a teacher never marks it
    expect(isEditable(cells[1])).toBe(true);
    expect(isEditable(cells[2])).toBe(false);
    expect(isEditable(cells[3])).toBe(false);
    expect(cells[2].getAttribute("title")).toBe(FUTURE);
    expect(cells[0].hasAttribute("title")).toBe(false);
  });

  it("locks every day of the next month, and says so", async () => {
    const { cellsOf } = await renderGrid(november, 4);

    press(NEXT_MONTH);
    await screen.findByText(/This month has not started yet/);
    await waitFor(() => expect(cellsOf()).toHaveLength(31)); // December

    expect(cellsOf().some(isEditable)).toBe(false);
    expect(cellsOf().every((cell) => cell.getAttribute("title") === FUTURE)).toBe(true);
  });

  it("locks every day of the same month next year", async () => {
    const { cellsOf } = await renderGrid(november, 4);

    press(NEXT_YEAR);
    await screen.findByText(/This month has not started yet/);
    await waitFor(() => expect(cellsOf()).toHaveLength(30)); // November 2027

    expect(cellsOf().some(isEditable)).toBe(false);
  });

  it("follows the local calendar day just after midnight, when UTC is still the day before", async () => {
    // 00:30 on 4 November local time is 19:30 on 3 November UTC.
    setNow(2026, 11, 4, 0, 30);
    const { cells } = await renderGrid(november, 4);

    expect(isEditable(cells[1])).toBe(true); // the 3rd is now the past
    expect(isEditable(cells[2])).toBe(true); // the 4th is today
    expect(isEditable(cells[3])).toBe(false); // the 5th is tomorrow
  });

  it("opens the last day of the month, and keeps the whole next month locked", async () => {
    setNow(2026, 11, 30, 23, 45);
    const { cells, cellsOf } = await renderGrid((request) => {
      if (request.url.includes("/dates?month=2026-11")) return jsonResponse({ data: ["2026-11-29", "2026-11-30"] });
      return november(request);
    }, 2);

    expect(isEditable(cells[0])).toBe(true);
    expect(isEditable(cells[1])).toBe(true); // 30 November: today

    press(NEXT_MONTH);
    await screen.findByText(/This month has not started yet/);
    await waitFor(() => expect(cellsOf()).toHaveLength(31)); // December
    expect(cellsOf().some(isEditable)).toBe(false);
  });
});

describe("Attendance grid: a frozen member is not in the roll call", () => {
  type Member = (typeof students)[number] & { groupStatus?: "ACTIVE" | "PROBATION" | "FROZEN" };
  const member = (id: number, name: string, groupStatus?: Member["groupStatus"]): Member => ({
    id, realId: `s${id}`, name, phone: "", active: true, ...(groupStatus && { groupStatus }),
  });
  const roster = [
    member(1, "Active Ali", "ACTIVE"),
    member(2, "Frozen Vali", "FROZEN"),
    member(3, "Trial Sami", "PROBATION"),
    member(4, "Unknown Anvar"),
  ];

  // The students' rows (the header row is in <thead>).
  const rowCount = () => document.querySelectorAll("tbody tr").length;

  const renderRoster = async (members: Member[], restrictToToday = false) => {
    stubFetch(november);
    const view = renderWithStore(
      <ToastProvider>
        <Attendance groupId="g1" students={members} restrictToToday={restrictToToday} />
      </ToastProvider>,
    );
    await screen.findByText("Active Ali");
    return view;
  };

  it("lists everyone but the frozen member, on the staff page", async () => {
    await renderRoster(roster);

    expect(screen.queryByText("Frozen Vali")).toBeNull();
    for (const name of ["Active Ali", "Trial Sami", "Unknown Anvar"]) expect(screen.getByText(name)).toBeTruthy();
    expect(rowCount()).toBe(3);
  });

  it("does the same on the teacher page, where only today can be marked", async () => {
    await renderRoster(roster, true);

    expect(screen.queryByText("Frozen Vali")).toBeNull();
    expect(screen.getByText("Trial Sami")).toBeTruthy();
    expect(rowCount()).toBe(3);
  });

  it("draws no cells for the frozen member, so nothing can be marked for them", async () => {
    await renderRoster(roster);

    // three listed members x the four lesson days of November
    await waitFor(() => expect(document.querySelectorAll("tbody .att-cell")).toHaveLength(3 * 4));
  });

  it("brings the member back once they are unfrozen", async () => {
    const { rerender } = await renderRoster(roster);
    expect(screen.queryByText("Frozen Vali")).toBeNull();

    rerender(
      <ToastProvider>
        <Attendance groupId="g1" students={roster.map((m) => (m.groupStatus === "FROZEN" ? { ...m, groupStatus: "ACTIVE" as const } : m))} />
      </ToastProvider>,
    );

    expect(await screen.findByText("Frozen Vali")).toBeTruthy();
    expect(rowCount()).toBe(4);
  });

  it("shows an empty grid, not an error, when every member is frozen", async () => {
    stubFetch(november);
    renderWithStore(
      <ToastProvider>
        <Attendance groupId="g1" students={[member(1, "Only Frozen", "FROZEN")]} />
      </ToastProvider>,
    );
    await screen.findByText("Attendance");

    expect(screen.queryByText("Only Frozen")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(rowCount()).toBe(0);
  });
});

// The attendance answer lists each student's own freezes (`freezeRanges`), which say
// when they were frozen - the roster's current status cannot.
describe("Attendance grid: freezes listed by the attendance answer", () => {
  type Status = "ACTIVE" | "FROZEN";
  const member = (id: number, name: string, groupStatus: Status = "ACTIVE") => ({
    id, realId: `s${id}`, name, phone: "", active: true, groupStatus,
  });
  // A freeze as GET /attendances/group/{id} writes it.
  const freeze = (from: string, to: string | null, status: "ACTIVE" | "EXPIRED") => ({
    id: `f-${from}`, startDate: `${from}T00:00:00+05:00`, endDate: to ? `${to}T23:59:59+05:00` : null, reason: null, status,
  });
  const row = (studentId: string, freezeRanges?: unknown[]) => ({
    studentId, studentName: studentId, photo: null, ...(freezeRanges && { freezeRanges }), attendances: [],
  });

  const answering = (table: unknown[]): FetchHandler => (request) => {
    if (request.url.includes("/dates?")) return jsonResponse({ data: [] });
    return jsonResponse({ data: { dates: [], table } });
  };

  const rowCount = () => document.querySelectorAll("tbody tr").length;
  const PREV_MONTH = 2;

  // Renders the grid and waits until the attendance answer has been asked for and
  // taken in, so what is asserted next is the grid with the freezes applied.
  const renderWith = async (table: unknown[], members: ReturnType<typeof member>[], firstRow: string) => {
    const { requests } = stubFetch(answering(table));
    renderWithStore(
      <ToastProvider>
        <Attendance groupId="g1" students={members} />
      </ToastProvider>,
    );
    await screen.findByText(firstRow);
    await waitFor(() => expect(requests.some((r) => r.url.includes("/attendances/group/g1?month="))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  it("leaves out a student whose freeze is in force today, whatever the roster says", async () => {
    await renderWith(
      [row("s1", []), row("s2", [freeze("2026-10-20", null, "ACTIVE")])],
      [member(1, "Active Ali"), member(2, "Frozen Vali")],
      "Active Ali",
    );

    expect(screen.queryByText("Frozen Vali")).toBeNull();
    expect(rowCount()).toBe(1);
  });

  it("keeps a student whose freeze has ended (EXPIRED)", async () => {
    // the freeze of Qayumova Dilnura in the Swagger response: one day in September
    await renderWith(
      [row("s1", [freeze("2026-09-01", "2026-09-01", "EXPIRED")])],
      [member(1, "Qayumova Dilnura")],
      "Qayumova Dilnura",
    );

    expect(rowCount()).toBe(1);
  });

  it("keeps a student whose freeze was lifted today, although its end date is today", async () => {
    await renderWith(
      [row("s1", [freeze("2026-10-20", "2026-11-03", "EXPIRED")])],
      [member(1, "Back Bobur")],
      "Back Bobur",
    );

    expect(rowCount()).toBe(1);
  });

  it("keeps the roster's FROZEN status in force for the current month, even when the freezes say nothing", async () => {
    await renderWith(
      [row("s1", []), row("s2", [])],
      [member(1, "Active Ali"), member(2, "Frozen Vali", "FROZEN")],
      "Active Ali",
    );

    await waitFor(() => expect(screen.queryByText("Frozen Vali")).toBeNull());
  });

  it("relies on the roster's status alone for a student the answer lists no freezes for", async () => {
    await renderWith(
      [row("s1")],
      [member(1, "Active Ali"), member(2, "Frozen Vali", "FROZEN")],
      "Active Ali",
    );

    await waitFor(() => expect(screen.queryByText("Frozen Vali")).toBeNull());
    expect(rowCount()).toBe(1);
  });

  it("shows last month's grid with a student who was not frozen yet then", async () => {
    // frozen since 2 November and still frozen: out of November's grid, but in October's
    const { requests } = stubFetch(answering([row("s1", [freeze("2026-11-02", null, "ACTIVE")])]));
    renderWithStore(
      <ToastProvider>
        <Attendance groupId="g1" students={[member(1, "Frozen Vali", "FROZEN")]} />
      </ToastProvider>,
    );
    await screen.findByText("Attendance");
    await waitFor(() => expect(requests.some((r) => r.url.includes("/attendances/group/g1?month=2026-11"))).toBe(true));
    expect(screen.queryByText("Frozen Vali")).toBeNull();

    press(PREV_MONTH);

    expect(await screen.findByText("Frozen Vali")).toBeTruthy();
    expect(rowCount()).toBe(1);
  });

  it("leaves out of a past month a student who was still frozen on its last day, and keeps one whose freeze ended before", async () => {
    await renderWith(
      [
        row("s1", [freeze("2026-09-15", "2026-10-31", "EXPIRED")]),
        row("s2", [freeze("2026-09-15", "2026-10-20", "EXPIRED")]),
      ],
      [member(1, "Frozen Vali"), member(2, "Other Sami")],
      "Frozen Vali",
    );
    // today (3 November) both freezes are over
    expect(rowCount()).toBe(2);

    press(PREV_MONTH);

    await waitFor(() => expect(rowCount()).toBe(1));
    expect(screen.getByText("Other Sami")).toBeTruthy();
    expect(screen.queryByText("Frozen Vali")).toBeNull();
  });
});
