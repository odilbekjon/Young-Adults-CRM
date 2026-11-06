import { fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../i18n/locales/en/translation.json";
import { renderWithStore } from "../../test/renderWithStore";
import { SidebarProvider } from "../../Context/SidebarContext";
import { Sidebar } from "./Sidebar";

// What the signed-in staff member may see (the rail is filtered by /auth/sidebar labels).
let auth = { isTeacher: false, sidebarAllAccess: true, sidebarLabels: [] as string[], isPermissionsReady: true };
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => auth }));

// A wide screen: the submenu of a rail entry opens as a panel beside the rail.
beforeEach(() => {
  auth = { isTeacher: false, sidebarAllAccess: true, sidebarLabels: [], isPermissionsReady: true };
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderSidebar = (path = "/dashboard") =>
  renderWithStore(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );

// The desktop rail (the phone drawer is a second copy of the same entries).
const rail = () => document.getElementById("main-sidebar") as HTMLElement;
const linkTo = (href: string) => rail().querySelector(`a[href="${href}"]`);
const railEntry = (label: string) => within(rail()).getByText(label);

describe("Sidebar: Finance", () => {
  it("opens All payments directly - the rail entry is a plain link to /finance/all-payments", () => {
    renderSidebar();

    expect(linkTo("/finance/all-payments")).not.toBeNull();
    expect(linkTo("/finance")).toBeNull();
    expect(within(linkTo("/finance/all-payments") as HTMLElement).getByText("Finance")).toBeTruthy();
  });

  it("opens no submenu panel beside the rail, and the hidden Finance pages are not offered anywhere", () => {
    renderSidebar();

    // A rail entry that still has a submenu opens one (the control)...
    fireEvent.click(railEntry("Reports"));
    expect(screen.getByText(en.sidebar.reports.leads)).toBeTruthy();

    // ...Finance does not: the Reports panel closes and nothing replaces it.
    fireEvent.click(railEntry("Finance"));
    expect(screen.queryByText(en.sidebar.reports.leads)).toBeNull();
    for (const hidden of [en.sidebar.finance.withdraw, en.sidebar.finance.totalExpenses, en.sidebar.finance.salaries, en.sidebar.finance.debtors]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
    for (const hidden of ["/finance/withdraw", "/finance/total-expenses", "/finance/salaries", "/finance/debtors"]) {
      expect(document.querySelector(`a[href="${hidden}"]`)).toBeNull();
    }
  });

  it("stays lit on the Debtors page, which belongs to Finance but has no entry of its own", () => {
    renderSidebar("/finance/debtors");

    // The lit entry's label is bold; every other one is regular.
    expect(railEntry("Finance").style.fontWeight).toBe("600");
    expect(railEntry("Reports").style.fontWeight).toBe("400");
    expect(linkTo("/finance/debtors")).toBeNull();
    expect(screen.queryByText(en.sidebar.finance.debtors)).toBeNull();
  });

  it("is not lit away from Finance", () => {
    renderSidebar("/dashboard");

    expect(railEntry("Finance").style.fontWeight).toBe("400");
  });

  it("starts with no panel open when the page itself is under /finance", () => {
    renderSidebar("/finance/all-payments");

    for (const hidden of [en.sidebar.finance.allPayments, en.sidebar.finance.withdraw, en.sidebar.finance.debtors]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
    expect(linkTo("/finance/all-payments")).not.toBeNull();
  });

  it("is offered to whoever holds PAYMENTS or FINANCE, and to no one who holds only EXPENSES or SALARIES", () => {
    auth = { ...auth, sidebarAllAccess: false, sidebarLabels: ["PAYMENTS"] };
    const first = renderSidebar();
    expect(linkTo("/finance/all-payments")).not.toBeNull();
    first.unmount();

    auth = { ...auth, sidebarLabels: ["FINANCE"] };
    const second = renderSidebar();
    expect(linkTo("/finance/all-payments")).not.toBeNull();
    second.unmount();

    auth = { ...auth, sidebarLabels: ["EXPENSES", "SALARIES"] };
    renderSidebar();
    expect(linkTo("/finance/all-payments")).toBeNull();
  });
});

describe("Sidebar: Attendance reports", () => {
  it("has no Attendance reports entry", () => {
    renderSidebar();

    expect(linkTo("/attendance-reports")).toBeNull();
    expect(within(rail()).queryByText("Attendance reports")).toBeNull();
  });

  it("keeps the other entries", () => {
    renderSidebar();

    for (const path of ["/dashboard", "/leads", "/teachers", "/groups", "/students", "/finance/all-payments"]) {
      expect(linkTo(path)).not.toBeNull();
    }
    expect(within(rail()).getByText("Reports")).toBeTruthy();
    expect(within(rail()).getByText("Settings")).toBeTruthy();
  });
});
