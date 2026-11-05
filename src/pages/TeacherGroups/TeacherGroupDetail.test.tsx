import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { TeacherGroupDetail } from "./TeacherGroupDetail";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Teacher One" }, isTeacher: true }),
}));

const GREEN = "rgb(67, 160, 71)"; // #43a047
const RED = "rgb(229, 57, 53)"; // #e53935

const group = { id: "g1", name: "G-1", courseName: "English", status: "ACTIVE", trainingEnd: "2099-12-31" };

// Three members as GET /teacher-portal/groups/g1/students could return them: one
// whose row says they owe (with the amount — which must never be shown), one who
// does not, and one whose row says nothing about money.
const roster = [
  {
    id: "s1", name: "Debtor Dilnoza", phone: "+998901112233", studentGroupStatus: "ACTIVE",
    balance: -150000, joinedAt: "2026-09-10T00:00:00.000Z", paymentStartDate: "2026-09-05",
  },
  {
    id: "s2", name: "Settled Farhod", phone: "+998902223344", studentGroupStatus: "ACTIVE",
    balance: 25000, joinedAt: "2026-09-11T00:00:00.000Z", paymentStartDate: "2026-09-06",
  },
  { id: "s3", name: "Unknown Umid", phone: "+998903334455", studentGroupStatus: "ACTIVE" },
];

const answer = (request: SentRequest, members: unknown[]) => {
  const path = new URL(request.url).pathname;
  if (path.endsWith("/teacher-portal/groups/g1/students")) return jsonResponse({ data: members });
  if (path.endsWith("/teacher-portal/groups/g1")) return jsonResponse({ data: group });
  if (path.endsWith("/teacher-portal/groups")) return jsonResponse({ data: [group] });
  if (path.endsWith("/teacher-portal/schedule")) return jsonResponse({ data: [] });
  // The Attendance tab's own requests.
  if (request.url.includes("/dates?")) return jsonResponse({ data: [] });
  return jsonResponse({ data: { table: [] } });
};

const renderPage = async (members: unknown[] = roster) => {
  const stub = stubFetch((request) => answer(request, members));
  renderWithStore(
    <ToastProvider>
      <MemoryRouter initialEntries={["/groups/g1"]}>
        <Routes>
          <Route path="/groups/:id" element={<TeacherGroupDetail />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
  await screen.findAllByText("Debtor Dilnoza");
  return stub;
};

// The roster entry (a list item) of a student, from the left panel.
const rosterItem = (name: string) => screen.getAllByText(name).map((el) => el.closest("li")).find(Boolean) as HTMLElement;

// The 8px status dot of a roster entry or attendance row.
const dotOf = (scope: HTMLElement) => {
  const dot = Array.from(scope.querySelectorAll<HTMLElement>("div")).find((el) => getComputedStyle(el).width === "8px");
  return dot ? getComputedStyle(dot).backgroundColor : undefined;
};

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

describe("TeacherGroupDetail roster (TEACHER session)", () => {
  it("shows a red dot for a student in debt and a green one for a student who is fine", async () => {
    await renderPage();

    expect(dotOf(rosterItem("Debtor Dilnoza"))).toBe(RED);
    expect(dotOf(rosterItem("Settled Farhod"))).toBe(GREEN);
  });

  it("keeps the green dot for a student whose row does not say anything about money", async () => {
    await renderPage();

    expect(dotOf(rosterItem("Unknown Umid"))).toBe(GREEN);
  });

  it("reads a DEBTOR status on the row as a debt", async () => {
    await renderPage([{ id: "s9", name: "Debtor Dilnoza", phone: "+998901112233", studentStatus: "DEBTOR", studentGroupStatus: "ACTIVE" }]);

    expect(dotOf(rosterItem("Debtor Dilnoza"))).toBe(RED);
  });

  it("marks the debtor red in the Attendance tab too", async () => {
    await renderPage();

    const attendanceRowOf = (name: string) =>
      screen.getAllByText(name).map((el) => el.closest("tr")).find(Boolean) as HTMLElement | undefined;
    await waitFor(() => expect(attendanceRowOf("Debtor Dilnoza")).toBeTruthy());
    expect(dotOf(attendanceRowOf("Debtor Dilnoza")!)).toBe(RED);
    expect(dotOf(attendanceRowOf("Settled Farhod")!)).toBe(GREEN);
  });

  it("opens a card on hover with the debtor status, phone, join date and active date", async () => {
    await renderPage();

    fireEvent.mouseEnter(rosterItem("Debtor Dilnoza"));
    const card = within(await screen.findByRole("tooltip"));

    expect(card.getByText("Debtor")).toBeTruthy();
    expect(card.getByText("(90) 111-22-33")).toBeTruthy();
    expect(card.getByText("10.09.2026")).toBeTruthy();
    expect(card.getByText("05.09.2026")).toBeTruthy();
  });

  it("says 'No debt' for a student who is fine, and shows a dash where the row has no dates", async () => {
    await renderPage();

    fireEvent.focus(rosterItem("Unknown Umid"));
    const unknown = within(await screen.findByRole("tooltip"));
    // balance status unknown, joined and active date missing
    expect(unknown.getAllByText("—")).toHaveLength(3);
    fireEvent.blur(rosterItem("Unknown Umid"));

    fireEvent.focus(rosterItem("Settled Farhod"));
    expect(within(await screen.findByRole("tooltip")).getByText("No debt")).toBeTruthy();
  });

  it("never reveals a balance amount anywhere in the page, and offers no way to the student profile", async () => {
    await renderPage();

    fireEvent.focus(rosterItem("Debtor Dilnoza"));
    await screen.findByRole("tooltip");
    fireEvent.focus(rosterItem("Settled Farhod"));

    const everything = document.body.innerHTML;
    expect(everything).not.toMatch(/150\p{Z}?[,.]?000/u);
    expect(everything).not.toMatch(/25\p{Z}?[,.]?000/u);
    expect(everything).not.toMatch(/UZS/);
    expect(everything).not.toMatch(/(title|aria-[a-z]+)="[^"]*\d{5,}[^"]*"/);
    expect(document.querySelector('a[href*="/students/"]')).toBeNull();
    expect(screen.queryByText(/profile/i)).toBeNull();
  });

  it("keeps a frozen student in the roster panel but out of the Attendance grid", async () => {
    await renderPage([
      ...roster.slice(0, 2),
      { id: "s4", name: "Frozen Farida", phone: "+998904445566", studentGroupStatus: "FROZEN" },
    ]);

    // the left panel still names the frozen member...
    expect(rosterItem("Frozen Farida")).toBeTruthy();
    // ...but the roll call lists only the others
    await waitFor(() => expect(document.querySelectorAll("tbody tr")).toHaveLength(2));
    const inGrid = (name: string) => screen.getAllByText(name).some((el) => el.closest("tr"));
    expect(inGrid("Debtor Dilnoza")).toBe(true);
    expect(inGrid("Settled Farhod")).toBe(true);
    expect(inGrid("Frozen Farida")).toBe(false);
  });

  it("asks nothing from the staff endpoints (students, finance, student-groups)", async () => {
    const { requests } = await renderPage();
    fireEvent.mouseEnter(rosterItem("Debtor Dilnoza"));
    await screen.findByRole("tooltip");
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    const staffCalls = requests.filter((r) => {
      const path = new URL(r.url).pathname;
      return !path.includes("/teacher-portal/") && /\/(students|finance|student-groups)(\/|$)/.test(path);
    });
    expect(staffCalls).toEqual([]);
  });
});
