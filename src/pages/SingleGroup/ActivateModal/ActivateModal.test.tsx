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
  renderWithStore(<ActivateModal {...props} />);
  return { props };
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

// Activating a frozen / archived member: billing may start on any day, past ones included.
describe("ActivateModal", () => {
  it("starts on the given default date and confirms it", () => {
    const { props } = renderModal({ defaultDate: "2026-06-04" });

    expect(screen.getByText("04.06.2026")).toBeTruthy();
    fireEvent.click(confirmButton());
    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-04");
  });

  it("starts on today when there is no default date", () => {
    const { props } = renderModal();

    fireEvent.click(confirmButton());
    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-15");
  });

  it("lets the first day of this month be picked", () => {
    const { props } = renderModal({ defaultDate: "2026-06-04" });

    fireEvent.click(screen.getByText("04.06.2026"));
    expect(dayCell(2026, 5, 1).disabled).toBe(false);
    fireEvent.click(dayCell(2026, 5, 1));
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-01");
  });

  it("lets a day of an earlier month be picked", () => {
    const { props } = renderModal({ defaultDate: "2026-06-04" });

    fireEvent.click(screen.getByText("04.06.2026"));
    fireEvent.click(screen.getByText("‹")); // May 2026
    expect(dayCell(2026, 4, 20).disabled).toBe(false);
    fireEvent.click(dayCell(2026, 4, 20));
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledWith("2026-05-20");
  });

  it("offers a 'Start of the month' shortcut", () => {
    const { props } = renderModal({ defaultDate: "2026-06-04" });

    fireEvent.click(screen.getByText("04.06.2026"));
    fireEvent.click(screen.getByText("Start of the month"));
    fireEvent.click(confirmButton());

    expect(props.onConfirm).toHaveBeenCalledWith("2026-06-01");
  });
});
