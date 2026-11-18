import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/renderWithStore";
import { ServerPaymentWarning } from "./ServerPaymentWarning";

let auth: { user: Record<string, unknown> | null; isCeo: boolean };
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => auth }));

const WARNING = { isWarning: true, daysLeft: 3, nextPaymentDate: "2026-11-20" };

beforeEach(() => {
  localStorage.clear();
  // Only the date is faked, so Testing Library's own timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0));
  auth = { user: { ...WARNING }, isCeo: true };
});

describe("ServerPaymentWarning", () => {
  it("shows the days left and the payment date when the backend says to warn", () => {
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.getByText("Server payment is coming up")).toBeTruthy();
    expect(screen.getByText("3 day(s) left until the payment")).toBeTruthy();
    expect(screen.getByText(/Payment date: 20\.11\.2026/)).toBeTruthy();
  });

  it("reads the grouped serverPaymentInfo object too", () => {
    auth = { user: { serverPaymentInfo: { ...WARNING, daysLeft: 1 } }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.getByText("1 day(s) left until the payment")).toBeTruthy();
  });

  it("says it is due today on the payment day", () => {
    auth = { user: { ...WARNING, daysLeft: 0 }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.getByText("The server payment is due today!")).toBeTruthy();
  });

  it("shows nothing while the backend does not warn (isWarning: false)", () => {
    auth = { user: { ...WARNING, isWarning: false, daysLeft: 12 }, isCeo: true };
    renderWithStore(<ServerPaymentWarning />);

    expect(screen.queryByText("Server payment is coming up")).toBeNull();
  });

  it("shows nothing for an account without the reminder keys, or one that is not a CEO", () => {
    auth = { user: { id: "u1" }, isCeo: true };
    const { unmount } = renderWithStore(<ServerPaymentWarning />);
    expect(screen.queryByText("Server payment is coming up")).toBeNull();
    unmount();

    auth = { user: { ...WARNING }, isCeo: false };
    renderWithStore(<ServerPaymentWarning />);
    expect(screen.queryByText("Server payment is coming up")).toBeNull();
  });

  it("stays closed for the rest of the day once dismissed, and asks again the next day", () => {
    const { unmount } = renderWithStore(<ServerPaymentWarning />);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText("Server payment is coming up")).toBeNull();
    unmount();

    renderWithStore(<ServerPaymentWarning />);
    expect(screen.queryByText("Server payment is coming up")).toBeNull();
    // Both mounts above were today; a mount tomorrow asks again.
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
    renderWithStore(<ServerPaymentWarning />);
    expect(screen.getByText("Server payment is coming up")).toBeTruthy();
  });
});
