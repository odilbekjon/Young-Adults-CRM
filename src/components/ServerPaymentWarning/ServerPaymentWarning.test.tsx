import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/renderWithStore";
import { ServerPaymentWarning } from "./ServerPaymentWarning";

let auth: { user: Record<string, unknown> | null; isCeo: boolean };
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => auth }));

const WARNING = { isWarning: true, daysLeft: 3, nextPaymentDate: "2026-11-20" };

beforeEach(() => {
  auth = { user: { ...WARNING }, isCeo: true };
});

describe("ServerPaymentWarning", () => {
  it("shows a notice with the days left and the payment date when the backend says to warn", () => {
    renderWithStore(<ServerPaymentWarning />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Attention!");
    expect(alert.textContent).toContain("3 day(s) left until the server payment (20.11.2026)");
  });

  it("is not dismissible: there is nothing to click away", () => {
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("reads the grouped serverPaymentInfo object too", () => {
    auth = { user: { serverPaymentInfo: { ...WARNING, daysLeft: 1 } }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.getByRole("alert").textContent).toContain("1 day(s) left");
  });

  it("says it is due today on the payment day", () => {
    auth = { user: { ...WARNING, daysLeft: 0 }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.getByRole("alert").textContent).toContain("The server payment is due today");
  });

  it("shows nothing while the backend does not warn (isWarning: false)", () => {
    auth = { user: { ...WARNING, isWarning: false, daysLeft: 12 }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows nothing for an account without the reminder keys, or one that is not a CEO", () => {
    auth = { user: { id: "u1" }, isCeo: true };
    const { unmount } = renderWithStore(<ServerPaymentWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
    unmount();

    auth = { user: { ...WARNING }, isCeo: false };
    renderWithStore(<ServerPaymentWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
