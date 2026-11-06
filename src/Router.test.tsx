import { screen } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "./test/renderWithStore";
import { AppRouter } from "./Router";

// The guards and the shell are replaced by pass-throughs (the permission guard also
// prints the labels it was given), and the pages by a line of text, so what is
// under test is the route table itself: which paths exist and what they open.
vi.mock("./routes/ProtectedRoute", () => ({ ProtectedRoute: () => <Outlet /> }));
vi.mock("./routes/PublicRoute", () => ({ PublicRoute: () => <Outlet /> }));
vi.mock("./routes/StudentRoute", () => ({ StudentRoute: () => <Outlet /> }));
vi.mock("./routes/PermissionRoute", () => ({
  PermissionRoute: ({ label }: { label: string | string[] }) => (
    <div data-testid="permission" data-labels={JSON.stringify(label)}><Outlet /></div>
  ),
}));
vi.mock("./routes/RoleGroupsRoute", () => ({ GroupsRoute: () => <div>GROUPS</div>, GroupDetailRoute: () => <div>GROUP</div> }));
vi.mock("./routes/RoleDashboardRoute", () => ({ DashboardRoute: () => <div>DASHBOARD</div>, SalaryRoute: () => <div>SALARY</div> }));
vi.mock("./layouts/layout", () => ({ Layout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./layouts/StudentPortalLayout/StudentPortalLayout", () => ({ StudentPortalLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./pages/Login/Login", () => ({ default: () => <div>LOGIN</div> }));
vi.mock("./pages/NotFound", () => ({ NotFound: () => <div>NOT FOUND</div> }));
vi.mock("./pages/Finance/pages/AllPayments", () => ({ AllPayments: () => <div>ALL PAYMENTS PAGE</div> }));
vi.mock("./pages/Reports/Reports", () => ({ Reports: () => <Outlet /> }));
vi.mock("./pages/Reports/pages/AttendenceReports", () => ({ AttendanceReports: () => <div>REPORTS ATTENDANCE PAGE</div> }));
vi.mock("./pages/TeacherAddanceReport", () => ({ TeacherAttendanceReport: () => <div>TEACHER ATTENDANCE REPORT</div> }));

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;

const open = (path: string) =>
  renderWithStore(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
      <Where />
    </MemoryRouter>,
  );

describe("Router: Finance", () => {
  it("opens All payments at /finance/all-payments", async () => {
    open("/finance/all-payments");

    expect(await screen.findByText("ALL PAYMENTS PAGE")).toBeTruthy();
  });

  it("sends /finance itself to All payments", async () => {
    open("/finance");

    expect(await screen.findByText("ALL PAYMENTS PAGE")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/finance/all-payments");
  });

  it.each(["/finance/withdraw", "/finance/total-expenses", "/finance/salaries", "/finance/debtors"])(
    "no longer has %s",
    async (path) => {
      open(path);

      expect(await screen.findByText("NOT FOUND")).toBeTruthy();
      expect(screen.queryByText("ALL PAYMENTS PAGE")).toBeNull();
    },
  );

  it("is entered with FINANCE or PAYMENTS", async () => {
    open("/finance/all-payments");
    await screen.findByText("ALL PAYMENTS PAGE");

    expect(JSON.parse(screen.getByTestId("permission").getAttribute("data-labels") as string)).toEqual(["FINANCE", "PAYMENTS"]);
  });
});

describe("Router: Attendance reports", () => {
  it("no longer has /attendance-reports", async () => {
    open("/attendance-reports");

    expect(await screen.findByText("NOT FOUND")).toBeTruthy();
  });

  it("keeps the Reports > Attendance page and the teacher attendance report", async () => {
    const first = open("/reports/attendance");
    expect(await screen.findByText("REPORTS ATTENDANCE PAGE")).toBeTruthy();
    first.unmount();

    open("/teacher-attendance-reports");
    expect(await screen.findByText("TEACHER ATTENDANCE REPORT")).toBeTruthy();
  });
});
