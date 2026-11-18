import type { ComponentProps } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { ActivateModal } from "./ActivateModal";

type Props = ComponentProps<typeof ActivateModal>;

// "Today" for every test: Monday 15 June 2026, midday local time.
const TODAY = new Date(2026, 5, 15, 12, 0);

const renderModal = (overrides: Partial<Props> = {}) => {
  const props: Props = { open: true, onClose: vi.fn(), onConfirm: vi.fn(), ...overrides };
  const view = renderWithStore(<ActivateModal {...props} />);
  const rerender = (next: Partial<Props>) => view.rerender(<ActivateModal {...props} {...next} />);
  return { props, rerender };
};

const confirmButton = () => screen.getByRole("button", { name: /^(Submit|Activating\.\.\.)$/ }) as HTMLButtonElement;

// The 42 day cells of the open calendar, in grid order.
const dayCells = () => screen.getAllByRole("button").filter((button) => /^\d{1,2}$/.test(button.textContent ?? "")) as HTMLButtonElement[];
// The in-month cell of `day` (the grid starts on Sunday).
const dayCell = (year: number, monthIndex: number, day: number) => dayCells()[new Date(year, monthIndex, 1).getDay() + day - 1];

beforeEach(() => {
  // Only the date is faked, so Testing Library's own timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

// No billing start date is pre-picked: the field starts empty and staff choose the
// day themselves - any day, past ones included - and confirming is blocked until
// they do.
describe("ActivateModal", () => {
  it("starts with no date picked", () => {
    renderModal();

    expect(screen.getByText("No date selected")).toBeTruthy();
    expect(screen.queryByText("15.06.2026")).toBeNull();
  });

  it("cannot be confirmed until a date is picked, not even with Enter", () => {
    const { props } = renderModal();

    expect(confirmButton().disabled).toBe(true);
    fireEvent.click(confirmButton());
    fireEvent.keyDown(screen.getByText("Activate student"), { key: "Enter" });
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the picked date, exactly once per click", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("No date selected"));
    fireEvent.click(dayCell(2026, 5, 22));
    expect(screen.getByText("22.06.2026")).toBeTruthy();
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-22");
  });

  it("lets the first day of this month and a day of an earlier month be picked", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("No date selected"));
    expect(dayCell(2026, 5, 1).disabled).toBe(false);
    fireEvent.click(screen.getByText("‹")); // May 2026
    expect(dayCell(2026, 4, 20).disabled).toBe(false);
    fireEvent.click(dayCell(2026, 4, 20));
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledWith("2026-05-20");
  });

  it("offers a 'Start of the month' shortcut", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("No date selected"));
    fireEvent.click(screen.getByText("Start of the month"));
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-01");
  });

  it("submits on Enter once a date is picked", () => {
    const { props } = renderModal();

    fireEvent.click(screen.getByText("No date selected"));
    fireEvent.click(dayCell(2026, 5, 3));
    fireEvent.keyDown(screen.getByText("Activate student"), { key: "Enter" });

    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-03");
  });

  it("is empty again each time the dialog opens", () => {
    const { rerender } = renderModal();

    fireEvent.click(screen.getByText("No date selected"));
    fireEvent.click(dayCell(2026, 5, 3));
    expect(screen.getByText("03.06.2026")).toBeTruthy();

    rerender({ open: false });
    rerender({ open: true });
    expect(screen.getByText("No date selected")).toBeTruthy();
  });

  it("is blocked while saving: the button is disabled, says so, and Enter does nothing", () => {
    const { props } = renderModal({ isSaving: true });

    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toBe("Activating...");
    fireEvent.keyDown(screen.getByText("Activate student"), { key: "Enter" });
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    renderModal({ open: false });

    expect(screen.queryByText("Activate student")).toBeNull();
  });
});
