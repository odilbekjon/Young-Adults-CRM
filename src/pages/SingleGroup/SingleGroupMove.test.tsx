import { configure, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setToken } from "../../app/store/authSlice";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { SingleGroup } from "./SingleGroup";

// Moving a student to another group from the group page, end to end: the page's
// real queries and mutations over a stubbed backend.
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });

const pathOf = (request: SentRequest) => new URL(request.url).pathname.replace("/api/v1", "");

const member = (over: Record<string, unknown> = {}) => ({
  id: "s1", name: "Ali Valiyev", phone: "+998901112233", role: "STUDENT", photo: null,
  studentGroupStatus: "ACTIVE", studentGroupId: "sg1", joinedAt: "2026-10-01T00:00:00.000Z", paymentStartDate: "2026-10-01",
  ...over,
});

const membershipRow = (over: Record<string, unknown> = {}) => ({
  id: "sg1", studentId: "s1", studentName: "Ali Valiyev", groupId: "g1", groupName: "Old group", status: "ACTIVE",
  joinedAt: "2026-10-01", paymentStartDate: "2026-10-01", ...over,
});

interface Setup {
  student?: ReturnType<typeof member>;
  membership?: ReturnType<typeof membershipRow>;
  // What the backend made of the student in the NEW group (it creates it ACTIVE).
  newMembershipStatus?: string;
  transfer?: () => Response;
  statusPatch?: () => Response;
}

