import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import { MoveStudentDialog } from "./MoveStudentDialog";

const GROUPS = [{ id: "g2", name: "Evening IELTS" }, { id: "g3", name: "Kids English" }];
const STUDENT = { id: 1, name: "Ali Valiyev", phone: "", active: true, balance: 0 };

// "Today" is 6 November 2026; only the clock is faked.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

const renderDialog = (over: Partial<React.ComponentProps<typeof MoveStudentDialog>> = {}) => {
  const onMove = vi.fn();
  const view = render(
    <MoveStudentDialog open onClose={() => {}} student={STUDENT as never} groups={GROUPS} onMove={onMove} {...over} />,
  );
  return { onMove, ...view };
};

const pickGroup = (id = "g2") => fireEvent.change(screen.getByRole("combobox"), { target: { value: id } });
const typeReason = (text = "Level up") => fireEvent.change(screen.getByPlaceholderText("Reason for moving (required)"), { target: { value: text } });
const moveButton = () => screen.getByRole("button", { name: "Move" }) as HTMLButtonElement;

describe("MoveStudentDialog", () => {
  it("is titled 'Move student to group' and names the student", () => {
    renderDialog();

    expect(screen.getByText(/Move student to group — Ali Valiyev/)).toBeTruthy();
  });

  it("asks from which date, today unless told otherwise", () => {
    renderDialog();

    expect(screen.getByText("Date from")).toBeTruthy();
    expect(screen.getByText("06.11.2026")).toBeTruthy();
    // The date is the day they leave this group: payment here ends the day before, and in
    // the new group they start on a trial lesson - nothing is said about billing from the date.
    expect(screen.getByText(/Payment in this group ends the day before/)).toBeTruthy();
    expect(screen.getByText(/starts on a trial lesson/)).toBeTruthy();
  });

  it("hands the group, the reason and the date to onMove", () => {
    const { onMove } = renderDialog();

    pickGroup("g3");
    typeReason("  Level up ");
    fireEvent.click(moveButton());

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith("g3", "Level up", "2026-11-06");
  });

  it("hands over the date picked in the calendar", async () => {
    const { onMove } = renderDialog();

    // Open the picker and take the 2nd of the month shown (the first "2": the grid also
    // shows the first days of the next month).
    fireEvent.click(screen.getByText("06.11.2026"));
    fireEvent.click((await screen.findAllByRole("button", { name: "2" }))[0]);
    pickGroup();
    typeReason();
    fireEvent.click(moveButton());

    expect(onMove).toHaveBeenCalledWith("g2", "Level up", "2026-11-02");
  });

  it("does not move without a group or without a reason", () => {
    const { onMove } = renderDialog();

    expect(moveButton().disabled).toBe(true);
    pickGroup();
    expect(moveButton().disabled).toBe(true);
    typeReason();
    expect(moveButton().disabled).toBe(false);
    typeReason("   ");
    expect(moveButton().disabled).toBe(true);
    fireEvent.click(moveButton());

    expect(onMove).not.toHaveBeenCalled();
  });

  it("starts over on today's date every time it opens", () => {
    const { rerender, onMove } = renderDialog();
    pickGroup();
    typeReason();

    rerender(<MoveStudentDialog open={false} onClose={() => {}} student={STUDENT as never} groups={GROUPS} onMove={onMove} />);
    rerender(<MoveStudentDialog open onClose={() => {}} student={STUDENT as never} groups={GROUPS} onMove={onMove} />);

    expect(screen.getByText("06.11.2026")).toBeTruthy();
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
    expect(moveButton().disabled).toBe(true);
  });
});
