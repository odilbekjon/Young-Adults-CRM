import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../test/renderWithStore";
import { SalaryRoute } from "./RoleDashboardRoute";

let isTeacher = false;
vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ isTeacher }) }));
vi.mock("../layouts/layout", () => ({ Layout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../pages/Dashboard", () => ({ Dashboard: () => <div>ADMIN DASHBOARD</div> }));

describe("SalaryRoute", () => {
  it("sends a staff session to the Dashboard: Finance > Salaries is hidden for now", async () => {
    isTeacher = false;
    renderWithStore(
      <MemoryRouter initialEntries={["/salary"]}>
        <Routes>
          <Route path="/salary" element={<SalaryRoute />} />
          <Route path="/dashboard" element={<div>LANDED ON DASHBOARD</div>} />
          <Route path="/finance/salaries" element={<div>LANDED ON SALARIES</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("LANDED ON DASHBOARD")).toBeTruthy();
    expect(screen.queryByText("LANDED ON SALARIES")).toBeNull();
  });
});
