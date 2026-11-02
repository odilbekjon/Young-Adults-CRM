import type { ComponentProps } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "../../../app/store";
import { logout, setToken } from "../../../app/store/authSlice";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { StudentActionsMenu } from "./StudentActionsMenu";

type Props = ComponentProps<typeof StudentActionsMenu>;

const makeProps = (overrides: Partial<Props> = {}) => {
  const anchorEl = document.createElement("button");
  document.body.appendChild(anchorEl);
  return {
    anchorEl,
    onClose: vi.fn(),
    isArchived: false,
    isFrozen: false,
    isTrial: false,
    onActivateArchived: vi.fn(),
    onBackToTrialLesson: vi.fn(),
    onGraduateTrial: vi.fn(),
    onActivate: vi.fn(),
    onMakeFrozen: vi.fn(),
    onAddPayment: vi.fn(),
    onAddNote: vi.fn(),
    onMoveGroup: vi.fn(),
    onRemove: vi.fn(),
    onReminders: vi.fn(),
    branches: [{ id: "b1", name: "Chilonzor" }, { id: "b2", name: "Yunusobod" }],
    isMovingBranch: false,
    onMoveToBranch: vi.fn().mockResolvedValue(true),
    ...overrides,
  } satisfies Props;
};

const renderMenu = (overrides: Partial<Props> = {}) => {
  const props = makeProps(overrides);
  renderWithStore(<StudentActionsMenu {...props} />);
  return props;
};

const itemLabels = () => screen.getAllByRole("menuitem").map((item) => item.textContent);

afterEach(() => {
  // The real store outlives a test: drop any session a test started.
  store.dispatch(logout());
});