// A backend where g1 holds one student and g2 is the group to move them to.
const backend = ({
  student = member(), membership = membershipRow(), newMembershipStatus = "ACTIVE",
  transfer = () => jsonResponse({ success: true }), statusPatch = () => jsonResponse({ success: true }),
}: Setup = {}) => (request: SentRequest) => {
  const path = pathOf(request);
  if (path === "/groups/g1") {
    return jsonResponse({
      success: true,
      data: {
        id: "g1", name: "Old group", status: "ACTIVE", courseId: "c1", courseName: "IELTS", coursePrice: "500000",
        daysType: "ODD", time: "16:00", roomId: null, roomName: null, roomCapacity: null, trainingStart: null, trainingEnd: null,
        teachers: [], students: [student],
      },
    });
  }
  if (path === "/groups") {
    return jsonResponse({
      success: true,
      data: [{ id: "g2", name: "Evening IELTS", status: "ACTIVE", courseId: "c1", teachers: [], students: [] }],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
  }
  if (path === "/student-groups") {
    const groupId = new URL(request.url).searchParams.get("groupId");
    const rows = groupId === "g1" ? [membership]
      : groupId === "g2" ? [membershipRow({ id: "sg2", groupId: "g2", groupName: "Evening IELTS", status: newMembershipStatus, joinedAt: "2026-11-06", paymentStartDate: "2026-11-06" })]
      : [];
    return jsonResponse({ success: true, data: rows, meta: { total: rows.length, page: 1, limit: 500, totalPages: 1 } });
  }
  if (path === "/groups/g1/students/transfer") return transfer();
  if (path === "/student-groups/sg2/status") return statusPatch();
  if (path === "/student-groups/sg1/graduate-trial" || path === "/student-groups/sg1") return jsonResponse({ success: true });
  if (path === "/students") return jsonResponse({ success: true, data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 1 } });
  if (/^\/students\/[^/]+$/.test(path)) return jsonResponse({ success: true, data: { id: "s1", name: "Ali Valiyev", balance: -150000, status: "ACTIVE" } });
  return jsonResponse({ success: true, data: [] });
};

const renderPage = () =>
  renderWithStore(
    <MemoryRouter initialEntries={["/groups/g1"]}>
      <ToastProvider>
        <Routes>
          <Route path="/groups/:id" element={<SingleGroup />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

const transfers = (requests: SentRequest[]) => requests.filter((r) => r.method === "POST" && pathOf(r) === "/groups/g1/students/transfer");
const statusPatches = (requests: SentRequest[]) => requests.filter((r) => r.method === "PATCH" && pathOf(r) === "/student-groups/sg2/status");
// Opens the "..." menu of the student's roster row, then "Move student to group".
const openMoveDialog = async () => {
  // The name is in the roster (a list item) and in the attendance grid (a table row).
  const row = (await screen.findAllByText("Ali Valiyev")).map((el) => el.closest("li")).find(Boolean) as HTMLElement;
  fireEvent.click(within(row).getByRole("button"));
  fireEvent.click(await screen.findByText("Move student to group"));
  const reason = await screen.findByPlaceholderText("Reason for moving (required)");
  return reason.closest("div[style*='fixed']") as HTMLElement;
};
const fillAndMove = async (dialog: HTMLElement) => {
  // The groups load as the dialog opens.
  await waitFor(() => expect(within(dialog).getByRole("option", { name: "Evening IELTS" })).toBeTruthy());
  fireEvent.change(dialog.querySelector("select") as HTMLSelectElement, { target: { value: "g2" } });
  fireEvent.change(within(dialog).getByPlaceholderText("Reason for moving (required)"), { target: { value: "Level up" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Move" }));
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

// "Today" is 6 November 2026; only the clock is faked.
beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setToken("test-token"));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SingleGroup: moving a student to another group", () => {
  it("asks from which date, and ends payment in this group the day before it", async () => {
    const { requests } = stubFetch(backend());
    renderPage();
    const dialog = await openMoveDialog();

    expect(within(dialog).getByText("Date from")).toBeTruthy();
    expect(within(dialog).getByText("06.11.2026")).toBeTruthy();
    await fillAndMove(dialog);

    await waitFor(() => expect(transfers(requests)).toHaveLength(1));
    expect(JSON.parse(transfers(requests)[0].body)).toEqual({
      studentId: "s1", newGroupId: "g2", reason: "Level up", paymentEndDate: "2026-11-05",
    });
  });

  it("uses the date picked in the calendar", async () => {
    const { requests } = stubFetch(backend());
    renderPage();
    const dialog = await openMoveDialog();

    fireEvent.click(within(dialog).getByText("06.11.2026"));
    fireEvent.click((await screen.findAllByRole("button", { name: "2" }))[0]);
    await fillAndMove(dialog);

    await waitFor(() => expect(transfers(requests)).toHaveLength(1));
    expect(JSON.parse(transfers(requests)[0].body)).toMatchObject({ paymentEndDate: "2026-11-01" });
  });

  it("starts no payment in the new group: no paymentStartDate is sent, whatever the date", async () => {
    const { requests } = stubFetch(backend());
    renderPage();
    const dialog = await openMoveDialog();

    fireEvent.click(within(dialog).getByText("06.11.2026"));
    fireEvent.click((await screen.findAllByRole("button", { name: "2" }))[0]);
    await fillAndMove(dialog);

    await waitFor(() => expect(transfers(requests)).toHaveLength(1));
    const body = JSON.parse(transfers(requests)[0].body);
    expect("paymentStartDate" in body).toBe(false);
    expect("keepCustomPrice" in body).toBe(false);
  });

  it("puts the student on a trial lesson (PROBATION) in the new group right after the move: not billed until staff activate them", async () => {
    const { requests } = stubFetch(backend({ newMembershipStatus: "ACTIVE" }));
    renderPage();
    await fillAndMove(await openMoveDialog());

    await waitFor(() => expect(statusPatches(requests)).toHaveLength(1));
    expect(await readFormData(statusPatches(requests)[0])).toEqual([["status", "PROBATION"]]);
    // after the transfer, never before it
    expect(requests.indexOf(statusPatches(requests)[0])).toBeGreaterThan(requests.indexOf(transfers(requests)[0]));
  });

  it("leaves a membership that is already a trial lesson as it is", async () => {
    const { requests } = stubFetch(backend({ newMembershipStatus: "PROBATION" }));
    renderPage();
    await fillAndMove(await openMoveDialog());
    await waitFor(() => expect(transfers(requests)).toHaveLength(1));
    await settle();

    expect(statusPatches(requests)).toHaveLength(0);
  });

  it("says so when the trial lesson could not be set - the student was moved all the same", async () => {
    stubFetch(backend({ statusPatch: () => jsonResponse({ success: false, error: ["boom"], statusCode: 500 }, { status: 500 }) }));
    renderPage();
    await fillAndMove(await openMoveDialog());

    expect(await screen.findByText(/couldn't be set to trial lesson in the new group/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Ali Valiyev")).toBeNull());
  });

  it("takes the student off this group's roster once moved", async () => {
    stubFetch(backend());
    renderPage();
    await fillAndMove(await openMoveDialog());

    await waitFor(() => expect(screen.queryByText("Ali Valiyev")).toBeNull());
  });

  it("sends no end date for a student who joined today and is moved today: there is no day left to bill here", async () => {
    const joinedToday = member({ joinedAt: "2026-11-06T00:00:00.000Z", paymentStartDate: "2026-11-06" });
    const { requests } = stubFetch(backend({ student: joinedToday, membership: membershipRow({ joinedAt: "2026-11-06", paymentStartDate: "2026-11-06" }) }));
    renderPage();
    await fillAndMove(await openMoveDialog());

    await waitFor(() => expect(transfers(requests)).toHaveLength(1));
    expect(JSON.parse(transfers(requests)[0].body)).toEqual({ studentId: "s1", newGroupId: "g2", reason: "Level up" });
  });

  it("shows the backend's reason when the move is refused, keeps the student here and sets no trial lesson", async () => {
    const { requests } = stubFetch(backend({
      transfer: () => jsonResponse({ success: false, error: ["Payment end date must be after the start"], statusCode: 400 }, { status: 400 }),
    }));
    renderPage();
    await fillAndMove(await openMoveDialog());

    expect(await screen.findByText(/Failed to move student/)).toBeTruthy();
    await settle();
    expect(screen.getAllByText("Ali Valiyev").length).toBeGreaterThan(0);
    expect(statusPatches(requests)).toHaveLength(0);
  });
});

describe("SingleGroup: a student who arrived on a trial lesson is billed from the day staff activate them", () => {
  // Moved here on 30 October (a trial lesson since), activated a week later on 6 November.
  const arrived = member({ studentGroupStatus: "PROBATION", joinedAt: "2026-10-30T00:00:00.000Z", paymentStartDate: null });
  const arrivedRow = membershipRow({ status: "PROBATION", joinedAt: "2026-10-30", paymentStartDate: null });

  const openActivate = async () => {
    const row = (await screen.findAllByText("Ali Valiyev")).map((el) => el.closest("li")).find(Boolean) as HTMLElement;
    fireEvent.click(within(row).getByRole("button"));
    fireEvent.click(await screen.findByText("Activate"));
    return screen.findByText("Finish trial lesson");
  };

  it("offers today as the start - the days since the move are not billed - and sends it as the payment start date", async () => {
    const { requests } = stubFetch(backend({ student: arrived, membership: arrivedRow }));
    renderPage();
    await openActivate();

    // today (6 November), not the day they arrived (30 October)
    expect(screen.getByText("06.11.2026")).toBeTruthy();
    expect(screen.queryByText("30.10.2026")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));

    await waitFor(() => expect(requests.filter((r) => r.method === "PATCH" && pathOf(r) === "/student-groups/sg1")).toHaveLength(1));
    const graduate = requests.filter((r) => r.method === "POST" && pathOf(r) === "/student-groups/sg1/graduate-trial");
    expect(graduate).toHaveLength(1);
    const patch = requests.find((r) => r.method === "PATCH" && pathOf(r) === "/student-groups/sg1") as SentRequest;
    expect(await readFormData(patch)).toEqual([["paymentStartDate", "2026-11-06"]]);
  });
});
