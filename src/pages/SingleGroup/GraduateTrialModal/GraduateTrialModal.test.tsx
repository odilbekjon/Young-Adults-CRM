import type { ComponentProps } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { GraduateTrialModal } from "./GraduateTrialModal";

type Props = ComponentProps<typeof GraduateTrialModal>;

// "Today" for every test: Monday 15 June 2026, midday local time.
const TODAY = new Date(2026, 5, 15, 12, 0);

const renderModal = (overrides: Partial<Props> = {}) => {
  const props: Props = { open: true, onClose: vi.fn(), onConfirm: vi.fn(), ...overrides };
  const view = renderWithStore(<GraduateTrialModal {...props} />);
  const rerender = (next: Partial<Props>) => view.rerender(<GraduateTrialModal {...props} {...next} />);
  return { props, rerender };
};

const confirmButton = () => screen.getByRole("button", { name: /^(Activate|Activating\.\.\.)$/ }) as HTMLButtonElement;

// The 42 day cells of the open calendar, in grid order.
const dayCells = () => screen.getAllByRole("button").filter((button) => /^\d{1,2}$/.test(button.textContent ?? "")) as HTMLButtonElement[];
// The in-month cell of `day` (the grid starts on Sunday).
const dayCell = (year: number, monthIndex: number, day: number) => dayCells()[new Date(year, monthIndex, 1).getDay() + day - 1];

beforeEach(() => {
  // Only the date is faked, so Testing Library's own timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

describe("GraduateTrialModal", () => {
  describe("default billing start date", () => {
    it("is today, not the day the student joined (trial lessons are free)", () => {
      const { props } = renderModal({ joinedAt: "2026-05-01" });

      expect(screen.getByText("15.06.2026")).toBeTruthy();
      expect(screen.queryByText("01.05.2026")).toBeNull();

      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-15");
    });

    it("is today when the join date is unknown", () => {
      const { props } = renderModal();

      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-15");
    });

    it("is today when the student joined today", () => {
      const { props } = renderModal({ joinedAt: "2026-06-15" });

      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-15");
    });

    it("is the join date when that still lies ahead", () => {
      const { props } = renderModal({ joinedAt: "2026-06-20" });

      expect(screen.getByText("20.06.2026")).toBeTruthy();
      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-20");
    });

    it("reads only the date part of a full datetime join date", () => {
      const { props } = renderModal({ joinedAt: "2026-06-20T00:00:00+05:00" });

      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-20");
    });

    it("is worked out again each time the dialog opens", () => {
      const { props, rerender } = renderModal({ open: false });
      vi.setSystemTime(new Date(2026, 5, 17, 9, 0));

      rerender({ open: true });
      fireEvent.click(confirmButton());

      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-17");
    });
  });

  describe("earliest selectable date", () => {
    it("cannot be earlier than the join date", () => {
      renderModal({ joinedAt: "2026-06-10" });

      fireEvent.click(screen.getByText("15.06.2026")); // open the picker

      expect(dayCell(2026, 5, 9).disabled).toBe(true);
      expect(dayCell(2026, 5, 1).disabled).toBe(true);
      expect(dayCell(2026, 5, 10).disabled).toBe(false);
      expect(dayCell(2026, 5, 20).disabled).toBe(false);
    });

    it("is the join date itself when it is still in the future", () => {
      renderModal({ joinedAt: "2026-06-20" });

      fireEvent.click(screen.getByText("20.06.2026"));

      expect(dayCell(2026, 5, 19).disabled).toBe(true);
      expect(dayCell(2026, 5, 20).disabled).toBe(false);
    });

    it("lets billing start on any day from the join date on, and confirms the picked one", () => {
      const { props } = renderModal({ joinedAt: "2026-06-10" });

      fireEvent.click(screen.getByText("15.06.2026"));
      fireEvent.click(dayCell(2026, 5, 10));
      expect(screen.getByText("10.06.2026")).toBeTruthy();

      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-10");
    });
  });

  describe("confirming", () => {
    it("passes the chosen date to onConfirm exactly once per click", () => {
      const { props } = renderModal();

      fireEvent.click(screen.getByText("15.06.2026"));
      fireEvent.click(dayCell(2026, 5, 22));
      fireEvent.click(confirmButton());

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-22");
    });

    it("submits on Enter as well, with the same date", () => {
      const { props } = renderModal({ joinedAt: "2026-06-20" });

      fireEvent.keyDown(screen.getByText("Finish trial lesson"), { key: "Enter" });

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith("2026-06-20");
    });

    it("is blocked while saving: the button is disabled, says so, and Enter does nothing", () => {
      const { props } = renderModal({ isSaving: true });

      expect(confirmButton().disabled).toBe(true);
      expect(confirmButton().textContent).toBe("Activating...");

      fireEvent.click(confirmButton());
      fireEvent.keyDown(screen.getByText("Finish trial lesson"), { key: "Enter" });
      expect(props.onConfirm).not.toHaveBeenCalled();
    });

    it("renders nothing while closed", () => {
      renderModal({ open: false });

      expect(screen.queryByText("Finish trial lesson")).toBeNull();
    });
  });
});