describe("StudentActionsMenu", () => {
  describe("a trial-lesson (PROBATION) member", () => {
    it("is offered Activate first and never Make Frozen", () => {
      renderMenu({ isTrial: true });

      expect(itemLabels()[0]).toBe("Activate");
      expect(itemLabels()).not.toContain("Make Frozen");
    });

    it("graduates the trial (not a plain activation) when Activate is chosen", () => {
      const props = renderMenu({ isTrial: true });

      fireEvent.click(screen.getAllByRole("menuitem")[0]);

      expect(props.onGraduateTrial).toHaveBeenCalledTimes(1);
      expect(props.onActivate).not.toHaveBeenCalled();
      expect(props.onMakeFrozen).not.toHaveBeenCalled();
    });

    it("still offers the ordinary member actions after Activate", () => {
      renderMenu({ isTrial: true });

      expect(itemLabels()).toEqual([
        "Activate",
        "Add new note",
        "Move student to group",
        "Move student to branch",
        "Remove from group",
        "Reminders",
      ]);
    });
  });

  describe("a frozen member", () => {
    it("is offered Activate, which un-freezes, and not Make Frozen", () => {
      const props = renderMenu({ isFrozen: true });

      expect(itemLabels()[0]).toBe("Activate");
      expect(itemLabels()).not.toContain("Make Frozen");

      fireEvent.click(screen.getAllByRole("menuitem")[0]);
      expect(props.onActivate).toHaveBeenCalledTimes(1);
      expect(props.onGraduateTrial).not.toHaveBeenCalled();
    });
  });

  describe("an active member", () => {
    it("is offered Make Frozen first and not Activate", () => {
      const props = renderMenu();

      expect(itemLabels()[0]).toBe("Make Frozen");
      expect(itemLabels()).not.toContain("Activate");

      fireEvent.click(screen.getAllByRole("menuitem")[0]);
      expect(props.onMakeFrozen).toHaveBeenCalledTimes(1);
      expect(props.onActivate).not.toHaveBeenCalled();
    });

    it("wires each remaining item to its own handler", () => {
      const props = renderMenu();
      const click = (label: string) => fireEvent.click(screen.getByRole("menuitem", { name: label }));

      click("Add new note");
      click("Move student to group");
      click("Remove from group");
      click("Reminders");

      expect(props.onAddNote).toHaveBeenCalledTimes(1);
      expect(props.onMoveGroup).toHaveBeenCalledTimes(1);
      expect(props.onRemove).toHaveBeenCalledTimes(1);
      expect(props.onReminders).toHaveBeenCalledTimes(1);
    });
  });

  describe("an archived member", () => {
    it("offers only Activate and Back to trial lesson", () => {
      renderMenu({ isArchived: true });

      expect(itemLabels()).toEqual(["Activate", "Back to trial lesson"]);
    });

    it("restores with Activate and returns to the trial with Back to trial lesson", () => {
      const props = renderMenu({ isArchived: true });

      fireEvent.click(screen.getByRole("menuitem", { name: "Activate" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Back to trial lesson" }));

      expect(props.onActivateArchived).toHaveBeenCalledTimes(1);
      expect(props.onBackToTrialLesson).toHaveBeenCalledTimes(1);
      expect(props.onActivate).not.toHaveBeenCalled();
      expect(props.onGraduateTrial).not.toHaveBeenCalled();
    });

    it("takes precedence over the trial and frozen flags", () => {
      renderMenu({ isArchived: true, isTrial: true, isFrozen: true });

      expect(itemLabels()).toEqual(["Activate", "Back to trial lesson"]);
    });
  });

  it("renders nothing while there is no anchor element", () => {
    renderMenu({ anchorEl: null });

    expect(screen.queryByRole("menu")).toBeNull();
  });

  describe("Add payment", () => {
    const meReply = (permissions: Array<{ label: string; action: string }>) =>
      jsonResponse({
        success: true,
        data: {
          id: "u1",
          role: "ADMIN",
          roles: ["ADMIN", "Reception"],
          rolePermissions: [{ id: "p1", name: "Reception", description: null, labels: [...new Set(permissions.map((p) => p.label))], permissions }],
          branchIds: [],
          branches: [],
        },
      });

    const signIn = (permissions: Array<{ label: string; action: string }>) => {
      const stub = stubFetch((request) =>
        request.url.endsWith("/auth/me") ? meReply(permissions) : jsonResponse({ success: true, data: { allAccess: false, labels: [] } }),
      );
      store.dispatch(setToken("test-token"));
      return stub;
    };

    it("is offered to staff who may create payments", async () => {
      signIn([{ label: "PAYMENTS", action: "CREATE" }]);
      const props = renderMenu();

      const item = await screen.findByRole("menuitem", { name: "Add payment" });
      fireEvent.click(item);
      expect(props.onAddPayment).toHaveBeenCalledTimes(1);
    });

    it("is hidden from staff without the PAYMENTS permission", async () => {
      const { requests } = signIn([{ label: "STUDENTS", action: "READ" }]);
      renderMenu();

      await waitFor(() => expect(requests.some((r) => r.url.endsWith("/auth/me"))).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(itemLabels()).not.toContain("Add payment");
    });

    it("is hidden while nobody is signed in", () => {
      renderMenu();

      expect(itemLabels()).not.toContain("Add payment");
    });
  });

  describe("Move student to branch", () => {
    beforeEach(() => {
      // Only the date is faked, so Testing Library's own timers keep running.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 5, 15, 12, 0));
    });

    it("closes the menu and opens the branch dialog with the payment end date set to today", () => {
      const props = renderMenu();

      fireEvent.click(screen.getByRole("menuitem", { name: "Move student to branch" }));

      expect(props.onClose).toHaveBeenCalledTimes(1);
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("15.06.2026")).toBeTruthy();
    });

    it("cannot be submitted before a branch is chosen", () => {
      renderMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Move student to branch" }));
      const dialog = screen.getByRole("dialog");

      expect((within(dialog).getByRole("button", { name: "Move to branch" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("sends the branch, an optional reason (undefined when blank) and the payment end date", async () => {
      const props = renderMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Move student to branch" }));
      const dialog = screen.getByRole("dialog");

      fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "b2" } });
      fireEvent.change(within(dialog).getByPlaceholderText("Reason (optional)"), { target: { value: "   " } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Move to branch" }));

      expect(props.onMoveToBranch).toHaveBeenCalledTimes(1);
      expect(props.onMoveToBranch).toHaveBeenCalledWith("b2", undefined, "2026-06-15");
      // a successful move closes the dialog
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("passes a typed reason through, trimmed", () => {
      const props = renderMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Move student to branch" }));
      const dialog = screen.getByRole("dialog");

      fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "b1" } });
      fireEvent.change(within(dialog).getByPlaceholderText("Reason (optional)"), { target: { value: "  Family moved  " } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Move to branch" }));

      expect(props.onMoveToBranch).toHaveBeenCalledWith("b1", "Family moved", "2026-06-15");
    });

    it("stays open when the move fails", async () => {
      const props = renderMenu({ onMoveToBranch: vi.fn().mockResolvedValue(false) });
      fireEvent.click(screen.getByRole("menuitem", { name: "Move student to branch" }));
      const dialog = screen.getByRole("dialog");

      fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "b1" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Move to branch" }));

      await waitFor(() => expect(props.onMoveToBranch).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
  });
});
